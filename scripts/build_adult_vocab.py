#!/usr/bin/env python3
"""Build the compact adult vocabulary module from ECDICT's ``ecdict.csv``.

Usage:
    python3 scripts/build_adult_vocab.py /path/to/ecdict.csv

The source file itself is intentionally not committed. The generated module keeps
only the fields used by YoYo Words and records the source SHA-256 for traceability.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = Path("/tmp/ecdict.csv")
DEFAULT_OUTPUT = ROOT / "js" / "adult-words.js"
LIFE_LIMIT = 1_800

TRACK_ORDER = ("life", "cet4", "cet6", "postgrad")
TAG_TO_TRACK = {"cet4": "cet4", "cet6": "cet6", "ky": "postgrad"}
WORD_RE = re.compile(r"[A-Za-z][A-Za-z'-]{0,31}")
CJK_RE = re.compile(r"[\u3400-\u9fff]")
LINE_SPLIT_RE = re.compile(r"\\(?:r\\)?n|\r?\n")
POS_RE = re.compile(
    r"^(?P<pos>vt\.vi\.|vi\.vt\.|[a-z]+\.)\s*",
    re.IGNORECASE,
)
BRACKET_LABEL_RE = re.compile(r"(?:\[[^\]]{1,12}\]|<[^>]{1,12}>)")
ID_REPLACEMENT_RE = re.compile(r"[^a-z0-9_-]+")


LEVELS = [
    {"id": "life", "name": "生活常用", "tag": "生活高频 · 1800词", "emoji": "☕", "isDefault": False},
    {"id": "cet4", "name": "CET4", "tag": "大学英语四级", "emoji": "🎓", "isDefault": True},
    {"id": "cet6", "name": "CET6", "tag": "大学英语六级", "emoji": "🚀", "isDefault": False},
    {"id": "postgrad", "name": "考研", "tag": "研究生入学考试", "emoji": "📚", "isDefault": False},
]

# ECDICT stores senses by dictionary order rather than everyday frequency.  For
# very common polysemous words that can make the first few flashcards actively
# misleading (can=装罐, will=意志, may=五月, etc.), pin a concise everyday gloss.
# Keep this list intentionally reviewable: it is product copy, not a second
# machine-generated dictionary.
COMMON_GLOSS_OVERRIDES: dict[str, tuple[str, str]] = {
    "the": ("这、那（特指）", "art."),
    "a": ("一个、任一", "art."),
    "but": ("但是、不过", "conj."),
    "as": ("作为、像、当…时", "prep."),
    "can": ("能、可以", "aux."),
    "will": ("将、会、愿意", "aux."),
    "up": ("向上、起来", "adv."),
    "out": ("出去、在外", "adv."),
    "just": ("只是、刚刚、正好", "adv."),
    "like": ("喜欢、像", "v."),
    "want": ("想要、需要", "v."),
    "look": ("看、看起来", "v."),
    "use": ("使用、利用", "v."),
    "no": ("不、没有", "adv."),
    "give": ("给、给予", "v."),
    "well": ("很好地、健康的", "adv."),
    "only": ("只、仅仅", "adv."),
    "very": ("非常、很", "adv."),
    "even": ("甚至、即使", "adv."),
    "back": ("回来、向后、背部", "adv."),
    "good": ("好的、良好的", "adj."),
    "through": ("穿过、通过", "prep."),
    "down": ("向下、下来", "adv."),
    "may": ("可以、可能", "aux."),
    "call": ("打电话、称呼、叫", "v."),
    "over": ("在…上方、结束", "prep."),
    "school": ("学校、上学", "n."),
    "still": ("仍然、还是", "adv."),
    "last": ("最后的、持续", "adj."),
    "high": ("高的、高度", "adj."),
    "most": ("大多数、最", "pron."),
    "own": ("自己的、拥有", "adj."),
    "leave": ("离开、留下", "v."),
    "old": ("老的、旧的", "adj."),
    "while": ("当…时、一段时间", "conj."),
    "mean": ("意思是、意味着", "v."),
    "keep": ("保持、继续", "v."),
    "great": ("很棒的、伟大的", "adj."),
    "start": ("开始、出发", "v."),
    "turn": ("转动、转向、轮到", "v."),
    "right": ("正确的、右边、权利", "adj."),
    "play": ("玩、播放、演奏", "v."),
    "run": ("跑、运行、经营", "v."),
    "live": ("生活、居住、活着", "v."),
    "hold": ("拿着、保持、举行", "v."),
    "next": ("下一个、接下来", "adj."),
    "must": ("必须、一定", "aux."),
    "study": ("学习、研究", "v."),
    "issue": ("问题、议题、发布", "n."),
    "kind": ("种类、友善的", "n."),
    "little": ("小的、少量", "adj."),
    "pay": ("支付、工资", "v."),
    "meet": ("遇见、会面", "v."),
    "set": ("设置、放置、一套", "v."),
    "change": ("改变、变化、零钱", "v."),
    "kid": ("孩子、小孩", "n."),
    "lead": ("带领、领先", "v."),
    "watch": ("观看、手表", "v."),
    "public": ("公众的、公共的", "adj."),
    "spend": ("花费、度过", "v."),
    "sure": ("确信的、一定", "adj."),
    "grow": ("成长、增长、种植", "v."),
    "open": ("打开的、开放的", "adj."),
    "low": ("低的、低声地", "adj."),
    "win": ("赢、获胜", "v."),
    "guy": ("家伙、人", "n."),
    "force": ("力量、迫使", "n."),
    "offer": ("提供、提议", "v."),
    "serve": ("服务、担任、供应", "v."),
    "fall": ("落下、跌倒、秋天", "v."),
    "cut": ("切、割、削减", "v."),
    "reach": ("到达、伸手、达到", "v."),
    "kill": ("杀死、消磨", "v."),
    "remain": ("仍然是、留下", "v."),
    "raise": ("提高、举起、筹集", "v."),
    "care": ("关心、照料、小心", "v."),
    "hard": ("困难的、努力地、坚硬的", "adj."),
    "pass": ("经过、通过、递给", "v."),
    "major": ("主要的、专业", "adj."),
    "along": ("沿着、向前", "prep."),
    "light": ("光、灯、轻的", "n."),
    "free": ("自由的、免费的、空闲的", "adj."),
    "carry": ("携带、搬运、承载", "v."),
    "drive": ("驾驶、驱动", "v."),
    "break": ("打破、休息、中断", "v."),
    "thank": ("感谢、谢谢", "v."),
    "full": ("满的、完整的", "adj."),
    "pick": ("挑选、采摘", "v."),
    "produce": ("生产、产生、农产品", "v."),
    "patient": ("病人、耐心的", "n."),
    "cover": ("覆盖、封面", "v."),
    "catch": ("抓住、赶上、接住", "v."),
    "might": ("可能、也许", "aux."),
    "lot": ("许多、大量、一批", "n."),
    "natural": ("自然的、天然的", "adj."),
    "special": ("特别的、特殊的", "adj."),
    "pm": ("下午", "abbr."),
    "ms": ("女士", "n."),
    "am": ("是（I am）", "v."),
    "jew": ("犹太人", "n."),
    # Life-route QA: ECDICT occasionally puts an archaic noun or a dated
    # figurative sense before the everyday use.  Only pin entries where that
    # first sense would make the flashcard materially misleading, or where an
    # unnecessary insulting/dated gloss leaked into an otherwise basic word.
    "woman": ("女人、女性", "n."),
    "girl": ("女孩、少女", "n."),
    "save": ("保存、节省、挽救", "v."),
    "medical": ("医疗的、医学的", "adj."),
    "current": ("当前的、现行的、水流", "adj."),
    "despite": ("尽管、不管", "prep."),
    "dog": ("狗", "n."),
    "ready": ("准备好的、愿意的", "adj."),
    "miss": ("错过、想念、未击中", "v."),
    "final": ("最后的、最终的", "adj."),
    "main": ("主要的、最重要的", "adj."),
    "specific": ("具体的、特定的", "adj."),
    "somebody": ("某人、有人", "pron."),
    "tough": ("艰难的、强硬的", "adj."),
    "modern": ("现代的、近代的", "adj."),
    "safe": ("安全的、平安的", "adj."),
    "nobody": ("没有人、无人", "pron."),
    "perfect": ("完美的、完全的", "adj."),
    "basic": ("基本的、基础的", "adj."),
    "none": ("没有一个、毫无", "pron."),
    "southern": ("南方的、南部的", "adj."),
    "settle": ("解决、定居、安顿", "v."),
    "hide": ("隐藏、躲藏", "v."),
    "independent": ("独立的、自主的", "adj."),
    "christian": ("基督徒、基督教的", "n."),
    "express": ("表达、表示、快递", "v."),
    "select": ("选择、挑选", "v."),
    "sick": ("生病的、不舒服的", "adj."),
    "cat": ("猫", "n."),
    "equal": ("相等的、平等的", "adj."),
    "due": ("到期的、预定的、由于", "adj."),
    "separate": ("分开的、把…分开", "adj."),
    "somewhat": ("有点、稍微", "adv."),
    "initial": ("最初的、首字母", "adj."),
    "contemporary": ("当代的、同时代的", "adj."),
    "multiple": ("多个的、多重的", "adj."),
    "essential": ("必不可少的、本质的", "adj."),
    "supreme": ("最高的、至高的", "adj."),
    "vegetable": ("蔬菜、植物", "n."),
    "narrow": ("狭窄的、有限的", "adj."),
    # Cross-route semantic audit: prefer the modern, high-frequency learning
    # sense over ECDICT's dictionary-order first sense or dated wording.
    "assimilate": ("吸收、理解、使同化", "v."),
    "bit": ("一点、少量、比特", "n."),
    "commission": ("委员会、佣金、委托", "n."),
    "configuration": ("配置、结构、布局", "n."),
    "doll": ("玩偶、洋娃娃", "n."),
    "hate": ("憎恨、讨厌", "v."),
    "ice-cream": ("冰淇淋", "n."),
    "intercourse": ("交往、交流、性交", "n."),
    "intermediate": ("中间的、中级的、中间物", "adj."),
    "loose": ("松的、宽松的、不牢固的", "adj."),
    "species": ("物种、种类", "n."),
    "temperamental": ("喜怒无常的、情绪多变的", "adj."),
    "unpaid": ("未支付的、无薪的", "adj."),
    "x-ray": ("X射线、X光检查", "n."),
}

# Merge a few known typo/orthographic duplicates before assigning ids so the
# learner does not meet the same headword twice under two spellings.
CANONICAL_WORDS = {
    "am": "am",
    "core": "core",
    "ms": "Ms",
    "north": "north",
    "reservior": "reservoir",
    "uptodate": "up-to-date",
    "world-wide": "worldwide",
}
SKIP_WORDS = {"n't"}


def positive_int(value: str) -> int | None:
    try:
        number = int(value)
    except (TypeError, ValueError):
        return None
    return number if number > 0 else None


def normalize_pos(raw: str | None) -> str:
    if not raw:
        return "word"
    token = raw.lower()
    aliases = {
        "a.": "adj.",
        "ad.": "adv.",
        "pl.": "n.",
        "int.": "interj.",
        "vt.vi.": "v.",
        "vi.vt.": "v.",
    }
    return aliases.get(token, token)


def clean_translation(raw: str) -> tuple[str, str] | None:
    """Return one short, readable Chinese gloss and its primary part of speech."""

    candidates = []
    for line in LINE_SPLIT_RE.split(raw or ""):
        line = re.sub(r"\s+", " ", line).strip()
        if not line or line.startswith("[网络]"):
            continue
        candidates.append(line)

    for line in candidates:
        # Specialist labels such as [计] and [医] are metadata, not the gloss.
        line_without_labels = BRACKET_LABEL_RE.sub("", line).strip()
        match = POS_RE.match(line_without_labels)
        pos = normalize_pos(match.group("pos") if match else None)
        content = line_without_labels[match.end() :] if match else line_without_labels
        content = re.sub(r"\s+", " ", content).strip(" ,，;；。")
        if not CJK_RE.search(content):
            continue

        parts: list[str] = []
        for part in re.split(r"[,，;；]", content):
            part = re.sub(r"\s+", " ", part).strip(" .。:：'\"")
            if not part or not CJK_RE.search(part) or part in parts:
                continue
            parts.append(part)
            if len(parts) == 3 or len("、".join(parts)) >= 28:
                break

        gloss = "、".join(parts) if parts else content
        gloss = gloss[:36].rstrip("、，；; ")
        if gloss:
            return gloss, pos
    return None


def row_score(row: dict[str, Any]) -> tuple[int, int, int]:
    """Prefer entries with phonetics, an explicit POS, then a useful short gloss."""

    return (
        1 if row["phonetic"] else 0,
        1 if row["pos"] != "word" else 0,
        min(len(row["zh"]), 24),
    )


def safe_word_id(word: str, used: set[str]) -> str:
    slug = ID_REPLACEMENT_RE.sub("_", word.casefold()).strip("_-") or "word"
    candidate = f"adult:{slug}"[:64]
    if candidate not in used:
        used.add(candidate)
        return candidate

    suffix = hashlib.sha1(word.encode("utf-8")).hexdigest()[:8]
    candidate = f"adult:{slug[:54]}_{suffix}"
    if candidate in used:
        raise ValueError(f"Unable to create a unique id for {word!r}")
    used.add(candidate)
    return candidate


def read_records(source: Path) -> dict[str, dict[str, Any]]:
    records: dict[str, dict[str, Any]] = {}

    with source.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        required = {"word", "phonetic", "translation", "tag", "bnc", "frq"}
        missing = required.difference(reader.fieldnames or ())
        if missing:
            raise ValueError(f"ECDICT CSV is missing columns: {', '.join(sorted(missing))}")

        for source_row in reader:
            word = (source_row.get("word") or "").strip()
            word = CANONICAL_WORDS.get(word.casefold(), word)
            if word.casefold() in SKIP_WORDS:
                continue
            if not WORD_RE.fullmatch(word):
                continue

            tags = set((source_row.get("tag") or "").split())
            exam_tracks = {track for tag, track in TAG_TO_TRACK.items() if tag in tags}
            frq = positive_int(source_row.get("frq") or "")
            # Use ECDICT's contemporary frequency rank directly.  Do not derive
            # this route from a proprietary named vocabulary-list marker.
            life_rank = frq if frq and frq <= 3_000 else None
            if not exam_tracks and life_rank is None:
                continue

            cleaned = clean_translation(source_row.get("translation") or "")
            if not cleaned:
                continue
            zh, pos = cleaned
            bnc = positive_int(source_row.get("bnc") or "")
            rank = frq or bnc or 999_999
            incoming = {
                "en": word,
                "zh": zh,
                "phonetic": (source_row.get("phonetic") or "").strip(),
                "pos": pos,
                "exam_tracks": exam_tracks,
                "life_rank": life_rank,
                "rank": rank,
            }

            key = word.casefold()
            current = records.get(key)
            if current is None:
                records[key] = incoming
                continue

            current["exam_tracks"].update(exam_tracks)
            current["rank"] = min(current["rank"], rank)
            if life_rank is not None:
                current["life_rank"] = min(current["life_rank"] or life_rank, life_rank)
            if row_score(incoming) > row_score(current):
                for field in ("en", "zh", "phonetic", "pos"):
                    current[field] = incoming[field]

    return records


def build_words(records: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    life_candidates = sorted(
        (record for record in records.values() if record["life_rank"] is not None),
        key=lambda record: (record["life_rank"], record["en"].casefold()),
    )
    if len(life_candidates) < LIFE_LIMIT:
        raise ValueError(f"Only {len(life_candidates)} eligible life words; need {LIFE_LIMIT}")
    selected_life = {record["en"].casefold() for record in life_candidates[:LIFE_LIMIT]}

    used_ids: set[str] = set()
    words: list[dict[str, Any]] = []
    for key, record in records.items():
        tracks = set(record["exam_tracks"])
        if key in selected_life:
            tracks.add("life")
        if not tracks:
            continue
        zh, pos = COMMON_GLOSS_OVERRIDES.get(key, (record["zh"], record["pos"]))
        words.append(
            {
                "id": safe_word_id(record["en"], used_ids),
                "en": record["en"],
                "zh": zh,
                "phonetic": record["phonetic"],
                "pos": pos,
                "tracks": [track for track in TRACK_ORDER if track in tracks],
                "rank": record["rank"],
            }
        )

    words.sort(key=lambda word: (word["rank"], word["en"].casefold()))
    return words


def render_module(words: list[dict[str, Any]], source_sha256: str) -> str:
    levels_json = json.dumps(LEVELS, ensure_ascii=False, separators=(",", ":"))
    rows = ",\n".join(
        json.dumps(word, ensure_ascii=False, separators=(",", ":")) for word in words
    )
    return f"""// Generated by scripts/build_adult_vocab.py from ECDICT (MIT License).
// Source ecdict.csv SHA-256: {source_sha256}
// Do not edit this file by hand; regenerate it from the pinned source data.

export const DEFAULT_ADULT_LEVEL_ID = 'cet4';
export const ADULT_LEVELS = {levels_json};

export const ADULT_WORDS = [
{rows}
];

const WORDS_BY_LEVEL = new Map(ADULT_LEVELS.map((level) => [
  level.id,
  ADULT_WORDS.filter((word) => word.tracks.includes(level.id)),
]));

export function findAdultLevel(id) {{
  return ADULT_LEVELS.find((level) => level.id === id)
    || ADULT_LEVELS.find((level) => level.id === DEFAULT_ADULT_LEVEL_ID);
}}

export function adultWordsForLevel(id) {{
  return WORDS_BY_LEVEL.get(findAdultLevel(id).id);
}}

export function adultWordPage(levelId, page = 0, pageSize = 20) {{
  const words = adultWordsForLevel(levelId);
  const safeSize = Math.max(1, Math.floor(Number(pageSize)) || 20);
  const pageCount = Math.max(1, Math.ceil(words.length / safeSize));
  const safePage = Math.min(pageCount - 1, Math.max(0, Math.floor(Number(page)) || 0));
  return {{
    page: safePage,
    pageCount,
    total: words.length,
    words: words.slice(safePage * safeSize, (safePage + 1) * safeSize),
  }};
}}
"""


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", nargs="?", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    source = args.source.expanduser().resolve()
    if not source.is_file():
        parser.error(f"ECDICT CSV not found: {source}")

    source_sha256 = hashlib.sha256(source.read_bytes()).hexdigest()
    words = build_words(read_records(source))
    output = args.output.expanduser().resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(render_module(words, source_sha256), encoding="utf-8")

    counts = {
        track: sum(track in word["tracks"] for word in words)
        for track in TRACK_ORDER
    }
    print(f"Wrote {len(words)} unique words to {output}")
    print("Tracks: " + ", ".join(f"{track}={count}" for track, count in counts.items()))
    print(f"Source SHA-256: {source_sha256}")


if __name__ == "__main__":
    main()
