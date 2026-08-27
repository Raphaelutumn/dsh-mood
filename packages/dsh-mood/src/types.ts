/**
 * Shared type surface for `@deepseek-ai/dsh-mood`.
 *
 * These types travel between the host side (engine + plugin) and any consumer —
 * the client status light reads the `mood` projection view via `useProjection`,
 * and the `ctx.mood` service / `mood/change` event carry the same JSON shape.
 * The `mood` key of `SessionProjectionMap` is declared here (its one home).
 *
 * @module @deepseek-ai/dsh-mood/types
 */

import type { Session } from '@deepseek-ai/dsh-session'
import type { MoodProjection, MoodSnapshot, MoodState } from './engine.ts'

export type {
  BehaviorObservation,
  Mood,
  MoodChange,
  MoodConfig,
  MoodCounters,
  MoodProjection,
  MoodSnapshot,
  MoodState,
  Transition,
} from './engine.ts'

// Marks this file a module so the declaration below AUGMENTS the projection
// table instead of declaring an ambient module.
export {}

declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionMap {
    /** Four-state behavioral mood and its change hint; see {@link MoodProjection}. */
    mood: MoodProjection
  }
}

/** The service exposed as `ctx.mood`; CLI/headless consumers read through it. */
export interface MoodService {
  /** The latest {@link MoodSnapshot} for a session (untracked sessions default to GOOD). */
  snapshot(session: Session): MoodSnapshot
  /** The latest fold {@link MoodState} for a session, or `undefined` when untracked. */
  state(session: Session): MoodState | undefined
}
