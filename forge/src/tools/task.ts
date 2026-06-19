import type { Tool } from './types.js'

// task：把一个独立子任务交给「子代理」处理。子代理在隔离的上下文里自己跑很多轮，
// 只把最终结果摘要回传给主代理——本质是个「上下文隔离器」，避免几十个文件内容污染主上下文。
//
// 真正怎么跑一个子代理由上层注入（run 闭包），这样本文件不直接依赖 Agent，避免循环依赖。
export function makeTaskTool(run: (prompt: string, cwd: string) => Promise<string>): Tool {
  return {
    name: 'task',
    // 标记只读：派生子代理这个动作本身不写盘；子代理内部真正的写操作会各自走权限闸门。
    readOnly: true,
    description:
      '把一个范围明确但过程冗长的子任务交给子代理处理（它有完整工具、独立上下文，只回传结果摘要）。适合「在整个仓库里找出所有 X 并整理」这类会读很多文件的调研任务，避免污染主上下文。给它一个自包含、目标清晰的 prompt。',
    inputSchema: {
      type: 'object',
      properties: {
        description: { type: 'string', description: '子任务的一句话描述（便于展示）。' },
        prompt: { type: 'string', description: '交给子代理的完整任务说明，必须自包含。' },
      },
      required: ['prompt'],
    },
    async execute(input, ctx) {
      const prompt = String(input.prompt ?? '')
      if (!prompt) return { output: 'task 需要一个非空的 prompt。', isError: true }
      const result = await run(prompt, ctx.cwd)
      return { output: result || '(子代理没有返回文本结果)' }
    },
  }
}
