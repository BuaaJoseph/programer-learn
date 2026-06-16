// 任务清单的共享状态。todo_write 工具往里写，CLI 可读出来展示。
export type TodoStatus = 'pending' | 'in_progress' | 'completed'

export interface TodoItem {
  content: string
  status: TodoStatus
}

export class TodoStore {
  items: TodoItem[] = []

  set(items: TodoItem[]): void {
    this.items = items
  }

  // 渲染成给人/模型看的清单文本。
  render(): string {
    if (this.items.length === 0) return '(暂无待办)'
    const mark: Record<TodoStatus, string> = { pending: '[ ]', in_progress: '[~]', completed: '[x]' }
    return this.items.map((t) => `${mark[t.status]} ${t.content}`).join('\n')
  }
}
