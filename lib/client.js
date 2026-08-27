window.__ModuleLoader__.load({
	id: "@dsh-external/dsh-mood",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		//#region \0dsh-css:D:\Deepseek harness\packages\client\mood\src\client\MoodLight.module.css.mjs
		const css = "._7OhZFW_light{cursor:default;color:var(--dsw-text-2,inherit);border:1px solid #0000;border-radius:999px;align-items:center;gap:.375rem;padding:.25rem .625rem;display:inline-flex;position:relative}._7OhZFW_light[data-mood=good]{background:var(--dsw-bg-mood-good,#e8f7ee)}._7OhZFW_light[data-mood=confused]{background:var(--dsw-bg-mood-confused,#fff6e0)}._7OhZFW_light[data-mood=frustrated]{background:var(--dsw-bg-mood-frustrated,#ffe9e5)}._7OhZFW_light[data-mood=overwhelmed]{background:var(--dsw-bg-mood-overwhelmed,#f7e6ff)}._7OhZFW_emoji{font-size:.9em;line-height:1}._7OhZFW_label{font-size:.8em;font-weight:500}._7OhZFW_journey{z-index:10;background:var(--dsw-surface-1,#fff);white-space:nowrap;border-radius:.5rem;flex-direction:column;gap:.25rem;padding:.5rem .75rem;font-size:.8em;display:none;position:absolute;top:calc(100% + .375rem);right:0;box-shadow:0 .25rem 1rem #0000001f}._7OhZFW_light:hover ._7OhZFW_journey{display:flex}._7OhZFW_journeyTitle{font-weight:600}._7OhZFW_journeyText{color:var(--dsw-text-2,inherit)}";
		const tagId = "@dsh-external/dsh-mood/MoodLight.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-external/dsh-mood";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var MoodLight_module_css_default = {
			"label": "_7OhZFW_label",
			"journeyTitle": "_7OhZFW_journeyTitle",
			"journeyText": "_7OhZFW_journeyText",
			"journey": "_7OhZFW_journey",
			"emoji": "_7OhZFW_emoji",
			"light": "_7OhZFW_light"
		};
		//#endregion
		//#region lib/types/client/MoodLight.js
		/**
		* The session-header mood status light.
		*
		* It reads the host-computed `mood` projection through the standard-kit
		* `useProjection` and renders a compact standing indicator: emoji + short
		* label, a title tooltip naming the change reason when one is recent, and a
		* session journey on hover. It is deliberately read-only and low-friction 鈥?		* a status light, not a log (PRD 搂4/搂8/搂9).
		*/
		/** Emoji + accent color per mood (product-visual, shared across locales). */
		const MOOD_EMOJI = {
			GOOD: "馃槉",
			CONFUSED: "馃槙",
			FRUSTRATED: "馃槫",
			OVERWHELMED: "馃く"
		};
		const moodKeyFor = {
			GOOD: "good",
			CONFUSED: "confused",
			FRUSTRATED: "frustrated",
			OVERWHELMED: "overwhelmed"
		};
		/** A compact, readable journey line from the projection's mood trace. */
		function journeyText(journey, emoji) {
			return journey.map((mood) => emoji[mood]).join(" 鈫?");
		}
		/**
		* Render this session's standing mood light.
		* @param props - composed slot props (standard kit + dictionary).
		* @returns the status light, or null before the capability is present.
		*/
		function MoodLight({ useProjection, t }) {
			const projection = useProjection("mood");
			const standing = projection === void 0 ? void 0 : projection.mood;
			const why = projection?.change?.why ?? void 0;
			const label = (0, react.useMemo)(() => {
				if (standing === void 0) return "";
				return t(moodKeyFor[standing]);
			}, [standing, t]);
			const journey = projection?.journey ?? [];
			if (standing === void 0) return null;
			const title = why === void 0 || why === "Recovered" ? `${t("hintTitle")}锛氿煒娾啋鈥 : why;
			return (0, react_jsx_runtime.jsxs)("span", {
				className: MoodLight_module_css_default.light,
				"data-mood": standing.toLowerCase(),
				title,
				children: [
					(0, react_jsx_runtime.jsx)("span", {
						className: MoodLight_module_css_default.emoji,
						"aria-hidden": "true",
						children: MOOD_EMOJI[standing]
					}),
					(0, react_jsx_runtime.jsx)("span", {
						className: MoodLight_module_css_default.label,
						children: label
					}),
					journey.length > 1 && (0, react_jsx_runtime.jsxs)("span", {
						className: MoodLight_module_css_default.journey,
						role: "tooltip",
						children: [(0, react_jsx_runtime.jsx)("span", {
							className: MoodLight_module_css_default.journeyTitle,
							children: t("journeyTitle")
						}), (0, react_jsx_runtime.jsx)("span", {
							className: MoodLight_module_css_default.journeyText,
							children: journeyText(journey, MOOD_EMOJI)
						})]
					})
				]
			});
		}
		//#endregion
		//#region lib/types/client/locales.js
		/** `mood` namespace dictionaries (the session-header status light's copy). */
		/** Dictionary namespace owned by this plugin. */
		const NS = "mood";
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			good: "椤哄埄",
			confused: "鍥版儜",
			frustrated: "鍙楁尗",
			overwhelmed: "杩囪浇",
			recovered: "宸叉仮澶?,
			hintIdle: "褰撳墠鐘舵€佹甯?,
			hintTitle: "浣犵湅锛屽畠涔熸湁蹇冩儏",
			journeyTitle: "浼氳瘽蹇冩儏杞ㄨ抗"
		};
		/** English dictionary, checked complete against the zh key set. */
		const en = {
			good: "Good",
			confused: "Confused",
			frustrated: "Frustrated",
			overwhelmed: "Overwhelmed",
			recovered: "Recovered",
			hintIdle: "Everything looks normal",
			hintTitle: "Your agent has moods too",
			journeyTitle: "Session mood journey"
		};
		//#endregion
		//#region lib/types/client/index.js
		/**
		* Session-header mood status light, browser half 鈥?registers the MoodLight
		* into the `conversation.session.header.utilities` seat (a right-aligned,
		* additive header utility), so the host-computed Mood shows as a standing,
		* low-friction indicator without touching the message flow (PRD 搂8/搂9).
		*/
		/** Required services. */
		const inject = ["slots", "locale"];
		/**
		* Client plugin body: mount the header mood utility.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "client-mood: dictionaries");
			ctx.slots.inject("conversation.session.header.utilities", () => ctx.slots.register({
				name: "conversation.session.header.utilities",
				id: "mood",
				locale: NS
			}, MoodLight));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map