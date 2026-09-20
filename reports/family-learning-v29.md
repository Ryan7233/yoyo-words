# 家庭英语学习 v29：修订与验证记录

本轮修订针对代码核查发现的问题，不代表 6,912 个词已经逐条完成专业词典审校。

## 1. 词库改动

- 使用与原项目相同的 ECDICT 源文件重建，SHA-256：`1a6947e04785db63613a92e14903cdae7954f7e84860b10e68e5c7cbb3f9c3cf`。
- 6,912 个词的 ID 均保留，不重新分配 ID，避免破坏历史学习记录。
- 生成器查找 `word + pos` 时不再退回该词的主词性；找不到对应内容就保留原义，绝不复制另一词性的中英文。
- 本轮 122 个词条有数据变化，含释义、词性、例句、音标及关联词更新，并非 122 个词原来全部有错。
- 有例句的词从 190 增至 199；新增了多条次要词性的独立例句，因此这两个数字不是例句总条数。
- 专属关联词覆盖从 2 个词增至 75 个。采用明确列出的派生关系，不做简单字符串前缀匹配；通用词缀例词仍单列为“同构词例词”。

### 42 个跨词性复制候选的处理范围

```text
more first only back call high mean help turn start right play run set
change best lead watch centre sure open fall cut reach raise care hard
else pass major better pull free drive break pick fail blue green yellow
sponge resolute
```

原扫描涉及 51 个次要词性条目。逐词补充对应词性的中英文与例句，或纠正不适合学习者的标签。最终全量检查中，“不同词性同时复制相同中英文”的模式为 0；这是特定模式的计数，不是全部词义正确率。

| 代表问题 | 本轮处理 |
|---|---|
| mean 的名词/形容词被动词义覆盖 | 恢复平均数、刻薄/吝啬/平均的等对应义和独立例句 |
| right 的名词/副词被形容词义覆盖 | 分别保留权利/右侧，向右/正确地/正好等 |
| back、fall 等名词使用动词解释 | 恢复背部、跌落/下降/美式秋天等 |
| ordinary 形容词解释成遗嘱法院法官 | 改为普通、平常的学习者解释 |
| album 中文与英文义不一致 | 音乐专辑、相册/集邮册，配对应解释 |
| moreover 混入两段引号残句 | 重写完整连接副词解释与例句 |
| dog、silver、question、government 解释不适合学习者 | 改写为简短解释，补例句和搭配 |
| quote 名词使用动词式解释 | 分开引用/报价的名词和动词用法 |
| severe 缺少严重/剧烈这一核心义 | 补齐并使用 severe damage 例句 |
| exploit 主词性改动后音标仍是名词重音 | 动词 /ɪkˈsplɔɪt/，名词 /ˈeksplɔɪt/ 分开 |
| resolute 生僻名词混入常用学习卡 | 只保留现代学习常用形容词，不全局删除其他词的常用多词性 |
| more、else、centre 的标签 | more 分副词/限定词/代词；else 保留副词；centre 保留名词/动词 |
| lead 同形名词不同发音 | 标注领先/线索与金属铅的读音差别 |

词性与义项核对参考（释义和例句是项目自行编写的学习文案，不是批量复制词典）：

- [Cambridge: mean](https://dictionary.cambridge.org/dictionary/english/mean)
- [Cambridge: ordinary](https://dictionary.cambridge.org/dictionary/english/ordinary)
- [Cambridge: album](https://dictionary.cambridge.org/us/dictionary/english/album)
- [Cambridge: more](https://dictionary.cambridge.org/grammar/british-grammar/more)
- [Oxford: else](https://www.oxfordlearnersdictionaries.com/definition/english/else)
- [Cambridge: centre](https://dictionary.cambridge.org/us/dictionary/english/centre)

### 仍然存在的内容边界

- 本轮没有把全库全部重写成学习者词典。大多数词的英文仍来自原始词典。
- 原始词典英文在卡片中折叠为“词典参考解释（未逐条语义审校）”，避免和学习版解释混淆；没有删除原始内容。
- 新增内容仍标记为 `generated`，不把模型自行检查冒充独立人工审校。
- 自动审计现在同时扫描已有英文的次要义项；没有英文的次要义项不冒充通过英英审查。
- 复核候选与难度启发式仍见 `adult-definition-audit.md` 和 CSV；规则未命中不能证明语义正确。词卡提供联网权威词典入口，不要求用户承担词义修订工作。

## 2. 学习与记忆规则

- 首次答对可升一级；之后需到期且距上次升级至少 24 小时才升级。同轮/同日重复练习仍记次数，但不重复升级，也不推迟原复习日。
- 已有旧版记忆等级、星星、贴纸、移出记录不清空；旧成绩不是按新规则重新认证。
- 新看过的成人词建立首次复习日期，不算答对或掌握；旧 `seen` 但无进度的成人词也补入复习。
- 到期词、新词、未到期词三组内部各自轮换；近期去重不再把到期弱词挤到新词后面。
- 按认义、拼写、组句、开口、动作分别记录练习次数。开口自评和动作自评不提升记忆等级，不当成能力评分。

## 3. 成人流程

- 每条路线每天固定最多 20 个词，保存队列、当前词、学习/小测阶段和已测 ID。
- 看完后按最多 10 题分批小测，20 个词全部覆盖；中途退出、刷新后继续未完成批次。
- 标记认识后不补新词回填当天队列；保留直接撤销及首页已认识词恢复入口。
- 卡片首先呈现主要义项；其他常用词性与构词资料使用原生可展开区域，键盘也能操作。
- 发音按钮独立，不再把整个长卡片做成一个按钮；保留固定翻页导航，增大次要词性的英英/例句文字。
- 保存失败显示明确警告，不静默声称保存成功。仍是本机存储，不是自动云同步。

## 4. 儿童流程

- Yoyo 主入口为最多 2 个新词、3 个已学词的短练习：听词义 → 小测 → 生活/绘本表达任务。其他原有模式保留。
- Kiwi 保留两新词的重复听音练习，但不在同一轮自动成为“已经听懂”；结束时可去指认、说词或做真实动作。
- 主结算页优先给“离开屏幕，用一用”，允许今天先结束，不要求继续刷关。
- 跟读文案明确浏览器识别不是发音评分；即使有 API 但麦克风拒绝，也能用自评继续。
- grandma/grandpa/grandparents 补外祖父母；cousin 补堂亲；aunt/uncle 不再限制为父系或母系的一种关系。

## 5. 验证方式

- `npm test`：包括生成器精确词性匹配、语义回归样例、次要义项扫描、间隔升级、队列全覆盖、持久化/备份兼容、服务端和 PWA 边界。
- `python3 scripts/build_adult_vocab.py /path/to/ecdict.csv` 后运行 `python3 scripts/audit_adult_definitions.py`，验证可重建数据及报告哈希。
- `tests/browser-learning.mjs`：真实 Chromium 浏览器，390×844 触控视口和 1280×900 桌面视口；连续翻页、长卡底部点击、移出/撤销、刷新续学、20 词分批全测、保存失败、麦克风拒绝和儿童结束任务。
- 这不是实体 iPhone/Safari 测试；实际 iOS 语音可用性仍由设备与浏览器决定。

本地验收结果：153 项自动测试全部通过；上述 Chromium 手机/桌面浏览器场景全部通过，无页面运行时错误。发布状态以 GitHub 和线上版本实际核验为准。
