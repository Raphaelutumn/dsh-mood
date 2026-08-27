# dsh-client-mood — client source mirror

This is a **read-only source mirror** of the client half of dsh-mood (the
session-header status light), taken from the DeepSeek Harness monorepo
(`packages/client/mood`).

- `src/client/` — `MoodLight.tsx` + CSS module, the slot registration
  (`index.ts`), and bilingual dictionaries (`locales.ts`).
- `src/index.ts` (empty node half), `src/invariant.ts`.

Mirrored here for review and to carry real, non-generated repo history.

## Build / run status (important, read this)

The browser half depends on the DeepSeek Harness **web client stack**, which on
npm is still at `0.0.1-rc.1` and does not yet expose the APIs this code uses
(the `conversation.session.header.utilities` slot, `useProjection`, and the
`mood` projection key). So this mirror **cannot yet be compiled or installed
standalone** against the public npm packages.

It works inside the DeepSeek Harness monorepo and ships with the default web
profile. The standalone `@dsh-external/dsh-mood` browser bundle (in the repo
root `lib/`) is built from the current monorepo and served by the reference
`dsh` build.

## Sync

```powershell
Copy-Item "D:\Deepseek harness\packages\client\mood\src\*" -Destination ".\src\" -Force
Copy-Item "D:\Deepseek harness\packages\client\mood\src\client\*" -Destination ".\src\client\" -Force
```
