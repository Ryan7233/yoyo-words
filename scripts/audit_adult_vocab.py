#!/usr/bin/env python3
"""Audit adult flashcard primary senses against SUBTLEX-UK part-of-speech data.

The script does not treat a corpus tag as a dictionary verdict. It reports a
candidate only when the current source-selected content POS differs from the
corpus dominant POS, the dominant POS has enough observations, and ECDICT has a
Chinese sense for that POS. Reviewed corrections remain explicitly identified.

Usage:
    python3 scripts/audit_adult_vocab.py /tmp/ecdict.csv \
        /tmp/subtlex-uk/SUBTLEX-UK.txt
"""

from __future__ import annotations

import argparse
import csv
from dataclasses import dataclass
from pathlib import Path

import build_adult_vocab as vocab


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_REPORT = ROOT / "reports" / "adult-vocab-audit.md"
DEFAULT_CSV = ROOT / "reports" / "adult-vocab-pos-candidates.csv"
DEFAULT_DECISIONS = ROOT / "scripts" / "data" / "adult-vocab-review.csv"
CONTENT_POS = {"noun", "verb", "adjective", "adverb"}
SHORT_POS = {"noun": "n.", "verb": "v.", "adjective": "adj.", "adverb": "adv."}
POS_ALIASES = {
    "n.": "noun",
    "pl.": "noun",
    "v.": "verb",
    "vt.": "verb",
    "vi.": "verb",
    "vt.vi.": "verb",
    "vi.vt.": "verb",
    "a.": "adjective",
    "adj.": "adjective",
    "ad.": "adverb",
    "adv.": "adverb",
}


@dataclass(frozen=True)
class CorpusEntry:
    dominant_pos: str
    dominant_count: int
    total_count: int
    pos_counts: dict[str, int]

    @property
    def dominance(self) -> float:
        return self.dominant_count / self.total_count if self.total_count else 0.0


def translation_senses(raw: str) -> dict[str, str]:
    senses: dict[str, str] = {}
    for line in vocab.LINE_SPLIT_RE.split(raw or ""):
        line = vocab.BRACKET_LABEL_RE.sub("", line).strip()
        match = vocab.POS_RE.match(line)
        if not match:
            continue
        pos = POS_ALIASES.get(match.group("pos").lower())
        if pos not in CONTENT_POS:
            continue
        cleaned = vocab.clean_translation(f"{match.group('pos')} {line[match.end():]}")
        if cleaned:
            senses.setdefault(pos, cleaned[0])
    return senses


def read_source_rows(source: Path) -> dict[str, dict[str, str]]:
    rows: dict[str, dict[str, str]] = {}
    with source.open("r", encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            key = (row.get("word") or "").strip().casefold()
            if key:
                rows.setdefault(key, row)
    return rows


def dotted_values(raw: str) -> list[str]:
    return [value for value in (raw or "").strip(".").split(".") if value]


def read_subtlex(source: Path) -> tuple[dict[str, CorpusEntry], set[str]]:
    entries: dict[str, CorpusEntry] = {}
    spellings: set[str] = set()
    with source.open("r", encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle, delimiter="\t"):
            spelling = (row.get("Spelling") or "").casefold()
            spellings.add(spelling)
            pos = row.get("DomPoS") or ""
            if pos not in CONTENT_POS:
                continue
            counts = [int(value) for value in dotted_values(row.get("AllPoSFreq") or "")]
            positions = dotted_values(row.get("AllPoS") or "")
            entry = CorpusEntry(
                pos,
                int(row.get("DomPoSFreq") or 0),
                sum(counts),
                dict(zip(positions, counts)),
            )
            entries[spelling] = entry
    return entries, spellings


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("ecdict", type=Path)
    parser.add_argument("subtlex", type=Path)
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV)
    parser.add_argument("--decisions", type=Path, default=DEFAULT_DECISIONS)
    parser.add_argument("--min-count", type=int, default=3)
    parser.add_argument("--min-dominance", type=float, default=0.65)
    args = parser.parse_args()

    source_rows = read_source_rows(args.ecdict)
    raw_records = vocab.read_records(args.ecdict)
    final_words = {word["en"].casefold(): word for word in vocab.build_words(raw_records)}
    corpus, corpus_spellings = read_subtlex(args.subtlex)
    results: list[dict[str, str]] = []
    matched = 0
    content_pos_matched = 0
    unmatched: list[str] = []

    for key, word in sorted(final_words.items()):
        if key not in corpus_spellings:
            unmatched.append(word["en"])
            continue
        matched += 1
        evidence = corpus.get(key)
        if evidence is None:
            continue
        content_pos_matched += 1
        raw = raw_records[key]
        raw_pos = POS_ALIASES.get(raw["pos"])
        senses = translation_senses(source_rows.get(key, {}).get("translation", ""))
        is_candidate = (
            raw_pos in CONTENT_POS
            and raw_pos != evidence.dominant_pos
            and evidence.dominant_count >= args.min_count
            and evidence.dominance >= args.min_dominance
            and evidence.dominant_pos in senses
        )
        is_reviewed = key in vocab.CORPUS_AUDITED_WORDS
        if not is_candidate and not is_reviewed:
            continue
        results.append({
            "status": "corrected" if is_reviewed else "review",
            "word": word["en"],
            "tracks": "+".join(word["tracks"]),
            "source_pos": raw["pos"],
            "source_gloss": raw["zh"],
            "corpus_pos": SHORT_POS[evidence.dominant_pos],
            "dominant_count": str(evidence.dominant_count),
            "dominance": f"{evidence.dominance:.3f}",
            "source_pos_count": str(evidence.pos_counts.get(raw_pos or "", 0)),
            "source_pos_share": f"{evidence.pos_counts.get(raw_pos or '', 0) / evidence.total_count:.3f}",
            "candidate_gloss": senses.get(evidence.dominant_pos, ""),
            "final_pos": word["pos"],
            "final_gloss": word["zh"],
        })

    always_keep_secondary = {
        "american", "chinese", "civilian", "egyptian", "extract", "french",
        "german", "greek", "handle", "immigrant", "iraqi", "italian",
        "japanese", "musical", "recruit", "reign", "relative", "ruin",
        "russian", "spanish", "stall", "tap", "tear", "tender",
    }
    never_keep_secondary = {"natural", "oriental", "stale"}
    manual_multi = {
        "relative": ("adj.", "相对的、相关的", "n.", "亲戚、亲属"),
        "civilian": ("adj.", "平民的、民用的", "n.", "平民"),
        "tender": ("adj.", "柔软的、嫩的", "n.", "投标、投标书"),
    }
    decisions: list[dict[str, str]] = []
    for row in results:
        if row["status"] != "review":
            continue
        key = row["word"].casefold()
        manual = manual_multi.get(key)
        common_by_corpus = (
            int(row["source_pos_count"]) >= 5
            and float(row["source_pos_share"]) >= 0.01
        )
        keep_secondary = (
            key not in never_keep_secondary
            and (common_by_corpus or key in always_keep_secondary)
        )
        row["status"] = "resolved_multi" if keep_secondary else "resolved_primary"
        decisions.append({
            "word": row["word"],
            "primary_pos": manual[0] if manual else row["corpus_pos"],
            "primary_zh": manual[1] if manual else row["candidate_gloss"],
            "secondary_pos": manual[2] if manual else row["source_pos"],
            "secondary_zh": manual[3] if manual else row["source_gloss"],
            "keep_secondary": "yes" if keep_secondary else "no",
            "dominance": row["dominance"],
            "source_pos_count": row["source_pos_count"],
            "source_pos_share": row["source_pos_share"],
        })

    args.decisions.parent.mkdir(parents=True, exist_ok=True)
    with args.decisions.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(decisions[0]))
        writer.writeheader()
        writer.writerows(sorted(decisions, key=lambda row: row["word"].casefold()))

    status_order = {"corrected": 0, "resolved_multi": 1, "resolved_primary": 2}
    results.sort(key=lambda row: (status_order[row["status"]], -float(row["dominance"]), row["word"].casefold()))
    args.csv.parent.mkdir(parents=True, exist_ok=True)
    with args.csv.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(results[0]))
        writer.writeheader()
        writer.writerows(results)

    corrected = [row for row in results if row["status"] == "corrected"]
    multi = [row for row in results if row["status"] == "resolved_multi"]
    primary_only = [row for row in results if row["status"] == "resolved_primary"]
    lines = [
        "# 成人词库主词性与释义审计",
        "",
        "本报告检查全部成人词库词条。主词性证据来自 SUBTLEX-UK 影视字幕语料；中文候选义来自 ECDICT。语料只用于发现风险，不把统计结果直接当成词典结论。",
        "",
        "## 结果摘要",
        "",
        f"- 总词条：{len(final_words):,}",
        f"- 匹配 SUBTLEX-UK 词形：{matched:,}",
        f"- 其中有名词/动词/形容词/副词主词性证据：{content_pos_matched:,}",
        f"- 未匹配词形、需其他来源复核：{len(unmatched):,}",
        f"- 已确认并修正：{len(corrected):,}",
        f"- 原待复核词性冲突：{len(multi) + len(primary_only):,}",
        f"- 两种常用词性均保留：{len(multi):,}",
        f"- 次要词性证据不足，仅保留现代主词性：{len(primary_only):,}",
        f"- 候选阈值：主词性至少 {args.min_count} 次，且占全部内容词性至少 {args.min_dominance:.0%}",
        "",
        "完整处理明细见 `adult-vocab-pos-candidates.csv`。`resolved_multi` 表示两种常用词性都会显示；`resolved_primary` 表示次要词性在现代语料中证据不足；`corrected` 是此前已人工接受的错误修正。",
        "",
        "## 已确认修正",
        "",
        "| 单词 | 原卡片 | 修正后 | 语料主词性（占比） |",
        "|---|---|---|---|",
    ]
    for row in corrected:
        lines.append(
            f"| {row['word']} | {row['source_pos']} {row['source_gloss']} | "
            f"{row['final_pos']} {row['final_gloss']} | {row['corpus_pos']} ({float(row['dominance']):.1%}) |"
        )
    lines.extend([
        "",
        "## 多词性处理规则",
        "",
        "- 现代语料中次要词性至少出现 5 次且占比至少 1%，两种词性都保留。",
        "- `relative`、`civilian`、`tender` 等已确认常用的多词性词作人工补充。",
        "- `invalid` 的过时名词义、`stale` 的古旧名词义以及冒犯性称谓不保留。",
        "- 卡片分行显示多词性；小测只使用第一条现代核心义，避免答案过长。",
        "",
        "## 未匹配词",
        "",
        ", ".join(f"`{word}`" for word in unmatched),
        "",
        "## 数据来源",
        "",
        "- [ECDICT（MIT License）](https://github.com/skywind3000/ECDICT)：项目生成器记录的固定源文件 SHA-256。",
        "- [SUBTLEX-UK](https://psychology.nottingham.ac.uk/subtlex-uk/)：[van Heuven et al. (2014)](https://doi.org/10.1080/17470218.2013.850521)，British English word frequencies based on subtitles；审计使用其 DomPoS、DomPoSFreq 与 AllPoSFreq 字段。",
        "",
    ])
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text("\n".join(lines), encoding="utf-8")
    print(
        f"Audited {len(final_words)} words: matched={matched}, "
        f"content_pos={content_pos_matched}, unmatched={len(unmatched)}"
    )
    print(
        f"Wrote {len(corrected)} corrected, {len(multi)} multi-POS and "
        f"{len(primary_only)} primary-only rows to {args.csv}"
    )
    print(f"Wrote {len(decisions)} reviewed decisions to {args.decisions}")
    print(f"Wrote summary to {args.report}")


if __name__ == "__main__":
    main()
