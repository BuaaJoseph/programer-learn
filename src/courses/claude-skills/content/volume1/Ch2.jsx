import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import ProgressiveLoading from '@/courses/claude-skills/illustrations/ProgressiveLoading.jsx'

const skillLayoutCode = `pdf-tools/
├── SKILL.md            # 元数据 + 正文，正文在触发时加载
├── reference/
│   ├── pdf-api.md      # 详尽的 API 说明，几百行
│   └── examples.md     # 大量示例
└── scripts/
    └── extract.py      # 可执行脚本`

const frontmatterCode = `---
name: pdf-tools
description: 处理 PDF 的提取、合并、加水印。当用户要读取 PDF 文本、拆分合并页面或给 PDF 加水印时使用。
disable-model-invocation: true   # 仅允许手动 /pdf-tools，不自动触发
---

# PDF 工具

常见操作见下；复杂参数与边界情况请查 reference/pdf-api.md。

- 提取文本：python scripts/extract.py input.pdf
- 需要逐页控制、加密 PDF 处理时，再去读 reference/pdf-api.md`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          上一章说 Skill 平时几乎不占上下文，用到才加载——这是怎么做到的？答案是<em>渐进式加载</em>（progressive disclosure）：
          Skill 的内容被切成三层，按「需不需要」逐层送进模型的上下文。理解这三层，你才能写出既好用、又不浪费 token 的 Skill。
        </p>
      </Lead>

      <h2>三层渐进式加载</h2>
      <p>
        把一个 Skill 想象成一本说明书：封面（书名 + 一句简介）随时摆在桌上，正文用到了才翻开，附录里厚厚的参考资料只有真需要时才去查。
        Skill 正是这么分的三层：
      </p>
      <ul>
        <li>
          <strong>① 元数据层</strong>（<code>name</code> + <code>description</code>）：启动时就加载进上下文，所有 Skill 的这一层都在。
          它极小，成本几乎可以忽略——所以你装一百个 Skill，平时也不会撑爆窗口。
        </li>
        <li>
          <strong>② SKILL.md 正文</strong>：只有当这个 Skill 被触发时才加载，而且会<strong>保留整轮会话</strong>，
          后续步骤都能用到它。
        </li>
        <li>
          <strong>③ reference / scripts 等资源</strong>：仅当正文里引用到它们时，才按需从磁盘加载进来。
          平时它们安安静静躺在硬盘上，一个 token 都不占。
        </li>
      </ul>

      <Example title="一个带大 reference 的 Skill，平时不占上下文">
        <p>
          假设有个处理 PDF 的 Skill，目录长这样：
        </p>
        <CodeBlock lang="text" title="pdf-tools 目录结构" code={skillLayoutCode} />
        <p>
          <code>reference/pdf-api.md</code> 可能有好几百行，<code>examples.md</code> 也很厚。但在你没问 PDF 的时候，
          上下文里只有元数据那一句话；当你说「帮我提取这个 PDF 的文字」，正文被加载进来；
          只有当任务真的涉及加密 PDF、需要查那份详尽 API 文档时，<code>reference/pdf-api.md</code> 才会被读进来。
          一份几百行的参考资料，<strong>九成时间是零成本的</strong>。
        </p>
      </Example>

      <ProgressiveLoading />

      <KeyIdea title="description 是唯一的「触发开关」">
        <p>
          Claude 怎么知道该不该加载某个 Skill 的正文？它<strong>只看元数据层</strong>，也就是 <code>description</code>。
          它拿当前任务和每个 Skill 的 description 比对，判断是否匹配。所以 description 既是「广告语」也是「触发条件」：
          写得准，正文才会在该来的时候来；写得含糊，正文要么不来，要么乱来。正文写得再好，description 不行也没人翻得开。
        </p>
      </KeyIdea>

      <h3>什么时候加载哪一层</h3>
      <p>
        把时间线理一遍就清楚了：会话一开始，所有 Skill 的<em>元数据</em>已经在上下文里；
        你发出请求，Claude 比对 description，命中的那个 Skill 的<em>正文</em>被加载，并在<strong>这一整轮</strong>里持续可用；
        执行过程中，正文若指向某个 <code>reference</code> 或要跑某个 <code>script</code>，对应资源此刻才被读取。
        没命中的 Skill，正文永远不会被加载；没被引用的 reference，永远不会进上下文。
      </p>

      <Callout variant="warn" title="预算是硬约束，别把 Skill 写成大杂烩">
        <p>
          有几条数字要记住：<code>description</code> 加 when_to_use 合计<strong>不超过 1536 字符</strong>；
          正文建议<strong>少于 500 行 / 5000 词</strong>。触发太多 Skill 或单个正文太大时，
          <em>auto-compaction</em>（自动压缩）会在约 <strong>25000 token</strong> 的预算内重新附加技能内容，
          超出的旧内容可能被丢弃。所以正文要精简，把详尽材料下沉到 <code>reference</code>，靠按需加载省预算。
        </p>
      </Callout>

      <h2>这对做 Agent / 工程实践意味着什么</h2>
      <p>
        渐进式加载意味着你可以放心地「广撒网、精加载」：建很多 Skill 都不心疼，因为没触发的只占元数据。
        于是写 Skill 的功夫，重心落在两处——把 <code>description</code> 打磨到精准（决定触发），
        把正文压薄、详情外置到 <code>reference</code>（决定成本）。这正是「<strong>正文管常用路径，reference 管长尾</strong>」的设计原则：
        让模型每次只为它真正用到的内容付费。
      </p>

      <Practice title="手动触发并观察加载行为">
        <p>
          要看清楚加载发生在哪一步，最直接的办法是手动触发，再控制是否允许自动触发。下面给一个把某 Skill 设为「仅手动」的写法：
        </p>
        <CodeBlock lang="markdown" title="SKILL.md frontmatter" code={frontmatterCode} />
        <p>
          加上 <code>disable-model-invocation: true</code> 后，Claude 不会自动用它，只有你输入 <code>/pdf-tools</code> 才会加载正文。
          对照试一下：去掉这行、问一句和 PDF 相关的话，看正文是否被自动加载；再加上这行，确认必须手动 <code>/pdf-tools</code> 才生效。
          这样你就能亲眼区分「元数据常驻」「正文按触发加载」「reference 按引用加载」这三层各自发生的时机。
        </p>
      </Practice>

      <Summary
        points={[
          'Skill 内容分三层：元数据（name + description）启动即加载、SKILL.md 正文在触发时加载、reference/scripts 在被引用时按需加载。',
          '正文一旦被触发加载，会保留整轮会话；后续步骤都能继续用到它。',
          'reference 等资源平时躺在磁盘上零成本，只有正文真正引用到时才读进上下文，长尾资料因此几乎不占预算。',
          'Claude 只凭 description 判断是否触发某个 Skill，所以 description 既是广告语也是触发开关，必须写准。',
          '预算硬约束：description + when_to_use ≤ 1536 字符，正文建议 < 500 行 / 5000 词，auto-compaction 在约 25000 token 内重附技能、超出会丢弃。',
          '设计原则是「正文管常用路径、reference 管长尾」，可用 disable-model-invocation 改为仅手动 /skill 触发以便观察与控制。',
        ]}
      />
    </>
  )
}
