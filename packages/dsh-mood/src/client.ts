/**
 * Client-namespace types outlet for `@deepseek-ai/dsh-mood`.
 *
 * The browser half of the mood status light imports ONLY this namespace (repo
 * discipline): it pulls the `mood` {@link SessionProjectionMap} merge the host
 * declared, so `useProjection('mood')` is typed for client consumers. It is a
 * pure re-export of the shared types — zero duplication.
 *
 * @module @deepseek-ai/dsh-mood/client
 */

import type { MoodProjection } from './types.ts'

export type { Mood, MoodChange, MoodProjection, Transition } from './types.ts'
export { MOOD_PROJECTION_KEY } from './projection.ts'

declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionMap {
    /** Four-state behavioral mood and its change hint; see {@link MoodProjection}. */
    mood: MoodProjection
  }
}
