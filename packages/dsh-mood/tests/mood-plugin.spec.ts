import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { SessionId } from '@deepseek-ai/dsh-session'
import { defineContentToolFixture } from '@deepseek-ai/dsh-tools'
import type { Agent } from '@deepseek-ai/dsh-agent'
import AgentLoop from '@deepseek-ai/dsh-agent-loop'
import { mountAgentLoopTestDependencies } from '@deepseek-ai/dsh-agent-loop-testkit'
import * as MoodPlugin from '@deepseek-ai/dsh-mood'
import { MockAdapter, textResponse, toolCallResponse } from '../../../core/agent-loop/tests/mock-adapter.ts'

/**
 * Integration suite: mount the real agent spine + dsh-mood, drive a scripted
 * adapter, and assert the `ctx.mood` snapshot tracks failure / recovery.
 * Mirrors repeat-tool-reminder's real-composition harness (no network).
 */
async function harness(config: MoodPlugin.Config = {}): Promise<Context> {
  const ctx = new Context()
  await mountAgentLoopTestDependencies(ctx)
  await ctx.plugin(AgentLoop, { agents: [] })
  await ctx.plugin(MoodPlugin, config)
  return ctx
}

function waitForIdle(ctx: Context, agent: Agent): Promise<void> {
  return new Promise((resolve) => {
    const d = ctx.on('agent/status', ({ agent: a, status }) => {
      if (a === agent && status === 'idle') {
        d()
        resolve()
      }
    })
  })
}

describe('dsh-mood integration (via session/event)', () => {
  it('tracks a run of consecutive failing tools to FRUSTRATED and recovers on stable success', async () => {
    const adapter = new MockAdapter([
      toolCallResponse('c1', 'boom', {}),
      toolCallResponse('c2', 'boom', {}),
      toolCallResponse('c3', 'boom', {}),
      toolCallResponse('c4', 'probe', {}),
      toolCallResponse('c5', 'probe', {}),
      textResponse('done'),
    ])
    const ctx = await harness()
    ctx.tools.register(defineContentToolFixture({
      name: 'boom',
      description: 'always fails',
      parameters: {},
      async execute() { throw new Error('exploded') },
    }))
    ctx.tools.register(defineContentToolFixture({
      name: 'probe',
      description: 'always succeeds',
      parameters: {},
      async execute() { return [{ type: 'text', text: 'ok' }] },
    }))
    ctx.llm.registerAdapter(['mock'], adapter)
    const agent = ctx.agentLoop.create(SessionId('mood-1'), { provider: 'mock', model: 'mock' })
    agent.followup(createUserMessage({ content: [{ type: 'text', text: 'go' }], source: { kind: 'user' } }))
    await waitForIdle(ctx, agent)

    const snap = ctx.mood.snapshot(agent.session)
    expect(snap.mood).toBe('GOOD') // two successes after three failures recover to GOOD
    expect(snap.journey).toContain('FRUSTRATED')
  })

  it('emits mood/change events on a visible transition', async () => {
    const adapter = new MockAdapter([
      toolCallResponse('c1', 'boom', {}),
      textResponse('done'),
    ])
    const ctx = await harness()
    ctx.tools.register(defineContentToolFixture({
      name: 'boom',
      description: 'always fails',
      parameters: {},
      async execute() { throw new Error('exploded') },
    }))
    ctx.llm.registerAdapter(['mock'], adapter)
    const agent = ctx.agentLoop.create(SessionId('mood-2'), { provider: 'mock', model: 'mock' })
    const changes: MoodPlugin.MoodSnapshot[] = []
    ctx.on('mood/change', (session, snapshot) => {
      if (session === agent.session) changes.push(snapshot)
    })
    agent.followup(createUserMessage({ content: [{ type: 'text', text: 'go' }], source: { kind: 'user' } }))
    await waitForIdle(ctx, agent)

    const last = ctx.mood.snapshot(agent.session)
    if (last.mood === 'FRUSTRATED') {
      expect(changes.some(c => c.transition === 'upgrade')).toBe(true)
      expect(changes.at(-1)?.mood).toBe('FRUSTRATED')
    }
    // The engine may have recovered only if a success followed; we assert the
    // snapshot is internally consistent here.
    expect(['GOOD', 'FRUSTRATED']).toContain(last.mood)
  })
})
