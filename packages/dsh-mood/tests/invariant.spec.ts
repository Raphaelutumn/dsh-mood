import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { SessionId, type Session } from '@deepseek-ai/dsh-session'
import * as MoodInvariant from '@deepseek-ai/dsh-mood/invariant'
import InvariantRegistry from '@deepseek-ai/dsh-invariants'
import type { MoodSnapshot } from '@deepseek-ai/dsh-mood'

async function setup(): Promise<Context> {
  const ctx = new Context()
  await ctx.plugin(InvariantRegistry)
  await ctx.plugin(MoodInvariant)
  return ctx
}

const session: Session = { id: SessionId('s1') } as Session
const base = (over: Partial<MoodSnapshot> = {}): MoodSnapshot => ({
  mood: 'GOOD',
  why: undefined,
  transition: 'none',
  journey: ['GOOD'],
  at: 0,
  ...over,
})

describe('dsh-mood invariant', () => {
  it('accepts valid snapshots, including a recovery landing on GOOD', async () => {
    const ctx = await setup()
    const runs = () => {
      ctx.emit('mood/change', session, base({ transition: 'recover', mood: 'GOOD', why: 'Recovered' }))
      ctx.emit('mood/change', session, base({ transition: 'upgrade', mood: 'FRUSTRATED', why: '3 consecutive failures' }))
    }
    expect(runs).not.toThrow()
  })

  it('rejects an unknown mood', async () => {
    const ctx = await setup()
    expect(() => { ctx.emit('mood/change', session, base({ mood: 'BLOATED' as never })) })
      .toThrow(/unknown mood/)
  })

  it('rejects a recover transition that does not land on GOOD', async () => {
    const ctx = await setup()
    expect(() => { ctx.emit('mood/change', session, base({ transition: 'recover', mood: 'FRUSTRATED' })) })
      .toThrow(/must land on GOOD/)
  })

  it('rejects an upgrade landing on GOOD', async () => {
    const ctx = await setup()
    expect(() => { ctx.emit('mood/change', session, base({ transition: 'upgrade', mood: 'GOOD' })) })
      .toThrow(/upgrade cannot land on GOOD/)
  })
})
