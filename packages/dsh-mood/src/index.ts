/**
 * Host plugin for `@deepseek-ai/dsh-mood`: a tiny behavioral mood indicator.
 *
 * It ingests the scoped `session/event` append feed, folds tool results into a
 * per-session {@link MoodEngine}, and exposes the current {@link MoodSnapshot}
 * through the `ctx.mood` service plus a scoped `mood/change` event. No model
 * loop, agent, or tool chain is touched — the plugin is an observer only.
 *
 * @module @deepseek-ai/dsh-mood
 */

import type { Context } from '@deepseek-ai/cordis'
import type { Session } from '@deepseek-ai/dsh-session'
import z from '@deepseek-ai/schemastery'
import { MoodEngine, type MoodSnapshot } from './engine.ts'
import { makeMoodProjectionDefinition } from './projection.ts'
import type { MoodService } from './types.ts'

export type { BehaviorObservation, Mood, MoodConfig, MoodEngine, MoodChange, MoodProjection, MoodSnapshot, MoodState, Transition } from './engine.ts'
export { DEFAULT_MOOD_CONFIG, validateMoodConfig, applyMoodEvent, applyMoodState, viewMoodProjection } from './engine.ts'
export type { MoodService } from './types.ts'
export { makeMoodProjectionDefinition, MOOD_PROJECTION_KEY } from './projection.ts'

/** Cordis plugin name. */
export const name = 'mood'

/**
 * Plugin configuration, validated by the same-named schemastery schema.
 * Every threshold is a positive integer (validated fail-loud in `apply`).
 */
export interface Config {
  /** Occurrences of the same tool that establish CONFUSED (default 3). */
  confusedRepeatThreshold?: number
  /** Consecutive call failures that establish FRUSTRATED (default 3). */
  frustratedFailureThreshold?: number
  /** Minimum distinct abnormal signals for OVERWHELMED (default 3). */
  overwhelmedSignalCount?: number
  /** Milliseconds during which a repeated mood change does not re-surface (default 60_000). */
  changeCooldownMs?: number
  /** Consecutive successful tool results required to return to GOOD (default 2). */
  stableSuccessesToRecover?: number
  /** Maximum journey length before oldest entries are dropped (default 8). */
  journeyMaxLength?: number
  /** Number of recent tool calls retained for repetition detection (default 12). */
  repetitionWindow?: number
  /** Minimum tool calls in the window for an activity signal (default 4). */
  highActivityThreshold?: number
}

/** Schemastery config schema; `.default()` guarantees every field after validation. */
export const Config: z<Config> = z.object({
  confusedRepeatThreshold: z.number().default(3),
  frustratedFailureThreshold: z.number().default(3),
  overwhelmedSignalCount: z.number().default(3),
  changeCooldownMs: z.number().default(60_000),
  stableSuccessesToRecover: z.number().default(2),
  journeyMaxLength: z.number().default(8),
  repetitionWindow: z.number().default(12),
  highActivityThreshold: z.number().default(4),
})

declare module '@deepseek-ai/cordis' {
  interface Context {
    mood: MoodService
  }
  interface Events {
    /**
     * Emitted (globally) whenever a session's Mood snapshot visibly changes —
     * an upgrade, a recovery, or a new abnormal reason after the cooldown.
     * Consumers filter by the session they care about; the client status light
     * normally reads `session/event` + `ctx.mood.snapshot` instead.
     * @param session - the session whose Mood changed.
     * @param snapshot - the new snapshot, including the `why` and transition.
     */
    'mood/change'(session: Session, snapshot: MoodSnapshot): void
  }
}

/**
 * Install the plugin: map tools to their results (tool/call names the tool,
 * tool/result reports success/failure), feed the per-session engine, and expose
 * the snapshot service.
 * @param ctx - plugin context; listeners and service are scoped to it.
 * @param config - parsed plugin config.
 */
export function apply(ctx: Context, config: Config): void {
  const resolvedConfig: import('./engine.ts').MoodConfig = {
    confusedRepeatThreshold: config.confusedRepeatThreshold as number,
    frustratedFailureThreshold: config.frustratedFailureThreshold as number,
    overwhelmedSignalCount: config.overwhelmedSignalCount as number,
    changeCooldownMs: config.changeCooldownMs as number,
    stableSuccessesToRecover: config.stableSuccessesToRecover as number,
    journeyMaxLength: config.journeyMaxLength as number,
    repetitionWindow: config.repetitionWindow as number,
    highActivityThreshold: config.highActivityThreshold as number,
  }

  // The browser reads the mood state through the `mood` session projection,
  // which folds the same session events with the same pure functions. The
  // projection unit activates only when a projection registry is composed
  // (headless assemblies stay unaffected).
  ctx.inject(['sessionProjections'], (projectionCtx) => {
    projectionCtx.sessionProjections.register(makeMoodProjectionDefinition(resolvedConfig))
  })

  const engines = new WeakMap<Session, MoodEngine>()
  // The tool/call name per callId, reconciled against tool/result so the result
  // carries the real tool name (the result message itself does not).
  const callNames = new WeakMap<Session, Map<string, string>>()

  const engineFor = (session: Session): MoodEngine => {
    let engine = engines.get(session)
    if (engine === undefined) {
      engine = new MoodEngine(resolvedConfig)
      engines.set(session, engine)
    }
    return engine
  }

  ctx.on('session/event', (session, event) => {
    const namesForSession = callNames.get(session) ?? new Map<string, string>()
    if (event.type === 'tool/call') {
      namesForSession.set(event.data.callId, event.data.name)
      callNames.set(session, namesForSession)
      return
    }
    if (event.type !== 'tool/result') return
    const tool = namesForSession.get(event.data.message.source.callId) ?? 'tool'
    const block = event.data.message.content[0]
    const error = event.data.error !== undefined || block?.isError === true
    const engine = engineFor(session)
    const snapshot = engine.observe({ kind: 'tool', tool, error })
    if (snapshot.transition !== 'none' || snapshot.why !== undefined) {
      ctx.emit('mood/change', session, snapshot)
    }
  })

  ctx.provide('mood', {
    snapshot(session: Session): MoodSnapshot {
      const engine = engines.get(session)
      if (engine === undefined) return { mood: 'GOOD', why: undefined, transition: 'none', journey: ['GOOD'], at: Date.now() }
      return engine.snapshot()
    },
    state(session: Session): import('./engine.ts').MoodState | undefined {
      const engine = engines.get(session)
      return engine?.stateSnapshot()
    },
  } satisfies MoodService)
}
