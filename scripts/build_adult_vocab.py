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
COMMON_MULTIPOS_SOURCE = ROOT / "scripts" / "data" / "adult-vocab-senses.csv"
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
    "circumference": ("圆周、周长", "n."),
    "transcendental": ("先验的、超验的、超凡的", "adj."),
    "unpaid": ("未支付的、无薪的", "adj."),
    "x-ray": ("X射线、X光检查", "n."),
    # Corpus-backed primary-POS audit (SUBTLEX-UK). These source rows put a
    # secondary or obsolete sense first even though modern usage and ECDICT's
    # own English definitions agree on another primary part of speech.
    "resolute": ("坚定的、坚决的", "adj."),
    "invert": ("使倒置、使颠倒、反转", "v."),
    "invalid": ("无效的、不合法的", "adj."),
    "retire": ("退休、退役、退出", "v."),
    "sometime": ("某个时候、改天", "adv."),
    "exploit": ("利用、开发、剥削", "v."),
    "safeguard": ("保护、保卫", "v."),
    "incorporate": ("包含、合并、使并入", "v."),
    "rotate": ("旋转、转动、轮换", "v."),
    "revise": ("修改、修订、复习", "v."),
    "indispensable": ("不可缺少的、必不可少的", "adj."),
    "wring": ("拧、绞、扭", "v."),
    "substantial": ("大量的、实质的、重要的", "adj."),
    "many": ("许多的、许多", "adj."),
    "disrupt": ("扰乱、使中断、破坏", "v."),
    "meanwhile": ("同时、在此期间", "adv."),
    "dependent": ("依赖的、取决于…的", "adj."),
    "entire": ("全部的、整个的", "adj."),
    "normal": ("正常的、通常的", "adj."),
    "melt": ("融化、熔化", "v."),
    "nowadays": ("现今、如今", "adv."),
    "reject": ("拒绝、驳回、摒弃", "v."),
    "cancel": ("取消、撤销", "v."),
    "wipe": ("擦、擦去", "v."),
    "elect": ("选举、选择", "v."),
    "mediate": ("调停、调解", "v."),
    "retard": ("延缓、妨碍、使减速", "v."),
    "shrink": ("收缩、缩小、退缩", "v."),
    "westward": ("向西、朝西", "adv."),
    "secular": ("世俗的、非宗教的", "adj."),
    "superficial": ("表面的、肤浅的", "adj."),
    "edible": ("可食用的", "adj."),
    "prerequisite": ("先决条件、必备条件", "n."),
    "hopeful": ("有希望的、乐观的", "adj."),
    "headlong": ("头朝前地、猛然地", "adv."),
    "streamline": ("使精简、使效率更高", "v."),
    "scoff": ("嘲笑、嘲弄", "v."),
    "lateral": ("侧面的、横向的", "adj."),
    "seaside": ("海滨、海边", "n."),
    "eastward": ("向东、朝东", "adv."),
    "mortal": ("终有一死的、致命的", "adj."),
    "quiet": ("安静的、平静的", "adj."),
    "try": ("尝试、试用、努力", "v."),
    "random": ("随机的、任意的", "adj."),
    "automatic": ("自动的、无意识的", "adj."),
    "hurt": ("伤害、使疼痛", "v."),
    "minor": ("较小的、次要的", "adj."),
    "sudden": ("突然的、意外的", "adj."),
    "pour": ("倒、倾泻、涌出", "v."),
    "revolutionary": ("革命性的、突破性的", "adj."),
    "shatter": ("打碎、粉碎、使破灭", "v."),
    "opaque": ("不透明的、难理解的", "adj."),
}

# These entries were individually accepted after the corpus audit described in
# reports/adult-vocab-audit.md.  Keeping the set explicit lets the audit tool
# distinguish reviewed fixes from lower-confidence candidates.
CORPUS_AUDITED_WORDS = frozenset({
    "automatic", "cancel", "dependent", "disrupt", "eastward", "edible",
    "elect", "entire", "exploit", "headlong", "hopeful", "hurt",
    "incorporate", "indispensable", "invalid", "invert", "lateral", "many",
    "meanwhile", "mediate", "melt", "minor", "mortal", "normal", "nowadays",
    "opaque", "pour", "prerequisite", "quiet", "random", "reject", "resolute",
    "retard", "retire", "revise", "revolutionary", "rotate", "safeguard",
    "scoff", "seaside", "secular", "shatter", "shrink", "sometime",
    "streamline", "substantial", "sudden", "superficial", "try", "westward",
    "wipe", "wring",
})

# Explicitly curated examples where multiple modern forms are useful enough to
# show on the flashcard. The first sense remains the concise quiz answer.
COMMON_MULTIPOS_OVERRIDES: dict[str, list[tuple[str, ...]]] = {
    "relative": [("adj.", "相对的、相关的"), ("n.", "亲戚、亲属")],
    "civilian": [("adj.", "平民的、民用的"), ("n.", "平民")],
    "tender": [
        ("adj.", "柔软的、嫩的"),
        ("v.", "正式提出、提交、投标"),
        ("n.", "投标、投标书"),
    ],
    "safeguard": [("v.", "保护、保卫"), ("n.", "保护措施、保障")],
    "abstract": [
        ("adj.", "抽象的、抽象派的", "ˈæbstrækt"),
        ("n.", "摘要、抽象概念", "ˈæbstrækt"),
        ("v.", "提取、概括", "əbˈstrækt"),
    ],
    "representative": [
        ("n.", "代表、代表性人物"),
        ("adj.", "有代表性的、典型的"),
    ],
    "conduct": [
        ("v.", "实施、进行、管理", "kənˈdʌkt"),
        ("n.", "行为、举止", "ˈkɒndʌkt"),
    ],
    "record": [
        ("n.", "记录、档案、纪录", "ˈrekɔːd"),
        ("v.", "记录、录制", "rɪˈkɔːd"),
    ],
    "state": [("n.", "状态、州"), ("v.", "陈述、说明、规定")],
    "current": [("adj.", "当前的、现行的"), ("n.", "水流、电流、潮流")],
    "intermediate": [("adj.", "中间的、中级的"), ("n.", "中间体、中间物")],
    "produce": [("v.", "生产、产生"), ("n.", "农产品")],
    "set": [
        ("v.", "设置、放置、安排"),
        ("n.", "一套、一组、集合"),
        ("adj.", "固定的、规定的"),
    ],
    "express": [
        ("v.", "表达、表示"),
        ("adj.", "特快的、明确的"),
        ("n.", "快递服务、特快列车"),
    ],
    "constant": [("adj.", "持续的、不变的"), ("n.", "常数、恒量")],
    "duplicate": [
        ("n.", "副本、复制品"),
        ("adj.", "复制的、完全相同的"),
        ("v.", "复制、使加倍"),
    ],
    "fundamental": [("adj.", "基本的、根本的"), ("n.", "基本原理、基本原则")],
    "initial": [("adj.", "最初的、开始的"), ("n.", "首字母"), ("v.", "签姓名首字母")],
    "preliminary": [("adj.", "初步的、预备的"), ("n.", "预备步骤、预赛")],
    "accessory": [("n.", "附件、配件、从犯"), ("adj.", "附属的、辅助的")],
    "articulate": [("adj.", "表达清晰的、善于表达的"), ("v.", "清楚表达、明确说明")],
    "integral": [("adj.", "不可缺少的、完整的"), ("n.", "整体、积分")],
    "implement": [("v.", "实施、执行"), ("n.", "工具、器具")],
    "negative": [("adj.", "消极的、否定的、负的"), ("n.", "否定、负数、底片")],
    "token": [("n.", "标志、代币、令牌"), ("adj.", "象征性的、装样子的")],
    "variable": [("n.", "变量、可变因素"), ("adj.", "可变的、不稳定的")],
    "periodical": [("n.", "期刊、杂志"), ("adj.", "定期的、周期性的")],
    "log": [("n.", "原木、日志、记录"), ("v.", "记录、把…载入日志")],
    "anchor": [("n.", "锚、主持人"), ("v.", "使固定、主持")],
    "major": [("adj.", "主要的、重大的"), ("n.", "专业、少校"), ("v.", "主修")],
    "peer": [("n.", "同龄人、同等地位者"), ("v.", "凝视、仔细看")],
    "archive": [("n.", "档案、档案馆"), ("v.", "把…存档")],
    "eclipse": [("n.", "日食、月食"), ("v.", "使黯然失色、超过")],
    "pine": [("n.", "松树、松木"), ("v.", "渴望、苦苦思念")],
    "echo": [("n.", "回声、回响"), ("v.", "回响、重复、附和")],
    "brave": [("adj.", "勇敢的"), ("v.", "勇敢面对")],
    "orphan": [("n.", "孤儿"), ("adj.", "无双亲的、孤立的"), ("v.", "使成为孤儿")],
    "missionary": [("n.", "传教士"), ("adj.", "传教的")],
    "latent": [("adj.", "潜在的、潜伏的")],
    "content": [
        ("n.", "内容、目录", "ˈkɒntent"),
        ("adj.", "满足的、满意的", "kənˈtent"),
        ("v.", "使满足", "kənˈtent"),
    ],
    "permit": [
        ("n.", "许可证、执照", "ˈpɜːmɪt"),
        ("v.", "允许、准许", "pəˈmɪt"),
    ],
    "convict": [
        ("n.", "罪犯、服刑人员", "ˈkɒnvɪkt"),
        ("v.", "判定有罪", "kənˈvɪkt"),
    ],
    "contract": [
        ("n.", "合同、契约", "ˈkɒntrækt"),
        ("v.", "订约、感染、收缩", "kənˈtrækt"),
    ],
    "object": [
        ("n.", "物体、目标、对象", "ˈɒbdʒɪkt"),
        ("v.", "反对、提出异议", "əbˈdʒekt"),
    ],
    "project": [
        ("n.", "项目、计划", "ˈprɒdʒekt"),
        ("v.", "投射、放映、预测", "prəˈdʒekt"),
    ],
    "rebel": [
        ("n.", "反叛者", "ˈrebəl"),
        ("adj.", "反叛的", "ˈrebəl"),
        ("v.", "反抗、反叛", "rɪˈbel"),
    ],
    "survey": [
        ("n.", "调查、测量、概览", "ˈsɜːveɪ"),
        ("v.", "调查、审视、测量", "səˈveɪ"),
    ],
    "light": [
        ("n.", "光、灯"),
        ("adj.", "轻的、明亮的、浅色的"),
        ("v.", "点燃、照亮"),
    ],
    "issue": [("n.", "问题、议题、期号"), ("v.", "发布、发行、发给")],
    "force": [("n.", "力量、武力"), ("v.", "强迫、迫使")],
    "patient": [("n.", "病人、患者"), ("adj.", "耐心的、能忍耐的")],
    "change": [("v.", "改变、更换"), ("n.", "变化、零钱")],
    "watch": [("v.", "观看、注视"), ("n.", "手表、监视")],
    "cover": [("v.", "覆盖、包括、保护"), ("n.", "盖子、封面")],
    "right": [
        ("adj.", "正确的、合适的、右边的"),
        ("n.", "权利、右边、正义"),
        ("adv.", "正好、直接、向右"),
    ],
    "lead": [
        ("v.", "带领、引导、领先", "liːd"),
        ("n.", "领先、主角、线索；铅", "liːd; led"),
        ("adj.", "主要的、领先的", "liːd"),
    ],
    "less": [("adj.", "更少的、较小的"), ("adv.", "更少地、较少")],
    "refuse": [
        ("v.", "拒绝、不接受", "rɪˈfjuːz"),
        ("n.", "垃圾、废弃物", "ˈrefjuːs"),
    ],
    "count": [("v.", "数、计算、算作、重要"), ("n.", "计数、总数")],
    "fix": [("v.", "修理、固定、解决"), ("n.", "困境、解决办法、修理")],
    "divide": [("v.", "分开、划分、除"), ("n.", "分歧、分界线、分水岭")],
    "resolve": [("v.", "解决、下定决心、分解"), ("n.", "决心、坚定")],
    "counter": [
        ("n.", "柜台、计数器"),
        ("v.", "反驳、抵制、抵消"),
        ("adj.", "相反的、反对的"),
        ("adv.", "相反地、反方向地"),
    ],
    "pale": [("adj.", "苍白的、浅色的、微弱的"), ("v.", "变苍白、相形失色")],
    "render": [("v.", "使成为、提供、呈现、渲染"), ("n.", "渲染图、抹灰层")],
    "interact": [("v.", "互动、相互作用")],
    "shy": [("adj.", "害羞的、胆怯的"), ("v.", "畏缩、避开")],
    "steer": [("v.", "驾驶、引导"), ("n.", "阉公牛")],
    "primitive": [
        ("adj.", "原始的、早期的、简陋的"),
        ("n.", "原始事物、基本类型"),
    ],
    "hedge": [("n.", "树篱、防范措施、对冲"), ("v.", "用树篱围、规避、套期保值")],
    "bankrupt": [
        ("adj.", "破产的、彻底缺乏的"),
        ("v.", "使破产"),
        ("n.", "破产者"),
    ],
    "console": [
        ("v.", "安慰、慰藉", "kənˈsəʊl"),
        ("n.", "控制台", "ˈkɒnsəʊl"),
    ],
    "cripple": [("v.", "严重损害、使残疾")],
    "exempt": [("adj.", "被免除的、豁免的"), ("v.", "免除、豁免")],
    "tan": [
        ("n.", "棕褐色、晒黑"),
        ("v.", "晒黑、鞣制"),
        ("adj.", "棕褐色的"),
    ],
    "tidy": [("adj.", "整齐的、有条理的"), ("v.", "收拾、整理")],
    "savage": [("adj.", "凶猛的、野蛮的、猛烈的"), ("v.", "猛烈攻击、严厉批评")],
    "mute": [
        ("adj.", "无声的、沉默的"),
        ("v.", "静音、减弱声音"),
        ("n.", "弱音器、静音键"),
    ],
    "queer": [
        ("adj.", "奇特的；酷儿的（身份用语）"),
        ("n.", "酷儿（身份认同用语）"),
    ],
    "lean": [
        ("v.", "倾斜、倚靠、依赖"),
        ("adj.", "瘦的、精简的"),
        ("n.", "瘦肉"),
    ],
    "prompt": [
        ("adj.", "迅速的、及时的"),
        ("v.", "促使、提示"),
        ("n.", "提示、提示符"),
    ],
    "weekly": [("adj.", "每周的"), ("adv.", "每周"), ("n.", "周刊、周报")],
    "faint": [
        ("adj.", "微弱的、模糊的、苍白的"),
        ("v.", "昏厥、变微弱"),
        ("n.", "昏厥"),
    ],
    "calm": [
        ("adj.", "平静的、冷静的"),
        ("v.", "使平静、镇静"),
        ("n.", "平静、无风"),
    ],
    "upstairs": [
        ("adv.", "在楼上、往楼上"),
        ("adj.", "楼上的"),
        ("n.", "楼上、楼上部分"),
    ],
    "overnight": [("adv.", "一夜之间、整夜"), ("adj.", "通宵的、一夜之间的")],
    "trim": [("v.", "修剪、整理"), ("adj.", "整齐的、苗条的"), ("n.", "修剪、装饰")],
    "damp": [("adj.", "潮湿的"), ("v.", "使潮湿、抑制"), ("n.", "潮湿、湿气")],
    "flush": [
        ("v.", "冲洗、脸红、涌出"),
        ("n.", "冲洗、脸红"),
        ("adj.", "齐平的、充裕的"),
    ],
    "triple": [("adj.", "三倍的"), ("v.", "使成三倍"), ("n.", "三倍、三个一组")],
    "mock": [("v.", "嘲笑、模仿"), ("adj.", "模拟的、假的"), ("n.", "模拟考试、仿制品")],
    "worse": [("adj.", "更坏的、更糟的"), ("adv.", "更坏地、更糟"), ("n.", "更糟的事")],
    "worst": [("adj.", "最坏的、最糟的"), ("adv.", "最坏地、最糟"), ("n.", "最坏的情况")],
}

HOMOGRAPH_VARIANTS: dict[str, list[dict[str, Any]]] = {
    # ECDICT merges the differently capitalized and pronounced words in one
    # source row. Keep two cards so “polish” never teaches “波兰的” and
    # “Polish” never teaches “擦亮”.
    "polish": [
        {
            "en": "polish",
            "phonetic": "ˈpɒlɪʃ",
            "pos": "v.",
            "zh": "擦亮、润色",
            "senses": [
                {"pos": "v.", "zh": "擦亮、润色"},
                {"pos": "n.", "zh": "抛光、光泽"},
            ],
        },
        {
            "en": "Polish",
            "phonetic": "ˈpəʊlɪʃ",
            "pos": "adj.",
            "zh": "波兰的",
            "senses": [
                {"pos": "adj.", "zh": "波兰的"},
                {"pos": "n.", "zh": "波兰语、波兰人"},
            ],
        },
    ],
}


def read_common_multipos(
    source: Path = COMMON_MULTIPOS_SOURCE,
) -> dict[str, list[dict[str, str]]]:
    if not source.is_file():
        return {}
    grouped: dict[str, list[dict[str, str]]] = {}
    with source.open("r", encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            key = (row.get("word") or "").casefold()
            pos = {
                "a.": "adj.",
                "ad.": "adv.",
                "vt.": "v.",
                "vi.": "v.",
                "vt.vi.": "v.",
                "vi.vt.": "v.",
            }.get((row.get("pos") or "").lower(), (row.get("pos") or "").lower())
            zh = (row.get("zh") or "").strip()
            if not key or pos not in {"n.", "v.", "adj.", "adv."} or not zh:
                continue
            grouped.setdefault(key, []).append({"pos": pos, "zh": zh})
    return grouped


COMMON_MULTIPOS = read_common_multipos()

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
        "vt.": "v.",
        "vi.": "v.",
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
        if key in HOMOGRAPH_VARIANTS:
            for variant in HOMOGRAPH_VARIANTS[key]:
                word = {
                    "id": safe_word_id(variant["en"], used_ids),
                    "en": variant["en"],
                    "zh": variant["zh"],
                    "phonetic": variant["phonetic"],
                    "pos": variant["pos"],
                    "tracks": [track for track in TRACK_ORDER if track in tracks],
                    "rank": record["rank"],
                    "senses": variant["senses"],
                }
                words.append(word)
            continue
        # The corpus audit is a risk detector, not an automatic dictionary
        # editor. Only explicitly curated COMMON_GLOSS_OVERRIDES may replace a
        # source primary meaning; generated review rows must not silently turn
        # peer into “凝视” or token into an adjective-only card.
        source_primary = (record["zh"], record["pos"])
        zh, pos = COMMON_GLOSS_OVERRIDES.get(key, source_primary)
        senses: list[dict[str, str]] = []
        if key in COMMON_MULTIPOS_OVERRIDES:
            senses = [
                {
                    "pos": sense[0],
                    "zh": sense[1],
                    **({"phonetic": sense[2]} if len(sense) > 2 else {}),
                }
                for sense in COMMON_MULTIPOS_OVERRIDES[key]
            ]
            pos, zh = senses[0]["pos"], senses[0]["zh"]
            if senses[0].get("phonetic"):
                record["phonetic"] = senses[0]["phonetic"]
        elif key in COMMON_MULTIPOS:
            # The concise primary gloss remains first because quizzes use it.
            # When the old concise gloss mixed several parts of speech in one
            # line, replace it with the source's POS-specific line first.
            reviewed_primary_sense = next(
                (sense for sense in COMMON_MULTIPOS[key] if sense["pos"] == pos),
                None,
            )
            if reviewed_primary_sense and key not in COMMON_GLOSS_OVERRIDES:
                zh = reviewed_primary_sense["zh"]
            senses = [{"pos": pos, "zh": zh}]
            for reviewed in COMMON_MULTIPOS[key]:
                if reviewed["pos"] == pos:
                    continue
                senses.append(reviewed)
        word = {
                "id": safe_word_id(record["en"], used_ids),
                "en": record["en"],
                "zh": zh,
                "phonetic": record["phonetic"],
                "pos": pos,
                "tracks": [track for track in TRACK_ORDER if track in tracks],
                "rank": record["rank"],
            }
        if len(senses) > 1:
            word["senses"] = senses
        words.append(word)

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
