/** `mood` namespace dictionaries (the session-header status light's copy). */

/** Dictionary namespace owned by this plugin. */
export const NS = 'mood'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  good: '顺利',
  confused: '困惑',
  frustrated: '受挫',
  overwhelmed: '过载',
  recovered: '已恢复',
  hintIdle: '当前状态正常',
  hintTitle: '你看，它也有心情',
  journeyTitle: '会话心情轨迹',
} satisfies Record<string, string>

/** The mood namespace key union. */
export type MoodKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  good: 'Good',
  confused: 'Confused',
  frustrated: 'Frustrated',
  overwhelmed: 'Overwhelmed',
  recovered: 'Recovered',
  hintIdle: 'Everything looks normal',
  hintTitle: 'Your agent has moods too',
  journeyTitle: 'Session mood journey',
} satisfies Record<MoodKey, string>
