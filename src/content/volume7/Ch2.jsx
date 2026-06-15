import Lead from '../../components/cards/Lead.jsx'
import KeyIdea from '../../components/cards/KeyIdea.jsx'
import Example from '../../components/cards/Example.jsx'
import Practice from '../../components/cards/Practice.jsx'
import Callout from '../../components/cards/Callout.jsx'
import CodeBlock from '../../components/cards/CodeBlock.jsx'
import Summary from '../../components/cards/Summary.jsx'

const routerCode = `# 一个最小的「路由协调器」：分诊 -> 分发 -> 单一出口收口
from anthropic import Anthropic

client = Anthropic()

# --- 三个专家，各自只懂一摊事（这里用占位实现，真实项目里换成真 Agent）---
def billing_expert(query):
    return {'answer': '已为你查询账单：本月应付 128 元。', 'used': 'billing'}

def tech_expert(query):
    return {'answer': '请先重启路由器，再观察指示灯是否变绿。', 'used': 'tech'}

def general_expert(query):
    return {'answer': '我们的营业时间是每天 9:00-21:00。', 'used': 'general'}

EXPERTS = {
    'billing': billing_expert,
    'tech': tech_expert,
    'general': general_expert,
}

# --- 第一拍 + 第二拍：理解请求，选出该交给哪个专家 ---
def classify(query):
    resp = client.messages.create(
        model='claude-haiku-4-5',   # 分诊用便宜的小模型就够了
        max_tokens=10,
        temperature=0,              # 分类要稳定，温度拉到 0
        system=(
            '你是分诊员。只回复一个词，表示该把问题交给哪个专家：'
            'billing（账单费用）、tech（技术故障）、general（其它）。'
        ),
        messages=[{'role': 'user', 'content': query}],
    )
    label = resp.content[0].text.strip().lower()
    return label if label in EXPERTS else 'general'   # 兜底，绝不让它落空

# --- 协调器：把四拍串起来，所有结果从这一个函数出口收口 ---
def router_agent(query):
    route = classify(query)                 # 第二拍：选 Agent
    expert = EXPERTS[route]                  # 第三拍：分发
    result = expert(query)
    # 第四拍：单一出口，统一包装后再返回，调用方永远只看到这一种结构
    return {
        'route': route,
        'answer': result['answer'],
        'handled_by': result['used'],
    }


if __name__ == '__main__':
    for q in ['这个月扣了我多少钱？', '网络连不上怎么办？', '你们几点关门？']:
        print(q, '->', router_agent(q))`

export default function Ch7_2() {
  return (
    <>
      <Lead>
        <p>
          上一章决定了「要拆」，这一章解决「怎么编」。多个 Agent 凑在一起不会自动协作，你得给它们安排一套
          <strong>编排结构</strong>：谁先谁后、谁调谁、结果怎么汇总。业界把常见的编排方式收敛成了五种模式，
          它们不是互斥的高低之分，而是对应不同形状的任务。看懂任务的形状，就知道该用哪一种。
        </p>
      </Lead>

      <h2>五种编排模式</h2>

      <h3>管线 pipeline（顺序）</h3>
      <p>
        几个 Agent 排成一条流水线，前一个的输出是后一个的输入：检索 → 写作 → 审校。
        适用于任务有<strong>天然的先后依赖</strong>、每一步都建立在上一步之上的场景。它最简单、最好调试，
        但链条越长，错误越容易一路传下去。
      </p>

      <h3>路由 routing（分诊）</h3>
      <p>
        先有一个分诊器判断请求属于哪一类，再把它<strong>只</strong>分给对应的那一个专家。
        适用于输入种类繁杂、但每条请求其实只该走一条路的场景，典型如客服分流、意图识别。
        它的精髓是「先分类、再专精」，避免让一个万能 Agent 硬扛所有类型。
      </p>

      <h3>并行 parallel（扇出汇总）</h3>
      <p>
        把同一个任务<strong>同时</strong>派给多个 Agent，再把它们的结果汇总。两种常见用法：
        一是「扇出」——把大任务切成互不依赖的子块各算各的（比如同时审查一份代码的安全、性能、风格）；
        二是「投票」——让多个 Agent 独立做同一件事，取多数或择优。它能压缩延迟，也能提高可靠性。
      </p>

      <h3>编排者-工人 orchestrator-workers</h3>
      <p>
        一个编排者 Agent <strong>在运行时动态地</strong>把任务拆成子任务，分派给工人 Agent，再综合它们的产出。
        和并行的区别在于：子任务不是预先写死的，而是编排者看了具体输入后临场决定的。
        适用于任务结构事先无法确定、需要边做边拆的复杂场景。
      </p>

      <h3>评估-优化 evaluator-optimizer</h3>
      <p>
        一个 Agent 负责产出，另一个 Agent 负责<strong>挑刺并给出修改意见</strong>，产出方据此重写，如此循环到达标。
        适用于「有明确质量标准、且一遍很难写好」的任务，比如翻译润色、代码改写。它本质是把人类的「写-审-改」循环自动化。
      </p>

      <Callout variant="tip" title="先用最简单能成的那一个">
        <p>
          这五种模式的复杂度是递增的：pipeline 和 routing 最轻，orchestrator-workers 最重。
          和上一章一个道理——别一上来就奔最花哨的去。多数真实需求，
          一条 pipeline 或一个 router 就能解决得又快又稳。
        </p>
      </Callout>

      <h2>协调器路由四拍</h2>
      <p>
        不管用哪种模式，最常见的协调器都在反复做同样四个动作，可以记成「四拍」：
      </p>
      <ul>
        <li><strong>理解</strong>——读懂这次请求到底要什么。</li>
        <li><strong>选 Agent</strong>——根据理解的结果，决定该交给哪个（或哪几个）专家。</li>
        <li><strong>分发</strong>——把请求连同必要上下文递过去，触发专家执行。</li>
        <li><strong>收口</strong>——拿回专家的产出，统一整理成对外的一份结果。</li>
      </ul>

      <Example title="一个分诊客服的四拍">
        <p>
          用户问「这个月扣了我多少钱？」。协调器先<strong>理解</strong>出这是账单问题；
          <strong>选</strong>中 billing 专家；把问题<strong>分发</strong>过去，billing 专家查库返回金额；
          协调器再把金额<strong>收口</strong>成一句礼貌的回复返回给用户。
          全程用户只和协调器对话，根本不知道背后换过手。
        </p>
      </Example>

      <KeyIdea title="单一出口：所有结果从一个口子收回来">
        <p>
          多 Agent 系统最容易乱的地方，是结果四处乱飞——这个专家直接回了用户，那个专家把数据塞进了别处。
          一定要立一条铁律：<strong>无论中间经过几个 Agent，最终结果都从协调器这一个出口收口、统一格式后再返回</strong>。
          单一出口带来三个好处：调用方永远只面对一种结构、统一的兜底和错误处理有地方落、
          日志和评估有唯一的观测点。没有单一出口，多 Agent 很快会退化成一团谁也理不清的意大利面。
        </p>
      </KeyIdea>

      <h2>这对做 Agent / 工程实践意味着什么</h2>
      <p>
        选模式就是<strong>读任务的形状</strong>：有先后依赖选 pipeline，要分流选 routing，能并行选 parallel，
        结构临场才定选 orchestrator-workers，要反复打磨选 evaluator-optimizer。而无论哪种，
        协调器都按「理解→选→分发→收口」四拍运转，并坚守单一出口。把这套骨架立住，
        往里换具体专家就只是填空——这正是下一章和实战章要做的事。
      </p>

      <Practice title="实现一个 router 协调器">
        <p>
          下面是一个可跑的最小路由协调器：分诊器（小模型 + 温度 0）判断请求类别，分发给对应专家，
          再从协调器这一个出口统一收口。注意分类落空时的兜底——绝不让请求无人接手。
        </p>
        <CodeBlock lang="python" title="router_agent.py" code={routerCode} />
        <p>
          试着再加一个 <code>orders</code> 专家，并改写分诊员的 system 提示——你会发现扩展一种类型，
          只需动两处：注册到 EXPERTS、在分诊提示里加一个标签。这就是单一出口带来的整洁。
        </p>
      </Practice>

      <Summary
        points={[
          '五种编排模式对应不同任务形状：pipeline 顺序、routing 分诊、parallel 扇出汇总、orchestrator-workers 动态拆分、evaluator-optimizer 反复打磨。',
          '模式复杂度递增，优先选最简单能成的那一个，多数需求一条 pipeline 或一个 router 就够。',
          '协调器按四拍运转：理解请求 → 选 Agent → 分发 → 收口。',
          '单一出口是铁律：无论中间过几个 Agent，结果都从协调器一个口子统一格式后返回。',
          '单一出口让调用方只面对一种结构，兜底、错误处理、日志评估都有唯一落点。',
          '编排骨架立住后，换具体专家只是填空——这是后续章节的基础。',
        ]}
      />
    </>
  )
}
