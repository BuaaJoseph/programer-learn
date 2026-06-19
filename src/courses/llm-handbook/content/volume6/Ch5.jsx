import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const evalCode = `import json
from anthropic import Anthropic

client = Anthropic()

# 用例集：每条带输入、断言、judge 标准
CASES = [
    {'id': 'q1', 'input': '把 19.99 美元换算成人民币，汇率 7.2',
     'assert': lambda out: '143' in out,            # 硬断言：必须出现正确数字
     'rubric': '答案是否给出约 143.93 元，且说明了用的汇率'},
    {'id': 'q2', 'input': '一句话解释什么是幂等',
     'assert': None,                                # 无客观对错，交给 judge
     'rubric': '解释是否准确、是否一句话、是否易懂'},
]

def run_agent(text):
    resp = client.messages.create(
        model='claude-sonnet-4-5', max_tokens=512,
        messages=[{'role': 'user', 'content': text}])
    return resp.content[0].text

JUDGE_SYS = '''你是评分员。依据评分标准给答案打 1 到 5 分。
为消除偏见：忽略答案长短，长不等于好；只看是否满足标准。
只输出 JSON：{"score": <1-5>, "reason": "..."}'''

def judge(rubric, answer):
    resp = client.messages.create(
        model='claude-sonnet-4-5', max_tokens=256, system=JUDGE_SYS,
        messages=[{'role': 'user',
                   'content': f'评分标准:\\n{rubric}\\n\\n答案:\\n{answer}'}])
    return json.loads(resp.content[0].text)

def evaluate():
    report = []
    for c in CASES:
        out = run_agent(c['input'])
        hard = c['assert'](out) if c['assert'] else None   # 断言硬测
        graded = judge(c['rubric'], out)                    # LLM-as-judge
        report.append({'id': c['id'], 'assert_pass': hard,
                       'score': graded['score'], 'reason': graded['reason']})
    # 汇总
    scores = [r['score'] for r in report]
    passed = [r for r in report if r['assert_pass'] is not False]
    print(f"断言通过 {len(passed)}/{len(report)}，平均分 {sum(scores)/len(scores):.2f}")
    return report

evaluate()`

const passRateCode = `# 应对「随机」：同一用例多跑几次，看 pass@k 与稳定性，而不是只信一次。
def pass_rate(case, run_agent, runs=5):
    results = []
    for _ in range(runs):
        out = run_agent(case['input'])
        ok = case['assert'](out) if case['assert'] else None
        results.append(ok)
    hard = [r for r in results if r is not None]
    rate = sum(hard) / len(hard) if hard else None
    return {
        'id': case['id'],
        'pass_rate': rate,            # 通过率：5 次里对了几次
        'stable': len(set(hard)) <= 1 # 是否每次结论一致（不一致=不稳定，要警惕）
    }

# 位置偏见校正：对比两个答案时，交换位置各评一次取平均，
# 避免 judge 单纯偏好排在前面的那个。
def judge_pairwise(rubric, ans_a, ans_b, judge_pick):
    pick1 = judge_pick(rubric, ans_a, ans_b)   # A 在前
    pick2 = judge_pick(rubric, ans_b, ans_a)   # B 在前
    # 两次都选「靠前」的那个 → 是位置偏见，判平；否则取一致结论
    if pick1 == 'first' and pick2 == 'first':
        return 'tie'
    return 'A' if (pick1, pick2) == ('first', 'second') else 'B'`

export default function Ch6_5() {
  return (
    <>
      <Lead>
        <p>
          前四章把一个 Agent 搭了起来：会自主循环、会拆任务、会反思、有护栏。但「搭起来」不等于「好用」。
          上线前你得回答一个朴素却最难的问题——<strong>它到底干得怎么样</strong>？这一章讲怎么<em>评估</em>（evaluation）
          一个 Agent，把「感觉还行」换成「有数」。
        </p>
      </Lead>

      <h2>为什么 Agent 难评</h2>
      <p>
        传统软件好测，因为它<strong>确定</strong>：同样的输入永远同样的输出，写个断言一比就知道对错。Agent 三个特性把这套打破了：
      </p>
      <ul>
        <li><strong>开放</strong>——很多任务没有唯一正确答案（「写一段产品介绍」），你没法用 <code>==</code> 去比。</li>
        <li><strong>多步</strong>——它要走好几步才出结果，最终答案对了不代表过程对了（可能瞎蒙对的），错了也得知道错在哪一步。</li>
        <li><strong>随机</strong>——同样的输入，两次运行可能给出不同答案、走不同路径，测一次的结论不可靠。</li>
      </ul>

      <h3>评什么：三个层次</h3>
      <p>
        别只盯着最终答案，从浅到深有三层都该看：
      </p>
      <ul>
        <li><strong>结果</strong>（outcome）：最终任务有没有完成、答案对不对。最直接，但只看这一层会漏掉「蒙对的」。</li>
        <li><strong>轨迹</strong>（trajectory）：中间过程对不对——调了哪些工具、顺序合不合理、有没有多余的步骤或走回头路。轨迹差但结果对，是不稳定的信号。</li>
        <li><strong>质量</strong>（quality）：答案的好坏程度——准确、完整、清楚、合规。开放任务主要靠这一层评。</li>
      </ul>

      <h3>怎么评：四种手段</h3>
      <ul>
        <li><strong>断言硬测</strong>：对有客观对错的部分写断言（数字算对没、JSON 格式合法没、必须出现的字段在不在）。最可靠、最快、最便宜，能用就用。</li>
        <li><em>LLM-as-judge</em>：让另一个模型按评分标准给答案打分。适合断言够不着的开放/质量评估，能规模化，但有偏见（见下文）。</li>
        <li><strong>人工抽检</strong>：人来看一批样本。最准、最贵，适合定标准、抽查 judge 是否靠谱，不适合大规模日常跑。</li>
        <li><strong>线上指标</strong>：上线后看真实信号——任务完成率、用户重试率、人工接管率、点踩率。最真实，但滞后，且要先上线才有。</li>
      </ul>
      <table>
        <thead>
          <tr><th>手段</th><th>准</th><th>快/便宜</th><th>可规模化</th><th>最适合</th></tr>
        </thead>
        <tbody>
          <tr><td>断言硬测</td><td>高（客观题）</td><td>最快最便宜</td><td>是</td><td>有唯一答案的部分</td></tr>
          <tr><td>LLM-as-judge</td><td>中，有偏见</td><td>较快</td><td>是</td><td>开放/质量评估</td></tr>
          <tr><td>人工抽检</td><td>最高</td><td>最慢最贵</td><td>否</td><td>定标准、校准 judge</td></tr>
          <tr><td>线上指标</td><td>最真实</td><td>滞后</td><td>是</td><td>上线后的真实表现</td></tr>
        </tbody>
      </table>

      <Example title="同一个问题，三层一起看">
        <p>任务：「查出过去 30 天销量最高的商品并说明依据。」Agent 答「是 A 商品」。光看结果不够：</p>
        <ul>
          <li><strong>结果</strong>　A 确实是销量第一 → 断言通过。</li>
          <li><strong>轨迹</strong>　但一看日志：它没查数据库，直接「猜」了一个——这次蒙对了，换批数据就会错。轨迹评分很低。</li>
          <li><strong>质量</strong>　它没给出「依据」（具体销量数字），违背了要求。judge 在「完整性」上扣分。</li>
        </ul>
        <p>三层结论合起来才是真相：「这次答对了，但方式不可靠、回答不完整」——只看结果会得出「完美」的错误结论。</p>
      </Example>

      <KeyIdea title="先建用例集，把评估变成可重复的事">
        <p>
          评估的起点是一份<strong>用例集</strong>（eval set）：一批有代表性的输入，每条配上「该满足什么」（断言或评分标准）。
          有了它，评估就从「随手试试」变成一件<strong>可重复、可对比</strong>的工程——改了 prompt、换了模型、调了流程，把整套用例
          重跑一遍，分数是涨了还是跌了一目了然。这套东西攒下来，就是你的<em>回归测试</em>：防止「修好一个问题、悄悄弄坏三个」。
        </p>
      </KeyIdea>
      <p>
        用例集怎么攒？最好的来源是<strong>真实失败案例</strong>。线上每出一次 bug、每接到一次用户投诉，就把那个输入连同「正确该是什么」沉淀成一条用例。
        这样你的 eval set 会随时间越来越贴合真实分布，而不是停留在你拍脑袋想的几个理想化例子上。一份只有「美好用例」的 eval set 会给你虚高的信心。
      </p>

      <Callout variant="warn" title="LLM-as-judge 的三种偏心">
        <p>
          让模型当裁判很香，但它有系统性偏见，不校正会得出失真的分数：
        </p>
        <ul>
          <li><strong>位置偏见</strong>——对比两个答案时，它倾向于偏好排在<strong>前面</strong>（或固定某个位置）的那个。对策：交换位置各评一次取平均。</li>
          <li><strong>啰嗦偏见</strong>——它倾向给<strong>更长</strong>的答案打高分，哪怕长的全是废话。对策：在评分标准里明确「长不等于好，只看是否满足标准」。</li>
          <li><strong>自我偏好</strong>——judge 倾向偏爱<strong>和自己风格相近</strong>（甚至自己生成）的答案。对策：尽量让 judge 和被评模型不是同一个，或用人工抽检校准。</li>
        </ul>
      </Callout>

      <KeyIdea title="judge 要打分，但谁来给 judge 打分？">
        <p>
          LLM-as-judge 最容易被忽略的一环是<strong>校准 judge 本身</strong>。judge 给的分数可能整体偏高、可能对某类答案系统性误判，你怎么知道？
          做法是：先让人工评一小批（比如 50 条）作为「金标准」，再让 judge 评同一批，算两者的一致率。一致率够高，才说明 judge 的分数可信、可以放心规模化；
          一致率低，就得改 judge 的 rubric 或换模型。<strong>没校准过的 judge 分数，只是另一种「感觉」，不是「数据」。</strong>
        </p>
      </KeyIdea>

      <h2>这对做 Agent / 工程实践意味着什么</h2>
      <p>
        把评估当成<strong>和写代码同等重要的工程</strong>来对待：尽量把能客观判定的部分压到<strong>断言</strong>上（又快又准又免费），
        剩下开放的部分才交给 <strong>LLM-judge</strong>，并用<strong>人工抽检</strong>定期校准 judge 靠不靠谱。针对「随机」这条特性，
        同一用例多跑几次看通过率，而不是只信一次。最后把这套用例集接进 CI，当作<strong>回归测试</strong>常态化跑——这样你每次改动
        才有底气说「确实变好了」，而不是「感觉变好了」。
      </p>
      <p>
        把这一卷六章串起来看：<strong>评估是闭环的最后一环，也是回到起点的那一环</strong>。第 1 章的循环、第 2 章的分解、第 3 章的反思、第 4 章的护栏，
        每一处改动好不好，最终都要靠这一章的 eval set 来判定；而线上跑出来的失败又会变成新的用例，反过来推动前几章的改进。没有评估，前面所有的「优化」都只是盲调；有了评估，整个 Agent 才进入「可度量、可迭代」的工程正轨。
      </p>

      <CodeBlock lang="python" title="robust_eval.py" code={passRateCode} />
      <p>
        上面两段补齐了最小框架最缺的两块：<code>pass_rate</code> 用「同一用例多跑几次」直面随机性，顺带标出「结论不稳定」的危险用例；
        <code>judge_pairwise</code> 用「交换位置各评一次」压制位置偏见。把它们接进下面的 <code>mini_eval.py</code>，评估就从「测一次的快照」升级成了「可信的统计」。
      </p>

      <Practice title="写一个最小 eval 框架">
        <p>
          下面是一个能跑的最小评估框架：一份带断言和评分标准的<strong>用例集</strong>，对每条用例先跑<strong>断言硬测</strong>，
          再用 <strong>LLM-as-judge</strong> 打分，最后<strong>汇总</strong>出断言通过率和平均分。注意 judge 的 system prompt 里
          已经写了「忽略长短」来压制啰嗦偏见。
        </p>
        <CodeBlock lang="python" title="mini_eval.py" code={evalCode} />
        <p>
          三处可扩展：给每条用例跑 3 次取通过率（用上面的 <code>pass_rate</code>），应对随机性；给 judge 做「位置交换各评一次取平均」（用上面的 <code>judge_pairwise</code>），压制位置偏见；
          把 <code>evaluate</code> 的汇总写成一份 JSON 报告存档，下次改动后 diff 一下分数，这就把它升级成了回归测试。
        </p>
        <p>
          进阶练习：再加一步「校准 judge」——人工给 5 条用例打分，让 judge 评同一批，算一致率；一致率不达标就回去改 rubric。亲手体会「先信任裁判，再用裁判」的顺序。
        </p>
      </Practice>

      <Summary
        points={[
          'Agent 难评因为它开放（无唯一答案）、多步（结果对不等于过程对）、随机（一次结论不可靠）。',
          '评什么分三层：结果（对不对）、轨迹（过程合不合理）、质量（好不好），三层合看才是真相。',
          '怎么评有四手段：断言硬测（能用就用）、LLM-as-judge（开放题、可规模化）、人工抽检（校准）、线上指标（最真实但滞后）。',
          'LLM-judge 有三种偏心：位置偏见（偏前面）、啰嗦偏见（偏长）、自我偏好（偏自己风格），都要主动校正。',
          'judge 本身要先用人工金标准校准一致率，没校准过的 judge 分数只是另一种「感觉」。',
          '评估的起点是用例集，最好从真实失败案例沉淀，让它越来越贴近真实分布而非理想化例子。',
          '用随机多跑取通过率应对不确定性；把用例集接进 CI 当回归测试，每次改动才有数说「确实变好了」。',
          '评估是 Agent 闭环的最后一环也是回到起点的一环：前几章的改动靠它判定，线上失败又反哺成新用例。',
        ]}
      />
    </>
  )
}
