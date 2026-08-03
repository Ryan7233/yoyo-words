# 家庭英语学习 🩷💙🌿

给 Yoyo、Kiwi 和森蝶共用的英语学习 App（PWA）。三个档案各走适合自己的路线，进度互不影响；无需 App Store，iPhone Safari 添加到主屏幕即可像原生 App 一样使用。

## 功能

- **459 词四级梯度**：🌱 萌芽（启蒙 70 词）→ ⭐ Starters（剑桥 Pre-A1，72 词）→ 🚀 Movers（剑桥 A1，**Power Up 2 对齐 241 词**，按 Welcome + Unit 1~9 + 拓展的课本单元学习，可跨级引用）→ 🏆 Flyers（剑桥 A2，76 词），Movers 和 Flyers 每词配例句朗读
- **森蝶成人背词路线**：默认从 CET4 开始，也可切换 ☕ 生活高频（1,800 词）、CET6 和考研；共 **6,912 个词条**（CET4 3,845 / CET6 5,407 / 考研 4,802）。每张词卡同时提供现代常用中文义、简明英英解释和常见词形；约 900 个适合拆解的词还会展示可靠的前缀/词根/后缀与“举一反三”关联词，再做 10 题小测；重叠词只存一份进度，切换路线不用重复从零开始
- **成人记忆计划**：每天优先安排 20 个到期词和新词；词卡可点“我认识”直接移出后续背词、复习和错词计划，并可在“我认识的词”中恢复；完整词表按每 200 个分组，成人测验不参与孩子的星星、毕业帽和贴纸奖励
- **词汇通关机制**：掌握本级 80% 单词解锁“词汇通关挑战”（12 题答对 10 题），通过后发毕业帽 🎓、奖励 ⭐×20、自动进入下一词汇级别；这里表示应用内核心词汇掌握，不等同于 Cambridge 真实考试通过
- **从单词走向表达（姐姐版第一批）**：Unit 1 增加“句型输入 → 情境对话 → 自主说四句话”的 Nature Explorer 综合任务，完成状态自动存档；后续单元按同一结构扩展
- **听说读写四技能**（姐姐版）：👂 听音选词 · 🎙️ **跟读**（语音识别自动打分，不支持时自评）· 🧩 **组句子**（乱序词块拼回例句）· ✍️ **拼一拼**（字母块拼写，对标 Movers 拼写题）；拼一拼/组句子**答错会重做同一题**（先看正确答案再重拼），不直接跳走
- **自然英音系统**：自动优先设备上的高质量英式声音，可试听并固定具体音色；慢读/自然/快读采用保护重音与连读的速度映射，单词、例句和中英文之间加入自然停顿，设置自动保存并进入备份码
- **无字自主学习**（弟弟版）：独立的 24 项家庭听说启蒙内容，按身体动作 / 家人问候 / 吃喝需要 / 玩具指令分组；每日只引入 2 个新声音并搭配复习，首日 6 题只围绕这 2 项重复；初见“英文→中文→英文”，熟悉后撤掉中文支架
- **🌍 我的世界**（仅姐姐）：把"做题"变成"给我的世界加东西"。三种加贴纸方式——**➕ 加一个**（听音找图解锁，复用 SRS 答对）、**📖 贴纸库**（她学过的词都在库里，学得越多能选的越多，点一个直接摆）、**🎧 听指令布置房间**（听 "Put the X next to the Y"，从库里把对的东西拖到场景里目标贴纸旁，放对了表扬 + ⭐×2）；贴纸可自由拖动/放大/缩小/删除，全程自动保存；**8 种环境各有自己独立的一套贴纸和布局**，换背景不会把小动物带过去
- **📕 错题本**：答错的词自动收录、按错误次数排序；专项训练的中间答对不重复送星，练到掌握（3 级盒子）自动移出时一次性奖励 ⭐×3；成人路线同样自动移出，但不参与儿童星星奖励
- **学习存档**：翻卡片自动记住学到第几张（下次接着学）、学过的词有"学过"计数；所有进度实时保存在本机，另支持**备份码导出/恢复**（换手机、清缓存都不怕丢）
- **三人独立档案**：打开先选人，Yoyo 粉色主题 🎀 / Kiwi 蓝色主题 🦖 / 森蝶鼠尾草绿主题 🌷；旧版双档案会自动升级，Yoyo 和 Kiwi 的历史进度完整保留
- **学一学**：翻卡片 + 点卡片听英文发音（iOS 原生语音，无需联网下载），Movers 级朗读单词+例句
- **考一考**：每关 8 题，三种题型（英选中 / 中选英 / 听音选词），干扰项取自同级词库
- **智能闯关**：Leitner 间隔重复算法，优先复习快忘记的词，并用分通道近期词窗口降低连续几轮重复同一个词的概率
- **星星奖励**：答对得星、连击加倍，进度保存在手机本地

## 在电脑上运行

```bash
cd yoyo-words
python3 serve.py        # 默认只允许这台电脑访问
# 浏览器打开 http://localhost:8377
```

> 用 `serve.py`（而不是 `python3 -m http.server`）很重要：它给每个文件都加了
> no-cache 头，并拒绝 `.git` 等隐藏路径和目录列表。浏览器每次都拿最新代码，
> 也不会意外把仓库元数据暴露给访问者。

可用参数：

```bash
python3 serve.py --host 127.0.0.1 --port 9000
python3 serve.py --help
```

## 更新加载不出来？强制更新

代码更新后如果 iPhone / 浏览器还是旧版（Service Worker 缓存卡住）：

- App 内在**选人页**点 **🔄 更新到最新版（清缓存）**——会注销当前 App 的
  Service Worker、清理 `yoyo-words-` 缓存并硬刷新，**不会动学习进度**
  （星星、错题、我的世界都保留），也不会影响同域名下的其他 App；
- 选人页底部有**版本号**（当前 `版本 v28`），可确认是否已更新到最新；
- 正常情况下 App 每次打开会自动检测新版并秒切，一般不需要手动点。

## 在 iPhone 上使用

1. 确保 iPhone 和 Mac 连同一个**可信的私人 Wi-Fi**；
2. Mac 上显式开启局域网监听：

   ```bash
   python3 serve.py --host 0.0.0.0 --port 8377
   ```

3. iPhone Safari 打开 `http://<Mac的IP>:8377`（IP 可在 Mac 的
   系统设置 → Wi-Fi → 详细信息里查看，例如 `http://192.168.1.155:8377`）；
4. 点 Safari 底部**分享按钮 → 添加到主屏幕**；
5. 主屏幕上会出现「英语学习」图标，点开即可使用。

> `--host 0.0.0.0` 会允许同一局域网里的设备连接，只应在可信网络临时使用，
> 用完后按 `Ctrl+C` 关闭。服务器会阻止隐藏文件和目录列表，但局域网 HTTP 本身
> 没有加密，也不是浏览器的安全上下文。

### 局域网 HTTP 与 HTTPS 的功能差异

| 功能 | 电脑 `localhost` | iPhone 局域网 HTTP | HTTPS 托管 |
| --- | --- | --- | --- |
| 学习、答题和本机进度 | ✅ | ✅ | ✅ |
| Service Worker / 离线 PWA | ✅ | ❌ | ✅ |
| 麦克风语音识别 | 视浏览器支持 | ❌，会退回自评 | 视浏览器和系统支持 |
| Mac 是否需要一直开着 | ✅ | ✅ | ❌ |

长期在 iPhone 使用请直接打开已启用 HTTPS 的 GitHub Pages：
<https://ryan7233.github.io/yoyo-words/>。HTTPS 下 Service Worker 才能可靠安装和更新，
离线能力也才能正常工作。

### 麦克风与隐私

跟读功能只会在点击麦克风后请求浏览器权限。本项目没有后端，不会自行上传或保存
录音、识别文本；但浏览器或操作系统提供的语音识别服务可能把音频发送给其服务商
处理，具体取决于设备、浏览器和相关隐私设置。不希望使用时可以拒绝权限并选择自评。

## 运行单元测试

```bash
npm test        # 单元测试 + PWA/本地服务器安全回归测试
```

每次 push 或创建 Pull Request 时，GitHub Actions 也会自动运行同一套测试。

## 成人词库释义审计

成人词库不再只按 ECDICT 的释义行顺序选择主词性。审计脚本会用
[SUBTLEX-UK](https://psychology.nottingham.ac.uk/subtlex-uk/) 的现代字幕语料检查
6,912 个词条的主词性，并把错误首义与应当同时保留的常用多词性分开：

```bash
python3 scripts/audit_adult_vocab.py /path/to/ecdict.csv /path/to/SUBTLEX-UK.txt
```

审计摘要见 [reports/adult-vocab-audit.md](reports/adult-vocab-audit.md)，完整候选明细见
[reports/adult-vocab-pos-candidates.csv](reports/adult-vocab-pos-candidates.csv)。原始
SUBTLEX-UK 数据不进入仓库。

英英释义还有一套不依赖外部语料的确定性扫描，用于发现缩写/同形词错义、
旧式交叉引用、明显残句、循环定义和学习难度候选：

```bash
python3 scripts/audit_adult_definitions.py
```

结果见 [reports/adult-definition-audit.md](reports/adult-definition-audit.md) 和
[reports/adult-definition-top-500.csv](reports/adult-definition-top-500.csv)。
规则未命中不等于语义已经确认；前 500 高频词和长尾分批重建方案见
[docs/ADULT_VOCAB_QUALITY_PLAN.md](docs/ADULT_VOCAB_QUALITY_PLAN.md)。

## 项目结构

```
index.html            应用入口
manifest.webmanifest  PWA 清单（名称/图标/全屏模式）
sw.js                 Service Worker 离线缓存
css/style.css         儿童友好的卡通风格样式 + 悠悠球动画
js/words.js           分级单词库 + Power Up 2 课本单元
js/adult-words.js     生成的成人生活/CET4/CET6/考研词库
js/engine.js          出题 / 判分 / 间隔重复 / 奖励（纯函数）
js/storage.js         localStorage 进度存储（容错降级）
js/app.js             界面与交互
scripts/              成人词库可复现生成脚本（原始大文件不入库）
reports/              成人词库释义审计摘要与候选明细
tests/                node:test 单元测试
docs/REQUIREMENTS.md  需求分析文档
docs/ADULT_VOCAB_QUALITY_PLAN.md 成人词汇质量重建与发布门槛
icons/                粉色悠悠球图标（180/192/512）
THIRD_PARTY_NOTICES.md 第三方数据来源与许可证
```

成人词库由 MIT 许可的 [ECDICT](https://github.com/skywind3000/ECDICT) 生成；具体来源哈希、清洗方式和许可证见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
