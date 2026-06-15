# 大模型学习手册 · 从原理到 Agent

一个用「直白讲清概念 + 举例子 + 动手实践」的方式，讲透大语言模型（LLM）原理与 Agent 开发的中文学习网站。
浅色「技术文档」风格，面向会编程、用过 LLM API 但想搞懂内部机制的工程师。

内容从「下一个词预测」这一最底层动作讲起，一路覆盖 Prompt 工程、微调、工具调用、记忆与 RAG、
自主 Agent、多 Agent 协作，直到能上线、扛流量、省成本的生产化系统——共 **8 卷 40 章**。

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
（见 `src/styles/`），章节正文为手写的 React 组件（见 `src/content/`），通过 `React.lazy` 按需加载。
学习进度记录在浏览器 `localStorage`。

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
  main.jsx, App.jsx          # 入口与路由
  context/AppContext.jsx     # 全局进度与主题
  hooks/                     # useProgress、useTheme
  data/curriculum.js         # 8 卷 40 章的课程目录数据
  content/                   # registry.js + volume1..8/ChX.jsx（40 章正文）
  components/                # Layout / TopBar / Sidebar
    cards/                   # Lead/KeyIdea/Example/Practice/Callout/CodeBlock/Summary
    illustrations/           # 5 个交互式 SVG 插画
  pages/                     # Home / ChapterPage / Placeholder / NotFound
  styles/                    # theme / global / components
```

## 许可

仅供学习交流使用。
