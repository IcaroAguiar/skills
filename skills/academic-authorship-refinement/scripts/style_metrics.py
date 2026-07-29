"""Deterministic style metrics used for editorial quality checks."""

from __future__ import annotations

import argparse
import json
from collections import Counter
import statistics
import re
from pathlib import Path

RISK_HIGH = "high"
RISK_LOW = "low"
RISK_MEDIUM = "medium"

MIN_WORDS_FOR_STABLE_SAMPLE = 80
LONG_SENTENCE_WORDS = 30
MAX_MEAN_SENTENCE_WORDS = 40
MAX_LONG_SENTENCE_RATIO = 0.35
MIN_LEXICAL_DIVERSITY = 0.45
MAX_REPEATED_BIGRAM_RATIO = 0.12
LOW_RISK_MIN_SCORE = 75
MEDIUM_RISK_MIN_SCORE = 50


_TOKEN_RE = re.compile(r"[A-Za-zÀ-ÿ0-9]+")
_SENTENCE_RE = re.compile(r"[^.!?]+[.!?]+")


def _tokens(text: str) -> list[str]:
    return [token.lower() for token in _TOKEN_RE.findall(text)]


def _sentence_lengths(text: str) -> list[int]:
    sentences = [match.group(0).strip() for match in _SENTENCE_RE.finditer(text)]
    if not sentences:
        return []
    return [_tokens(sentence).__len__() for sentence in sentences]


def compute_style_metrics(text: str) -> dict:
    """Compute deterministic metrics from plain text."""

    token_list = _tokens(text)
    sentence_lengths = _sentence_lengths(text)

    total_words = len(token_list)
    unique_words = len(set(token_list)) if token_list else 0
    avg_sentence_len = statistics.mean(sentence_lengths) if sentence_lengths else 0.0
    long_sentence_ratio = (
        sum(1 for length in sentence_lengths if length >= LONG_SENTENCE_WORDS)
        / max(len(sentence_lengths), 1)
    )

    repeated_bigrams = 0
    bigrams = []
    for index in range(len(token_list) - 1):
        bigrams.append((token_list[index], token_list[index + 1]))
    if bigrams:
        repeated_bigrams = sum(1 for count in Counter(bigrams).values() if count > 1) / len(bigrams)

    diversity = unique_words / max(total_words, 1)

    score = 100
    if total_words < MIN_WORDS_FOR_STABLE_SAMPLE:
        score -= 20
    if avg_sentence_len > MAX_MEAN_SENTENCE_WORDS:
        score -= min(30, int((avg_sentence_len - MAX_MEAN_SENTENCE_WORDS) * 1.5))
    if long_sentence_ratio > MAX_LONG_SENTENCE_RATIO:
        score -= 20
    if diversity < MIN_LEXICAL_DIVERSITY:
        score -= 20
    if repeated_bigrams > MAX_REPEATED_BIGRAM_RATIO:
        score -= 15

    score = max(0, min(100, score))
    risk = (
        RISK_LOW
        if score >= LOW_RISK_MIN_SCORE
        else RISK_MEDIUM
        if score >= MEDIUM_RISK_MIN_SCORE
        else RISK_HIGH
    )

    return {
        "total_words": total_words,
        "total_sentences": len(sentence_lengths),
        "mean_sentence_length": round(avg_sentence_len, 2),
        "lexical_diversity": round(diversity, 3),
        "long_sentence_ratio": round(long_sentence_ratio, 3),
        "repeated_bigram_ratio": round(repeated_bigrams, 3),
        "style_score": score,
        "risk": risk,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Compute style metrics for a manuscript body.")
    parser.add_argument("--text", default=None, help="Manuscript text.")
    parser.add_argument("--text-file", default=None, help="Path to manuscript text file.")
    args = parser.parse_args()

    text = args.text or ""
    if args.text_file:
        text = Path(args.text_file).read_text(encoding="utf-8")

    metrics = compute_style_metrics(text)
    print(json.dumps(metrics, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
