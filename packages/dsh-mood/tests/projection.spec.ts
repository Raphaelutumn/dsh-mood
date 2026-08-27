/**
 * The `mood` projection unit: mounting the plugin beside the projection
 * registry serves a four-state mood view folded from tool events; the exported
 * definition validates the wire schema. Host `ctx.mood` and the projection
 * share the same pure fold, so the projection value tracks the session events.
 */

import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { CallId, createToolResultMessage } from '@deepseek-ai/dsh-llm'
import SessionStore, { SessionId } from '@deepseek-ai/dsh-session'
import type { Session } from '@deepseek-ai/dsh-session'
import SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection'
import * as MoodPlugin from '@deepseek-ai/dsh-mood'
import { makeMoodProjectionDefinition } from '@deepseek-ai/dsh-mood/src/projection.ts'
import type { MoodProjection } from '@deepseek-ai/dsh-mood'

async function harness(withPlugin: boolean): Promise<{ ctx: Context; session: Session }> {
  const ctx = new Context()
  await ctx.plugin(SessionStore)
  await ctx.plugin(SessionProjectionRegistry)
  if (withPlugin) await ctx.plugin(MoodPlugin)
  return { ctx, session: ctx.sessions.create(SessionId('mood-proj')) }
}

/** Append a tool/call then its tool/result at the given success/error flag. */
function toolRun(session: Session, turn: number, step: number, id: string, name: string, isError: boolean): void {
  session.append('tool/call', { turn, step, callId: CallId(id), name, arguments: '{}' })
  session.append('tool/result', {
    turn,
    step,
    message: createToolResultMessage({
      callId: CallId(id),
      content: [{ type: 'text', text: isError ? 'boom' : 'ok' }],
      isError,
    }),
  }, { surfaceOp: 'append' })
}

describe('mood projection unit', () => {
  it('serves GOOD on the empty log and after a single success', async () => {
    const { ctx, session } = await harness(true)
    expect(ctx.sessionProjections.snapshot(session).values.mood?.mood).toBe('GOOD')
    toolRun(session, 1, 1, 'c1', 'read', false)
    expect(ctx.sessionProjections.snapshot(session).values.mood?.mood).toBe('GOOD')
  })

  it('folds consecutive failures into FRUSTRATED and recovers on stable success', async () => {
    const { ctx, session } = await harness(true)
    toolRun(session, 1, 1, 'c1', 'build', true)
    toolRun(session, 1, 2, 'c2', 'build', true)
    toolRun(session, 1, 3, 'c3', 'build', true)
    expect(ctx.sessionProjections.snapshot(session).values.mood?.mood).toBe('FRUSTRATED')
    toolRun(session, 2, 1, 'c4', 'lint', false)
    toolRun(session, 2, 2, 'c5', 'test', false)
    const mood = ctx.sessionProjections.snapshot(session).values.mood
    expect(mood?.mood).toBe('GOOD')
    expect(mood?.change?.transition).toBe('recover')
  })

  it('round-trips through the projection definition schema directly', () => {
    const def = makeMoodProjectionDefinition({
      confusedRepeatThreshold: 3,
      frustratedFailureThreshold: 3,
      overwhelmedSignalCount: 3,
      changeCooldownMs: 1000,
      stableSuccessesToRecover: 2,
      journeyMaxLength: 8,
      repetitionWindow: 12,
      highActivityThreshold: 4,
    })
    expect(def.schema.parse({ mood: 'GOOD', change: null, journey: ['GOOD'] } satisfies MoodProjection)).toEqual({
      mood: 'GOOD',
      change: null,
      journey: ['GOOD'],
    })
  })
})
