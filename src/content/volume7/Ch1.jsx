import Lead from '../../components/cards/Lead.jsx'
import KeyIdea from '../../components/cards/KeyIdea.jsx'
import Example from '../../components/cards/Example.jsx'
import Practice from '../../components/cards/Practice.jsx'
import Callout from '../../components/cards/Callout.jsx'
import CodeBlock from '../../components/cards/CodeBlock.jsx'
import Summary from '../../components/cards/Summary.jsx'

const checklistCode = `# 一个判断「该不该上多 Agent」的清单
# 全部回答完，再决定。任何一条「否」都倾向于先用单 Agent。

def should_go_multi_agent(task):
    score = 0

    # 1. 任务能否清晰拆成几个「职责不重叠」的角色？
    #    （检索 / 写作 / 审校 这种，而不是模糊的「都干一点」）
    if task.has_distinct_roles:
        score += 1

    # 2. 单 Agent 的工具数量是否已经多到模型经常选错？
    #    经验阈值：可用工具超过 10~15 个就要警惕。
    if task.tool_count > 12:
        score += 1

    # 3. 单轮上下文是否已经撑爆（频繁逼近上下文窗口上限）？
    if task.context_pressure_high:
        score += 1

    # 4. 你是否需要「分段评估、单独定位是谁出的错」？
    if task.needs_per_stage_eval:
        score += 1

    # 5. 任务对延迟和成本是否不敏感（可以接受变慢、token 翻倍）？
    if task.latency_cost_tolerant:
        score += 1

    # 3 分及以上：多 Agent 大概率划算
    # 1~2 分：先把单 Agent 的 prompt 和工具裁剪做到位
    # 0 分：别上多 Agent
    return score >= 3, score


if __name__ == '__main__':
    class T:
        pass
    t = T()
    t.has_distinct_roles = True
    t.tool_count = 18
    t.context_pressure_high = True
    t.needs_per_stage_eval = True
    t.latency_cost_tolerant = False
    print(should_go_multi_agent(t))   # (True, 4)`

export default function Ch7_1() {
  return (
    <>
      <Lead>
        <p>
          做到这一卷，你大概率已经有了一个能用工具、能多轮对话的单体 Agent。它跑得挺好——直到任务变复杂，
          它开始选错工具、把角色串味、上下文爆掉、出了错你还查不出是哪一步。这一章先讲清楚一件事：
          多 Agent 不是更高级的玩具，而是<strong>当单体 Agent 撞上天花板时</strong>，用来分而治之的工程手段。
        </p>
      </Lead>

      <h2>单体 Agent 的四个天花板</h2>
      <p>
        一个 Agent 本质是「一个系统提示 + 一组工具 + 一段对话历史」驱动的循环。这套结构很强，但当你不断往里塞东西，
        会先后撞上四面墙。它们不是同时出现的，而是随任务变重逐个浮现。
      </p>

      <h3>一、工具太多，模型选错</h3>
      <p>
        每多给 Agent 一个工具，就多一份「该用 A 时误用了 B」的概率。当可用工具从 5 个涨到 20 个，
        模型挑工具就像人在塞满 20 把螺丝刀的抽屉里翻找——不是不会，而是错得更频繁。工具描述还会一起塞进上下文，
        每轮都占着 token。这是最早出现、也最容易被忽视的天花板。
      </p>

      <h3>二、单一角色，顾此失彼</h3>
      <p>
        一个系统提示很难同时把「严谨的检索者」「天马行空的写手」「挑刺的审校」三种人格都调到最优。你让它更有创意，
        它检索就开始编；你让它更严谨，文笔就变得干巴巴。一个 prompt 里塞进互相矛盾的要求，
        结果往往是<strong>每个角色都只做到六成</strong>。
      </p>

      <h3>三、上下文撑爆</h3>
      <p>
        单 Agent 把所有中间产物——检索到的原文、工具返回的大段 JSON、每一步的思考——全堆在同一段对话历史里。
        任务一长，上下文就逼近窗口上限，模型开始「忘记」前面的指令，质量断崖式下跌。这就是上一卷讲过的
        <em>context rot</em>，在复杂任务里尤其致命。
      </p>

      <h3>四、难以评估和定位</h3>
      <p>
        当检索、推理、写作全揉在一个黑盒里，最终结果不好时，你几乎无法判断是「检索没找到」还是「写作发挥失常」。
        没有清晰的接缝，就没有可以单独测量、单独修的环节。
      </p>

      <Example title="一个客服 Agent 是怎么一步步撞墙的">
        <p>
          最初它只回答常见问题，三五个工具，跑得很好。后来你加了「查订单」「退款」「查物流」「升级工单」「读知识库」
          「查库存」……工具涨到十几个。于是开始出现：用户问退款，它去查了物流（选错工具）；
          回复时既要安抚情绪又要严格走合规话术，结果两头都不到位（角色冲突）；
          一通长对话后它忘了用户最早说的订单号（上下文撑爆）；线上投诉一个坏案例，你翻了半天日志也定位不到是哪一步出的问题（难以评估）。
        </p>
        <p>四面墙，它一次性全撞上了。</p>
      </Example>

      <KeyIdea title="分而治之：按角色拆 Agent">
        <p>
          解法和我们拆函数、拆微服务是同一个直觉：<strong>把一个什么都干的大 Agent，拆成几个各管一摊的小 Agent</strong>。
          检索归检索专家，写作归写作专家，审校归审校专家。每个小 Agent 拿到的是<em>窄而清晰</em>的职责、
          一小撮相关工具、一段干净的上下文。选错工具的概率降了，角色不再打架，上下文不再互相污染，
          每个环节也都能被单独评估和替换。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="多 Agent 不是免费的">
        <p>分而治之有实打实的代价，上手前必须清醒：</p>
        <ul>
          <li>
            <strong>token 翻倍甚至翻几倍</strong>——每个子 Agent 都有自己的系统提示，结果在 Agent 之间传递时还要反复序列化、再读入。
          </li>
          <li>
            <strong>延迟变长</strong>——原来一次模型调用能出的活，现在要好几个 Agent 接力，串行链路越长越慢。
          </li>
          <li>
            <strong>错误会跨 Agent 传播</strong>——检索专家挑错了原文，写作专家会拿着错料一本正经地写下去，错误被放大而不是被纠正。
          </li>
          <li>
            <strong>协调复杂度上升</strong>——你多出一层「谁来调度、结果怎么收口、出错怎么办」的系统要维护，这本身就是工程负担。
          </li>
        </ul>
      </Callout>

      <h2>这对做 Agent / 工程实践意味着什么</h2>
      <p>
        把多 Agent 当成一种<strong>有成本的扩展手段</strong>，而不是默认架构。它的价值只在你确实撞墙时才兑现：
        工具多到选错、角色互相打架、上下文撑爆、出错查不出来。没撞墙就上多 Agent，你买到的全是代价——
        更贵、更慢、更难调试——却没换来对应的收益。所以本卷的第一条原则，也是最重要的一条：
        <strong>能用单 Agent 解决的，就别上多 Agent</strong>。先把单 Agent 的 prompt 和工具裁剪做到位，
        实在裁不动了，再谈拆分。
      </p>

      <Practice title="给你的任务做一次多 Agent 体检">
        <p>
          对照下面这份清单，逐条给你手头的任务打分。它把上面四个天花板和多 Agent 的代价都折成了可回答的问题——
          先量一量再决定，而不是凭「感觉这个高级」就拆。
        </p>
        <CodeBlock lang="python" title="should_go_multi_agent.py" code={checklistCode} />
        <p>
          关键是诚实：如果分数不够，回头去精简单 Agent 的工具集、改写系统提示，往往比硬拆成多 Agent 收益更高、麻烦更少。
        </p>
      </Practice>

      <Summary
        points={[
          '单体 Agent 有四个天花板：工具太多选错、单一角色顾此失彼、上下文撑爆、难以评估定位。',
          '解法是分而治之——按角色把大 Agent 拆成各管一摊的小 Agent，每个有窄职责、少工具、干净上下文。',
          '多 Agent 有实打实的代价：token 翻倍、延迟变长、错误会跨 Agent 传播、协调复杂度上升。',
          '错误传播尤其危险：上游挑错了料，下游会拿着错料把错误放大而不是纠正。',
          '把多 Agent 当成有成本的扩展手段，只在确实撞墙时才兑现价值。',
          '第一原则：能用单 Agent 解决的就别上多 Agent，先把 prompt 和工具裁剪做到位再谈拆分。',
        ]}
      />
    </>
  )
}
