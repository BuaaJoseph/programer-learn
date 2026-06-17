// 前端工程化 · 从构建原理到 CI/CD：8 卷 16 章。slug 规则 e{卷}-c{章}。
export const VOLUMES = [
  {
    id: 'e0',
    index: 0,
    title: '导论：前端为什么需要工程化',
    subtitle: 'Why Engineering',
    theme: '先想清楚前端工程化到底解决什么问题：从「几个 script 标签」到大型协作工程，复杂度从哪来、工具链如何分工。建立全课的心智地图。',
    chapters: [
      { slug: 'e0-c1', title: '前端工程化解决什么问题', topic: '动机', hook: '依赖管理、模块化、编译转译、代码质量、构建优化、协作规范、自动化发布——前端从玩具走向工程，每一块复杂度都需要工具来驯服。', minutes: 90, hasContent: true },
      { slug: 'e0-c2', title: '现代前端工具链全景', topic: '概览', hook: '包管理器、构建工具、转译器、Linter、测试、CI/CD——一张图看清现代前端工具链每块在哪、彼此怎么衔接，知道后面各章在讲什么。', minutes: 90, hasContent: true },
    ],
  },
  {
    id: 'e1',
    index: 1,
    title: '模块化与打包原理',
    subtitle: 'Modules & Bundling',
    theme: '工程化的核心机制。讲透模块化的演进与依赖图，再揭开打包器的黑盒：它如何从一个入口出发，分析依赖、转换、拼成浏览器能跑的 bundle。',
    chapters: [
      { slug: 'e1-c1', title: '模块化与依赖图：打包的起点', topic: '原理', hook: 'CommonJS 与 ESM 的差异、静态分析为何重要、打包器如何从入口文件递归构建一张模块依赖图（dependency graph）——一切打包从这张图开始。', minutes: 120, hasContent: true },
      { slug: 'e1-c2', title: '打包原理：从源码到 bundle', topic: '原理', hook: '解析（AST）→ 加载与转换（loader/插件）→ 构建依赖图 → 生成 chunk → 输出。手写一个极简打包器的思路，看懂 webpack 运行时如何在浏览器里串起模块。', minutes: 150, hasContent: true },
    ],
  },
  {
    id: 'e2',
    index: 2,
    title: '构建工具：Vite 与它的对手',
    subtitle: 'Build Tools',
    theme: '把打包原理落到具体工具。讲透 Vite 为何快（dev 用浏览器原生 ESM、prod 用 Rollup 的双引擎），再横向对比 webpack/Rollup/esbuild 的定位与取舍。',
    chapters: [
      { slug: 'e2-c1', title: 'Vite 原理：dev 用 ESM、prod 用 Rollup', topic: '原理', hook: 'Vite 开发时不打包，直接用浏览器原生 ESM 按需请求 + esbuild 预构建依赖，所以启动近乎瞬时；生产时用 Rollup 打包优化——讲清这套「双引擎」。', minutes: 150, hasContent: true },
      { slug: 'e2-c2', title: 'webpack / Rollup / esbuild 对比与选型', topic: '原理', hook: 'webpack（功能全、生态大、应用打包）、Rollup（库打包、产物干净）、esbuild（Go 写、极快、做转译/预构建）——它们的定位、性能与适用场景对比。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'e3',
    index: 3,
    title: 'TypeScript 工程化',
    subtitle: 'TypeScript at Scale',
    theme: '把 TS 用在真实工程。讲 tsconfig 关键配置与类型检查策略、声明文件与第三方类型，以及类型检查与构建工具（只转译不检查）如何分工协作。',
    chapters: [
      { slug: 'e3-c1', title: 'tsconfig 与类型检查策略', topic: '原理', hook: 'strict 全家桶、target/module/moduleResolution、paths 路径别名、incremental/项目引用——tsconfig 的关键选项各自影响什么。', minutes: 120, hasContent: true },
      { slug: 'e3-c2', title: '类型与构建的分工：声明文件与集成', topic: '实战', hook: '为什么 Vite/esbuild 只转译不做类型检查、要单独跑 tsc --noEmit；.d.ts 声明文件、@types 与 DefinitelyTyped、给库产出类型——把类型安全接进工程流水线。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'e4',
    index: 4,
    title: '代码质量与规范',
    subtitle: 'Code Quality',
    theme: '团队协作靠规范托底。讲 ESLint 的检查机制与 Prettier 的格式化分工、如何用 Git hooks 在提交前自动把关，以及提交信息规范与测试集成。',
    chapters: [
      { slug: 'e4-c1', title: 'ESLint 与 Prettier：检查与格式化', topic: '实战', hook: 'ESLint 查「可能的错误与坏味道」（含 AST 规则原理、flat config），Prettier 管「统一格式」，两者如何分工配合、避免规则打架。', minutes: 120, hasContent: true },
      { slug: 'e4-c2', title: 'Git hooks、提交规范与测试集成', topic: '实战', hook: '用 husky + lint-staged 在 pre-commit 只检查改动文件、commitlint 约束提交信息（Conventional Commits）、把单测接进流程——让规范自动执行而非靠自觉。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'e5',
    index: 5,
    title: '包管理与 Monorepo',
    subtitle: 'Packages & Monorepo',
    theme: '依赖与多包协作。讲包管理器（npm/yarn/pnpm）的依赖解析与 pnpm 的硬链接方案，再到用 workspace + Turborepo 管理 Monorepo 与任务编排。',
    chapters: [
      { slug: 'e5-c1', title: '包管理器与依赖解析：npm / yarn / pnpm', topic: '原理', hook: 'node_modules 的扁平化与「幽灵依赖」、lockfile 锁定版本、pnpm 用硬链接 + 内容寻址解决重复与依赖隔离——讲清三者差异与 pnpm 为何省空间又严格。', minutes: 120, hasContent: true },
      { slug: 'e5-c2', title: 'Monorepo：workspace 与 Turborepo', topic: '实战', hook: '一个仓库管多个包的好处与代价；用 pnpm workspace 组织本地包互相引用，用 Turborepo 做任务编排与构建缓存，让 Monorepo 又快又有序。', minutes: 150, hasContent: true },
    ],
  },
  {
    id: 'e6',
    index: 6,
    title: '构建产物与性能优化',
    subtitle: 'Build Optimization',
    theme: '让产物又小又快。讲代码分割与懒加载、Tree Shaking 与压缩、产物分析与缓存策略，以及核心 Web 指标（Core Web Vitals）的工程化优化。',
    chapters: [
      { slug: 'e6-c1', title: '产物优化：代码分割、Tree Shaking 与压缩', topic: '原理', hook: '代码分割按需加载、Tree Shaking 靠 ESM 静态结构摇掉死代码、minify 与 gzip/brotli 压缩、长效缓存的 contenthash——把 bundle 体积压到最小。', minutes: 150, hasContent: true },
      { slug: 'e6-c2', title: '性能分析与 Web 指标优化', topic: '实战', hook: '用 bundle 分析工具找体积大头、按路由/依赖分包、预加载与懒加载策略；以及围绕 LCP/CLS/INP 等核心 Web 指标做工程化优化。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'e7',
    index: 7,
    title: 'CI/CD 与部署',
    subtitle: 'CI/CD & Deploy',
    theme: '把工程跑通到上线。讲持续集成流水线（自动化检查/测试/构建）、部署方式（静态托管/容器/CDN）与环境管理，收束全课的工程化闭环。',
    chapters: [
      { slug: 'e7-c1', title: 'CI 流水线：自动化检查、测试与构建', topic: '实战', hook: '用 GitHub Actions 搭一条流水线：装依赖（带缓存）→ lint → 类型检查 → 测试 → 构建 → 产出制品；讲清触发、并行、缓存与质量门禁。', minutes: 150, hasContent: true },
      { slug: 'e7-c2', title: '部署：静态托管、Docker 与 CDN', topic: '总结', hook: 'SPA 静态托管（Vercel/Netlify/Nginx）的路由回退、用 Docker 多阶段构建打镜像、CDN 与缓存失效、环境变量与多环境——把工程送上线，收束全课。', minutes: 120, hasContent: true },
    ],
  },
]

export const FLAT_CHAPTERS = VOLUMES.flatMap((vol) =>
  vol.chapters.map((ch) => ({ ...ch, volumeId: vol.id, volumeIndex: vol.index, volumeTitle: vol.title })),
)
export const TOTAL_CHAPTERS = FLAT_CHAPTERS.length
export const TOTAL_MINUTES = FLAT_CHAPTERS.reduce((sum, ch) => sum + ch.minutes, 0)
export function findChapterBySlug(slug) {
  const i = FLAT_CHAPTERS.findIndex((ch) => ch.slug === slug)
  if (i === -1) return { chapter: null, prev: null, next: null }
  return { chapter: FLAT_CHAPTERS[i], prev: i > 0 ? FLAT_CHAPTERS[i - 1] : null, next: i < FLAT_CHAPTERS.length - 1 ? FLAT_CHAPTERS[i + 1] : null }
}
export function findVolumeById(id) {
  return VOLUMES.find((v) => v.id === id) || null
}
