import type { Provider } from './types.js'
import { ClaudeProvider } from './claude.js'

// Provider 工厂：把「选哪个 LLM」收敛到一处。默认 Claude，新增 Provider 只需在这里注册一行。
// 主循环、工具、CLI 都只依赖 Provider 接口，不关心背后是谁——这就是薄抽象层的价值。
export interface ProviderConfig {
  provider?: string
  model?: string
  apiKey?: string
  baseURL?: string
  contextWindow?: number
}

export function createProvider(cfg: ProviderConfig = {}): Provider {
  const name = cfg.provider ?? 'claude'
  switch (name) {
    case 'claude':
      return new ClaudeProvider({ model: cfg.model, apiKey: cfg.apiKey, baseURL: cfg.baseURL, contextWindow: cfg.contextWindow })
    default:
      throw new Error(`未知 provider「${name}」。目前内置：claude。新增 provider 只需实现 Provider 接口并在 createProvider 注册。`)
  }
}

export type { Provider } from './types.js'
