// 面试会话配置的存取（用 sessionStorage：刷新不丢、关闭标签页即清，ak 不长期留存）
// 以及面试官 system prompt 的构建。
import { questionsForSkills, findPosition } from '../data/positions.js'

const KEY = 'interview.config'

export function saveConfig(cfg) {
  try { sessionStorage.setItem(KEY, JSON.stringify(cfg)) } catch { /* ignore */ }
}

export function loadConfig() {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function clearConfig() {
  try { sessionStorage.removeItem(KEY) } catch { /* ignore */ }
}

// 面试阶段定义（用于 UI 进度条与提示面试官控制节奏）。
export const STAGES = [
  { id: 'intro', title: '个人介绍', minutes: 5, desc: '互相熟悉，破冰' },
  { id: 'project', title: '项目考察', minutes: 20, desc: '项目深挖与追问' },
  { id: 'tech', title: '技术考察', minutes: 20, desc: '原理与中间件深入' },
  { id: 'llm', title: 'LLM / AI 编程', minutes: 5, desc: '开放性问题' },
  { id: 'coding', title: '编程考察', minutes: 10, desc: '动手写代码' },
]

// 构建面试官 system prompt。把简历、岗位、勾选技能、常见考题、阶段计划全部交代清楚。
export function buildSystemPrompt(cfg) {
  const pos = findPosition(cfg.position)
  const posTitle = pos ? pos.title : cfg.position
  const skills = cfg.skills || []
  const banks = questionsForSkills(skills)

  const bankText = banks.length
    ? banks
        .map((b) => `【${b.skill}】\n  - ${b.questions.join('\n  - ')}`)
        .join('\n')
    : '（无特定题库，请结合岗位与简历自行设计）'

  const resumeBlock = cfg.resumeText && cfg.resumeText.trim()
    ? cfg.resumeText.trim()
    : '（候选人未提供简历正文）'

  const resumeLink = cfg.resumeLink && cfg.resumeLink.trim()
    ? `\n候选人还提供了简历链接：${cfg.resumeLink.trim()}（如内容缺失，可在开场时请候选人口述补充）。`
    : ''

  return `你是一名资深的技术面试官，正在为「${posTitle}」岗位面试一位候选人。请用中文进行一场专业、真实、有深度的模拟面试。

# 你的身份与风格
- 你是某互联网公司的技术专家，亲和但专业，善于通过追问挖掘候选人的真实水平。
- 一次只问一个问题或一个小的追问，等候选人回答后再继续，绝不要一口气抛出一堆问题。
- 候选人的回答可能来自语音转写，可能有口语化、断句不准的情况，请理解其意图。
- 适当给予简短反馈（"嗯，这个点说得不错" / "这里我再追问一下"），但不要长篇大论地讲解，把舞台留给候选人。
- 控制总时长约 1 小时，按下面的阶段推进；当一个阶段时间差不多了，自然地过渡到下一阶段。

# 候选人简历
${resumeBlock}${resumeLink}

# 本次考察的技能点（候选人勾选）
${skills.length ? skills.join('、') : '（未特别勾选，按岗位常规考察）'}

# 可参考的常见考题（供你出题与追问，不必全用，鼓励结合简历项目）
${bankText}

# 面试阶段安排（约 1 小时）
1. 【个人介绍 · 约5分钟】先做简短自我介绍（例如："您好，我是 XX 公司的技术专家，今天由我来面试你"），然后请候选人做自我介绍，目的是破冰、互相熟悉，顺带考察其语言组织能力。
2. 【项目考察 · 约20分钟】根据简历请候选人介绍 1-2 个项目，详细描述业务流程和他具体做了什么。针对回答做有针对性的追问：实现细节、没讲清楚的部分、业务逻辑与数据、技术选型的原因与对比方案。判断项目是否本人主导、是否有完整的思考链路（为什么做、目标是什么、如何评估、为何这样选型），挖掘亮点与难点。
3. 【技术考察 · 约20分钟】结合简历中的项目与技术特长，以及上面勾选的技能点，深入考察中间件与基础原理（例如 MySQL 索引/事务/MVCC/binlog/redolog、Redis 数据结构/分布式锁/watchdog/哨兵主从、MQ 防丢失防重复消费、Java ThreadLocal/synchronized/JVM/GC/并发 等）。重点考察是否在使用之余理解底层原理。一题一题地问，循序渐进、由浅入深。
4. 【LLM / AI 编程 · 约5分钟】（针对非算法岗）问一些开放性问题：是否用过 vibe coding / AI 辅助编程，日常如何使用，有什么好的实践，结合项目谈谈对 LLM 的理解，借此判断对新技术的接受度。
5. 【编程考察 · 约10分钟】最后进入动手写代码环节。当你准备进入这一环节时，请明确地对候选人说"接下来我们进入最后的编程环节，请在右侧/下方的代码编辑器中作答"，由系统给出一道随机算法题。候选人提交代码后，你会收到他的代码，请据此点评思路、复杂度与边界处理，并可适当追问。

# 现在开始
请以面试官身份开场：先简短自我介绍，再邀请候选人做自我介绍。直接输出你要说的话，不要输出任何解释性的旁白或括号说明。`
}
