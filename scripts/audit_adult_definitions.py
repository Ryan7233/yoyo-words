#!/usr/bin/env python3
"""Audit the generated adult English definitions without external services.

This is a deterministic candidate finder, not a semantic proofreader.  It scans
every generated card, writes exact counts for the patterns it can recognize,
and labels vocabulary/difficulty checks as heuristics.  In particular, a row
with no findings has *not* been certified as a correct translation.

Default outputs:
    reports/adult-definition-audit.md
    reports/adult-definition-audit.json
    reports/adult-definition-findings.csv
    reports/adult-definition-top-500.csv

Usage:
    python3 scripts/audit_adult_definitions.py
    python3 scripts/audit_adult_definitions.py --top 500 --defining-rank 3000
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = ROOT / "js" / "adult-words.js"
DEFAULT_REPORT = ROOT / "reports" / "adult-definition-audit.md"
DEFAULT_JSON = ROOT / "reports" / "adult-definition-audit.json"
DEFAULT_CSV = ROOT / "reports" / "adult-definition-findings.csv"
DEFAULT_TOP_CSV = ROOT / "reports" / "adult-definition-top-500.csv"

SCRIPT_VERSION = 1
WORD_RE = re.compile(r"[A-Za-z]+(?:['’][A-Za-z]+)?")
CONNECTOR_ENDINGS = {
    "a", "an", "and", "because", "or", "the", "which",
}
FUNCTION_POS = {"art.", "aux.", "conj.", "prep.", "pron."}
NON_NOUN_POS = FUNCTION_POS | {"adj.", "adv.", "v."}
META_NOUNS = {
    "adjective", "adverb", "article", "case", "conjunction", "determiner",
    "expression", "form", "phrase", "preposition", "pronoun", "quantifier",
    "term", "word",
}

# These words carry little lexical difficulty and are omitted from difficulty
# ratios.  The remaining ratios are still only rank-based proxies.
STOPWORDS = {
    "a", "about", "above", "after", "again", "against", "all", "also", "am",
    "an", "and", "any", "are", "as", "at", "be", "because", "been", "before",
    "being", "below", "between", "both", "but", "by", "can", "could", "did",
    "do", "does", "doing", "down", "during", "each", "either", "few", "for",
    "from", "further", "had", "has", "have", "having", "he", "her", "here",
    "hers", "herself", "him", "himself", "his", "how", "i", "if", "in",
    "into", "is", "it", "its", "itself", "just", "may", "me", "might", "more",
    "most", "must", "my", "myself", "neither", "no", "nor", "not", "of", "off",
    "on", "once", "only", "or", "other", "our", "ours", "ourselves", "out",
    "over", "own", "same", "she", "should", "so", "some", "such", "than",
    "that", "the", "their", "theirs", "them", "themselves", "then", "there",
    "these", "they", "this", "those", "through", "to", "too", "under", "until",
    "up", "very", "was", "we", "were", "what", "when", "where", "which",
    "while", "who", "whom", "whose", "why", "will", "with", "would", "you",
    "your", "yours", "yourself", "yourselves",
}

IRREGULAR_LEMMAS = {
    "better": "good",
    "best": "good",
    "children": "child",
    "feet": "foot",
    "fewer": "few",
    "gone": "go",
    "knew": "know",
    "known": "know",
    "made": "make",
    "men": "man",
    "mice": "mouse",
    "people": "person",
    "teeth": "tooth",
    "thought": "think",
    "took": "take",
    "women": "woman",
    "worse": "bad",
    "worst": "bad",
}

LEGACY_CROSS_REFERENCE_RE = re.compile(
    r"(?:^|[.;]\s*)(?:i\.\s*)?(?:see|compare|cf\.?|alt\.?\s+of)\s+"
    r"[A-Za-z][A-Za-z'-]*\.?\s*$",
    re.IGNORECASE,
)
LEGACY_GRAMMAR_RE = re.compile(
    r"(?:^|[\s,&])(?:acc|dat|imp|nom|obj|pl|pron)\.\s*"
    r"|(?:^|[\s,&])&\s*(?:a|adv|n|v)\.\s*"
    r"|\bnominative\b",
    re.IGNORECASE,
)
LETTER_SENSE_RE = re.compile(
    r"\b(?:\d+(?:st|nd|rd|th)|first|second|third|fourth|fifth|sixth|"
    r"seventh|eighth|ninth|tenth)\s+letter\b"
    r"|\bletter (?:of|in) the (?:roman|hebrew|greek) alphabet\b",
    re.IGNORECASE,
)

# A short function word explained as a place, acronym, chemical symbol, unit,
# organization, etc. is usually an abbreviation/homograph sense leak.
ABBREVIATION_DOMAIN_PATTERNS = {
    "place name or abbreviation": re.compile(
        r"\ba state in\b|\ba river in\b|\ba city in\b|\ba county in\b",
        re.IGNORECASE,
    ),
    "technology abbreviation": re.compile(
        r"\bbranch of engineering\b|\bcomputers? and telecommunications\b",
        re.IGNORECASE,
    ),
    "organization abbreviation": re.compile(
        r"\bUnited Nations agency\b|\binternational organization\b",
        re.IGNORECASE,
    ),
    "chemical symbol": re.compile(
        r"\b(?:metallic|chemical) element\b|\ballotropic forms\b",
        re.IGNORECASE,
    ),
    "currency or unit abbreviation": re.compile(
        r"\bequal 1 kip\b|\bmonetary unit\b|\bunit of currency\b",
        re.IGNORECASE,
    ),
    "concrete container sense": re.compile(
        r"\b(?:airtight sealed|metal|plastic) container\b",
        re.IGNORECASE,
    ),
    "sports sense": re.compile(
        r"^\s*\(?(?:baseball|cricket|golf|tennis)\)?\b"
        r"|\bbatter or runner\b|\bballs are bowled\b",
        re.IGNORECASE,
    ),
    "calendar month sense": re.compile(
        r"\bmonth (?:following|preceding|of the year)\b",
        re.IGNORECASE,
    ),
}

# Frequent short homographs can leak a concrete noun sense into an adverb,
# adjective, conjunction, preposition, or auxiliary card.  These patterns are
# intentionally narrow: they catch known semantic domains without pretending
# to solve general English/Chinese entailment.
HOMOGRAPH_DOMAIN_PATTERNS = {
    "body-part noun sense": re.compile(
        r"\bposterior part of a (?:human|animal)\b",
        re.IGNORECASE,
    ),
    "feather noun sense": re.compile(r"^\s*soft fine feathers\b", re.IGNORECASE),
    "well noun sense": re.compile(r"^\s*a deep hole or shaft\b", re.IGNORECASE),
    "photograph noun sense": re.compile(r"^\s*a static photograph\b", re.IGNORECASE),
    "legal-right noun sense": re.compile(r"^\s*an abstract idea of that which is due\b", re.IGNORECASE),
    "period noun sense": re.compile(r"^\s*a period of indeterminate length\b", re.IGNORECASE),
    "intent noun sense": re.compile(r"^\s*a fixed and persistent intent\b", re.IGNORECASE),
}

ISSUE_DEFINITIONS = {
    "missing_definition": {
        "category": "defect",
        "meaning": "The generated card has no English definition.",
    },
    "headword_self_reference": {
        "category": "defect",
        "meaning": "The definition starts by repeating the headword.",
    },
    "obvious_truncation": {
        "category": "defect",
        "meaning": "The definition ends with dangling punctuation or a connector.",
    },
    "legacy_cross_reference": {
        "category": "defect",
        "meaning": "The text contains a dictionary cross-reference instead of a standalone explanation.",
    },
    "legacy_grammar_notation": {
        "category": "defect",
        "meaning": "The text contains old or reader-hostile grammatical notation.",
    },
    "letter_sense_mismatch": {
        "category": "defect",
        "meaning": "A non-noun card selected an alphabet-letter sense.",
    },
    "abbreviation_sense_mismatch": {
        "category": "defect",
        "meaning": "A short non-noun card selected an abbreviation or unrelated domain sense.",
    },
    "homograph_sense_mismatch": {
        "category": "defect",
        "meaning": "A non-noun card selected a known concrete or abstract noun homograph sense.",
    },
    "pos_definition_conflict": {
        "category": "risk",
        "meaning": "The grammatical shape of the definition conflicts with the card's primary POS.",
    },
    "high_outside_vocab_ratio": {
        "category": "heuristic",
        "meaning": "Too many content tokens are absent from the 6,912-word inventory.",
    },
    "definition_too_advanced": {
        "category": "heuristic",
        "meaning": "Too many content tokens fall outside the configured rank-based proxy list.",
    },
}


@dataclass(frozen=True)
class Issue:
    code: str
    category: str
    explanation: str


def read_generated_words(path: Path) -> list[dict[str, Any]]:
    """Read the JSON array assigned to ``ADULT_WORDS`` in the JS module."""

    text = path.read_text(encoding="utf-8")
    marker = "export const ADULT_WORDS ="
    try:
        offset = text.index(marker) + len(marker)
    except ValueError as exc:
        raise ValueError(f"{path} does not export ADULT_WORDS") from exc
    payload = text[offset:].lstrip()
    words, _ = json.JSONDecoder().raw_decode(payload)
    if not isinstance(words, list):
        raise ValueError("ADULT_WORDS is not an array")
    return words


def display_path(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(ROOT))
    except ValueError:
        return str(path.resolve())


def lexical_tokens(text: str) -> list[str]:
    return [token.replace("’", "'").casefold() for token in WORD_RE.findall(text)]


def lemma_candidates(token: str) -> set[str]:
    """Return conservative, dependency-free candidates for rank lookup."""

    token = token.casefold().strip("'")
    candidates = {token}
    if token in IRREGULAR_LEMMAS:
        candidates.add(IRREGULAR_LEMMAS[token])
    if token.endswith("'s") and len(token) > 3:
        candidates.add(token[:-2])
    if token.endswith("ies") and len(token) > 4:
        candidates.add(token[:-3] + "y")
    if token.endswith("ied") and len(token) > 4:
        candidates.add(token[:-3] + "y")
    if token.endswith("ing") and len(token) > 5:
        stem = token[:-3]
        candidates.update({stem, stem + "e"})
        if len(stem) > 2 and stem[-1] == stem[-2]:
            candidates.add(stem[:-1])
    if token.endswith("ed") and len(token) > 4:
        stem = token[:-2]
        candidates.update({stem, stem + "e"})
        if len(stem) > 2 and stem[-1] == stem[-2]:
            candidates.add(stem[:-1])
    if token.endswith("es") and len(token) > 4:
        candidates.update({token[:-2], token[:-1]})
    elif token.endswith("s") and len(token) > 3 and not token.endswith("ss"):
        candidates.add(token[:-1])
    return candidates


def build_rank_index(words: Iterable[dict[str, Any]]) -> dict[str, int]:
    ranks: dict[str, int] = {}
    for word in words:
        rank = int(word.get("rank") or 10**9)
        values = [word.get("en", ""), *(word.get("forms") or [])]
        for value in values:
            key = str(value).casefold()
            if key:
                ranks[key] = min(rank, ranks.get(key, rank))
    return ranks


def token_rank(token: str, ranks: dict[str, int]) -> int | None:
    matches = [ranks[candidate] for candidate in lemma_candidates(token) if candidate in ranks]
    return min(matches) if matches else None


def ratio(part: int, total: int) -> float:
    return part / total if total else 0.0


def analyze_word(
    word: dict[str, Any],
    ranks: dict[str, int],
    defining_rank: int,
    outside_threshold: float,
    difficult_threshold: float,
) -> dict[str, Any]:
    definition = str(word.get("definition") or "").strip()
    headword = str(word.get("en") or "").casefold()
    pos = str(word.get("pos") or "")
    rank = int(word.get("rank") or 10**9)
    issues: list[Issue] = []

    if not definition:
        issues.append(Issue(
            "missing_definition", "defect", "The generated card has no English definition.",
        ))

    tokens = lexical_tokens(definition)
    if len(headword) >= 2 and tokens and tokens[0] == headword:
        issues.append(Issue(
            "headword_self_reference",
            "defect",
            "The definition starts by repeating the headword.",
        ))

    if definition:
        connector_match = re.search(
            rf"\b({'|'.join(sorted(CONNECTOR_ENDINGS))})\s*$",
            definition,
            re.IGNORECASE,
        )
        trailing_connector = connector_match.group(1).casefold() if connector_match else ""
        if definition.endswith((",", ";", ":")) or trailing_connector:
            detail = (
                f"ends with connector '{trailing_connector}'"
                if trailing_connector else "ends with dangling punctuation"
            )
            issues.append(Issue(
                "obvious_truncation",
                "defect",
                f"The definition {detail}.",
            ))

    if LEGACY_CROSS_REFERENCE_RE.search(definition):
        issues.append(Issue(
            "legacy_cross_reference",
            "defect",
            "The text contains a dictionary cross-reference instead of a standalone explanation.",
        ))

    if LEGACY_GRAMMAR_RE.search(definition):
        issues.append(Issue(
            "legacy_grammar_notation",
            "defect",
            "The text contains old or reader-hostile grammatical notation.",
        ))

    if LETTER_SENSE_RE.search(definition) and pos != "n.":
        issues.append(Issue(
            "letter_sense_mismatch",
            "defect",
            "A non-noun card selected an alphabet-letter sense.",
        ))

    matched_domain = ""
    if len(headword) <= 4 and pos in NON_NOUN_POS:
        for label, pattern in ABBREVIATION_DOMAIN_PATTERNS.items():
            if pattern.search(definition):
                matched_domain = label
                issues.append(Issue(
                    "abbreviation_sense_mismatch",
                    "defect",
                    f"A short {pos or 'unknown-POS'} word selected a {label} sense.",
                ))
                break

    if pos in NON_NOUN_POS and not matched_domain:
        for label, pattern in HOMOGRAPH_DOMAIN_PATTERNS.items():
            if pattern.search(definition):
                matched_domain = label
                issues.append(Issue(
                    "homograph_sense_mismatch",
                    "defect",
                    f"The {pos or 'unknown-POS'} card selected a {label}.",
                ))
                break

    # POS-shape rules deliberately produce review candidates rather than
    # verdicts.  A noun-phrase definition can be valid for words such as
    # "there", while often exposing a wrong noun sense for "well" or "still".
    shape_text = re.sub(r"^\s*\([^)]{1,30}\)\s*", "", definition)
    noun_start = re.match(r"^(?:a|an|the)\s+([a-z-]+)", shape_text, re.IGNORECASE)
    if (
        noun_start
        and pos in NON_NOUN_POS
        and noun_start.group(1).casefold() not in META_NOUNS
        and not matched_domain
    ):
        issues.append(Issue(
            "pos_definition_conflict",
            "risk",
            f"The {pos or 'unknown-POS'} card is explained with a noun-shaped definition.",
        ))
    elif pos == "n." and re.match(r"^to\s+[a-z]+", shape_text, re.IGNORECASE):
        issues.append(Issue(
            "pos_definition_conflict",
            "risk",
            "The noun card is explained with an infinitive verb-shaped definition.",
        ))

    content_tokens = [token for token in tokens if token not in STOPWORDS]
    ranked_tokens: list[tuple[str, int | None]] = [
        (token, token_rank(token, ranks)) for token in content_tokens
    ]
    outside_tokens = sorted({token for token, token_value in ranked_tokens if token_value is None})
    advanced_tokens = sorted({
        token for token, token_value in ranked_tokens
        if token_value is None or token_value > defining_rank
    })
    harder_tokens = sorted({
        token for token, token_value in ranked_tokens
        if token_value is None or token_value > rank
    })
    content_count = len(content_tokens)
    outside_ratio = ratio(
        sum(token_value is None for _, token_value in ranked_tokens),
        content_count,
    )
    advanced_ratio = ratio(
        sum(token_value is None or token_value > defining_rank for _, token_value in ranked_tokens),
        content_count,
    )
    harder_ratio = ratio(
        sum(token_value is None or token_value > rank for _, token_value in ranked_tokens),
        content_count,
    )

    if content_count >= 3 and outside_ratio >= outside_threshold:
        issues.append(Issue(
            "high_outside_vocab_ratio",
            "heuristic",
            f"{outside_ratio:.0%} of content tokens are absent from this 6,912-word inventory.",
        ))
    if content_count >= 3 and advanced_ratio >= difficult_threshold:
        issues.append(Issue(
            "definition_too_advanced",
            "heuristic",
            f"{advanced_ratio:.0%} of content tokens fall outside the rank-{defining_rank} proxy list.",
        ))

    issue_codes = sorted({issue.code for issue in issues})
    categories = Counter(issue.category for issue in issues)
    hard_codes = {
        "missing_definition",
        "letter_sense_mismatch",
        "abbreviation_sense_mismatch",
        "homograph_sense_mismatch",
    }
    if any(code in hard_codes for code in issue_codes):
        priority = "P0"
    elif categories["defect"]:
        priority = "P1"
    elif categories["risk"]:
        priority = "P2"
    elif categories["heuristic"]:
        priority = "P3"
    else:
        priority = "AUTO_CLEAR"

    return {
        "rank": rank,
        "en": str(word.get("en") or ""),
        "pos": pos,
        "zh": str(word.get("zh") or ""),
        "definition": definition,
        "tracks": "+".join(word.get("tracks") or []),
        "priority": priority,
        "issue_codes": issue_codes,
        "issues": issues,
        "defect_count": categories["defect"],
        "risk_count": categories["risk"],
        "heuristic_count": categories["heuristic"],
        "content_token_count": content_count,
        "outside_vocab_ratio": outside_ratio,
        "advanced_token_ratio": advanced_ratio,
        "harder_than_headword_ratio": harder_ratio,
        "outside_tokens": outside_tokens,
        "advanced_tokens": advanced_tokens,
        "harder_tokens": harder_tokens,
    }


CSV_FIELDS = [
    "rank",
    "en",
    "pos",
    "zh",
    "definition",
    "tracks",
    "priority",
    "issue_codes",
    "defect_count",
    "risk_count",
    "heuristic_count",
    "content_token_count",
    "outside_vocab_ratio",
    "advanced_token_ratio",
    "harder_than_headword_ratio",
    "outside_tokens",
    "advanced_tokens",
]


def csv_row(result: dict[str, Any]) -> dict[str, Any]:
    row = {field: result.get(field, "") for field in CSV_FIELDS}
    row["issue_codes"] = "|".join(result["issue_codes"])
    row["outside_vocab_ratio"] = f"{result['outside_vocab_ratio']:.3f}"
    row["advanced_token_ratio"] = f"{result['advanced_token_ratio']:.3f}"
    row["harder_than_headword_ratio"] = f"{result['harder_than_headword_ratio']:.3f}"
    row["outside_tokens"] = "|".join(result["outside_tokens"])
    row["advanced_tokens"] = "|".join(result["advanced_tokens"])
    return row


def write_csv(path: Path, rows: Iterable[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=CSV_FIELDS, lineterminator="\n")
        writer.writeheader()
        writer.writerows(csv_row(row) for row in rows)


def pct(count: int, total: int) -> str:
    return f"{count / total:.1%}" if total else "0.0%"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    parser.add_argument("--json", type=Path, default=DEFAULT_JSON)
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV)
    parser.add_argument("--top-csv", type=Path, default=DEFAULT_TOP_CSV)
    parser.add_argument("--top", type=int, default=500)
    parser.add_argument(
        "--defining-rank",
        type=int,
        default=3000,
        help="Rank cutoff used as a simple defining-vocabulary proxy.",
    )
    parser.add_argument("--outside-threshold", type=float, default=0.50)
    parser.add_argument("--difficult-threshold", type=float, default=0.60)
    args = parser.parse_args()

    if args.top < 1 or args.defining_rank < 1:
        parser.error("--top and --defining-rank must be positive")
    for flag, value in (
        ("--outside-threshold", args.outside_threshold),
        ("--difficult-threshold", args.difficult_threshold),
    ):
        if not 0 <= value <= 1:
            parser.error(f"{flag} must be between 0 and 1")

    words = read_generated_words(args.input)
    ranks = build_rank_index(words)
    results = [
        analyze_word(
            word,
            ranks,
            args.defining_rank,
            args.outside_threshold,
            args.difficult_threshold,
        )
        for word in words
    ]
    results.sort(key=lambda row: (row["rank"], row["en"].casefold()))
    top_rows = results[: min(args.top, len(results))]
    findings = [row for row in results if row["issue_codes"]]

    issue_counts = Counter(
        code for result in results for code in result["issue_codes"]
    )
    category_counts = Counter()
    for result in results:
        for issue in result["issues"]:
            category_counts[issue.category] += 1
    flagged_words = sum(bool(result["issue_codes"]) for result in results)
    top_flagged = sum(bool(result["issue_codes"]) for result in top_rows)
    top_p0 = sum(result["priority"] == "P0" for result in top_rows)
    source_sha = hashlib.sha256(args.input.read_bytes()).hexdigest()

    write_csv(args.csv, findings)
    write_csv(args.top_csv, top_rows)

    issue_metadata = ISSUE_DEFINITIONS
    json_payload = {
        "script_version": SCRIPT_VERSION,
        "input": display_path(args.input),
        "input_sha256": source_sha,
        "total_words": len(results),
        "flagged_words": flagged_words,
        "automatically_unflagged_not_semantically_verified": len(results) - flagged_words,
        "top_n": len(top_rows),
        "top_flagged_words": top_flagged,
        "top_p0_words": top_p0,
        "thresholds": {
            "defining_rank": args.defining_rank,
            "outside_vocab_ratio": args.outside_threshold,
            "advanced_token_ratio": args.difficult_threshold,
            "minimum_content_tokens_for_ratio_flags": 3,
        },
        "issue_counts": dict(sorted(issue_counts.items())),
        "category_matches": dict(sorted(category_counts.items())),
        "issue_metadata": dict(sorted(issue_metadata.items())),
        "top_p0": [
            {
                "rank": row["rank"],
                "en": row["en"],
                "pos": row["pos"],
                "zh": row["zh"],
                "definition": row["definition"],
                "issue_codes": row["issue_codes"],
            }
            for row in top_rows if row["priority"] == "P0"
        ],
    }
    args.json.parent.mkdir(parents=True, exist_ok=True)
    args.json.write_text(
        json.dumps(json_payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    issue_order = [
        "missing_definition",
        "letter_sense_mismatch",
        "abbreviation_sense_mismatch",
        "homograph_sense_mismatch",
        "headword_self_reference",
        "obvious_truncation",
        "legacy_cross_reference",
        "legacy_grammar_notation",
        "pos_definition_conflict",
        "high_outside_vocab_ratio",
        "definition_too_advanced",
    ]
    issue_labels = {
        "missing_definition": "空释义",
        "letter_sense_mismatch": "字母义错配",
        "abbreviation_sense_mismatch": "缩写/同形词义项错配",
        "homograph_sense_mismatch": "常见同形词义项错配",
        "headword_self_reference": "释义以原词开头",
        "obvious_truncation": "明显截断",
        "legacy_cross_reference": "古旧交叉引用",
        "legacy_grammar_notation": "古旧语法缩写",
        "pos_definition_conflict": "主词性与释义形态冲突候选",
        "high_outside_vocab_ratio": "词库外词比例过高（启发式）",
        "definition_too_advanced": "释义难度过高（启发式）",
    }

    lines = [
        "# 成人英英释义自动审计",
        "",
        "本报告由 `scripts/audit_adult_definitions.py` 对生成后的成人词卡做全量、确定性扫描。"
        "**匹配数量只是命中规则的精确数量，不等于语言学意义上的全部错误数量；未命中也不代表释义正确。**",
        "",
        "## 扫描信息",
        "",
        f"- 输入：`{display_path(args.input)}`",
        f"- 输入 SHA-256：`{source_sha}`",
        f"- 总词条：{len(results):,}",
        f"- 有至少一个自动发现：{flagged_words:,}（{pct(flagged_words, len(results))}）",
        f"- 自动规则未发现问题、但**未经语义确认**：{len(results) - flagged_words:,}",
        f"- 头部清单：前 {len(top_rows):,} 词，其中有发现 {top_flagged:,}，P0 高置信错义 {top_p0:,}",
        "",
        "## 规则命中",
        "",
        "| 检查项 | 类型 | 命中词条 | 占全部 |",
        "|---|---|---:|---:|",
    ]
    for code in issue_order:
        category = issue_metadata[code]["category"]
        count = issue_counts.get(code, 0)
        lines.append(
            f"| {issue_labels[code]} | {category} | {count:,} | {pct(count, len(results))} |"
        )

    lines.extend([
        "",
        f"## 前 {len(top_rows):,} 高频词中的 P0",
        "",
        "| rank | word | pos | 中文义 | 当前英文释义 | 命中 |",
        "|---:|---|---|---|---|---|",
    ])
    for row in top_rows:
        if row["priority"] != "P0":
            continue
        safe_definition = row["definition"].replace("|", "\\|")
        safe_zh = row["zh"].replace("|", "\\|")
        lines.append(
            f"| {row['rank']} | {row['en']} | {row['pos']} | {safe_zh} | "
            f"{safe_definition} | {', '.join(row['issue_codes'])} |"
        )

    lines.extend([
        "",
        "## 输出与使用边界",
        "",
        f"- `{Path(args.top_csv).name}`：前 {len(top_rows)} 高频词逐条清单；"
        "`AUTO_CLEAR` 只表示自动规则未命中，仍需人工读义。",
        "- `adult-definition-findings.csv`：全部命中项，便于筛选、分派和修订。",
        "- `adult-definition-audit.json`：输入哈希、阈值、规则计数与头部 P0，便于 CI 对比。",
        f"- 难度代理把本词库 rank ≤ {args.defining_rank:,} 当作“基础释义词”；"
        "词形还原是轻量规则，不是完整英语词形分析。",
        "- `high_outside_vocab_ratio`、`definition_too_advanced`、"
        "`pos_definition_conflict` 都是复核候选，不应自动改词义。",
        "- 本脚本无法证明两句自然语言语义一致，`it → 信息技术` 一类只在命中已知"
        "缩写/语义域模式时才能自动抓到；全量语义复核需要独立来源或模型判定，再由人工验收头部词。",
        "",
    ])
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text("\n".join(lines), encoding="utf-8")

    print(
        f"Audited {len(results)} definitions: flagged={flagged_words}, "
        f"top_{len(top_rows)}_flagged={top_flagged}, top_p0={top_p0}"
    )
    print(f"Wrote report to {args.report}")
    print(f"Wrote JSON summary to {args.json}")
    print(f"Wrote {len(findings)} findings to {args.csv}")
    print(f"Wrote top {len(top_rows)} checklist to {args.top_csv}")


if __name__ == "__main__":
    main()
