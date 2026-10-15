function clientIp(req: Request) {
  // ruleid: xff-first-hop
  return req.headers["x-forwarded-for"]?.toString().split(",")[0].trim();
}

function clientIpFromHeaders(headers: Headers) {
  const forwarded = headers.get("X-Forwarded-For") ?? "";
  // ruleid: xff-first-hop
  const [first] = [forwarded.split(",").shift()];
  return first;
}

function trustedHop(headers: Headers, trustedHops: number) {
  const hops = (headers.get("x-forwarded-for") ?? "").split(",").map((hop) => hop.trim());
  // ok: xff-first-hop
  return hops[hops.length - 1 - trustedHops];
}

function unrelated(value: string) {
  // ok: xff-first-hop
  return value.split(",")[0];
}

function destructured(h: Record<string, string>) {
  // ruleid: xff-first-hop
  const [first] = String(h["x-forwarded-for"]).split(",");
  return first;
}

function mapped(h: Record<string, string>) {
  // ruleid: xff-first-hop
  return h["x-forwarded-for"].split(",").map((hop) => hop.trim())[0];
}
