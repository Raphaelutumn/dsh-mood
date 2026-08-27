# Contributing to dsh-mood

Thanks for considering a contribution. This is a small, focused plugin — the
best contributions are ones that keep it small, behavior-driven, and true to
the "a status light, not a dashboard" design.

## Where the code lives

The production code powering dsh-mood lives in the DeepSeek Harness monorepo:

- Host state machine + session projection: `packages/mood/mood`
- Client session-header status light: `packages/client/mood`

This repository (`Raphaelutumn/dsh-mood`) is the installable package + product
homepage. A source mirror lives under `packages/*` here so the repo is
self-contained and CI-verifiable.

## Local development

```powershell
corepack pnpm install
corepack pnpm test      # runs the package's test suite
corepack pnpm typecheck
corepack pnpm build
```

If you are changing the host/client source, develop in the DeepSeek Harness
monorepo (where the full test matrix runs), then sync the built `lib/` here.

## Standards

- Behavior must be test-backed. There are 32 tests total (host 22 + client 10);
  a new signal or threshold change needs a corresponding test.
- Keep the state machine a **pure fold** (`event → MoodState → MoodProjection`).
- Mood stays an **interpretable behavior classification** — never claim it
  "measures" the model's psychology.
- Docs: keep README.zh.md and README.md bilingual and in sync.

## Pull requests

Open a clearly-scoped PR. In the description, state what behavior you changed,
why, and how you verified it. Small, reviewable diffs land much faster than
large rewrites.

## License

By contributing you agree that your contributions are licensed under the
[MIT License](LICENSE).
