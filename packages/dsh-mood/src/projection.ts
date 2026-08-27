/**
 * The `mood` session-projection unit: a pure fold of session events into the
 * four-state Mood view the browser reads via `useProjection('mood')`.
 *
 * The fold reuses the pure engine (see `./engine.ts`) — `applyMoodEvent` →
 * {@link initMoodState}, `viewMoodProjection` → the wire payload — so the host
 * projection, the `ctx.mood` service, and the `mood/change` event all derive
 * from ONE fold, with no duplicated logic.
 *
 * @module @deepseek-ai/dsh-mood/projection
 */

import { z } from 'zod'
import type { ProjectionDefinition } from '@deepseek-ai/dsh-session-projection'
import {
  initMoodState,
  applyMoodEvent,
  viewMoodProjection,
  type MoodChange,
  type MoodConfig,
  type MoodProjection,
  type MoodState,
  type Transition,
} from './engine.ts'

const transitionSchema = z.enum(['upgrade', 'recover', 'none'])

const moodSchema = z.enum(['GOOD', 'CONFUSED', 'FRUSTRATED', 'OVERWHELMED'])

/** Validates the `mood` wire payload (the `view` output) before it leaves the host. */
const moodProjectionSchema: z.ZodType<MoodProjection> = z.object({
  mood: moodSchema,
  change: z.object({
    transition: transitionSchema,
    why: z.string().nullable(),
    at: z.number(),
  }).nullable(),
  journey: z.array(moodSchema),
})

export const MOOD_PROJECTION_KEY = 'mood'

/**
 * Build the `mood` projection unit bound to a resolved engine config.
 * @param config - the plugin's resolved mood thresholds.
 * @returns a {@link ProjectionDefinition} over {@link MoodState}.
 */
export function makeMoodProjectionDefinition(config: MoodConfig): ProjectionDefinition<'mood', MoodState> {
  return {
    key: MOOD_PROJECTION_KEY,
    schema: moodProjectionSchema,
    init: initMoodState,
    apply: (state, event) => applyMoodEvent(state, event, config),
    view: viewMoodProjection,
    stateVersion: 1,
  }
}

/** Re-export for consumers that need the schema pieces statically. */
export type { MoodChange, MoodProjection, Transition }
