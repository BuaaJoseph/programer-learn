import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Agent } from '../src/agent.js'
import type { Provider, CompleteParams } from '../src/provider/types.js'
import type { AssistantTurn } from '../src/types.js'
import { writeTool } from '../src/tools/write.js'

// 假 Provider：按脚本依次返回预设回合，完全离线——这样能在没有网络/密钥的情况下测主循环。
class FakeProvider implements Provider {
  readonly model = 'fake'
  readonly contextWindow = 100_000
  private i = 0
  constructor(private turns: AssistantTurn[]) {}
  async complete(_p: CompleteParams): Promise<AssistantTurn> {
    return this.turns[this.i++]
  }
  async countTokens(): Promise<number> {
    return 0
  }
}

test('主循环：纯文本回合即停机', async () => {
  const provider = new FakeProvider([
    { content: [{ type: 'text', text: '你好' }], stopReason: 'end_turn', usage: { inputTokens: 1, outputTokens: 1 } },
  ])
  const agent = new Agent({ provider, tools: [], system: '', cwd: process.cwd() })
  const out = await agent.runTurn('hi')
  assert.equal(out, '你好')
})

test('主循环：执行工具后再停机', async () => {
  const cwd = mkdtempSync(join(tmpdir(), 'forge-'))
  const provider = new FakeProvider([
    {
      content: [{ type: 'tool_use', id: 't1', name: 'write', input: { path: 'a.txt', content: 'hi' } }],
      stopReason: 'tool_use',
      usage: { inputTokens: 1, outputTokens: 1 },
    },
    { content: [{ type: 'text', text: '写好了' }], stopReason: 'end_turn', usage: { inputTokens: 1, outputTokens: 1 } },
  ])
  const agent = new Agent({
    provider,
    tools: [writeTool],
    system: '',
    cwd,
    // 测试里放行所有操作，避免卡在确认。
    permissions: { decide: () => ({ decision: 'allow', reason: '' }) },
  })
  const out = await agent.runTurn('写个文件')
  assert.equal(out, '写好了')
})

test('权限为 ask 且无 confirm 时拒绝执行', async () => {
  const cwd = mkdtempSync(join(tmpdir(), 'forge-'))
  const provider = new FakeProvider([
    {
      content: [{ type: 'tool_use', id: 't1', name: 'write', input: { path: 'a.txt', content: 'hi' } }],
      stopReason: 'tool_use',
      usage: { inputTokens: 1, outputTokens: 1 },
    },
    { content: [{ type: 'text', text: '没写成' }], stopReason: 'end_turn', usage: { inputTokens: 1, outputTokens: 1 } },
  ])
  const agent = new Agent({
    provider,
    tools: [writeTool],
    system: '',
    cwd,
    permissions: { decide: () => ({ decision: 'ask', reason: '写文件' }) },
    // 不提供 confirm：ask 应被视为拒绝
  })
  const out = await agent.runTurn('写个文件')
  assert.equal(out, '没写成')
})
