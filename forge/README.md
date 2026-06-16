# forge

一个从零手写的、生产级的编码 Agent CLI —— 配套课程《从零构建生产级 Agent》的实战仓库。

> 这个仓库不是「一次性写好的成品」，而是**跟着课程一章一章长出来的**。每一章对应一段真实代码，
> 你可以 `git log` 着读，也可以从空文件夹开始自己敲一遍。

## 它现在能做什么（卷 0 ~ 卷 1 里程碑）

- 一个最小 REPL：和你多轮对话
- 一个真正的 Agent 主循环：调模型 → 执行工具 → 回灌 → 循环，直到任务完成
- 7 个内置工具：
  - 只读（眼睛）：`read` `list` `glob` `grep` —— 并行执行
  - 写（手）：`write` `edit` `bash` —— 串行执行
- 一层薄薄的 Provider 抽象，默认使用 Claude

后续卷会加上：流式渲染、斜杠命令、权限与人在回路、上下文工程与自动压缩、
计划与子代理、配置与 MCP、会话恢复、测试、打包发布。

## 快速开始

```bash
npm install
export ANTHROPIC_API_KEY=sk-...
npm run dev
```

然后在 `forge>` 提示符后输入任务，例如：

```
forge> 看一下这个项目结构，然后给 README 加一句话介绍
```

输入 `exit` 退出。

## 脚本

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 用 tsx 直接跑源码（开发） |
| `npm run typecheck` | 类型检查 |
| `npm run build` | 编译到 `dist/` |
| `npm start` | 跑编译后的产物 |

## 目录结构

```
src/
  index.ts          入口 + 最小 REPL
  agent.ts          Agent 主循环与工具调度
  system.ts         基础 system prompt
  types.ts          消息 / 内容块 / 用量等核心类型
  provider/         LLM Provider 抽象（默认 Claude）
    types.ts
    claude.ts
  tools/            工具实现
    types.ts        工具契约
    index.ts        工具注册表
    read.ts list.ts glob.ts grep.ts   只读工具
    write.ts edit.ts bash.ts          写工具
    walk.ts         目录遍历 + glob 编译（glob/grep 共用）
```

## License

MIT
