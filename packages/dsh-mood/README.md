# dsh-mood — host source mirror

This is a **read-only source mirror** of the host half of dsh-mood, taken from
the DeepSeek Harness monorepo (`packages/mood/mood`).

- `src/` — the pure fold state machine (`engine.ts`), the session `mood`
  projection (`projection.ts`), the plugin (`index.ts`), shared types
  (`types.ts`), the client-namespace types outlet (`client.ts`), and the
  invariant companion (`invariant.ts`).
- `tests/` — the host test suite (22 tests).

It is mirrored here so a reader can review the real source without pulling the
whole monorepo, and so the repo carries real, non-generated history.

## Build / run status (important, read this)

This source targets the **DeepSeek Harness monorepo API surface (`~0.1.0-rc.7`)**.
The packages published on npm for the harness (host and especially the web
client stack) are still at `0.0.1-rc.1` and **do not yet expose the APIs this
code uses** (e.g. the `conversation.session.header.utilities` slot and
`useProjection` are absent from the published client stack). As a result this
mirror **cannot yet be compiled or installed standalone** against the public
npm packages.

Working, integrated versions ship inside the DeepSeek Harness monorepo and load
with the default web profile. Once the public DSH client stack reaches the API
level this code needs, the standalone `@dsh-external/dsh-mood` package can be
built and published.

## Sync

Update this mirror from the monorepo whenever you change the host source:

```powershell
Copy-Item "D:\Deepseek harness\packages\mood\mood\src\*" -Destination ".\src\" -Force
Copy-Item "D:\Deepseek harness\packages\mood\mood\tests\*" -Destination ".\tests\" -Force
```
