# 全库更新进度

本次目标覆盖成人 6,912 个独立词、儿童 459 条、Kiwi 24 条；成人路线之间共享词条，
不把相同词在四条路线里重复算作工作量。既有 ID 与学习记录不变。

**状态：进行中，未完成全库更新，未通过全库独立复核；尚未发布本次改动。**

## 当前断点（2026-09-29）

**成人新稿 2,600 / 6,912；已完成独立模型语义复核并合入本地 1,300 / 6,912。**
“独立”指作者和复核者不同，不是专业人工审校。所有这些生成文案仍标记为
`generated`，未伪称已由词典编纂者审定。

| 范围 | 已保存新稿 | 已复核并合入本地 | 下一断点 |
|---|---:|---:|---|
| A：稳定 rank 索引 0–2303 | 001–011，共 1,100 词 | 001、002、004，共 300 词 | A003、A005–A011 为 root 编写，需另一位复核；A012 从索引 1,100 开始 |
| B：索引 2304–4607 | 001–007，共 700 词 | 001–004，共 400 词 | B005–B007 为 root 编写，需另一位复核；B008 从索引 3004 开始 |
| C：索引 4608–6911 | 001–008，共 800 词 | 001–006，共 600 词 | C007、C008 为 root 编写，需另一位复核；C009 从索引 5408 开始 |
| 儿童 | 459 条，补齐 130 条例句 | 459 条，逐项记录且当前哈希匹配 | 最终整体验收 |
| Kiwi | 24 条 | 24 条，逐项记录且当前哈希匹配 | 最终整体验收 |

成人还欠 **4,312 词新稿**，以及 **5,612 词本轮复核**（包含 1,300 词已有新稿）。
若粗略把每词的“改写”和“交叉复核”各算一份工作，完成 3,900 / 13,824 份，
约 **28.2%**；剩余 9,924 份。这是工作量，不是工时或正确率估计。
另有既往修订与本次人工修正使内容字段完整的词数达到 1,468；不能把它当成本轮复核完成数。

### 9 月 29 日：一致性修复

- **复核目录与文档不一致**：9 月 24 日 A003、B005、C007、C008 四批（作者均为 `root`，
  复核者为 `review_a003`、`review_b005`、`/root/review_c007`）被放进了 `vocab-reviewed/`，
  但既没重新构建，也没写进本文档；下次构建会把这 400 词静默合入。按本项目“作者派生的
  子代理不算独立复核”的规则，已把四批移到 `scripts/data/vocab-review-pending/`（构建器与
  覆盖审计都不读取），内容与逐词意见完整保留，处理方式见该目录 README。
- **构建器加闸**：复核者名字形如 `/<作者>/...` 时拒绝合入，并有测试覆盖。
- **可复现构建**：用 SHA-256 与锁定值一致的 ECDICT 源文件重建，除本次人工修正外
  0 个词条变化；已复核的 1,300 词保持不变，覆盖审计中的模型复核数仍为 1,300。
- **普通词错配人名/地名（新增硬性审计规则 `proper_name_sense_mismatch`，现为 0）**：
  原释义把 hunt、foster、mill、curl、crane、barber、villa、piston、weld、seaman、chase、
  peel、grey 解释成同名人物，把 forth、buffalo、tyre 解释成地名；另有 tuna、thorn、wasp、
  donkey、orthodox、dot、north/south/northwest、crown、everlasting、thrift、cosmos、ministry、
  thanksgiving 等选错义项，itself、per、upon、whenever、whereby、fro、whilst、amongst、unless
  残留古旧写法，rabbit、grape、ox、rose、willow 等用生物学名解释。共 72 个词（82 行义项）在
  `adult-vocab-learner-content.csv` 中改写为学习者可读的释义并配例句，中文义原样保留；
  northern、muse、metropolitan、oriental、chase、grey 按最常用词性调整主卡片。
- **新增提示规则**（只报告、不拦截）：`circular_definition` 循环定义候选、
  `taxonomic_definition` 生物学名式释义，便于后续批次定位。
- **释义体例**：约 75% 的释义是“首字母小写、句末无句号”，新批次多为大写开头带句号。
  统一放在页面展示层（`formatDefinition`），不改词库数据，否则会使已复核记录全部失效。
- **仓库卫生**：与本项目无关的 `reports/sql-optimization/` 已加入 `.gitignore`，文件原样保留。
- 当前 **167 / 167 自动测试通过**；隔离浏览器中连续 20 张成人词卡的 27 条释义均无大写开头或句末句号。

本次恢复后新增 A003/A004/C006，并接入新增复核批次。三个子任务之后再次收到
服务端额度限制（返回可重试时间 14:26），未重复无效重试。主代理随后亲自完成
A004 与 C006 共 200 词的逐条独立复核，留下每词意见；A003 因作者是主代理，
不能自审，仍留在草稿区。草稿不参与生成正式词库。

9 月 22–24 日继续写成 A005–A007、B005–B006、C007，共 600 词新稿；其中 A006
在客户端连接中断前保存 50 词，恢复后接着补齐后 50 词。词性易错的 `either`、`whose`、`likely`、`medical`、
`close`、`produce` 等按名词、动词、形容词等实际用法分别编写，并对特殊读音或
英美差异添加可在卡片显示的提示。A007 补了 `fine`、`sound`、`stock`、`lie` 等多词性；
B006 修正 `ethical` 原来的“民族”错义，并区分 `compound`、`export` 的词性与读音。
C007 修正 `spinal` 的“针的”错义，补 `tablet` 的药片/平板义，并区分 `conserve`、
`intrigue` 的词性及异读。结构检查发现并修复 `TV`、`Roman` 显示拼写与存档 ID 大小写
不同的问题。这 600 词仍待不同作者复核，不计入已复核数量。

草稿检查器增加稳定 rank 顺序和每批词数核对，发现 B003 中 `examination` 与 `organic`
相邻但次序互换；已按原 rank 调整草稿位置，词条内容与存档 ID 未改。

9 月 24 日新增 A008 共 100 个高频词草稿。纠正了 `PM` 的旧英文释义误指尸检，
并按时间缩写、名词缩写及网络动词分开；`benefit` 增加常见“好处/使受益”，
`hang` 以动词悬挂为主，保留固定短语 `get the hang of` 的名词义。
`lay`、`fail` 与 `PM` 的易混词性参考了 Cambridge 词典；这仍是 root 草稿，
未由另一人复核，也未进入正式词库。

随后新增 A009 共 100 词草稿。`cold`、`final`、`expert`、`visit`、`charge`、
`measure` 等把常用多词性拆开；`main`、`contain` 等避开旧库偏离日常用法的
释义。`bit` 的 bite 过去式只作词形提示，不误标为独立动词义项；`particular` 的
名词主要用于复数 particulars，`Mrs` 的称谓使用也加了说明。
这些条目尚未由另一位复核，仍不进入正式词库。

B007 新增 100 词草稿，把 `initiate`、`plain`、`broadcast`、`fly`、`execute` 等
调回常见主词性与常用义；纠正 `recession`、`motive`、`hence` 等旧释义偏离。
对 `trunk` 的象鼻义、`horn` 的动物角搭配再核词典；`herb` 的英美读音提示也
单独标出。B007 同样尚未独立复核，不进入正式词库。

C008 新增 100 个考研词草稿：`litter` 优先垃圾义，`exquisite` 优先精美义，
`scenery` 优先风景义，`cosmos` 优先宇宙义；`hinder` 改回常用动词“妨碍”，
`buffet` 区分自助餐名词和连续冲击动词的异读，`imperative` 保留形容词/名词。
词典核对限于下列明确列出的易混词，不能据此宣称整批已由外部词典逐条核实。

A010 新增 100 个高频词草稿。`goods` 回到“商品/货物”，`none` 回到“没有一个”，
`western` 以方向形容词为主、保留西部片名词，`realise` 优先“意识到/实现”；
`wind` 按风名词与缠绕动词分开读音，`shot` 保留射击/尝试/照片/注射/小杯烈酒，
但 shoot 的过去式只作词形提示。`customer` 改为“顾客/客户”，不再与 consumer
混同。草稿尚待交叉复核，不进入正式页面。

**未提交 Git，未发布 Pages。** 用户要求全库完成后再提交；保持 v29 发布标记，
不把阶段性更新说成全量完成。未触碰用户的 `reports/sql-optimization/`。

### 本轮实质修订

- 儿童：bus station 不再配路边站牌；desk 不再配椅子；pepper 不再配辣椒；
  square 的广场义不再配几何方形。使用本地 SVG，已在真实浏览器查看渲染。
- 儿童：修正 paint、evening、carry 等词义边界；secret 改到名词分类；
  刀具和开水例句改为大人操作，词条 ID 与学习记录保持不变。
- 成人：常用名动形分别保留；修正 civilian 主次、humiliation 错含谦卑、
  mastery 缺精通、nationality 误当国家、payoff 缺回报等。
- 成人复核发现 roast 不能只限“善意吐槽”，补严厉批评；
  flake out 补英式累倒/睡着，保留美式爽约并注明语境。
- 学习提醒原本在部分稿件顶层 notes 中、构建器不显示。已把需要给学习者看的
  提示移入对应 sense.note，并修复单词性 note 在构建和页面中丢失的问题。
  read、second 的异读、programme 的英式拼写、pants 的英美差异等可见。
- 构词排除 internal 的透明 inter- 拆解、assist 的职业 -ist 误拆，以及
  ideology/terminology 等不符合简单“某某研究”释义的 -ology 通用提示。

词义边界参考：
[Cambridge roast](https://dictionary.cambridge.org/us/dictionary/english/roast?q=to%2Broast)、
[Cambridge flake out](https://dictionary.cambridge.org/us/dictionary/english/flake-out)、
[Cambridge bathe](https://dictionary.cambridge.org/us/dictionary/english/bathe)、
[Merriam-Webster pedal](https://www.merriam-webster.com/dictionary/pedal)。
只有实际核查过的来源才写入记录；其余模型复核不冒充外部证据核验。
本轮易混词核查：[Cambridge PM](https://dictionary.cambridge.org/dictionary/english/pm)、
[lay](https://dictionary.cambridge.org/dictionary/english/lay)、
[bit](https://dictionary.cambridge.org/dictionary/english/bit)、
[particular](https://dictionary.cambridge.org/dictionary/english/particular)、
[Mrs](https://dictionary.cambridge.org/dictionary/english/mrs)、
[trunk](https://dictionary.cambridge.org/dictionary/english/trunk)、
[horn](https://dictionary.cambridge.org/dictionary/english/horn)、
[execute](https://dictionary.cambridge.org/dictionary/english/execute)、
[hence](https://dictionary.cambridge.org/dictionary/english/hence)。
C008 另核对：[Cambridge hinder](https://dictionary.cambridge.org/dictionary/english/hinder)、
[buffet](https://dictionary.cambridge.org/dictionary/english/buffet)、
[relay](https://dictionary.cambridge.org/dictionary/english/relay)、
[imperative](https://dictionary.cambridge.org/dictionary/english/imperative)。
A010 另核对：[Cambridge western](https://dictionary.cambridge.org/dictionary/english/western)、
[nor](https://dictionary.cambridge.org/dictionary/english/nor)、
[none](https://dictionary.cambridge.org/dictionary/english/none)、
[wind](https://dictionary.cambridge.org/dictionary/english/wind)、
[shot](https://dictionary.cambridge.org/dictionary/english/shot)、
[agent](https://dictionary.cambridge.org/dictionary/english/agent)、
[finger](https://dictionary.cambridge.org/dictionary/english/finger)、
[coach](https://dictionary.cambridge.org/dictionary/english/coach)。

### 验证

- 草稿结构和稳定 rank 顺序检查：2,500 词，无已检测的结构错误；不是语义零错误的证明。
- 当前 **165 / 165 自动测试通过**。
- 隔离 Chromium 手机/桌面流程通过：长卡片底部点击、已认识移除/撤销、
  刷新恢复、20 词完整小测、存档失败提示、儿童流程与麦克风拒绝降级。
- 增加浏览器断言：单词性 girl 和多词性 read 的学习提示都能显示。
- 四个新儿童图示已截图检查。不是实体 iPhone/Safari 验证。
- 全库完成后仍需重新构建、复验、提交、推送并核实 Pages 实际版本。

### 儿童修订细节

- `grandson/granddaughter` 补外孙/外孙女；`artist/queen` 补艺术家/王后。
- `moustache` 是上唇的胡子，不限于八字胡；`hop` 包含兔等动物的蹦跳。
- `first floor/second floor` 明确英美差异；`ground floor` 标地面层。
- `pen/bag/lamp/read/tram` 等避免过窄翻译；`bored` 标明是感到无聊。
- 章鱼例句改为 eight arms；将笼统的“鲨鱼很危险”改为道路活动安全例句。
- 低龄例句是可以听、跟读的日常短句，不代表要求启蒙儿童独立阅读。

边界核对参考：[Cambridge: first floor](https://dictionary.cambridge.org/us/dictionary/english/first-floor)、
[ground floor](https://dictionary.cambridge.org/dictionary/english/ground-floor)、
[octopus](https://dictionary.cambridge.org/dictionary/english/octopus)。其他常识性词条的
本轮阅读不冒充已逐条访问外部词典，更不冒充专家审定。

## 验收与台账

- `scripts/audit_vocab_coverage.mjs` 枚举全部词条，成人按每一个现有词性检查学习版释义及例句是否齐全。
- `reports/vocab-coverage.json` 是可重建的逐词清单，包含当前内容哈希、缺少字段与批次。
- 分成 70 个成人批次、5 个儿童批次、1 个 Kiwi 批次。批次只用于组织工作，不代表完成。
- “字段完整”“有独立复核记录”分别统计。没有匹配哈希、证据和不同复核者的记录，不能算独立复核完成。
- `model_semantic_reviewed` 单独统计与当前生成词条完全匹配、来自不同作者/审核者的模型语义复核。
  它不要求伪造逐词外部来源，不等同于 `independently_checked` 的完整外部证据记录。
- 这套机制不会自动判定词义正确，不会给旧数据批量盖章，也不会要求用户选择正确释义。

## 首批新发现并修订

以下是原问题的具体处理，不代表其余词均正确。学习文案为自行编写；现阶段仍保留
`generated` 状态，未冒充已完成另一位复核者的独立审校。

| 词 | 原问题 | 修订 |
|---|---|---|
| treat | 首页义为名词“宴请、款待”，关联词也跟着失准 | 动词补对待、看待、治疗、处理、请客；保留名词乐事/特别享受/请客 |
| treatment | 长技术式解释只讲医疗，未覆盖待遇及处理 | 分明列出治疗、对待方式、处理，补自然例句和搭配 |
| batch | 局限为“一次烘的面包” | 名词改一批/一组/批次，另补常见业务用法的动词 |
| feast | 英文只描述抽象享受，漏了盛宴核心义 | 补盛宴、享受、宗教节日；动词独立例句 |
| reception | 缺日常酒店/办公场景的接待处与信号接收 | 补接待处、反响、招待会、信号接收 |
| entertain | “怀抱”孤立且模糊，英文未解释 | 改使开心、招待、考虑想法，并配搭配 |
| All done! | 只译成“我吃完了” | 改完成/全好了，另标吃饭语境 |

核对来源（非整页复制）：

- [Cambridge: treat](https://dictionary.cambridge.org/dictionary/english/treat)
- [Cambridge: treatment](https://dictionary.cambridge.org/dictionary/english/treatment)
- [Cambridge: batch](https://dictionary.cambridge.org/dictionary/english/batch)
- [Cambridge: feast](https://dictionary.cambridge.org/dictionary/english/feast)
- [Cambridge: reception](https://dictionary.cambridge.org/dictionary/english/reception)
- [Cambridge: entertain](https://dictionary.cambridge.org/dictionary/english/entertain)

## 仍待完成

其余词逐词更新；所有常用多词性的中英文和例句对齐；相互独立的语义复核；
全库回归测试；移动端复验；最终提交与 Pages 验证。已发现的功能词标签边界
（如 its 的限定词分类、as 的介词/连词分离）也在后续复核范围内。
