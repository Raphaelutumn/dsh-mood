import z from "@deepseek-ai/schemastery";
import { z as z$1 } from "zod";
//#region lib/types/engine.js
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
/** Default engine configuration. */
const DEFAULT_MOOD_CONFIG = {
	confusedRepeatThreshold: 3,
	frustratedFailureThreshold: 3,
	overwhelmedSignalCount: 3,
	changeCooldownMs: 6e4,
	stableSuccessesToRecover: 2,
	journeyMaxLength: 8,
	repetitionWindow: 12,
	highActivityThreshold: 4
};
const RANK = {
	GOOD: 0,
	CONFUSED: 1,
	FRUSTRATED: 2,
	OVERWHELMED: 3
};
/** Product ordering: `b` is worse than `a`. */
function worseThan(a, b) {
	return RANK[b] > RANK[a];
}
/** Validate a configuration object fail-loud (every threshold is a positive integer). */
function validateMoodConfig(config) {
	const entries = [
		["confusedRepeatThreshold", config.confusedRepeatThreshold],
		["frustratedFailureThreshold", config.frustratedFailureThreshold],
		["overwhelmedSignalCount", config.overwhelmedSignalCount],
		["changeCooldownMs", config.changeCooldownMs],
		["stableSuccessesToRecover", config.stableSuccessesToRecover],
		["journeyMaxLength", config.journeyMaxLength],
		["repetitionWindow", config.repetitionWindow],
		["highActivityThreshold", config.highActivityThreshold]
	];
	for (const [key, value] of entries) if (!Number.isInteger(value) || value < 1) throw new Error(`dsh-mood: invalid ${key} ${value} — must be an integer >= 1`);
	return config;
}
/** Trailing consecutive run of the last tool in a retained window; `undefined` when empty. */
function consecutiveRun(tools) {
	const last = tools[tools.length - 1];
	if (last === void 0) return void 0;
	let count = 0;
	for (let i = tools.length - 1; i >= 0; i -= 1) if (tools[i] === last) count += 1;
	else break;
	return {
		name: last,
		count
	};
}
/** Fixed why text per mood and counters. */
function whyFor(config, counters) {
	if (counters.consecutiveFailures >= config.frustratedFailureThreshold) return `${counters.consecutiveFailures} consecutive failures`;
	if (counters.repeatedTool !== void 0 && counters.repeatedTool.count >= config.confusedRepeatThreshold) return `Repeated ${counters.repeatedTool.name} ×${counters.repeatedTool.count}`;
	if (counters.abnormalSignals >= config.overwhelmedSignalCount) return "High activity + repeated failures";
}
/** Initial fold state for the empty log. */
function initMoodState() {
	return {
		consecutiveFailures: 0,
		consecutiveSuccesses: 0,
		toolCallCount: 0,
		recentTools: [],
		pendingCalls: {},
		lastChange: null,
		lastAbnormalWhy: void 0,
		lastAbnormalWhyAt: -Infinity,
		lastMood: "GOOD",
		journey: ["GOOD"]
	};
}
/** The next window snapshot after an observation (owning the repetition trim). */
function nextRecentTools(state, obs, config) {
	if (obs.kind === "activity") return state.recentTools;
	return [...state.recentTools.slice(-(config.repetitionWindow - 1)), obs.tool];
}
/** Fold counters from a state plus an observation. */
function foldCounters(state, obs, config) {
	const recentTools = nextRecentTools(state, obs, config);
	const repeatedTool = obs.kind === "tool" ? consecutiveRun(recentTools) : void 0;
	const repeatedCondition = repeatedTool !== void 0 && repeatedTool.count >= config.confusedRepeatThreshold;
	const nextConsecutiveFailures = obs.kind === "tool" ? obs.error ? state.consecutiveFailures + 1 : 0 : state.consecutiveFailures;
	const failureCondition = nextConsecutiveFailures >= config.frustratedFailureThreshold;
	const activityCondition = recentTools.length >= config.highActivityThreshold;
	const abnormalSignals = (failureCondition ? 1 : 0) + (repeatedCondition ? 1 : 0) + (activityCondition ? 1 : 0);
	return {
		recentTools,
		counters: {
			consecutiveFailures: nextConsecutiveFailures,
			consecutiveSuccesses: obs.kind === "tool" ? obs.error ? 0 : state.consecutiveSuccesses + 1 : state.consecutiveSuccesses,
			toolCallCount: obs.kind === "tool" ? state.toolCallCount + 1 : state.toolCallCount,
			repeatedTool,
			abnormalSignals
		}
	};
}
/**
* Apply one behavior observation at wall time `now`, returning the next state
* plus the observation-local change hint (present only when this observation
* caused a Mood change). This is the single fold both the projection and the
* standalone engine use.
*/
function applyMoodState(prev, obs, now, config) {
	const { counters, recentTools } = foldCounters(prev, obs, config);
	const desired = decideMood(config, counters);
	const previous = prev.lastMood;
	let target = desired;
	if (previous !== "GOOD") {
		if (counters.consecutiveSuccesses >= config.stableSuccessesToRecover && desired === "GOOD") target = "GOOD";
		else if (desired === "GOOD" || !worseThan(previous, desired)) target = previous;
	}
	const recovered = target === "GOOD" && previous !== "GOOD";
	const upgraded = target !== previous && worseThan(previous, target);
	const changed = target !== previous;
	let lastChange = prev.lastChange;
	let change = null;
	let journey = prev.journey;
	if (changed) {
		journey = [...journey, target].slice(-config.journeyMaxLength);
		let why;
		let transition = upgraded ? "upgrade" : recovered ? "recover" : "none";
		if (recovered) why = "Recovered";
		else if (upgraded) {
			why = whyFor(config, counters);
			if (why !== void 0 && why === prev.lastAbnormalWhy && now - prev.lastAbnormalWhyAt < config.changeCooldownMs) why = void 0;
		}
		change = {
			transition,
			why,
			at: now
		};
		lastChange = change;
	}
	const publishAbnormal = change?.why !== void 0 && change.why !== "Recovered";
	return {
		next: {
			consecutiveFailures: counters.consecutiveFailures,
			consecutiveSuccesses: counters.consecutiveSuccesses,
			toolCallCount: counters.toolCallCount,
			recentTools,
			pendingCalls: prev.pendingCalls,
			lastChange,
			lastAbnormalWhy: publishAbnormal ? change?.why : prev.lastAbnormalWhy,
			lastAbnormalWhyAt: publishAbnormal ? now : prev.lastAbnormalWhyAt,
			lastMood: target,
			journey
		},
		change
	};
}
/**
* Fold one committed session event into the mood state. `tool/call` records the
* call→name mapping; `tool/result` folds the resolved tool observation; every
* other event returns the SAME state reference (the projection change gate).
*/
function applyMoodEvent(state, event, config) {
	if (event.type === "tool/call" && !Object.hasOwn(state.pendingCalls, event.data.callId)) return {
		...state,
		pendingCalls: {
			...state.pendingCalls,
			[event.data.callId]: event.data.name
		}
	};
	if (event.type === "tool/result") {
		const tool = state.pendingCalls[event.data.message.source.callId] ?? "tool";
		const block = event.data.message.content[0];
		return applyMoodState(state, {
			kind: "tool",
			tool,
			error: event.data.error !== void 0 || block?.isError === true
		}, event.time, config).next;
	}
	return state;
}
/**
* State → client-facing snapshot view. `transition`/`why` come from the most
* recent change hint (the standing mood is always `lastMood`); a caller that
* wants the observation-local hint uses the `change` from `applyMoodState`.
*/
function viewMood(state, now) {
	return {
		mood: state.lastMood,
		why: state.lastChange?.why,
		transition: state.lastChange?.transition ?? "none",
		journey: [...state.journey],
		at: now
	};
}
/** State → pure projection view (standing mood + last change hint, JSON-safe). */
function viewMoodProjection(state) {
	const last = state.lastChange;
	return {
		mood: state.lastMood,
		change: last === null ? null : {
			transition: last.transition,
			why: last.why ?? null,
			at: last.at
		},
		journey: [...state.journey]
	};
}
/** Decide the target Mood from counters (priority OVERWHELMED > FRUSTRATED > CONFUSED > GOOD). */
function decideMood(config, counters) {
	const confused = counters.repeatedTool !== void 0 && counters.repeatedTool.count >= config.confusedRepeatThreshold;
	const frustrated = counters.consecutiveFailures >= config.frustratedFailureThreshold;
	if (counters.abnormalSignals >= config.overwhelmedSignalCount) return "OVERWHELMED";
	if (frustrated) return "FRUSTRATED";
	if (confused) return "CONFUSED";
	return "GOOD";
}
/**
* A convenience wrapper over {@link applyMoodState} for scripts and tests: feed
* {@link observe} with a {@link BehaviorObservation} and a wall clock, read the
* latest snapshot with {@link snapshot}.
*/
var MoodEngine = class {
	config;
	state;
	constructor(config = {}) {
		this.config = validateMoodConfig({
			...DEFAULT_MOOD_CONFIG,
			...config
		});
		this.state = initMoodState();
	}
	/** Advance the engine with one observation, returning the resulting snapshot. */
	observe(obs, now = Date.now()) {
		const { next, change } = applyMoodState(this.state, obs, now, this.config);
		this.state = next;
		return {
			mood: next.lastMood,
			why: change?.why,
			transition: change?.transition ?? "none",
			journey: [...next.journey],
			at: now
		};
	}
	/** The latest known snapshot (does not touch state). */
	snapshot(now = Date.now()) {
		return viewMood(this.state, now);
	}
	/** @internal the current fold state (used by the host `ctx.mood.state`). */
	stateSnapshot() {
		return this.state;
	}
};
//#endregion
//#region lib/types/projection.js
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
const transitionSchema = z$1.enum([
	"upgrade",
	"recover",
	"none"
]);
const moodSchema = z$1.enum([
	"GOOD",
	"CONFUSED",
	"FRUSTRATED",
	"OVERWHELMED"
]);
/** Validates the `mood` wire payload (the `view` output) before it leaves the host. */
const moodProjectionSchema = z$1.object({
	mood: moodSchema,
	change: z$1.object({
		transition: transitionSchema,
		why: z$1.string().nullable(),
		at: z$1.number()
	}).nullable(),
	journey: z$1.array(moodSchema)
});
const MOOD_PROJECTION_KEY = "mood";
/**
* Build the `mood` projection unit bound to a resolved engine config.
* @param config - the plugin's resolved mood thresholds.
* @returns a {@link ProjectionDefinition} over {@link MoodState}.
*/
function makeMoodProjectionDefinition(config) {
	return {
		key: MOOD_PROJECTION_KEY,
		schema: moodProjectionSchema,
		init: initMoodState,
		apply: (state, event) => applyMoodEvent(state, event, config),
		view: viewMoodProjection,
		stateVersion: 1
	};
}
//#endregion
//#region lib/types/index.js
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
/** Cordis plugin name. */
const name = "mood";
/** Schemastery config schema; `.default()` guarantees every field after validation. */
const Config = z.object({
	confusedRepeatThreshold: z.number().default(3),
	frustratedFailureThreshold: z.number().default(3),
	overwhelmedSignalCount: z.number().default(3),
	changeCooldownMs: z.number().default(6e4),
	stableSuccessesToRecover: z.number().default(2),
	journeyMaxLength: z.number().default(8),
	repetitionWindow: z.number().default(12),
	highActivityThreshold: z.number().default(4)
});
/**
* Install the plugin: map tools to their results (tool/call names the tool,
* tool/result reports success/failure), feed the per-session engine, and expose
* the snapshot service.
* @param ctx - plugin context; listeners and service are scoped to it.
* @param config - parsed plugin config.
*/
function apply(ctx, config) {
	const resolvedConfig = {
		confusedRepeatThreshold: config.confusedRepeatThreshold,
		frustratedFailureThreshold: config.frustratedFailureThreshold,
		overwhelmedSignalCount: config.overwhelmedSignalCount,
		changeCooldownMs: config.changeCooldownMs,
		stableSuccessesToRecover: config.stableSuccessesToRecover,
		journeyMaxLength: config.journeyMaxLength,
		repetitionWindow: config.repetitionWindow,
		highActivityThreshold: config.highActivityThreshold
	};
	ctx.inject(["sessionProjections"], (projectionCtx) => {
		projectionCtx.sessionProjections.register(makeMoodProjectionDefinition(resolvedConfig));
	});
	const engines = /* @__PURE__ */ new WeakMap();
	const callNames = /* @__PURE__ */ new WeakMap();
	const engineFor = (session) => {
		let engine = engines.get(session);
		if (engine === void 0) {
			engine = new MoodEngine(resolvedConfig);
			engines.set(session, engine);
		}
		return engine;
	};
	ctx.on("session/event", (session, event) => {
		const namesForSession = callNames.get(session) ?? /* @__PURE__ */ new Map();
		if (event.type === "tool/call") {
			namesForSession.set(event.data.callId, event.data.name);
			callNames.set(session, namesForSession);
			return;
		}
		if (event.type !== "tool/result") return;
		const tool = namesForSession.get(event.data.message.source.callId) ?? "tool";
		const block = event.data.message.content[0];
		const error = event.data.error !== void 0 || block?.isError === true;
		const snapshot = engineFor(session).observe({
			kind: "tool",
			tool,
			error
		});
		if (snapshot.transition !== "none" || snapshot.why !== void 0) ctx.emit("mood/change", session, snapshot);
	});
	ctx.provide("mood", {
		snapshot(session) {
			const engine = engines.get(session);
			if (engine === void 0) return {
				mood: "GOOD",
				why: void 0,
				transition: "none",
				journey: ["GOOD"],
				at: Date.now()
			};
			return engine.snapshot();
		},
		state(session) {
			return engines.get(session)?.stateSnapshot();
		}
	});
}
//#endregion
export { Config, DEFAULT_MOOD_CONFIG, MOOD_PROJECTION_KEY, apply, applyMoodEvent, applyMoodState, makeMoodProjectionDefinition, name, validateMoodConfig, viewMoodProjection };
