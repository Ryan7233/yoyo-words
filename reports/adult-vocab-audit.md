# 成人词库主词性与释义审计

本报告对全部成人词库词条做结构化扫描，并对高风险首义与多词性词作显式人工校正；它不是把 6,912 个中文义逐条人工重译。主词性证据来自 SUBTLEX-UK 影视字幕语料，中文候选义来自 ECDICT。语料只用于发现风险，不把统计结果直接当成词典结论。

## 结果摘要

- 总词条：6,912
- 匹配 SUBTLEX-UK 词形：6,869
- 其中有名词/动词/形容词/副词主词性证据：6,492
- 未匹配词形、需其他来源复核：43
- 已确认并修正：52
- 原主词性冲突候选：460
- 其中来源词性在语料中仍可见：211
- 其中来源词性语料证据较少：249
- 语料筛出的现代常用多词性候选：2,384 条，覆盖 1,166 个词
- 成品多词性卡片：1,196 个（三词性及以上 77 个）
- 其中考研路线：928 个（三词性及以上 57 个）
- 显式人工维护的高风险多词性/首义词：93 个
- 主词性冲突候选阈值：主词性至少 3 次，且占全部内容词性至少 65%
- 多词性候选阈值：每个词性至少出现 20 次，且占内容词性至少 1%

完整诊断明细见 `adult-vocab-pos-candidates.csv`。其中 `resolved_multi` 和 `resolved_primary` 是历史状态名，只表示语料风险分组，不再直接决定成品词卡的主词性或删除义项；构建器只自动读取全词库多词性候选，并由显式人工覆盖确定高风险词的核心释义。

## 已确认修正

| 单词 | 原卡片 | 修正后 | 语料主词性（占比） |
|---|---|---|---|
| exploit | n. 功绩、勋绩 | v. 利用、开发、剥削 | v. (100.0%) |
| incorporate | adj. 合并的、组成公司的、一体化的 | v. 包含、合并、使并入 | v. (100.0%) |
| indispensable | n. 不可缺少之物 | adj. 不可缺少的、必不可少的 | adj. (100.0%) |
| retire | n. 隐居 | v. 退休、退役、退出 | v. (100.0%) |
| revise | n. 校订、修正、改样 | v. 修改、修订、复习 | v. (100.0%) |
| rotate | adj. 辐状的 | v. 旋转、转动、轮换 | v. (100.0%) |
| safeguard | n. 保卫、保护措施、防护设施 | v. 保护、保卫 | v. (100.0%) |
| sometime | adj. 以前的、某一时间的 | adv. 某个时候、改天 | adv. (100.0%) |
| wring | n. 扭绞、拧、挤 | v. 拧、绞、扭 | v. (100.0%) |
| many | n. 多数、多数人 | adj. 许多的、许多 | adj. (99.9%) |
| substantial | n. 重要材料(或事物)、有实际价值的东西 | adj. 大量的、实质的、重要的 | adj. (99.9%) |
| dependent | n. 依赖他人者 | adj. 依赖的、取决于…的 | adj. (99.8%) |
| disrupt | adj. 分裂的、中断的 | v. 扰乱、使中断、破坏 | v. (99.8%) |
| meanwhile | n. 其时、其间 | adv. 同时、在此期间 | adv. (99.8%) |
| entire | n. 整个、全部 | adj. 全部的、整个的 | adj. (99.7%) |
| melt | n. 熔化、熔化物、溶解 | v. 融化、熔化 | v. (99.7%) |
| normal | n. 常态、标准、正常 | adj. 正常的、通常的 | adj. (99.7%) |
| nowadays | n. 现在、现时、当今 | adv. 现今、如今 | adv. (99.6%) |
| reject | n. 被拒之人、被弃之物、不合格品 | v. 拒绝、驳回、摒弃 | v. (99.6%) |
| cancel | n. 取消、撤消、盖销(邮票) | v. 取消、撤销 | v. (99.4%) |
| wipe | n. 擦拭、用力打、凸轮 | v. 擦、擦去 | v. (99.3%) |
| elect | n. 当选人、被选的人 | v. 选举、选择 | v. (99.2%) |
| mediate | adj. 居间的、间接的 | v. 调停、调解 | v. (98.9%) |
| retard | n. 阻止、延迟 | v. 延缓、妨碍、使减速 | v. (98.8%) |
| invalid | n. 病人、残废者 | adj. 无效的、不合法的 | adj. (98.4%) |
| shrink | n. 收缩、萎缩、回避 | v. 收缩、缩小、退缩 | v. (98.3%) |
| secular | n. 修道院外的教士 | adj. 世俗的、非宗教的 | adj. (98.2%) |
| westward | n. 朝西的方向 | adv. 向西、朝西 | adv. (98.2%) |
| superficial | n. 表面、外表 | adj. 表面的、肤浅的 | adj. (98.0%) |
| edible | n. 食品、食物 | adj. 可食用的 | adj. (97.5%) |
| hopeful | n. 有希望之人、有前途之人 | adj. 有希望的、乐观的 | adj. (97.1%) |
| prerequisite | adj. 先决条件的、必要的 | n. 先决条件、必备条件 | n. (97.1%) |
| headlong | adj. 头向前的、仓猝而用力的、轻率的 | adv. 头朝前地、猛然地 | adv. (96.6%) |
| streamline | n. 流线、流线型 | v. 使精简、使效率更高 | v. (95.5%) |
| scoff | n. 嘲笑、愚弄、笑柄 | v. 嘲笑、嘲弄 | v. (95.4%) |
| lateral | n. 侧部、支线、边音 | adj. 侧面的、横向的 | adj. (94.7%) |
| seaside | adj. 海边的、海滨的 | n. 海滨、海边 | n. (93.9%) |
| eastward | n. 朝东方向 | adv. 向东、朝东 | adv. (93.8%) |
| mortal | n. 生物、人类 | adj. 终有一死的、致命的 | adj. (93.5%) |
| quiet | n. 安静、闲适、平静 | adj. 安静的、平静的 | adj. (93.2%) |
| try | n. 尝试、试验、审理 | v. 尝试、试用、努力 | v. (91.0%) |
| random | n. 随意、随机 | adj. 随机的、任意的 | adj. (90.9%) |
| automatic | n. 自动手枪、自动机械 | adj. 自动的、无意识的 | adj. (90.5%) |
| hurt | n. 伤害、创伤、损害 | v. 伤害、使疼痛 | v. (88.2%) |
| minor | n. 未成年人、副修科目 | adj. 较小的、次要的 | adj. (85.6%) |
| sudden | n. 突然、忽然 | adj. 突然的、意外的 | adj. (85.0%) |
| pour | n. 流出、倾泻、骤雨 | v. 倒、倾泻、涌出 | v. (82.4%) |
| revolutionary | n. 革命者、革命党人 | adj. 革命性的、突破性的 | adj. (81.5%) |
| shatter | n. 碎片、粉碎、落叶 | v. 打碎、粉碎、使破灭 | v. (81.4%) |
| opaque | n. 不透明物 | adj. 不透明的、难理解的 | adj. (80.7%) |
| resolute | n. 果断的人 | adj. 坚定的、坚决的 | adj. (72.2%) |
| invert | adj. 转化的 | v. 使倒置、使颠倒、反转 | v. (59.4%) |

## 多词性处理规则

- 对全部词条逐词性扫描：同一词至少有两个词性分别出现 20 次且占比至少 1%，才进入多词性候选表。
- SUBTLEX-UK 只用于发现和排序风险，不自动覆盖主释义，也不单独作为删除某个词性的依据。
- `relative`、`civilian`、`tender`、异读词等高风险词使用显式人工覆盖。
- `invalid` 的过时名词义、`stale` 的古旧名词义以及冒犯性称谓不保留。
- 卡片分行显示多词性；小测只使用第一条现代核心义，避免答案过长。

## 未匹配词

`accessary`, `anemia`, `catalog`, `centralize`, `characterize`, `cigaret`, `civilize`, `dissatisfy`, `dramatize`, `dully`, `endeavor`, `equipe`, `first-rate`, `generalization`, `generalize`, `glamor`, `humor`, `industrialize`, `living-room`, `maltreat`, `modernization`, `neighbor`, `normalization`, `odor`, `optimize`, `oxidize`, `paralyze`, `protend`, `publicize`, `reflexion`, `rumor`, `seminate`, `sitting-room`, `skeptical`, `standardize`, `subsidize`, `systematical`, `thriftless`, `utilization`, `vigor`, `vitamine`, `waggon`, `workpiece`

## 数据来源

- [ECDICT（MIT License）](https://github.com/skywind3000/ECDICT)：项目生成器记录的固定源文件 SHA-256。
- [SUBTLEX-UK](https://psychology.nottingham.ac.uk/subtlex-uk/)：[van Heuven et al. (2014)](https://doi.org/10.1080/17470218.2013.850521)，British English word frequencies based on subtitles；审计使用其 DomPoS、DomPoSFreq 与 AllPoSFreq 字段。
- [Merriam-Webster Dictionary](https://www.merriam-webster.com/)：用于复核 `invalid`、`render`、`steer`、`tan`、`pale`、`mute` 等高风险现代义项，不作为批量词库来源。
