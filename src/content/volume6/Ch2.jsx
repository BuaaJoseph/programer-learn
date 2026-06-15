import Lead from '../../components/cards/Lead.jsx'
import KeyIdea from '../../components/cards/KeyIdea.jsx'
import Example from '../../components/cards/Example.jsx'
import Practice from '../../components/cards/Practice.jsx'
import Callout from '../../components/cards/Callout.jsx'
import CodeBlock from '../../components/cards/CodeBlock.jsx'
import Summary from '../../components/cards/Summary.jsx'

const plannerCode = `import json
from anthropic import Anthropic

client = Anthropic()

PLANNER_PROMPT = '''你是任务规划器。把用户目标拆成 3 到 6 个可独立执行的子任务。
要求：每个子任务粒度适中（不要拆到一句话能说清的小动作，也不要笼统到一句话做不完）；
明确每步的输入依赖。只输出 JSON，格式：
{"steps": [{"id": 1, "goal": "...", "depends_on": []}, ...]}'''

def make_plan(user_goal):
    resp = client.messages.create(
        model='claude-sonnet-4-5',
        max_tokens=1024,
        system=PLANNER_PROMPT,
        messages=[{'role': 'user', 'content': user_goal}],
    )
    text = resp.content[0].text
    return json.loads(text)['steps']

def execute_step(step, results):
    # 把已完成步骤的产出作为上下文喂进去
    context = '\\n'.join(f"步骤{r['id']}产出: {r['output']}" for r in results)
    resp = client.messages.create(
        model='claude-sonnet-4-5',
        max_tokens=1024,
        messages=[{'role': 'user',
                   'content': f'已知上下文:\\n{context}\\n\\n现在执行: {step[\"goal\"]}'}],
    )
    return resp.content[0].text

def run(user_goal):
    plan = make_plan(user_goal)
    done = []
    for step in sorted(plan, key=lambda s: s['id']):
        # 按依赖顺序执行；这里假设 id 升序即满足依赖
        output = execute_step(step, done)
        done.append({'id': step['id'], 'output': output})
        print(f"[完成] 步骤{step['id']}: {step['goal']}")
    return done

run('给一篇技术博客写一份中文推广文案，并配三条社交媒体短文')`

export default function Ch6_2() {
  return (
    <>
      <Lead>
        <p>
          上一章让模型自己驱动循环，但你很快会发现：直接把「写一份完整的市场调研报告」丢给它，它会东一榔头西一棒子，
          中途忘了自己要干嘛。原因很简单——模型的注意力和上下文都是有限的。要让它干成大事，得先把大目标
          <strong>拆成一串可执行的小步</strong>，这就是<em>任务分解</em>（task decomposition）。
        </p>
      </Lead>

      <h2>为什么必须拆</h2>
      <p>
        两个硬约束逼着我们拆。其一是<strong>注意力有限</strong>：一次塞给模型的事情越多、越杂，它越容易抓不住重点，
        漏掉要求、自相矛盾。把任务切小，每一步只让它专注一件事，质量立刻上去。其二是<strong>上下文有限</strong>：
        一个复杂任务从头到尾的所有材料、中间产物可能远超上下文窗口，分步执行才能让每一步只携带它真正需要的那点信息，
        而不是把整个世界都背在身上。
      </p>
      <p>
        还有一个工程上的好处：拆开之后每一步都能<strong>单独验证、单独重试</strong>。第 3 步错了，你只重跑第 3 步，
        而不是从头来过；某步可以换更便宜的模型、某步可以并行——这些优化只有在拆开后才谈得上。
      </p>

      <h3>分解的三种形态</h3>
      <p>
        子任务之间的关系，决定了你用哪种结构来组织它们：
      </p>
      <ul>
        <li>
          <strong>线性</strong>（chain）：第二步依赖第一步的产出，一条直线走到底。最简单，适合「调研 → 提纲 → 初稿 → 润色」这类天然有先后的流程。
        </li>
        <li>
          <strong>DAG</strong>（有向无环图）：步骤间是依赖关系而非纯线性，没有依赖的步骤可以并行。比如「分别调研三个竞品」可以同时做，
          做完再汇总——汇总这一步依赖前三步，但前三步彼此独立。
        </li>
        <li>
          <strong>递归</strong>：某个子任务太大，执行它时又触发一次分解，把它拆成更小的子任务。适合事先不知道要拆多深的探索型任务，
          但要警惕拆不到底、无限递归。
        </li>
      </ul>

      <h3>先规划，再执行</h3>
      <p>
        最实用的做法是让一个 <em>planner</em>（规划器）先单独跑一次，产出一份<strong>结构化的计划</strong>——通常是一段
        JSON，列出每个子任务的目标和依赖关系——然后执行器再按这份计划逐条做。把「规划」和「执行」分成两个独立阶段有三个好处：
        计划是结构化的，便于程序检查（步骤数对不对、依赖有没有环）；计划可以在执行前给人看一眼、改一改；执行某步失败时，
        可以只重做那一步，或回到 planner 重新规划。
      </p>

      <Example title="一份结构化计划长什么样">
        <p>目标：「给一篇技术博客写推广文案并配三条社交短文。」planner 可能输出：</p>
        <CodeBlock
          lang="json"
          title="plan.json"
          code={`{
  "steps": [
    {"id": 1, "goal": "通读博客，提炼 3 个核心卖点", "depends_on": []},
    {"id": 2, "goal": "基于卖点写一段 200 字推广文案", "depends_on": [1]},
    {"id": 3, "goal": "把推广文案改写成 3 条不同风格的社交短文", "depends_on": [2]}
  ]
}`}
        />
        <p>
          注意每一步既不琐碎（不是「读第一段」「读第二段」），也不笼统（不是「搞定推广」）；<code>depends_on</code> 把执行顺序
          显式写了出来，执行器照着拓扑顺序跑即可。
        </p>
      </Example>

      <KeyIdea title="拆得好的标准：每一步都能独立交付与验证">
        <p>
          判断一份计划拆得好不好，看每个子任务是不是满足两条：<strong>能独立执行</strong>（带着前置步骤的产出就能做完，不依赖
          没列出来的隐含信息）、<strong>能独立验证</strong>（做完能一眼看出对错或好坏）。满足这两条，整个流程就像一条装配线，
          每个工位职责清楚、产出可检。拆不到这个程度，多半是粒度或边界出了问题。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="任务分解的三个坑">
        <p>拆错的方式比拆对的方式多，常见三类：</p>
        <ul>
          <li>
            <strong>拆太碎</strong>——步骤一多，错误会连乘。假设每步成功率 0.9，听着不低，但 10 步串起来整体成功率是
            0.9 的 10 次方 ≈ 0.35，三分之二的概率整条链会断在某处。步骤数是有成本的，不是越细越好。
          </li>
          <li>
            <strong>拆太粗</strong>——一个子任务里塞了好几件事，又回到了「注意力不够」的老问题，模型照样抓不住，还不好验证哪部分错了。
          </li>
          <li>
            <strong>边界不清</strong>——两个子任务职责重叠或留了缝隙，导致同一件事做两遍，或某件事谁都没做。依赖关系没写清，
            执行顺序就会乱。
          </li>
        </ul>
      </Callout>

      <h2>这对做 Agent / 工程实践意味着什么</h2>
      <p>
        分解不是「锦上添花的优化」，而是把不可控的大任务<strong>变得可控、可测、可重试</strong>的核心手段。工程上落地时记住：
        让 planner 输出<strong>结构化（JSON）而非自然语言</strong>的计划，这样代码才能检查它、调度它；执行每一步时只喂它
        <strong>真正需要的上下文</strong>（依赖步骤的产出），别把全部历史一股脑塞进去；并且控制步骤总数——结合上一章的轮数上限，
        一份「步骤适中、边界清晰、依赖明确」的计划，是后面反思和评估都能稳定运转的地基。
      </p>

      <Practice title="写一个 planner：让模型输出结构化子任务并按序执行">
        <p>
          下面这段代码做两件事：<code>make_plan</code> 让模型把目标拆成 JSON 子任务列表，<code>run</code> 按 id 顺序逐条执行，
          并把已完成步骤的产出当作下一步的上下文喂进去。这就是「先规划、再执行」的最小实现。
        </p>
        <CodeBlock lang="python" title="planner.py" code={plannerCode} />
        <p>
          练习三件事：在 <code>make_plan</code> 后加一段校验，检查 <code>depends_on</code> 里引用的 id 都真实存在、没有环；
          把执行顺序从「按 id」改成「按依赖拓扑排序」，让没有依赖的步骤能并行；最后故意给一个会让模型拆出 12 步的复杂目标，
          亲眼看看「拆太碎」时整体成功率怎么掉下来。
        </p>
      </Practice>

      <Summary
        points={[
          '注意力和上下文都有限，所以大目标必须拆成可执行的小步，每步只专注一件事，质量和可控性都上去。',
          '分解有三种形态：线性（一条直线）、DAG（有依赖、无依赖可并行）、递归（执行时再拆，注意防无限递归）。',
          '最实用的是「先规划再执行」：planner 产出结构化 JSON 计划，便于程序校验、人工预审、单步重试。',
          '拆得好的标准是每个子任务都能独立执行、独立验证，像装配线上职责清楚的工位。',
          '三个坑：拆太碎（0.9 的 10 次方 ≈ 0.35，错误连乘）、拆太粗（又抓不住）、边界不清（重做或漏做）。',
          '工程上让计划结构化、每步只喂必要上下文、控制步骤总数，这是反思与评估能稳定运转的地基。',
        ]}
      />
    </>
  )
}
