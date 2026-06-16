import type { Tool } from './types.js'
import type { TodoStore, TodoItem, TodoStatus } from '../todo.js'

// todo_write：让 Agent 把大任务拆成清单、并随进度更新。覆盖式写入（每次传完整列表）。
// 它不碰文件系统，所以标记为只读——不需要确认、可静默执行。
export function makeTodoTool(store: TodoStore): Tool {
  return {
    name: 'todo_write',
    description:
      '维护任务清单。传入完整的待办列表（覆盖式）：每项含 content（任务描述）与 status（pending/in_progress/completed）。同一时刻最多一个 in_progress。用于规划多步任务、追踪进度，不要用于琐碎的单步任务。',
    readOnly: true,
    inputSchema: {
      type: 'object',
      properties: {
        todos: {
          type: 'array',
          description: '完整的待办列表',
          items: {
            type: 'object',
            properties: {
              content: { type: 'string' },
              status: { type: 'string', enum: ['pending', 'in_progress', 'completed'] },
            },
            required: ['content', 'status'],
          },
        },
      },
      required: ['todos'],
    },
    async execute(input) {
      const raw = Array.isArray(input.todos) ? (input.todos as unknown[]) : []
      const items: TodoItem[] = raw.map((t) => {
        const o = t as Record<string, unknown>
        return { content: String(o.content ?? ''), status: (o.status as TodoStatus) ?? 'pending' }
      })
      const inProgress = items.filter((t) => t.status === 'in_progress').length
      if (inProgress > 1) {
        return { output: '同一时刻只能有一个进行中(in_progress)的任务，请调整后重试。', isError: true }
      }
      store.set(items)
      return { output: '已更新任务清单：\n' + store.render() }
    },
  }
}
