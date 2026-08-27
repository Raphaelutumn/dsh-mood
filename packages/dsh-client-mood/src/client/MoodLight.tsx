/**
 * The session-header mood status light.
 *
 * It reads the host-computed `mood` projection through the standard-kit
 * `useProjection` and renders a compact standing indicator: emoji + short
 * label, a title tooltip naming the change reason when one is recent, and a
 * session journey on hover. It is deliberately read-only and low-friction —
 * a status light, not a log (PRD §4/§8/§9).
 */

import { useMemo } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: pulls the `conversation.session.header.utilities` SlotMap merge.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
// Type-only: pulls the `mood` SessionProjectionMap merge for useProjection.
import type {} from '@deepseek-ai/dsh-mood/client'
import type { Mood } from '@deepseek-ai/dsh-mood/client'
import { NS, type MoodKey } from './locales.ts'
import css from './MoodLight.module.css'

/** The `mood` locale namespace. */
declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The session-header mood status light's copy. */
    mood: MoodKey
  }
}

/** Emoji + accent color per mood (product-visual, shared across locales). */
const MOOD_EMOJI: Record<Mood, string> = {
  GOOD: '😊',
  CONFUSED: '😕',
  FRUSTRATED: '😤',
  OVERWHELMED: '🤯',
}

/** Full component props — the standard session kit plus the locale dictionary. */
export type MoodLightProps =
  PropsRuntime<'conversation.session.header.utilities'>
  & PropsLocale<typeof NS>

const moodKeyFor: Record<Mood, MoodKey> = {
  GOOD: 'good',
  CONFUSED: 'confused',
  FRUSTRATED: 'frustrated',
  OVERWHELMED: 'overwhelmed',
}

/** A compact, readable journey line from the projection's mood trace. */
function journeyText(journey: Mood[], emoji: Record<Mood, string>): string {
  return journey.map(mood => emoji[mood]).join(' → ')
}

/**
 * Render this session's standing mood light.
 * @param props - composed slot props (standard kit + dictionary).
 * @returns the status light, or null before the capability is present.
 */
export function MoodLight({ useProjection, t }: MoodLightProps) {
  // The projection is undefined until the host unit mounts or a baseline lands;
  // until then we render nothing (the header utility stays empty).
  const projection = useProjection('mood')

  const standing = projection === undefined ? undefined : projection.mood
  const why = projection?.change?.why ?? undefined

  const label = useMemo(() => {
    if (standing === undefined) return ''
    return t(moodKeyFor[standing])
  }, [standing, t])

  const journey = projection?.journey ?? []
  if (standing === undefined) return null

  const title = why === undefined || why === 'Recovered'
    ? `${t('hintTitle')}：😊→…`
    : why

  return (
    <span className={css.light} data-mood={standing.toLowerCase()} title={title}>
      <span className={css.emoji} aria-hidden="true">{MOOD_EMOJI[standing]}</span>
      <span className={css.label}>{label}</span>
      {journey.length > 1 && (
        <span className={css.journey} role="tooltip">
          <span className={css.journeyTitle}>{t('journeyTitle')}</span>
          <span className={css.journeyText}>{journeyText(journey, MOOD_EMOJI)}</span>
        </span>
      )}
    </span>
  )
}
