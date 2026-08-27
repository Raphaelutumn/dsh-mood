import { describe, expect, it } from 'vitest'
import {
  MoodEngine,
  decideMood,
  validateMoodConfig,
  type MoodConfig,
  type MoodCounters,
} from '../src/engine.ts'

const tool = (name: string, error = false) => ({ kind: 'tool' as const, tool: name, error })

describe('decideMood', () => {
  const cfg: MoodConfig = {
    confusedRepeatThreshold: 3,
    frustratedFailureThreshold: 3,
    overwhelmedSignalCount: 3,
    changeCooldownMs: 60_000,
    stableSuccessesToRecover: 2,
    journeyMaxLength: 8,
    repetitionWindow: 12,
    highActivityThreshold: 4,
  }
  const counters = (over: Partial<MoodCounters>): MoodCounters => ({
    consecutiveFailures: 0,
    consecutiveSuccesses: 0,
    toolCallCount: 0,
    repeatedTool: undefined,
    abnormalSignals: 0,
    ...over,
  })

  it('returns GOOD with no abnormal signals', () => {
    expect(decideMood(cfg, counters({}))).toBe('GOOD')
  })

  it('is CONFUSED when a tool repeats past the threshold', () => {
    expect(decideMood(cfg, counters({ repeatedTool: { name: 'read', count: 3 }, abnormalSignals: 1 }))).toBe('CONFUSED')
  })

  it('is FRUSTRATED at the consecutive-failure threshold', () => {
    expect(decideMood(cfg, counters({ consecutiveFailures: 3 }))).toBe('FRUSTRATED')
  })

  it('prioritizes OVERWHELMED over FRUSTRATED and CONFUSED', () => {
    expect(decideMood(cfg, counters({
      consecutiveFailures: 3,
      repeatedTool: { name: 'read', count: 3 },
      abnormalSignals: 3,
    }))).toBe('OVERWHELMED')
  })
})

describe('validateMoodConfig', () => {
  it('accepts a valid default', () => {
    expect(() => validateMoodConfig({ confusedRepeatThreshold: 3, frustratedFailureThreshold: 3, overwhelmedSignalCount: 3, changeCooldownMs: 1000, stableSuccessesToRecover: 2, journeyMaxLength: 8, repetitionWindow: 12, highActivityThreshold: 4 })).not.toThrow()
  })
  it('rejects a non-positive-integer threshold fail-loud', () => {
    expect(() => validateMoodConfig({ confusedRepeatThreshold: 0, frustratedFailureThreshold: 3, overwhelmedSignalCount: 3, changeCooldownMs: 1000, stableSuccessesToRecover: 2, journeyMaxLength: 8, repetitionWindow: 12, highActivityThreshold: 4 }))
      .toThrow(/confusedRepeatThreshold 0/)
  })
})

describe('MoodEngine transitions', () => {
  it('is GOOD before any observation and stays GOOD on isolated successes', () => {
    const e = new MoodEngine()
    expect(e.snapshot().mood).toBe('GOOD')
    expect(e.observe(tool('read', false)).mood).toBe('GOOD')
  })

  it('escalates to FRUSTRATED after consecutive failures and emits a why', () => {
    const e = new MoodEngine()
    e.observe(tool('run', true), 0)
    e.observe(tool('run', true), 1)
    const snap = e.observe(tool('run', true), 2)
    expect(snap.mood).toBe('FRUSTRATED')
    expect(snap.transition).toBe('upgrade')
    expect(snap.why).toBe('3 consecutive failures')
  })

  it('escalates to CONFUSED on repeated tool occurrences', () => {
    const e = new MoodEngine()
    e.observe(tool('read', false), 0)
    e.observe(tool('read', false), 1)
    const snap = e.observe(tool('read', false), 2)
    expect(snap.mood).toBe('CONFUSED')
    expect(snap.why).toBe('Repeated read ×3')
  })

  it('does not treat different tools as repetition', () => {
    const e = new MoodEngine()
    e.observe(tool('read', false), 0)
    e.observe(tool('write', false), 1)
    expect(e.observe(tool('grep', false), 2).mood).toBe('GOOD')
  })
})

describe('anti-flash', () => {
  it('requires stable consecutive successes to recover from a negative mood', () => {
    const e = new MoodEngine()
    e.observe(tool('build', true), 0)
    e.observe(tool('build', true), 1)
    e.observe(tool('build', true), 2) // FRUSTRATED
    const first = e.observe(tool('lint', false), 3) // one success — not enough
    expect(first.mood).toBe('FRUSTRATED') // still not recovered
    expect(first.transition).toBe('none')
    const second = e.observe(tool('test', false), 4) // second success — recover
    expect(second.mood).toBe('GOOD')
    expect(second.transition).toBe('recover')
    expect(second.why).toBe('Recovered')
  })

  it('suppresses a repeated identical abnormal reason within the cooldown window', () => {
    // highActivityThreshold isolates the FRUSTRATED re-entry from OVERWHELMED
    // escalation so the assertion targets the reason-cooldown alone; wall times
    // are in ms to stay consistent with changeCooldownMs.
    const e = new MoodEngine({ changeCooldownMs: 1_000, highActivityThreshold: 99 })
    e.observe(tool('build', true), 2_000)
    e.observe(tool('build', true), 2_010)
    const first = e.observe(tool('build', true), 2_020) // FRUSTRATED, reported at t=2020
    expect(first.why).toBe('3 consecutive failures')
    // Recover quickly, then regress to FRUSTRATED within the cooldown of t=2020:
    // the identical reason is suppressed, but the upgrade transition still fires.
    e.observe(tool('lint', false), 2_100)
    e.observe(tool('test', false), 2_110) // recover to GOOD
    e.observe(tool('build', true), 2_200)
    e.observe(tool('build', true), 2_210)
    const reentry = e.observe(tool('build', true), 2_220) // FRUSTRATED again, same why within 1s
    expect(reentry.mood).toBe('FRUSTRATED')
    expect(reentry.transition).toBe('upgrade')
    expect(reentry.why).toBeUndefined()
    // Once the cooldown elapses (t > 3020), the reason re-surfaces.
    e.observe(tool('lint', false), 4_000)
    e.observe(tool('test', false), 4_010)
    e.observe(tool('build', true), 4_100)
    e.observe(tool('build', true), 4_110)
    const later = e.observe(tool('build', true), 4_120) // beyond the cooldown of t=2020
    expect(later.why).toBe('3 consecutive failures')
  })
})

describe('journey', () => {
  it('records mood transitions compactly', () => {
    const e = new MoodEngine()
    e.observe(tool('build', true), 0)
    e.observe(tool('build', true), 1)
    const snap3 = e.observe(tool('build', true), 2) // -> FRUSTRATED
    expect(snap3.journey).toEqual(['GOOD', 'FRUSTRATED'])
    e.observe(tool('lint', false), 5)
    const snap5 = e.observe(tool('test', false), 6) // -> GOOD (recover)
    expect(snap5.journey).toEqual(['GOOD', 'FRUSTRATED', 'GOOD'])
  })
})
