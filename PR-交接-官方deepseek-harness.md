# dsh-mood → DeepSeek Harness 官方 PR 交接

本文件是让 dsh-mood 作为社区贡献进入官方 `deepseek-ai/deepseek-harness` 的**就绪交接单**。所有内容已备好并验证，只差一个"创建 PR"的权限动作。

## 现状（已就绪、已验证）

- 已 fork：`Raphaelutumn/deepseek-harness`
- **分支已推**：`feat/dsh-mood` @ commit `0545c36`（干净，23 文件 / +1495 行，只含宿主 dsh-mood + 注册 + Agent Note）
- 宿主包 `packages/mood/mood` 已适配**最新官方 master** 的 `ProjectionDefinition` API（`stateSchema` + 可选 `wire`，`satisfies` 保留具体类型）。
- **验证全绿**：`tsc` 干净 · vitest **22/22** · oxlint **0 错误** · README/invariant/model-experience 门禁（248 包）conform。
- Agent Note（官方要求，双语）：`.agents/notes/implemented/feature/2026-08-27-dsh-mood.{md,zh.md}`。

## 为什么需要你手动提 PR

我用本机 token 尝试跨 fork PR：
```sh
gh pr create --repo deepseek-ai/deepseek-harness --head Raphaelutumn:feat/dsh-mood --base master
```
被 GitHub 拒绝：`Raphaelutumn does not have the correct permissions to execute CreatePullRequest`。这不是代码问题，是该认证对该官方仓库的 PR 创建权限被拒（`push=false`）。我在当前认证边界内无法越界，也不应伪造。

## 你要做的（任选其一，约 30 秒）

**方式 A — 浏览器：**
打开下面的链接（把 `Raphaelutumn:feat/dsh-mood` 作为 head 提到官方 master）：
```
https://github.com/deepseek-ai/deepseek-harness/pull/new/master...Raphaelutumn:feat/dsh-mood
```
标题与正文见下方，直接粘贴提交。

**方式 B — CLI（用有权限的 token）：**
```sh
gh pr create --repo deepseek-ai/deepseek-harness \
  --head Raphaelutumn:feat/dsh-mood --base master \
  --title "feat(mood): add dsh-mood behavioral mood indicator" \
  --body-file PR-body.md
```

## 直接可粘贴的 PR 内容

### Title
`feat(mood): add dsh-mood behavioral mood indicator`

### Body
```markdown
Host-side **dsh-mood**: a behavioral mood indicator for DeepSeek Harness. It folds session events into a four-state Mood (GOOD / CONFUSED / FRUSTRATED / OVERWHELMED) via a pure fold `session/event -> MoodState -> MoodProjection`, exposed as a `mood` session projection plus a `ctx.mood` service.

- Pure observer (no prompt, no tool veto, no model context)
- Interpretable behavior classification; fixed reasons from observed signals
- Anti-flash: immediate upgrades, conservative recovery, cooldown-suppressed repeats
- Config-tunable thresholds that fail loud when invalid

`packages/mood/mood`: engine, projection unit, plugin, types, invariant, tests (22 green). Registered in `dsh-base`, tsconfig base/host, README, model-experience gate. Agent Note in `.agents/notes/implemented/feature/2026-08-27-dsh-mood` (bilingual).

Verified: tsc clean; vitest 22/22; oxlint 0 errors; README/invariant gates conform.
```

## 备注符合官方仓库的贡献预期

- 只提**宿主**包（客户端状态灯因官方客户端体系已重构、需按新 API 适配，作为后续单独 PR）。
- 已附 Agent Note；未伪造 commit / CI 结果 / 收录。

## 若官方审核打回

把审核意见贴给 dsh-mood 助手，我会照单调整（分支已可 `git push --force-with-lease` 更新）。
