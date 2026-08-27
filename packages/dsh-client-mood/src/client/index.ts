/**
 * Session-header mood status light, browser half — registers the MoodLight
 * into the `conversation.session.header.utilities` seat (a right-aligned,
 * additive header utility), so the host-computed Mood shows as a standing,
 * low-friction indicator without touching the message flow (PRD §8/§9).
 */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the ui-conversation SlotMap merge (the header utilities).
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the `mood` SessionProjectionMap merge for useProjection.
import type {} from '@deepseek-ai/dsh-mood/client'
import { MoodLight } from './MoodLight.tsx'
import { en, NS, zh, type MoodKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The session-header mood status light's copy. */
    mood: MoodKey
  }
}

/** Required services. */
export const inject = ['slots', 'locale']

/**
 * Client plugin body: mount the header mood utility.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'client-mood: dictionaries')

  ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register({
    name: 'conversation.session.header.utilities',
    id: 'mood',
    locale: NS,
  }, MoodLight))
}
