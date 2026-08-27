/**
 * Pure Mood engine for `@deepseek-ai/dsh-mood`.
 *
 * The engine folds a stream of behavior observations into a four-state Mood
 * snapshot (GOOD / CONFUSED / FRUSTRATED / OVERWHELMED), a fixed short "why", a
 * transition hint, and a session-level journey. The core is a pure fold over a
 * JSON {@link MoodState} (`applyMoodState` / `applyMoodEvent` → `viewMood`), which
 * is what makes it usable both as a replayable session projection (host folds
 * events; the browser reads the view via `useProjection`) and as a standalone
 * {@link MoodEngine} for scripts and tests.
 *
 * Design contract (rationale in the package README):
 * - Mood is a productized behavior classification, not a measurement of model
 *   psychology. Every "why" is derived from an actually observed signal, and the
 *   templates are fixed strings — no LLM is involved.
 * - Priority when several conditions hold: OVERWHELMED > FRUSTRATED > CONFUSED > GOOD.
 * - Anti-flash: upgrades are immediate, but recovery to GOOD requires a small run
 *   of consecutive positive results, and a repeated reason is suppressed until the
 *   change cooldown elapses.
 * @module @deepseek-ai/dsh-mood/engine
 */

import type { SessionEvent } from '@deepseek-ai/dsh-session'

/** The four product Mood states. */
export type Mood = 'GOOD' | 'CONFUSED' | 'FRUSTRATED' | 'OVERWHELMED'

/** Whether the snapshot moved to a worse, better, or unchanged Mood. */
export type Transition = 'upgrade' | 'recover' | 'none'

/** The engine's tunables; validated by {@link validateMoodConfig}. */
export interface MoodConfig {
  /** Occurrences of the same tool that establish CONFUSED (default 3). */
  confusedRepeatThreshold: number
  /** Consecutive call failures that establish FRUSTRATED (default 3). */
  frustratedFailureThreshold: number
  /** Minimum distinct abnormal signals, each past its threshold, for OVERWHELMED (default 3). */
  overwhelmedSignalCount: number
  /** Milliseconds during which a repeated abnormal reason does not re-surface (default 60_000). */
  changeCooldownMs: number
  /** Consecutive successful tool results required to return to GOOD (default 2). */
  stableSuccessesToRecover: number
  /** Maximum journey length before oldest entries are dropped (default 8). */
  journeyMaxLength: number
  /** Number of recent tool calls retained for repetition detection (default 12). */
  repetitionWindow: number
  /** Minimum tool calls in the window for an activity signal (default 4). */
  highActivityThreshold: number
}

/** Default engine configuration. */
export const DEFAULT_MOOD_CONFIG: MoodConfig = {
  confusedRepeatThreshold: 3,
  frustratedFailureThreshold: 3,
  overwhelmedSignalCount: 3,
  changeCooldownMs: 60_000,
  stableSuccessesToRecover: 2,
  journeyMaxLength: 8,
  repetitionWindow: 12,
  highActivityThreshold: 4,
}

/** A single behavior observation. A tool result is an error when it did error. */
export type BehaviorObservation =
  | { kind: 'tool'; tool: string; error: boolean }
  | { kind: 'activity' }

/** The public, serializable snapshot (also the projection view). */
export interface MoodSnapshot {
  mood: Mood
  /** Fixed short reason, present on an abnormal change or on recovery. */
  why: string | undefined
  transition: Transition
  /** Session-level Mood trajectory (compact, truncated). */
  journey: Mood[]
  /** Wall time (ms) of the observation that produced this snapshot. */
  at: number
}

/** Rolling counters a mood decision reads. */
export interface MoodCounters {
  consecutiveFailures: number
  consecutiveSuccesses: number
  toolCallCount: number
  repeatedTool: { name: string; count: number } | undefined
  abnormalSignals: number
}

const RANK: Record<Mood, number> = { GOOD: 0, CONFUSED: 1, FRUSTRATED: 2, OVERWHELMED: 3 }

/** Product ordering: `b` is worse than `a`. */
function worseThan(a: Mood, b: Mood): boolean {
  return RANK[b] > RANK[a]
}

/** Validate a configuration object fail-loud (every threshold is a positive integer). */
export function validateMoodConfig(config: MoodConfig): MoodConfig {
  const entries: Array<[keyof MoodConfig, number]> = [
    ['confusedRepeatThreshold', config.confusedRepeatThreshold],
    ['frustratedFailureThreshold', config.frustratedFailureThreshold],
    ['overwhelmedSignalCount', config.overwhelmedSignalCount],
    ['changeCooldownMs', config.changeCooldownMs],
    ['stableSuccessesToRecover', config.stableSuccessesToRecover],
    ['journeyMaxLength', config.journeyMaxLength],
    ['repetitionWindow', config.repetitionWindow],
    ['highActivityThreshold', config.highActivityThreshold],
  ]
  for (const [key, value] of entries) {
    if (!Number.isInteger(value) || value < 1) {
      throw new Error(`dsh-mood: invalid ${key} ${value} — must be an integer >= 1`)
    }
  }
  return config
}

/** Trailing consecutive run of the last tool in a retained window; `undefined` when empty. */
function consecutiveRun(tools: readonly string[]): { name: string; count: number } | undefined {
  const last = tools[tools.length - 1]
  if (last === undefined) return undefined
  let count = 0
  for (let i = tools.length - 1; i >= 0; i -= 1) {
    if (tools[i] === last) count += 1
    else break
  }
  return { name: last, count }
}

/** Fixed why text per mood and counters. */
function whyFor(
  config: MoodConfig,
  counters: MoodCounters,
): string | undefined {
  if (counters.consecutiveFailures >= config.frustratedFailureThreshold) {
    return `${counters.consecutiveFailures} consecutive failures`
  }
  if (counters.repeatedTool !== undefined && counters.repeatedTool.count >= config.confusedRepeatThreshold) {
    return `Repeated ${counters.repeatedTool.name} ×${counters.repeatedTool.count}`
  }
  if (counters.abnormalSignals >= config.overwhelmedSignalCount) {
    return 'High activity + repeated failures'
  }
  return undefined
}

/** A single recorded change hint: transition + fixed why at a wall time. */
export interface MoodChange {
  transition: Transition
  why: string | undefined
  at: number
}

/**
 * One session's fold state — plain JSON, so it satisfies the projection-cache
 * precondition and replays deterministically from the committed log.
 */
export interface MoodState {
  consecutiveFailures: number
  consecutiveSuccesses: number
  toolCallCount: number
  recentTools: string[]
  /** tool/call name per callId, reconciled against tool/result so the result carries the real tool name. */
  pendingCalls: Record<string, string>
  /** The most recent recorded change hint, or null before the first change. */
  lastChange: MoodChange | null
  /** Last reported abnormal reason, for the report-cooldown. */
  lastAbnormalWhy: string | undefined
  /** Wall time of `lastAbnormalWhy`. */
  lastAbnormalWhyAt: number
  lastMood: Mood
  journey: Mood[]
}

/** Initial fold state for the empty log. */
export function initMoodState(): MoodState {
  return {
    consecutiveFailures: 0,
    consecutiveSuccesses: 0,
    toolCallCount: 0,
    recentTools: [],
    pendingCalls: {},
    lastChange: null,
    lastAbnormalWhy: undefined,
    lastAbnormalWhyAt: -Infinity,
    lastMood: 'GOOD',
    journey: ['GOOD'],
  }
}

/** The next window snapshot after an observation (owning the repetition trim). */
function nextRecentTools(state: MoodState, obs: BehaviorObservation, config: MoodConfig): string[] {
  if (obs.kind === 'activity') return state.recentTools
  return [...state.recentTools.slice(-(config.repetitionWindow - 1)), obs.tool]
}

/** Fold counters from a state plus an observation. */
function foldCounters(
  state: MoodState,
  obs: BehaviorObservation,
  config: MoodConfig,
): { counters: MoodCounters; recentTools: string[] } {
  const recentTools = nextRecentTools(state, obs, config)
  const repeatedTool = obs.kind === 'tool' ? consecutiveRun(recentTools) : undefined

  const repeatedCondition = repeatedTool !== undefined && repeatedTool.count >= config.confusedRepeatThreshold
  const nextConsecutiveFailures = obs.kind === 'tool' ? (obs.error ? state.consecutiveFailures + 1 : 0) : state.consecutiveFailures
  const failureCondition = nextConsecutiveFailures >= config.frustratedFailureThreshold
  const activityCondition = recentTools.length >= config.highActivityThreshold

  const abnormalSignals = (failureCondition ? 1 : 0) + (repeatedCondition ? 1 : 0) + (activityCondition ? 1 : 0)

  return {
    recentTools,
    counters: {
      consecutiveFailures: nextConsecutiveFailures,
      consecutiveSuccesses: obs.kind === 'tool' ? (obs.error ? 0 : state.consecutiveSuccesses + 1) : state.consecutiveSuccesses,
      toolCallCount: obs.kind === 'tool' ? state.toolCallCount + 1 : state.toolCallCount,
      repeatedTool,
      abnormalSignals,
    },
  }
}

/**
 * Apply one behavior observation at wall time `now`, returning the next state
 * plus the observation-local change hint (present only when this observation
 * caused a Mood change). This is the single fold both the projection and the
 * standalone engine use.
 */
export function applyMoodState(
  prev: MoodState,
  obs: BehaviorObservation,
  now: number,
  config: MoodConfig,
): { next: MoodState; change: MoodChange | null } {
  const { counters, recentTools } = foldCounters(prev, obs, config)

  const desired = decideMood(config, counters)
  const previous = prev.lastMood

  // Anti-flash resolution: from a negative Mood, only a stable success run
  // recovers to GOOD, and only a strictly worse counter outcome upgrades;
  // anything else holds the current Mood so a single success/failure cannot
  // chatter between negatives.
  let target = desired
  if (previous !== 'GOOD') {
    const recoveryMet = counters.consecutiveSuccesses >= config.stableSuccessesToRecover
    if (recoveryMet && desired === 'GOOD') {
      target = 'GOOD'
    } else if (desired === 'GOOD' || !worseThan(previous, desired)) {
      target = previous
    }
  }

  const recovered = target === 'GOOD' && previous !== 'GOOD'
  const upgraded = target !== previous && worseThan(previous, target)
  const changed = target !== previous

  let lastChange = prev.lastChange
  let change: MoodChange | null = null
  let journey = prev.journey
  if (changed) {
    journey = [...journey, target].slice(-config.journeyMaxLength)
    let why: string | undefined
    let transition: Transition = upgraded ? 'upgrade' : (recovered ? 'recover' : 'none')
    if (recovered) {
      why = 'Recovered'
    } else if (upgraded) {
      why = whyFor(config, counters)
      // Report-cooldown: a fresh upgrade whose reason repeats the last reported
      // abnormal reason does not re-surface its why; the transition still fires.
      if (why !== undefined && why === prev.lastAbnormalWhy && now - prev.lastAbnormalWhyAt < config.changeCooldownMs) {
        why = undefined
      }
    }
    change = { transition, why, at: now }
    lastChange = change
  }

  const publishAbnormal = change?.why !== undefined && change.why !== 'Recovered'
  const next: MoodState = {
    consecutiveFailures: counters.consecutiveFailures,
    consecutiveSuccesses: counters.consecutiveSuccesses,
    toolCallCount: counters.toolCallCount,
    recentTools,
    pendingCalls: prev.pendingCalls,
    lastChange,
    lastAbnormalWhy: publishAbnormal ? change?.why : prev.lastAbnormalWhy,
    lastAbnormalWhyAt: publishAbnormal ? now : prev.lastAbnormalWhyAt,
    lastMood: target,
    journey,
  }
  return { next, change }
}

/**
 * Fold one committed session event into the mood state. `tool/call` records the
 * call→name mapping; `tool/result` folds the resolved tool observation; every
 * other event returns the SAME state reference (the projection change gate).
 */
export function applyMoodEvent(state: MoodState, event: SessionEvent, config: MoodConfig): MoodState {
  if (event.type === 'tool/call' && !Object.hasOwn(state.pendingCalls, event.data.callId)) {
    return { ...state, pendingCalls: { ...state.pendingCalls, [event.data.callId]: event.data.name } }
  }
  if (event.type === 'tool/result') {
    const tool = state.pendingCalls[event.data.message.source.callId] ?? 'tool'
    const block = event.data.message.content[0]
    const error = event.data.error !== undefined || block?.isError === true
    return applyMoodState(state, { kind: 'tool', tool, error }, event.time, config).next
  }
  return state
}

/**
 * State → client-facing snapshot view. `transition`/`why` come from the most
 * recent change hint (the standing mood is always `lastMood`); a caller that
 * wants the observation-local hint uses the `change` from `applyMoodState`.
 */
export function viewMood(state: MoodState, now: number): MoodSnapshot {
  return {
    mood: state.lastMood,
    why: state.lastChange?.why,
    transition: state.lastChange?.transition ?? 'none',
    journey: [...state.journey],
    at: now,
  }
}

/**
 * The projection view payload read by the browser via `useProjection('mood')`.
 * JSON-wire shape: `change.why` is `null` (not `undefined`) when no reason.
 */
export interface MoodProjection {
  mood: Mood
  change: { transition: Transition; why: string | null; at: number } | null
  journey: Mood[]
}

/** State → pure projection view (standing mood + last change hint, JSON-safe). */
export function viewMoodProjection(state: MoodState): MoodProjection {
  const last = state.lastChange
  return {
    mood: state.lastMood,
    change: last === null ? null : {
      transition: last.transition,
      why: last.why ?? null,
      at: last.at,
    },
    journey: [...state.journey],
  }
}

/** Decide the target Mood from counters (priority OVERWHELMED > FRUSTRATED > CONFUSED > GOOD). */
export function decideMood(config: MoodConfig, counters: MoodCounters): Mood {
  const confused = counters.repeatedTool !== undefined && counters.repeatedTool.count >= config.confusedRepeatThreshold
  const frustrated = counters.consecutiveFailures >= config.frustratedFailureThreshold
  const overwhelmed = counters.abnormalSignals >= config.overwhelmedSignalCount
  if (overwhelmed) return 'OVERWHELMED'
  if (frustrated) return 'FRUSTRATED'
  if (confused) return 'CONFUSED'
  return 'GOOD'
}

/**
 * A convenience wrapper over {@link applyMoodState} for scripts and tests: feed
 * {@link observe} with a {@link BehaviorObservation} and a wall clock, read the
 * latest snapshot with {@link snapshot}.
 */
export class MoodEngine {
  private readonly config: MoodConfig
  private state: MoodState

  constructor(config: Partial<MoodConfig> = {}) {
    this.config = validateMoodConfig({ ...DEFAULT_MOOD_CONFIG, ...config })
    this.state = initMoodState()
  }

  /** Advance the engine with one observation, returning the resulting snapshot. */
  observe(obs: BehaviorObservation, now: number = Date.now()): MoodSnapshot {
    const { next, change } = applyMoodState(this.state, obs, now, this.config)
    this.state = next
    return {
      mood: next.lastMood,
      why: change?.why,
      transition: change?.transition ?? 'none',
      journey: [...next.journey],
      at: now,
    }
  }

  /** The latest known snapshot (does not touch state). */
  snapshot(now: number = Date.now()): MoodSnapshot {
    return viewMood(this.state, now)
  }

  /** @internal the current fold state (used by the host `ctx.mood.state`). */
  stateSnapshot(): MoodState {
    return this.state
  }
}
