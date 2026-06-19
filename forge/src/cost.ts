import type { Usage } from './types.js'

// 成本与延迟统计：累计每轮 token 用量、估算花费、记录耗时，让 forge 对自己的开销心里有数。
export interface Pricing {
  /** 每百万输入 token 美元价。 */
  inputPerM: number
  /** 每百万输出 token 美元价。 */
  outputPerM: number
}

// 价格表（美元/百万 token）。新模型按需补充。
export const PRICING: Record<string, Pricing> = {
  'claude-opus-4-8': { inputPerM: 5, outputPerM: 25 },
  'claude-sonnet-4-6': { inputPerM: 3, outputPerM: 15 },
  'claude-haiku-4-5': { inputPerM: 1, outputPerM: 5 },
}

export class CostTracker {
  inputTokens = 0
  outputTokens = 0
  rounds = 0
  totalMs = 0

  add(usage: Usage, ms: number): void {
    this.inputTokens += usage.inputTokens
    this.outputTokens += usage.outputTokens
    this.rounds += 1
    this.totalMs += ms
  }

  estimateUsd(model: string): number {
    const p = PRICING[model]
    if (!p) return 0
    return (this.inputTokens / 1e6) * p.inputPerM + (this.outputTokens / 1e6) * p.outputPerM
  }

  summary(model: string): string {
    const usd = this.estimateUsd(model)
    const avg = this.rounds ? Math.round(this.totalMs / this.rounds) : 0
    return `轮数 ${this.rounds} · 输入 ${this.inputTokens} tok · 输出 ${this.outputTokens} tok · 约 $${usd.toFixed(4)} · 平均延迟 ${avg}ms`
  }
}
