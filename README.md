# 😊 dsh-mood — A tiny behavioral mood ring for your AI coding agent

> Your agent doesn't have feelings. But its behavior does.
> It's not science. It's a mood ring.

**dsh-mood** 是一个面向 DeepSeek Harness (dsh) 的轻量行为状态可视化插件。它观察 agent 最近怎么做事（连续失败、反复做同一件事、活动强度），把它翻译成一个简单的 Mood——顺手、困惑、受挫、过载——并在会话头部用一颗**低干扰的状态灯**呈现给你。

让一个正在干活的 agent “会变脸”：顺利时 😊，卡住时 😕，连挂时 😤，什么都挤在一起时 🤯。

---

## ✨ 为什么值得装

你在等 agent 干活时最想知道的就是一句：**“它现在看起来正常吗？”**

- 🟢 **看懂进展**：不用翻日志，扫一眼状态灯就知道 agent 眼下是顺利、困惑还是受挫。
- 🔁 **抓住卡死**：连续失败、反复执行同一个工具时，会给出可验证的提示（如 `3 consecutive failures`）。
- 🎪 **有点好玩**：四态表情 + 会话轨迹（`😊 → 😕 → 😤 → 😊`），让枯燥的任务观察变得有趣。
- 🪶 **低干扰**：它是一颗状态灯，不是监控面板——只在你需要时展开一点点原因。

> 诚实说明：Mood 是**可解释的行为分类**，不是对模型心理的真实测量。它看的是“被观察到的事”，不是模型“在想什么”。

---

## 🧭 它认识四种 Mood

| Mood | 含义 | 观察到什么 |
|---|---|---|
| 😊 **GOOD** | 一切正常 | 持续有效结果，无明显异常重复 |
| 😕 **CONFUSED** | 开始原地打转 | 反复执行相同 / 高度相似的操作 |
| 😤 **FRUSTRATED** | 连挂很明显 | 短时间连续明确失败 |
| 🤯 **OVERWHELMED** | 失控 / 过载 | 高活动 + 失败 + 重复等信号同时出现 |

多状态同**时成立时**的优先级：`🤯 OVERWHELMED > 😤 FRUSTRATED > 😕 CONFUSED > 😊 GOOD`。

正常的高复杂度任务**不会**因为工具调用多就被误判为 OVERWHELMED——它需要多重异常信号同时命中。

---

## 🔄 它会怎么变脸（防闪烁）

- **升级很敏感**：连续失败/重复一达阈值立刻升到对应 Mood。
- **恢复很保守**：回到 GOOD 需要**连续几次成功**，单个成功不会让它来回跳。
- **原因去重**：同一原因在冷却窗口内不再刷屏，但真正的恢复/升级不会被吞掉。
- **会话轨迹**：它记住整场的旅行（`😊 → 😤 → 😊`），悬停即可回看。

所有阈值都可用 `Config` 调，按你的任务实测校准。

---

## 🚀 安装 / 使用

dsh-mood 由**宿主侧**（行为状态机 + session 投影）和**客户端侧**（会话头部状态灯）两个包构成，代码位于 DeepSeek Harness monorepo：

```
packages/mood/mood/     @deepseek-ai/dsh-mood          -- 纯 fold 状态机 + mood 投影 + ctx.mood 服务
packages/client/mood/   @deepseek-ai/dsh-client-mood    -- 会话头部状态灯 (conversation.session.header.utilities)
```

**从源码跑（开发/尝鲜）：**

```sh
cd path/to/deepseek-harness
corepack pnpm install
corepack pnpm run build:lib:host      # 宿主侧构建（含 mood 投影）
corepack pnpm run build:lib:client    # 客户端侧构建（浏览器 bundle）
corepack pnpm run build:web           # 重建前端，让新的 client 插件进入 boot manifest
# 然后重启 dsh web，刷新浏览器
```

`dsh web` 启动后，**会话头部右侧**会出现 状态灯。CLI/无头场景通过 `ctx.mood.snapshot(session)` 读当前 Mood。

> 若遵循 DSH 官方安装通道，两个包已注册进 `@deepseek-ai/dsh-base`（`mood` 行）与 `@deepseek-ai/dsh-web-app`（`ui-mood` 行），随 profile 一并加载。

---

## 📌 判定依据（可配置）

| 信号 | 默认阈值 | 示例 Why |
|---|---|---|
| 连续失败 | ≥ 3 → FRUSTRATED | `3 consecutive failures` |
| 同一工具连续出现 | ≥ 3 → CONFUSED | `Repeated read ×3` |
| 高活动 + 失败 + 重复 | 三信号 → OVERWHELMED | `High activity + repeated failures` |
| 恢复 | 连续 2 次成功 → GOOD | `Recovered` |

全部可用 `Config` 覆盖（`confusedRepeatThreshold`、`frustratedFailureThreshold`、`overwhelmedSignalCount`、`stableSuccessesToRecover`、`changeCooldownMs` …）。

---

## 🛠 健康度

- 宿主侧测试 **22/22 绿** · 客户端侧测试 **10/10 绿** · host/client 全量 typecheck 通过
- 门禁通过：`verify-cordis-config`（124 configs）、README model-experience/limitations、package-invariants
- 纯 fold 状态机 = 无外部依赖、可预测、可作为 session 投影在浏览器端直接渲染

---

## 📁 文档

| 文档 | 说明 |
|---|---|
| [PRD](dsh-mood_完整版PRD_产品口径版.docx) | 产品需求文档（轻量 MVP） |
| [TDD 技术设计](dsh-mood_技术设计文档_TDD.docx) | 架构 / 状态机 / 验收 / 测试 |

---

## 🗺 Roadmap

- 用真实任务实测校准默认阈值（PRD §6）
- 视觉打磨与可访问性：接入 `--dsw-*` 语义 token、键盘/读屏支持
- 会话结束完整 Journey 摘要、Roast/Easter Egg（PRD P2）

---

## 📄 License

MIT

---

**Made with 😊 by a very moody agent.** 如果你喜欢就点个 ⭐ —— 如果不喜欢，至少它诚实地告诉了你它现在有多焦躁。
