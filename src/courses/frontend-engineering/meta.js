export const meta = {
  slug: 'frontend-engineering',
  title: '前端工程化：从构建原理到 CI/CD',
  shortTitle: '前端工程化',
  subtitle: 'Frontend Engineering & Tooling',
  categoryId: 'frontend',
  subCategoryId: 'engineering',
  level: '系统',
  cover: '🛠️',
  coverScene: 'buildpipeline',
  accent: '#646cff',
  pricing: 'free',
  description:
    '一门把前端「工程地基」讲透的课：先想清前端工程化到底解决什么问题，再深入模块化与打包原理（依赖图、从源码到 bundle）、构建工具（Vite 的 dev/prod 双引擎、webpack/Rollup/esbuild 对比）；系统覆盖 TypeScript 工程配置、代码质量体系（ESLint/Prettier/Git hooks）、包管理与 Monorepo（pnpm workspace/Turborepo）、构建产物与性能优化（代码分割/Tree Shaking/体积分析），最后落到 CI/CD 流水线与部署（静态托管/Docker/CDN）。每章原理配交互图、实战配可运行配置。',
  audience: [
    '会写组件但说不清「打包/Tree Shaking/Vite 为什么快」的前端',
    '想从「会用脚手架」升级到「懂工程化原理」的工程师',
    '要搭建项目工程规范、Monorepo 与 CI/CD 流水线的开发者',
  ],
  outcomes: [
    '讲清前端工程化解决的问题与现代工具链全景',
    '理解模块化与打包原理，说清 Vite/webpack/Rollup/esbuild 的取舍',
    '落地 TS 工程配置、代码质量体系与 Monorepo',
    '掌握构建产物优化、CI/CD 流水线与部署实践',
  ],
}

export default meta
