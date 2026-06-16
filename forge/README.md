# forge 🔨

一个从零手写的、生产级的编码 Agent CLI —— 配套课程《从零构建生产级 Agent》的实战仓库。

像 Claude Code 一样：装上、敲一句话，它就能读你的代码、改你的代码、跑测试。
但它的每一行都是课程里一章一章讲出来的——你不只是用它，更能看懂它、改造它。

```text
$ forge
forge · 模型 claude-opus-4-8（输入 /help 看命令，/exit 退出）

forge> 帮我把 config 里的端口从 3000 改成 8080
· grep("3000")
· edit(src/config.ts)
⚠ forge 想要执行：修改文件：src/config.ts
允许吗？[y/N] y
已把端口改为 8080，改动在 src/config.ts。
```

---

## 安装

```bash
npm install -g @buaajoseph/forge
```

需要 Node.js >= 18。

也可以不发布、直接从源码用：

```bash
git clone https://github.com/BuaaJoseph/forge.git
cd forge
npm install
npm run build
npm link        # 把本地 forge 链接为全局命令
```

---

## 配置：URL 与 API Key

forge 需要一个 Anthropic API Key 才能工作。有两种配置方式，**任选其一**：

### 方式一：配置文件（推荐，类似 Claude Code）

forge 读取两级配置，**项目级覆盖全局级**：

- 全局：`~/.forge/config.json`
- 项目：`<当前项目>/.forge/config.json`

最小配置只需一个 key：

```json
{
  "apiKey": "sk-ant-xxxxxxxx"
}
```

完整可配项：

```json
{
  "apiKey": "sk-ant-xxxxxxxx",
  "baseURL": "https://api.anthropic.com",
  "model": "claude-opus-4-8",
  "maxTokens": 8192,
  "contextWindow": 1000000,
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "."]
    }
  }
}
```

| 字段 | 说明 | 默认 |
| --- | --- | --- |
| `apiKey` | API 密钥 | 读环境变量 `ANTHROPIC_API_KEY` |
| `baseURL` | API 基址。接入代理 / 中转 / 兼容端点时填；留空走官方 | 官方默认 |
| `model` | 模型标识 | `claude-opus-4-8` |
| `maxTokens` | 单轮最大输出 token | `8192` |
| `contextWindow` | 上下文窗口大小（token） | `1000000` |
| `mcpServers` | 要接入的 MCP server | 无 |

> 💡 仓库根目录有一份 `config.example.json`，把它复制到 `~/.forge/config.json` 改一下即可。
>
> ⚠️ 配置文件里有密钥，**不要提交到 git**。forge 已把项目级 `.forge/` 写进 `.gitignore`。

### 方式二：环境变量

```bash
export ANTHROPIC_API_KEY=sk-ant-xxxxxxxx
# 可选：自定义端点
export ANTHROPIC_BASE_URL=https://your-proxy.example.com
```

> 配置文件里的 `apiKey` / `baseURL` 优先级高于环境变量。

---

## 使用

进入任意项目目录，敲 `forge`：

```bash
cd your-project
forge
```

然后用自然语言交代任务：

```text
forge> 这个项目用的什么测试框架？
forge> 给 utils/date.ts 的 formatDate 补一个处理空值的分支，并加一条单测
forge> 重构 services/user.ts，把里面的回调改成 async/await
```

forge 会自己探索代码、规划步骤、动手修改、跑测试验证。**所有写操作（改文件、跑命令）在执行前都会向你确认。**

### 命令行参数

| 参数 | 作用 |
| --- | --- |
| `forge` | 启动交互式会话 |
| `forge --resume` | 恢复最近一次会话，接着上次继续 |
| `forge --debug` | 调试模式，打印工具输入输出、上下文占用等内部细节 |

### 斜杠命令（会话内）

| 命令 | 作用 |
| --- | --- |
| `/help` | 列出所有命令 |
| `/clear` | 清空当前会话历史 |
| `/model [名称]` | 查看或切换模型 |
| `/plan` | 开/关计划模式（只读调研、先给计划再动手） |
| `/cost` | 查看本次会话的 token 用量、估算花费与平均延迟 |
| `/tools` | 列出已注册的工具 |
| `/exit` | 退出 |

---

## 项目记忆：AGENTS.md

在项目根放一个 `AGENTS.md`，forge 启动时会读它、注入上下文——相当于「项目对 Agent 说的话」：

```markdown
# 项目约定
- 包管理用 pnpm，测试用 `pnpm test`
- 不要改 `generated/` 目录
- 提交信息用中文
```

---

## 安全说明

forge 能改文件、能执行 shell，所以内置了多道闸门，请放心也请知悉：

- **权限模型（Deny > Ask > Allow）**：只读操作放行；写文件 / 执行命令默认会**问你一句**；明显危险的命令（`rm -rf /`、写入 `.git`、越出工作目录等）**直接拒绝**。
- **审计日志**：每次 LLM 往返、权限裁定、确认、工具执行都记进 `.forge/audit-*.jsonl`，可事后回放排查。
- **会话与审计文件**都落在项目的 `.forge/` 下，已被 `.gitignore` 忽略，不会误提交。

> ⚠️ `AGENTS.md` 的内容会被模型完全信任。对来路不明的仓库，先看一眼它的 `AGENTS.md`，警惕藏在里面的诱导指令。

---

## 内置工具

| 工具 | 类型 | 作用 |
| --- | --- | --- |
| `read` | 只读 | 读文件（带行号） |
| `list` | 只读 | 列目录 |
| `glob` | 只读 | 按模式找文件 |
| `grep` | 只读 | 按正则搜内容 |
| `write` | 写 | 覆盖写文件 |
| `edit` | 写 | 精确字符串替换 |
| `bash` | 写 | 执行 shell 命令 |
| `todo_write` | — | 维护任务清单 |
| `task` | — | 派子代理处理独立子任务（隔离上下文） |
| `mcp__*` | — | 来自已接入 MCP server 的外部工具 |

---

## 开发

```bash
npm run dev        # 用 tsx 直接跑源码
npm run typecheck  # 类型检查
npm test           # 跑测试（node:test）
npm run build      # 编译到 dist/
```

### 目录结构

```text
src/
  index.ts          入口：装配 + 事件渲染器
  repl.ts           交互外壳（REPL）
  commands.ts       斜杠命令
  agent.ts          主循环、工具调度、权限闸门、自动压缩
  system.ts         基础 system prompt
  context.ts        组装 system（环境 + AGENTS.md）
  compaction.ts     自动压缩
  config.ts         两级配置
  session.ts        会话持久化 / --resume
  cost.ts           成本与延迟统计
  audit.ts          审计日志
  permissions.ts    权限策略
  mcp.ts            MCP 客户端
  todo.ts           任务清单状态
  types.ts          核心类型
  provider/         LLM Provider 抽象（默认 Claude）
  tools/            工具实现
test/               单测与集成测试
```

---

## License

MIT
