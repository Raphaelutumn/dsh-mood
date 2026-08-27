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
import type { Context } from '@deepseek-ai/cordis';
import type { Session } from '@deepseek-ai/dsh-session';
import z from '@deepseek-ai/schemastery';
import { type MoodSnapshot } from './engine.ts';
import type { MoodService } from './types.ts';
export type { BehaviorObservation, Mood, MoodConfig, MoodEngine, MoodChange, MoodProjection, MoodSnapshot, MoodState, Transition } from './engine.ts';
export { DEFAULT_MOOD_CONFIG, validateMoodConfig, applyMoodEvent, applyMoodState, viewMoodProjection } from './engine.ts';
export type { MoodService } from './types.ts';
export { makeMoodProjectionDefinition, MOOD_PROJECTION_KEY } from './projection.ts';
/** Cordis plugin name. */
export declare const name = "mood";
/**
 * Plugin configuration, validated by the same-named schemastery schema.
 * Every threshold is a positive integer (validated fail-loud in `apply`).
 */
export interface Config {
    /** Occurrences of the same tool that establish CONFUSED (default 3). */
    confusedRepeatThreshold?: number;
    /** Consecutive call failures that establish FRUSTRATED (default 3). */
    frustratedFailureThreshold?: number;
    /** Minimum distinct abnormal signals for OVERWHELMED (default 3). */
    overwhelmedSignalCount?: number;
    /** Milliseconds during which a repeated mood change does not re-surface (default 60_000). */
    changeCooldownMs?: number;
    /** Consecutive successful tool results required to return to GOOD (default 2). */
    stableSuccessesToRecover?: number;
    /** Maximum journey length before oldest entries are dropped (default 8). */
    journeyMaxLength?: number;
    /** Number of recent tool calls retained for repetition detection (default 12). */
    repetitionWindow?: number;
    /** Minimum tool calls in the window for an activity signal (default 4). */
    highActivityThreshold?: number;
}
/** Schemastery config schema; `.default()` guarantees every field after validation. */
export declare const Config: z<Config>;
declare module '@deepseek-ai/cordis' {
    interface Context {
        mood: MoodService;
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
        'mood/change'(session: Session, snapshot: MoodSnapshot): void;
    }
}
/**
 * Install the plugin: map tools to their results (tool/call names the tool,
 * tool/result reports success/failure), feed the per-session engine, and expose
 * the snapshot service.
 * @param ctx - plugin context; listeners and service are scoped to it.
 * @param config - parsed plugin config.
 */
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map