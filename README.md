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
学习进度按 `课程/章节` 复合键记录在浏览器 `localStorage`。登录/支付后端尚未接入，仅预留接口。

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
