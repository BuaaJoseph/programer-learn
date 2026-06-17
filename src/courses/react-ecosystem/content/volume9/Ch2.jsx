import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const counterComponent = `// Counter.jsx —— 被测组件
import { useState } from 'react'

export default function Counter() {
  const [count, setCount] = useState(0)
  return (
    <div>
      <p>当前计数：{count}</p>
      <button onClick={() => setCount((c) => c + 1)}>加一</button>
    </div>
  )
}`

const counterTest = `// Counter.test.jsx —— 用 React Testing Library 测点击计数
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import Counter from './Counter.jsx'

describe('Counter', () => {
  it('点击按钮后计数加一', async () => {
    const user = userEvent.setup()
    render(<Counter />)                       // 把组件渲染进测试用的 DOM

    // 按用户视角找元素：用「可见文本 / 角色」，而不是 class / id
    expect(screen.getByText('当前计数：0')).toBeInTheDocument()

    const button = screen.getByRole('button', { name: '加一' })
    await user.click(button)                  // 模拟真实用户点击
    await user.click(button)

    // 断言用户「看得见」的结果，而不是内部 state
    expect(screen.getByText('当前计数：2')).toBeInTheDocument()
  })
})`

const asyncTest = `// 测异步 + mock 请求：等异步内容出现、把网络请求替换成假数据
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import UserCard from './UserCard.jsx'

vi.spyOn(global, 'fetch').mockResolvedValue({
  json: async () => ({ name: '小明' }),        // mock：不发真请求，返回假数据
})

it('加载完成后显示用户名', async () => {
  render(<UserCard id={1} />)
  // findBy* 会等待元素出现（内部带重试），适合异步渲染
  expect(await screen.findByText('小明')).toBeInTheDocument()
})`

const e2eTest = `// 端到端（Playwright）：开一个真浏览器，像真人一样走完整流程
import { test, expect } from '@playwright/test'

test('用户能登录并看到首页', async ({ page }) => {
  await page.goto('http://localhost:5173/login')
  await page.getByLabel('邮箱').fill('a@b.com')
  await page.getByLabel('密码').fill('123456')
  await page.getByRole('button', { name: '登录' }).click()
  await expect(page.getByText('欢迎回来')).toBeVisible()
})`

const a11yExample = `// 可访问性：用语义标签 + aria + 键盘可达，机器和用户都更友好
function SearchBar() {
  return (
    <form role="search">
      <label htmlFor="q">搜索</label>
      <input id="q" type="search" aria-label="搜索关键词" />
      {/* 用 <button> 而非 <div onClick>，天生可聚焦、可回车触发 */}
      <button type="submit">搜索</button>
    </form>
  )
}`

export default function Ch2() {
  return (
    <article>
      <Lead>
        这是整门课的最后一章，分两半。前半补上工程化里最后一块拼图——<strong>测试</strong>：
        测试金字塔在前端长什么样、React Testing Library 的核心哲学、怎么测交互与异步、
        端到端测试与可访问性各是什么。后半把这门课走过的所有领域汇成一张
        <strong>React 生态地图</strong>，再给一条进阶学习路径，为你这段学习收束。
      </Lead>

      <h2>一、测试金字塔在前端的样子</h2>
      <KeyIdea>
        测试金字塔的主张是：<strong>底层多、上层少</strong>。大量便宜又快的单元测试垫底，
        中间是数量适中的集成测试，顶上是少量但昂贵的端到端测试。越往上，越接近真实用户，
        但也越慢、越脆、越难维护——所以要「少而精」。
      </KeyIdea>
      <p>把这个金字塔翻译到前端，三层大致是这样：</p>
      <table>
        <thead>
          <tr><th>层级</th><th>测什么</th><th>工具</th><th>特点</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>单元测试</strong>（底，最多）</td>
            <td>单个函数、Hook、小组件的逻辑</td>
            <td>Vitest / Jest</td>
            <td>快、稳、便宜，秒级跑完成百上千个</td>
          </tr>
          <tr>
            <td><strong>集成测试</strong>（中）</td>
            <td>几个组件协作、组件 + 状态 + 请求</td>
            <td>RTL + Vitest</td>
            <td>更接近真实使用，前端测试的主力区</td>
          </tr>
          <tr>
            <td><strong>端到端测试</strong>（顶，最少）</td>
            <td>真浏览器里走完整用户流程</td>
            <td>Playwright / Cypress</td>
            <td>最真实，但慢、易碎，只覆盖关键路径</td>
          </tr>
        </tbody>
      </table>
      <p>
        前端有个值得注意的现实：用 React Testing Library 写的「组件测试」往往横跨单元与集成之间——
        它渲染真实组件、模拟真实交互，比纯函数单测更有价值。所以前端的金字塔，
        实践中常常是一个「中间偏胖」的形状，主力火力压在 RTL 组件 / 集成测试上。
      </p>

      <h2>二、React Testing Library 的哲学</h2>
      <KeyIdea>
        React Testing Library（RTL）只有一句核心哲学：<strong>测试越接近用户使用软件的方式，
        越能给你信心</strong>。所以它鼓励你按<strong>用户视角</strong>去找元素和断言——
        查可见文本、查无障碍角色（role）、查标签，而<strong>不是</strong>去查 class、id 或组件内部
        state 这些实现细节。
      </KeyIdea>
      <p>
        为什么避开实现细节？因为实现会变。你把一个 <code>{'<div className="btn-primary">'}</code>
        重构成 <code>{'<button>'}</code>，功能没变，但如果测试是按 <code>.btn-primary</code> 找的，
        它就会无谓地挂掉。反之，如果测试是按「名为『提交』的按钮」找的，重构不影响它——
        <strong>测试只在功能真的坏了时才失败</strong>，这正是好测试该有的样子。
      </p>
      <p>RTL 的三个高频工具：</p>
      <ul>
        <li>
          <code>render</code>：把组件渲染进一个测试用的 DOM 容器。
        </li>
        <li>
          <code>screen</code>：统一的查询入口，配合 <code>getByRole</code> /
          <code>getByText</code> / <code>getByLabelText</code> / <code>findByText</code> 等找元素。
        </li>
        <li>
          <code>userEvent</code>：模拟真实用户操作（点击、输入、键盘），比老的
          <code>fireEvent</code> 更贴近真实行为（它会触发 hover、focus 等完整事件链）。
        </li>
      </ul>
      <Callout variant="tip" title="查询优先级：优先 getByRole">
        RTL 推荐的查询优先级大致是：<code>getByRole</code> ＞ <code>getByLabelText</code> ＞
        <code>getByText</code> ＞ …… 最后才是兜底的 <code>getByTestId</code>。
        优先用 role / label，既贴近用户与辅助技术看到的界面，又顺带逼着你把可访问性写好。
      </Callout>

      <h2>三、实战：测一个按钮点击计数</h2>
      <p>先看被测的组件，一个最简单的计数器：</p>
      <CodeBlock lang="jsx" title="被测组件 Counter.jsx" code={counterComponent} />
      <p>
        再看测试。注意它<strong>从头到尾都站在用户视角</strong>：用「名为『加一』的按钮」找元素、
        用 <code>userEvent</code> 模拟点击、断言「页面上看得见的文字」从 0 变成 2——
        全程不碰组件内部的 <code>count</code> state。
      </p>
      <CodeBlock lang="jsx" title="Counter.test.jsx：用 RTL 测点击计数" code={counterTest} />
      <Example title="读懂这个测试的三段式：渲染 → 操作 → 断言">
        <p>
          <strong>渲染</strong>：<code>render(&lt;Counter /&gt;)</code> 把组件挂进测试 DOM。
        </p>
        <p>
          <strong>操作</strong>：<code>screen.getByRole('button', ...)</code> 找到按钮，
          <code>user.click(button)</code> 模拟两次点击。
        </p>
        <p>
          <strong>断言</strong>：<code>screen.getByText('当前计数：2')</code> 验证用户最终
          看见的是「2」。测的是<strong>用户能观察到的结果</strong>，而非内部状态——这就是 RTL 哲学的落地。
        </p>
      </Example>

      <h2>四、测异步与 mock 请求（一句话）</h2>
      <p>
        组件常常要异步拉数据。测异步时，用 <code>findBy*</code> 系列查询——它会
        <strong>自动等待</strong>元素出现（内部带重试与超时）；同时把真实网络请求
        <strong>mock 掉</strong>（用 <code>vi.fn()</code> / <code>vi.spyOn</code> 或 MSW 拦截），
        让测试不依赖真后端、稳定又快。
      </p>
      <CodeBlock lang="jsx" title="测异步 + mock fetch" code={asyncTest} />

      <h2>五、端到端测试（一句话）</h2>
      <p>
        <strong>端到端（E2E）</strong>测试用 Playwright 或 Cypress 开一个<strong>真实浏览器</strong>，
        像真人一样点击、输入、跳转，验证「登录→下单→支付」这类完整关键流程能跑通——最真实，
        但也最慢最脆，所以只覆盖核心路径，数量保持在金字塔顶端。
      </p>
      <CodeBlock lang="js" title="Playwright 端到端：走完整登录流程" code={e2eTest} />

      <h2>六、可访问性（a11y）简述</h2>
      <p>
        可访问性（accessibility，常缩写 a11y）让残障用户也能用你的应用，同时顺带改善 SEO 和
        测试体验。三条最常落地的实践：
      </p>
      <ul>
        <li>
          <strong>语义标签</strong>：用 <code>{'<button>'}</code>、<code>{'<nav>'}</code>、
          <code>{'<main>'}</code>、<code>{'<label>'}</code> 等，而不是一律用
          <code>{'<div>'}</code> 拼。语义标签自带角色与键盘行为。
        </li>
        <li>
          <strong>aria 属性</strong>：当语义标签不够表达时，用 <code>aria-label</code>、
          <code>aria-expanded</code> 等补充信息，让屏幕阅读器读得懂。
        </li>
        <li>
          <strong>键盘可达</strong>：所有可交互元素都要能用 <code>Tab</code> 聚焦、用回车 / 空格触发。
          用 <code>{'<button>'}</code> 就自动满足，用 <code>{'<div onClick>'}</code> 则不行。
        </li>
      </ul>
      <CodeBlock lang="jsx" title="可访问的搜索框" code={a11yExample} />
      <Callout variant="info" title="a11y 和 RTL 是一对好搭档">
        写好可访问性，RTL 的 <code>getByRole</code> / <code>getByLabelText</code> 就更好用——
        因为它们查的正是无障碍角色与标签。可以说，把界面写得对辅助技术友好，
        测试也会跟着变好写。两件事互相成全。
      </Callout>

      <h2>七、React 生态地图</h2>
      <p>
        走到这里，这门课覆盖的领域可以汇成一张地图。每个领域都有几个主流选择，
        括号里是这门课重点讲过或最值得先掌握的：
      </p>
      <table>
        <thead>
          <tr><th>领域</th><th>主流选择</th><th>一句话定位</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>构建工具</td>
            <td><strong>Vite</strong></td>
            <td>极快的开发服务器与打包，现代 React 项目默认起点</td>
          </tr>
          <tr>
            <td>状态管理</td>
            <td>Context / <strong>Redux Toolkit</strong> / <strong>Zustand</strong></td>
            <td>从内置 Context 到轻量 Zustand 到规范的 RTK，按规模选</td>
          </tr>
          <tr>
            <td>路由</td>
            <td><strong>React Router</strong></td>
            <td>SPA 路由的事实标准</td>
          </tr>
          <tr>
            <td>服务端数据</td>
            <td><strong>TanStack Query</strong></td>
            <td>请求缓存、重试、失效、后台刷新，管「服务端状态」的利器</td>
          </tr>
          <tr>
            <td>UI 组件库</td>
            <td>MUI / antd / <strong>shadcn/ui</strong></td>
            <td>从成套设计体系到可复制进项目的组件，按风格与控制度选</td>
          </tr>
          <tr>
            <td>测试</td>
            <td><strong>RTL</strong> + <strong>Vitest</strong> / Playwright</td>
            <td>组件与单元测试用 RTL+Vitest，端到端用 Playwright</td>
          </tr>
          <tr>
            <td>全栈框架</td>
            <td><strong>Next.js</strong> / Remix</td>
            <td>需要 SSR/SSG/RSC、要 SEO 或全栈一体时上场</td>
          </tr>
        </tbody>
      </table>

      <h2>八、一条进阶学习路径</h2>
      <p>地图很大，但有先后。一条务实的进阶顺序：</p>
      <ul>
        <li>
          <strong>1. 夯实基础</strong>：把组件、Hooks、状态提升、列表与 key、受控组件
          这些核心心智模型练到肌肉记忆——这是一切的地基。
        </li>
        <li>
          <strong>2. 工程化骨架</strong>：用 Vite 起项目，配上 React Router 做路由，
          引入一个状态方案（先 Context / Zustand，规模大了再上 RTK）。
        </li>
        <li>
          <strong>3. 数据层</strong>：用 TanStack Query 接管服务端数据，
          理解「服务端状态 ≠ 客户端状态」，告别手写 loading / error / 缓存。
        </li>
        <li>
          <strong>4. 质量保障</strong>：用 RTL + Vitest 给关键组件补测试，
          再用 Playwright 守住一两条核心流程，养成测试习惯。
        </li>
        <li>
          <strong>5. 渲染架构</strong>：当项目需要 SEO 或好首屏，学 Next.js 与 RSC，
          掌握 SSR/SSG/ISR 的取舍（上一章讲过）。
        </li>
        <li>
          <strong>6. 持续打磨</strong>：可访问性、性能优化（memo / 代码分割 / 懒加载）、
          TypeScript——这些会让你从「能写」走向「写得好」。
        </li>
      </ul>
      <Callout variant="tip" title="别想着一口吃成胖子">
        生态地图上的工具不必一次学完。真正的成长来自<strong>带着真实项目去用</strong>：
        遇到状态乱了再认真学状态管理，遇到请求满天飞再上 TanStack Query，
        遇到要 SEO 再学 Next。工具是用来解决问题的，按需引入，才记得牢、用得对。
      </Callout>

      <h2>九、收束：你已经走完这门课</h2>
      <p>
        从最初的「JSX 是什么、组件怎么写」，到状态与 Hooks、列表与表单、路由与数据、
        状态管理、性能、再到渲染架构与测试——你已经把现代 React 开发的主干完整地走了一遍。
        剩下的，是在真实项目里把这些知识反复磨成手感。React 生态一直在演进，
        但你这门课打下的心智模型（声明式 UI、单向数据流、组件组合、按需引入工具）是稳定的根基。
        带着它，去做点真东西吧。
      </p>

      <Summary
        points={[
          '前端测试金字塔：底层大量单元测试（Vitest/Jest）、中层集成测试（RTL）、顶层少量端到端（Playwright/Cypress）；前端实践中常中间偏胖。',
          'RTL 的核心哲学：测试越接近用户使用方式越有信心；按可见文本 / role / label 查找与断言，不碰 class、id、内部 state 等实现细节。',
          'RTL 三件套：render 渲染组件、screen 查询元素、userEvent 模拟真实交互；查询优先 getByRole。',
          '测点击计数的范式是「渲染→操作→断言」，断言用户看得见的结果而非内部状态。',
          '测异步用 findBy* 自动等待，mock 请求让测试不依赖真后端；E2E 用真浏览器走关键流程，只覆盖核心路径。',
          '可访问性靠语义标签 + aria + 键盘可达；写好 a11y 也让 getByRole/getByLabelText 更好用，互相成全。',
          'React 生态地图：构建 Vite、状态 Context/RTK/Zustand、路由 React Router、数据 TanStack Query、UI MUI/antd/shadcn、测试 RTL/Vitest/Playwright、框架 Next/Remix。',
          '进阶路径：基础 → Vite+路由+状态 → TanStack Query 数据层 → RTL/Playwright 测试 → Next/RSC 渲染架构 → a11y/性能/TS 打磨；按需引入，带真实项目去学。',
        ]}
      />
    </article>
  )
}
