# 编程学习站

一个多课程的中文技术学习平台，浅色「技术文档」风格。课程按**两级分类**组织
（如 `服务端 / Java`、`服务端 / 中间件`、`服务端 / Agent 开发`、`前端 / Vue`），
每门课都用「直白讲清概念 + 举例子 + 动手实践」的方式，带你从原理学到落地。

平台采用「平台外壳 + 课程模块」的架构：新增一门课只需在 `src/courses/` 下建一个自包含模块，
再到 `src/catalog/courses.js` 注册一行，它就会自动出现在对应分类下。已为将来的**登录、支付**预留了
接口（`src/shared/AuthContext.jsx` 与课程 `pricing` / 章节试读字段）。

## 已上线课程

### 大模型学习手册 · 从原理到 Agent（`服务端 / Agent 开发`）

从「下一个词预测」这一最底层动作讲起，一路覆盖 Prompt 工程、微调、工具调用、记忆与 RAG、
自主 Agent、多 Agent 协作，直到能上线、扛流量、省成本的生产化系统——共 **8 卷 40 章**。

### MySQL 深入浅出 · 引擎 · 事务 · 索引 · MVCC（`服务端 / 数据库`）

把 InnoDB 的存储引擎、索引、事务与 MVCC 讲透，配大量**交互式动态图解**
（Buffer Pool 命中、B+Tree 查找、回表、最左前缀、隔离级别异常、间隙锁/Next-Key、
WAL 日志流程、MVCC 版本链 + ReadView）——共 **4 卷 12 章**。

## 面试模拟（AI 模拟面试）

顶部菜单「🎤 面试模拟」进入。上传简历（PDF/TXT/Markdown 自动提取，或粘贴正文/填链接）、
选择岗位（服务端 / 前端 / iOS / Android / 算法 / Agent / 大模型算法），按岗位推荐勾选考察技能点
（也可自定义添加），即可开始一场约 **1 小时**的全真模拟面试：

> 面试官模型的**接口地址与密钥在服务端 `.env` 配置**（类似 Claude Code，变量名 `ANTHROPIC_BASE_URL` /
> `ANTHROPIC_AUTH_TOKEN` 对齐，可直接复用 Claude Code 配置；默认走 Anthropic Messages 协议，
> 也支持 `INTERVIEW_API_STYLE=openai`），不再在页面填写。详见 `server/.env.example`。
> 设置页可一键「测试连通性」，或 `curl -X POST http://localhost:8787/api/interview/ping`。

1. **个人介绍**（约5min）破冰，考察语言组织
2. **项目考察**（约20min）按简历深挖项目、针对性追问
3. **技术考察**（约20min）结合项目与勾选技能考察中间件与底层原理
4. **AI 编程**（约5min）vibe coding / LLM 使用等开放问题
5. **编程考察**（约10min）从 **35+ 道中等及以上**题库随机出题，内置 **Java / Python** 双标签
   代码编辑器（基础库自动联想 + 真实执行），写完可提交给面试官点评

全程支持**语音对话**：面试官回答边输出文字边朗读（TTS），你也可以点麦克风**语音作答**（STT，建议 Chrome/Edge）。
语音**默认复用聊天模型的 base+token** 走 OpenAI 兼容的 `/v1/audio/speech`（多数中转一套 key 通吃 OpenAI 全部接口），
开箱即用**云端神经语音**（`nova` 等音色），效果接近 ChatGPT 语音对话；若该接口不可用会自动回退到浏览器内置 TTS
（已内置 JVM/Redis 等术语读音修正与更优音色挑选，面试页右上角可手选音色）。可用 `INTERVIEW_TTS_DISABLED=1` 强制用浏览器语音。
面试结束点「结束并生成评分报告」，由模型结合本次问答给出 **A/B/C/D/E** 五级评分、
结合实例的亮点与不足分析、后续提升建议与本站相关课程链接，并产出一份**可下载 / 可在浏览器直接打开的 HTML 报告**。

> 实现：面试官对话经后端 `/api/interview/chat`，按 env 配置转发到 Anthropic/OpenAI 兼容接口并统一为流式 SSE；
> 代码执行经 `/api/interview/run-code` 代理到 Piston（可自建，见 `server/.env.example`）。
> 简历附件 PDF 解析用 CDN 懒加载的 pdf.js；语音用浏览器原生 Web Speech API，零额外依赖。

## 课程结构

| 卷 | 主题 | 章数 |
| --- | --- | --- |
| 第 1 卷 | 大模型基础原理（next-token / 注意力 / Transformer / 上下文 / 幻觉） | 7 |
| 第 2 卷 | Prompt 与输出控制 | 5 |
| 第 3 卷 | 微调 Fine-tuning（SFT / LoRA / 数据集 / RLHF） | 6 |
| 第 4 卷 | 工具调用与 Agent 起点（function calling / ReAct） | 4 |
| 第 5 卷 | 记忆与 RAG | 5 |
| 第 6 卷 | 自主 Agent（规划 / 反思 / 护栏 / 评估） | 5 |
| 第 7 卷 | 多 Agent 协作 | 4 |
| 第 8 卷 | 生产化（可观测性 / 成本 / 部署 / 毕业项目） | 4 |

每章按固定节奏推进：**讲清楚 → 举例子 → 动手做**，并配有交互式内联 SVG 图解
（下一个词接龙、分词/词向量、注意力连线、温度采样、ReAct 循环）。

## 技术栈

纯前端单页应用，**只用三个运行时依赖**：

- [Vite 5](https://vitejs.dev/) — 构建工具
- [React 18](https://react.dev/) — UI
- [react-router-dom 6](https://reactrouter.com/) — 路由

没有引入任何 UI 库、CSS 框架、状态管理库或 Markdown 库。样式为手写 CSS + 设计令牌
（见 `src/styles/`），章节正文为手写的 React 组件，通过 `React.lazy` 按需加载。
学习进度按 `课程/章节` 复合键记录在浏览器 `localStorage`。

登录已接入轻量后端（`server/`，Express + Node 内置 SQLite）：支持**邮箱 + 验证码**与
**邮箱 + 密码**两种方式，发码前有图形验证码、同邮箱 60s 限流、验证码 10min 有效，
密码用 scrypt 加盐哈希存储（不存原文）。详见 [`server/README.md`](server/README.md)。
支付后端仍为预留接口。

## 本地运行

```bash
npm install      # 安装依赖
npm run dev      # 启动开发服务器
npm run build    # 生产构建，输出到 dist/
npm run preview  # 本地预览生产构建
```

## 目录结构

```
src/
  main.jsx, App.jsx           # 入口与路由
  catalog/                    # 平台「数据库」
    categories.js             # 两级分类定义
    courses.js                # 课程注册表（新增课程在此注册）
  courses/                    # 每门课一个自包含模块
    llm-handbook/
      meta.js                 # 课程元信息（标题、归属分类、定价…）
      curriculum.js           # 卷/章大纲数据
      content/                # registry.js + volume1..8/ChX.jsx（40 章正文）
      index.js                # 课程统一出口
  platform/                   # 平台级页面与导航
    PlatformLayout.jsx
    pages/                    # Home / Browse / CourseLanding / Search / NotFound
    components/               # GlobalNav / CourseCard
  reader/                     # 章节阅读器（课程作用域）
    ReaderLayout.jsx / TopBar / Sidebar / ChapterPage / Placeholder
  components/                 # 跨课程共享 UI
    cards/                    # Lead/KeyIdea/Example/Practice/Callout/CodeBlock/Summary
    illustrations/            # 交互式 SVG 插画
  context/AppContext.jsx      # 全局进度与主题
  shared/AuthContext.jsx      # 登录/支付预留接口（占位）
  hooks/                      # useProgress、useTheme
  styles/                     # theme / global / components / platform
```

## 路由

| 路由 | 页面 |
| --- | --- |
| `/` | 平台首页（分类导航 + 课程网格） |
| `/c/:cat` · `/c/:cat/:sub` | 分类浏览页 |
| `/course/:courseSlug` | 课程详情/大纲页 |
| `/course/:courseSlug/:chapterSlug` | 章节阅读器 |
| `/search?q=` | 跨课程搜索 |

## 新增一门课

1. 在 `src/courses/<slug>/` 下建 `meta.js`（含 `categoryId` / `subCategoryId`）、`curriculum.js`、`content/` 与 `index.js`。
2. 在 `src/catalog/courses.js` 里 `import` 并加入 `COURSES` 数组。
3. 完成——它会自动出现在对应分类页与首页。

## 许可

仅供学习交流使用。
