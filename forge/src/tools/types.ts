// 工具契约：一个工具 = 给模型看的「说明书」(name/description/inputSchema) + forge 真正执行的 execute。

/** JSON Schema（简化版），用来告诉模型某个工具该怎么填参数。 */
export interface JSONSchema {
  type: 'object'
  properties: Record<string, unknown>
  required?: string[]
}

/** 工具执行时能拿到的运行环境。后续卷会往里加权限、日志等。 */
export interface ToolContext {
  /** 工作目录，所有相对路径以它为基准。 */
  cwd: string
}

/** 一次工具执行的结果。 */
export interface ToolResult {
  /** 回灌给模型的文本。 */
  output: string
  /** 是否出错。 */
  isError?: boolean
}

export interface Tool {
  /** 工具名，必须唯一，模型用它点名调用。 */
  name: string
  /** 给模型看的说明：什么时候用、注意什么。写得越清楚模型用得越准。 */
  description: string
  /** 参数的 JSON Schema。 */
  inputSchema: JSONSchema
  /**
   * 是否只读。只读工具(read/list/glob/grep)互不影响、可并行；
   * 写工具(write/edit/bash)会改状态，必须串行。主循环靠这个标记调度。
   */
  readOnly: boolean
  /** 真正干活的地方。入参是模型填好的参数，出参是要回灌的结果。 */
  execute(input: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult>
}
