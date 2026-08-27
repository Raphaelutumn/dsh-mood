## What does this change?

<!-- A clear, concise summary of the behavior change (Mood, threshold, signal, UI). -->

## Behavior + tests

- [ ] New signal / threshold has a test in the DeepSeek Harness monorepo test matrix (host `packages/mood/mood/tests`, client `packages/client/mood/tests`)
- [ ] `MoodState` fold stays pure (`event → MoodState → MoodProjection`)
- [ ] Mood stays an interpretable behavior classification (no "measures psychology" claims)
- [ ] README.zh.md and README.md updated in sync

## Verification

- [ ] `corepack pnpm test`
- [ ] `corepack pnpm typecheck`
- [ ] `corepack pnpm build`
- [ ] `lib/` re-synced from the monorepo build if host/client code changed

<!-- Paste relevant test output or a short before/after, if useful. -->
