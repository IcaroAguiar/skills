#!/usr/bin/env python3
"""Read-only, privacy-minimizing Hostinger finance heartbeat helper."""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import pwd
import re
import subprocess
import sys
import unicodedata
import urllib.error
import urllib.request
from collections import Counter
from dataclasses import dataclass
from typing import Any, Callable
from zoneinfo import ZoneInfo


BASE_URL = "https://developers.hostinger.com"
KEYCHAIN_SERVICE = "codex-hostinger-api-token"
EXPECTED_OWNER = "JAMIL SAHELI"
STAR_DOMAINS = frozenset({"plataformastar.com", "staragency.com.br"})
MAX_RESPONSE_BYTES = 4 * 1024 * 1024
TIMEOUT_SECONDS = 12.0
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/126.0.0.0 Safari/537.36 HostingerStarFinanceReadOnly/1.0"
)
SUBSCRIPTION_STATUSES = frozenset(
    {"active", "paused", "cancelled", "not_renewing", "transferred", "in_trial", "future"}
)
DOMAIN_STATUSES = frozenset(
    {"active", "pending_setup", "expired", "requested", "pending_verification", "deleted", "suspended", "failed"}
)
VPS_STATES = frozenset(
    {
        "running", "starting", "stopping", "stopped", "creating", "initial", "error",
        "suspending", "unsuspending", "suspended", "destroying", "destroyed",
        "recreating", "restoring", "recovery", "stopping_recovery",
    }
)

# This is the complete network surface. There is intentionally no generic URL or
# method argument exposed through the CLI.
ENDPOINTS = {
    "subscriptions": "/api/billing/v1/subscriptions",
    "domains": "/api/domains/v1/portfolio",
    "domain_details": "/api/domains/v1/portfolio/{domain}",
    "whois": "/api/domains/v1/whois",
    "dns": "/api/dns/v1/zones/{domain}",
    "vps": "/api/vps/v1/virtual-machines",
}


class SafeFailure(Exception):
    """Failure whose code is safe to expose; provider response bodies are not."""

    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


class _RejectRedirectHandler(urllib.request.HTTPRedirectHandler):
    """Reject redirects before urllib can replay the Authorization header."""

    def _reject(self, req, fp, code, msg, headers):  # noqa: ANN001
        raise SafeFailure("api_redirect_rejected")

    http_error_301 = _reject
    http_error_302 = _reject
    http_error_303 = _reject
    http_error_307 = _reject
    http_error_308 = _reject

    def redirect_request(self, req, fp, code, msg, headers, newurl):  # noqa: ANN001
        raise SafeFailure("api_redirect_rejected")


@dataclass(frozen=True)
class DueItem:
    category: str
    due_date: str
    currency: str | None
    amount_minor: int | None
    status: str


def _normalize(value: object) -> str:
    text = unicodedata.normalize("NFKD", str(value or ""))
    return " ".join("".join(c for c in text if not unicodedata.combining(c)).upper().split())


def _read_keychain_token() -> str:
    try:
        result = subprocess.run(
            [
                "/usr/bin/security",
                "find-generic-password",
                "-a",
                pwd.getpwuid(os.getuid()).pw_name,
                "-s",
                KEYCHAIN_SERVICE,
                "-w",
            ],
            check=False,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
            timeout=5,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise SafeFailure("keychain_unavailable") from exc
    token = result.stdout.strip()
    if result.returncode != 0 or not token:
        raise SafeFailure("keychain_token_missing")
    return token


def _request_json(path: str, token: str) -> Any:
    allowed_paths = {
        ENDPOINTS["subscriptions"],
        ENDPOINTS["domains"],
        ENDPOINTS["whois"],
        ENDPOINTS["vps"],
        *(ENDPOINTS["domain_details"].format(domain=domain) for domain in STAR_DOMAINS),
        *(ENDPOINTS["dns"].format(domain=domain) for domain in STAR_DOMAINS),
    }
    if path not in allowed_paths:
        raise SafeFailure("endpoint_not_allowed")

    request = urllib.request.Request(
        BASE_URL + path,
        method="GET",
        headers={
            "Accept": "application/json",
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": USER_AGENT,
        },
    )
    opener = urllib.request.build_opener(_RejectRedirectHandler())
    try:
        with opener.open(request, timeout=TIMEOUT_SECONDS) as response:
            if response.status != 200:
                raise SafeFailure(f"api_http_{response.status}")
            raw = response.read(MAX_RESPONSE_BYTES + 1)
    except urllib.error.HTTPError as exc:
        # Never consume or expose provider error bodies.
        raise SafeFailure(f"api_http_{exc.code}") from exc
    except (urllib.error.URLError, TimeoutError) as exc:
        raise SafeFailure("api_transport_error") from exc
    if len(raw) > MAX_RESPONSE_BYTES:
        raise SafeFailure("api_response_too_large")
    try:
        return json.loads(raw)
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise SafeFailure("api_invalid_json") from exc


def _as_list(value: Any, code: str) -> list[dict[str, Any]]:
    if not isinstance(value, list) or any(not isinstance(item, dict) for item in value):
        raise SafeFailure(code)
    return value


def _owner_name(profile: dict[str, Any]) -> str:
    details = profile.get("whois_details")
    if not isinstance(details, dict):
        return ""
    candidates = (
        details.get("name"),
        details.get("full_name"),
        details.get("company_name"),
        f"{details.get('first_name', '')} {details.get('last_name', '')}",
    )
    return next((_normalize(item) for item in candidates if _normalize(item) == EXPECTED_OWNER), "")


def _has_corporate_cnpj(profile: dict[str, Any]) -> bool:
    if profile.get("entity_type") != "organization":
        return False
    details = profile.get("whois_details")
    tld_details = profile.get("tld_details")
    containers = [item for item in (details, tld_details) if isinstance(item, dict)]
    values = [container.get("vat_company_br") for container in containers]
    return any(len(re.sub(r"\D", "", str(value or ""))) == 14 for value in values)


def _parse_date(value: object) -> dt.date | None:
    if not isinstance(value, str) or not value:
        return None
    try:
        return dt.date.fromisoformat(value[:10])
    except ValueError:
        return None


def _category(name: object) -> str:
    normalized = _normalize(name)
    if any(word in normalized for word in ("DOMAIN", "DOMINIO")):
        return "domain"
    if any(word in normalized for word in ("VPS", "KVM", "VIRTUAL")):
        return "vps"
    if any(word in normalized for word in ("EMAIL", "E-MAIL", "MAILBOX")):
        return "email"
    return "hosting"


def _safe_enum(value: object, allowed: frozenset[str]) -> str:
    candidate = str(value or "").lower()
    return candidate if candidate in allowed else "unknown"


def _due_items(
    subscriptions: list[dict[str, Any]],
    domains: list[dict[str, Any]],
    today: dt.date,
) -> list[DueItem]:
    result: list[DueItem] = []
    for item in subscriptions:
        due = _parse_date(item.get("next_billing_at")) or _parse_date(item.get("expires_at"))
        if due == today:
            amount = item.get("renewal_price")
            result.append(
                DueItem(
                    category=_category(item.get("name")),
                    due_date=due.isoformat(),
                    currency=str(item.get("currency_code") or "") or None,
                    amount_minor=amount if isinstance(amount, int) and amount >= 0 else None,
                    status=_safe_enum(item.get("status"), SUBSCRIPTION_STATUSES),
                )
            )
    for item in domains:
        due = _parse_date(item.get("expires_at"))
        if due == today:
            result.append(
                DueItem(
                    category="domain",
                    due_date=due.isoformat(),
                    currency=None,
                    amount_minor=None,
                    status=_safe_enum(item.get("status"), DOMAIN_STATUSES),
                )
            )
    return result


def audit(
    *,
    today: dt.date,
    token_reader: Callable[[], str] = _read_keychain_token,
    requester: Callable[[str, str], Any] = _request_json,
) -> dict[str, Any]:
    token = token_reader()
    subscriptions = _as_list(
        requester(ENDPOINTS["subscriptions"], token), "subscriptions_invalid"
    )
    domains = _as_list(requester(ENDPOINTS["domains"], token), "domains_invalid")

    currencies = {str(item.get("currency_code") or "").upper() for item in subscriptions}
    currency_guard = bool(subscriptions) and currencies == {"BRL"}
    known_domains = {
        str(item.get("domain") or "").lower()
        for item in domains
        if str(item.get("domain") or "").lower() in STAR_DOMAINS
    }
    domain_guard = bool(known_domains)

    # Fail the cheapest, least-sensitive account checks before requesting WHOIS,
    # DNS, VPS, or domain-contact data.
    if not currency_guard:
        raise SafeFailure("account_guard_currency_failed")
    if not domain_guard:
        raise SafeFailure("account_guard_domain_failed")

    star_domain = (
        "plataformastar.com"
        if "plataformastar.com" in known_domains
        else sorted(known_domains)[0]
    )
    contact_ids: set[int] = set()
    for known_domain in sorted(known_domains):
        details = requester(
            ENDPOINTS["domain_details"].format(domain=known_domain), token
        )
        if not isinstance(details, dict):
            raise SafeFailure("domain_details_invalid")
        contacts = details.get("domain_contacts")
        if not isinstance(contacts, dict):
            raise SafeFailure("account_guard_whois_correlation_failed")
        contact_ids.update(
            value for value in contacts.values() if isinstance(value, int)
        )

    whois = _as_list(requester(ENDPOINTS["whois"], token), "whois_invalid")
    correlated_profiles = [profile for profile in whois if profile.get("id") in contact_ids]
    owner_guard = any(_owner_name(profile) == EXPECTED_OWNER for profile in correlated_profiles)
    corporate_guard = any(
        _owner_name(profile) == EXPECTED_OWNER and _has_corporate_cnpj(profile)
        for profile in correlated_profiles
    )
    whois_guard = owner_guard and corporate_guard

    if not whois_guard:
        raise SafeFailure("account_guard_whois_failed")

    # Fetch the zone only after the account/domain guard has identified a known
    # Star domain. Record values never leave this process.
    dns = _as_list(
        requester(ENDPOINTS["dns"].format(domain=star_domain), token), "dns_invalid"
    )
    vps = _as_list(requester(ENDPOINTS["vps"], token), "vps_invalid")

    due = _due_items(subscriptions, domains, today)
    status_counts = Counter(_safe_enum(item.get("state"), VPS_STATES) for item in vps)
    return {
        "ok": True,
        "read_only": True,
        "guard_passed": True,
        "guard": {
            "currency_brl": currency_guard,
            "star_domain_present": domain_guard,
            "expected_whois_owner": owner_guard,
            "corporate_cnpj_shape": corporate_guard,
        },
        "counts": {
            "subscriptions": len(subscriptions),
            "domains": len(domains),
            "whois_profiles": len(whois),
            "dns_record_sets": len(dns),
            "vps": len(vps),
            "vps_by_state": dict(sorted(status_counts.items())),
            "due_today": len(due),
        },
        "checked_date": today.isoformat(),
        "due_today": [item.__dict__ for item in due],
        "invoice_visibility": "not_exposed_by_selected_read_endpoints",
    }


def _safe_error(code: str, today: dt.date) -> dict[str, Any]:
    return {
        "ok": False,
        "read_only": True,
        "guard_passed": False,
        "blocked": True,
        "block_code": code,
        "checked_date": today.isoformat(),
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Sanitized read-only Hostinger finance audit")
    parser.add_argument(
        "--date",
        type=dt.date.fromisoformat,
        default=dt.datetime.now(ZoneInfo("America/Sao_Paulo")).date(),
        help="Reference date (YYYY-MM-DD); defaults to America/Sao_Paulo",
    )
    args = parser.parse_args(argv)
    try:
        output = audit(today=args.date)
        code = 0
    except SafeFailure as exc:
        output = _safe_error(exc.code, args.date)
        code = 2
    except Exception:
        # Unknown exceptions are deliberately collapsed: no provider body, token,
        # local path, stack trace, or personal data reaches stdout/stderr.
        output = _safe_error("internal_error", args.date)
        code = 3
    json.dump(output, sys.stdout, ensure_ascii=True, separators=(",", ":"), sort_keys=True)
    sys.stdout.write("\n")
    return code


if __name__ == "__main__":
    raise SystemExit(main())
