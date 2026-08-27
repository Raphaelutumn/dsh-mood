//#region lib/types/invariant.js
/**
* Package-owned invariant companion for `@deepseek-ai/dsh-mood`.
* @module @deepseek-ai/dsh-mood/invariant
*/
const PACKAGE_NAME = "@deepseek-ai/dsh-mood";
/** The four valid Mood states. */
const VALID_MOODS = [
	"GOOD",
	"CONFUSED",
	"FRUSTRATED",
	"OVERWHELMED"
];
const validMood = (mood) => VALID_MOODS.includes(mood);
/**
* Checks the `mood/change` event's payload relation: the snapshot must carry a
* known Mood, a `recover` transition must land on GOOD, and an `upgrade` must
* never land on GOOD. A live observer, so it reads the authoritative emit.
*/
const install = (ctx, fail) => {
	ctx.on("mood/change", (_session, snapshot) => {
		assertSnapshot(snapshot, fail);
	});
};
function assertSnapshot(snapshot, fail) {
	if (!validMood(snapshot.mood)) {
		fail(`mood/change carried unknown mood ${JSON.stringify(snapshot.mood)}`);
		return;
	}
	if (snapshot.transition === "recover" && snapshot.mood !== "GOOD") fail(`mood/change transition=recover must land on GOOD, got ${snapshot.mood}`);
	if (snapshot.transition === "upgrade" && snapshot.mood === "GOOD") fail("mood/change transition=upgrade cannot land on GOOD");
}
/** Cordis companion plugin name. */
const name = "mood-invariant";
/** Service required before the companion can reserve package ownership. */
const inject = ["invariants"];
/**
* Register this package's invariant companion.
* @param ctx - Cordis context carrying the invariant service.
* @returns the installed registration's disposer after setup succeeds.
*/
const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
//#endregion
export { apply, inject, name };
