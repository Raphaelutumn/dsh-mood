/**
 * Package-owned invariant companion for `@deepseek-ai/dsh-client-mood`.
 * @module @deepseek-ai/dsh-client-mood/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-client-mood'

/**
 * No runtime invariant: the browser status light reads the host-computed `mood`
 * projection through the standard kit and registers no package-owned event or
 * snapshot an independent companion could observe.
 */
const install: InvariantInstaller = () => {}

/** Cordis companion plugin name. */
export const name = 'client-mood-invariant'
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
