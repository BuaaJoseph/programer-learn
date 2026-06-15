// 课程目录：8 卷 40 章。slug 规则 v{卷}-c{章}。
export const VOLUMES = [
  {
    id: 'v1',
    index: 1,
    title: '大模型基础原理',
    subtitle: 'LLM Fundamentals',
    theme: '大模型到底是什么、靠什么运转。看懂这一卷，后面所有内容都有根。',
    chapters: [
      { slug: 'v1-c1', title: '下一个词预测：大模型唯一的核心动作', topic: 'next-token prediction', hook: '大模型干的事，本质上只有一件：根据前面的内容，预测下一个最可能的词。', minutes: 90, hasContent: true },
      { slug: 'v1-c2', title: '分词与词向量：模型眼里的文字长什么样', topic: 'tokenization 与 embedding', hook: '模型读不懂字，它读的是 token 编号和一串数字向量。', minutes: 120, hasContent: true },
      { slug: 'v1-c3', title: '注意力机制：模型如何决定“该看哪些词”', topic: 'attention', hook: '注意力让模型在生成每个词时，动态决定该重点参考前文的哪些部分。', minutes: 150, hasContent: true },
      { slug: 'v1-c4', title: '采样与温度：为什么同一个问题答案会变', topic: 'sampling / temperature / top-p', hook: '模型输出的是概率分布，采样策略决定了它从中怎么抽词。', minutes: 90, hasContent: true },
      { slug: 'v1-c5', title: 'Transformer 层级：一个词如何被逐层加工', topic: 'Transformer 结构', hook: '一个 token 的向量，会在几十层里被反复读取、计算、写回，逐层变得“懂上下文”。', minutes: 150, hasContent: true },
      { slug: 'v1-c6', title: '上下文窗口：模型一次能看多少、为什么越长越贵', topic: 'context window 与 KV cache', hook: '上下文窗口是模型的工作记忆，它有限、且越长越烧钱。', minutes: 120, hasContent: true },
      { slug: 'v1-c7', title: '幻觉：模型为什么会一本正经地胡说', topic: '幻觉成因', hook: '幻觉不是 bug，而是“按概率补全”这件事的天然副产品。', minutes: 90, hasContent: true },
    ],
  },
  {
    id: 'v2',
    index: 2,
    title: 'Prompt 与输出控制',
    subtitle: 'Prompting & Control',
    theme: '同一个模型，怎么问、怎么约束，决定了输出是金子还是垃圾。',
    chapters: [
      { slug: 'v2-c1', title: 'Prompt 工程：把需求说清楚', topic: 'prompt engineering', hook: 'Prompt 不是玄学，它是用文字去改变模型下一步的概率分布。', minutes: 120, hasContent: true },
      { slug: 'v2-c2', title: 'System Prompt 与角色设定', topic: 'system prompt 与人格', hook: 'System prompt 是你给模型设定的“工作守则”，比普通对话更稳、但也能被掀开。', minutes: 90, hasContent: true },
      { slug: 'v2-c3', title: '思维链：让模型一步步推理', topic: 'CoT 与 few-shot', hook: '让模型先写出推理过程，等于给它一张草稿纸，答对率显著上升。', minutes: 120, hasContent: true },
      { slug: 'v2-c4', title: '结构化输出：让模型稳定吐出 JSON', topic: 'structured output / JSON', hook: '要让下游代码能解析，就得把输出格式从“求模型”升级到“锁死”。', minutes: 90, hasContent: true },
      { slug: 'v2-c5', title: '控制输出：长度、格式与各种约束', topic: '输出控制与约束', hook: '啰嗦、复读、跑题、不守格式——每种毛病都有对应的参数和 prompt 解法。', minutes: 90, hasContent: true },
    ],
  },
  {
    id: 'v3',
    index: 3,
    title: '微调 Fine-tuning',
    subtitle: 'Fine-tuning',
    theme: '有些能力靠 prompt 教不会，得直接改造模型本身。讲什么时候、怎么改。',
    chapters: [
      { slug: 'v3-c1', title: '要不要微调：先想清楚再动手', topic: '微调 vs prompt', hook: '微调改的是模型的“行为习惯”，不是给它灌新知识——搞混这点会浪费大量钱。', minutes: 90, hasContent: true },
      { slug: 'v3-c2', title: '监督微调 SFT：用示范教模型', topic: 'SFT', hook: 'SFT 就是给模型看大量“这样的输入应该这样答”的示范，让它模仿。', minutes: 150, hasContent: true },
      { slug: 'v3-c3', title: 'LoRA：用很小的成本微调大模型', topic: 'LoRA', hook: 'LoRA 只训练两个小矩阵，就能让百亿参数模型学会新行为，可训练参数砍掉约 99%。', minutes: 120, hasContent: true },
      { slug: 'v3-c4', title: '构建微调数据集', topic: '数据集构建', hook: '数据是模型的镜子：数据里有什么毛病，模型就学到什么毛病。', minutes: 120, hasContent: true },
      { slug: 'v3-c5', title: '对齐与 RLHF：教模型什么叫“得体”', topic: '对齐', hook: '对齐解决的不是“答得对不对”，而是“答得得不得体、要不要这么答”。', minutes: 120, hasContent: true },
      { slug: 'v3-c6', title: '跑一次最小可用的微调', topic: '微调实操', hook: '把前几章串起来，用托管 API 和本地 PEFT 两条路各跑通一次最小微调。', minutes: 180, hasContent: true },
    ],
  },
  {
    id: 'v4',
    index: 4,
    title: '工具调用与 Agent 起点',
    subtitle: 'Tools & Agents',
    theme: '让模型能调用工具、和真实世界交互——从聊天机器人迈向 Agent 的第一步。',
    chapters: [
      { slug: 'v4-c1', title: '工具调用：让模型能“动手做事”', topic: 'function calling 与 ReAct', hook: '模型本身只会生成文字，工具调用让它能查天气、读数据库、发邮件。', minutes: 150, hasContent: true },
      { slug: 'v4-c2', title: '工具定义：写清楚一个工具的契约', topic: 'tool schema 设计', hook: '工具的 description 和参数 schema，本质是写给模型看的 API 文档。', minutes: 120, hasContent: true },
      { slug: 'v4-c3', title: 'ReAct 循环：思考—行动—观察', topic: 'ReAct 详解', hook: 'ReAct 让模型在“想—做—看结果”之间循环，直到任务完成。', minutes: 120, hasContent: true },
      { slug: 'v4-c4', title: '工具出错怎么办：重试与容错', topic: '错误处理', hook: '工具会超时、会报错、会返回脏数据——容错设计决定 Agent 上不上得了线。', minutes: 90, hasContent: true },
    ],
  },
  {
    id: 'v5',
    index: 5,
    title: '记忆与 RAG',
    subtitle: 'Memory & RAG',
    theme: '模型没有记忆、也不知道你的私有数据。让 Agent 记得住、查得到。',
    chapters: [
      { slug: 'v5-c1', title: '上下文是有限的：为什么需要记忆系统', topic: 'context 限制与记忆需求', hook: '模型是 stateless 的，多轮对话全靠每轮把历史重发一遍——这撑不了多久。', minutes: 90, hasContent: true },
      { slug: 'v5-c2', title: '短期与长期记忆设计', topic: '记忆设计', hook: '短期记忆管“这次对话”，长期记忆管“关于你的一切”，两者读写方式完全不同。', minutes: 120, hasContent: true },
      { slug: 'v5-c3', title: 'RAG：让模型按需查资料再回答', topic: 'RAG 与检索', hook: 'RAG 让模型先去你的资料库里查一段相关内容，再带着它来回答。', minutes: 150, hasContent: true },
      { slug: 'v5-c4', title: '向量检索：按“语义相似”找内容', topic: 'embedding 检索', hook: '向量检索用方向的接近程度来衡量语义相似，这是 RAG 的引擎。', minutes: 120, hasContent: true },
      { slug: 'v5-c5', title: '上下文压缩与取舍', topic: '压缩与遗忘', hook: '给模型塞得越多不等于答得越好，学会取舍是长跑 Agent 的核心功夫。', minutes: 90, hasContent: true },
    ],
  },
  {
    id: 'v6',
    index: 6,
    title: '自主 Agent',
    subtitle: 'Autonomous Agents',
    theme: '不再一步步喂指令，让 Agent 自己规划、执行、纠错。',
    chapters: [
      { slug: 'v6-c1', title: '自主循环与规划', topic: '自主循环', hook: '自主 Agent 把控制权交给模型：由它决定下一步做什么，直到目标达成。', minutes: 150, hasContent: true },
      { slug: 'v6-c2', title: '任务分解：把大目标拆成可执行的小步', topic: '任务分解', hook: '模型注意力有限，大目标必须先拆成它一步能啃下的小任务。', minutes: 120, hasContent: true },
      { slug: 'v6-c3', title: '反思与自我纠错', topic: '反思', hook: '让 Agent 回头审视自己的产出、挑出毛病再改一遍，质量往往大幅提升。', minutes: 120, hasContent: true },
      { slug: 'v6-c4', title: '护栏与安全：给自主 Agent 加约束', topic: '护栏', hook: '自主意味着它能自己做决定，护栏决定了它不能越过哪些红线。', minutes: 120, hasContent: true },
      { slug: 'v6-c5', title: '怎么评估一个 Agent 好不好用', topic: 'eval', hook: 'Agent 输出开放、过程多步、结果随机，传统测试方法基本失灵。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'v7',
    index: 7,
    title: '多 Agent 协作',
    subtitle: 'Multi-Agent',
    theme: '一个 Agent 扛不动的复杂任务，交给一支分工协作的 Agent 团队。',
    chapters: [
      { slug: 'v7-c1', title: '为什么需要多个 Agent', topic: '协作动机', hook: '单体 Agent 有四个天花板，到顶之后只能靠拆分角色突破。', minutes: 120, hasContent: true },
      { slug: 'v7-c2', title: '角色分工与编排', topic: '编排', hook: '多 Agent 不是一拥而上，而是按管线、路由、并行等固定模式编排。', minutes: 150, hasContent: true },
      { slug: 'v7-c3', title: 'Agent 之间怎么传递信息', topic: '通信协议', hook: '传什么比传给谁更要命：只传结构化、自包含的结果，错误要显式上报。', minutes: 120, hasContent: true },
      { slug: 'v7-c4', title: '实战：搭一个多 Agent 系统', topic: '多 Agent 实战', hook: '用两个专家函数加一个协调器，搭出一个能跑的最小三人 Agent 团队。', minutes: 180, hasContent: true },
    ],
  },
  {
    id: 'v8',
    index: 8,
    title: '生产化',
    subtitle: 'Production',
    theme: '把 Agent 从本地玩具，变成能上线、能扛流量、能省钱的产品。',
    chapters: [
      { slug: 'v8-c1', title: '可观测性：看清 Agent 每一步做了什么', topic: 'observability', hook: '没有 trace，Agent 出问题你只能干瞪眼；有了它，每一步都能回放。', minutes: 120, hasContent: true },
      { slug: 'v8-c2', title: '成本与延迟优化', topic: '成本与延迟', hook: '多 Agent、多轮调用会让 token 账单滚雪球，先量后优才不会瞎忙。', minutes: 120, hasContent: true },
      { slug: 'v8-c3', title: '部署：把 Agent 送上线', topic: '部署', hook: '从一个本地脚本到能扛流量的线上服务，中间隔着无状态化、限流和灰度。', minutes: 150, hasContent: true },
      { slug: 'v8-c4', title: '毕业项目：完整的多 Agent 客服系统', topic: 'capstone', hook: '把八卷的知识拼成一套完整可搭的多 Agent 客服系统蓝图。', minutes: 240, hasContent: true },
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
  return {
    chapter: FLAT_CHAPTERS[i],
    prev: i > 0 ? FLAT_CHAPTERS[i - 1] : null,
    next: i < FLAT_CHAPTERS.length - 1 ? FLAT_CHAPTERS[i + 1] : null,
  }
}

export function findVolumeById(id) {
  return VOLUMES.find((v) => v.id === id) || null
}
