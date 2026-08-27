/**
 * Package-owned invariant companion for `@deepseek-ai/dsh-mood`.
 * @module @deepseek-ai/dsh-mood/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantFailure, InvariantInstaller } from '@deepseek-ai/dsh-invariants'
import type { Mood, MoodSnapshot } from './engine.ts'

const PACKAGE_NAME = '@deepseek-ai/dsh-mood'

/** The four valid Mood states. */
const VALID_MOODS: readonly Mood[] = ['GOOD', 'CONFUSED', 'FRUSTRATED', 'OVERWHELMED']

const validMood = (mood: Mood): boolean => VALID_MOODS.includes(mood)

/**
 * Checks the `mood/change` event's payload relation: the snapshot must carry a
 * known Mood, a `recover` transition must land on GOOD, and an `upgrade` must
 * never land on GOOD. A live observer, so it reads the authoritative emit.
 */
const install: InvariantInstaller = (ctx: Context, fail: InvariantFailure) => {
  ctx.on('mood/change', (_session, snapshot) => {
    assertSnapshot(snapshot, fail)
  })
}

function assertSnapshot(snapshot: MoodSnapshot, fail: InvariantFailure): void {
  if (!validMood(snapshot.mood)) {
    fail(`mood/change carried unknown mood ${JSON.stringify(snapshot.mood)}`)
    return
  }
  if (snapshot.transition === 'recover' && snapshot.mood !== 'GOOD') {
    fail(`mood/change transition=recover must land on GOOD, got ${snapshot.mood}`)
  }
  if (snapshot.transition === 'upgrade' && snapshot.mood === 'GOOD') {
    fail('mood/change transition=upgrade cannot land on GOOD')
  }
}

/** Cordis companion plugin name. */
export const name = 'mood-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
/* jscpd:ignore-end */
