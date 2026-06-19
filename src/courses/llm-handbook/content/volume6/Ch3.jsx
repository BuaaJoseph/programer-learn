import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const reviseCode = `from anthropic import Anthropic

client = Anthropic()

def call(system, user):
    resp = client.messages.create(
        model='claude-sonnet-4-5',
        max_tokens=1024,
        system=system,
        messages=[{'role': 'user', 'content': user}],
    )
    return resp.content[0].text

def draft(task):
    return call('你是写作助手，直接产出答案。', task)

# 关键：critic 用「独立视角」，只挑错、不为答案辩护
CRITIC_SYS = '''你是严格的审稿人。针对给定的任务和草稿，只列出具体问题：
事实错误、遗漏的要求、逻辑漏洞、表达问题。如果确实没问题，只回复「PASS」。
不要重写答案，不要夸奖。'''

def critique(task, answer):
    return call(CRITIC_SYS, f'任务:\\n{task}\\n\\n草稿:\\n{answer}')

def revise(task, answer, feedback):
    return call('你是写作助手，根据审稿意见修订答案，只输出修订后的完整答案。',
                f'任务:\\n{task}\\n\\n原答案:\\n{answer}\\n\\n审稿意见:\\n{feedback}')

def reflexion_loop(task, max_rounds=3):
    answer = draft(task)
    best = answer
    for _ in range(max_rounds):
        fb = critique(task, answer)
        if fb.strip() == 'PASS':
            return answer            # critic 认可，提前收工
        answer = revise(task, answer, fb)
        best = answer                # 保留最近一版（也可按打分保留最优）
    return best

print(reflexion_loop('用三句话解释什么是数据库索引，面向初级开发者'))`

const toolCheckCode = `# 写代码时，最可靠的「critic」是真去跑测试，而不是问模型「对不对」。
# 把工具核查接进 revise 循环：编译/跑测试给出客观信号，再让模型据此改。
import subprocess, tempfile, os

def run_tests(code, test_code):
    # 把代码和测试落盘，真的跑一遍 pytest，拿真实结果当反馈
    d = tempfile.mkdtemp()
    open(os.path.join(d, 'solution.py'), 'w').write(code)
    open(os.path.join(d, 'test_solution.py'), 'w').write(test_code)
    proc = subprocess.run(['pytest', '-q'], cwd=d,
                          capture_output=True, text=True, timeout=30)
    passed = proc.returncode == 0
    return passed, proc.stdout + proc.stderr

def code_reflexion(task, test_code, draft_code, revise, max_rounds=3):
    code = draft_code
    for _ in range(max_rounds):
        passed, log = run_tests(code, test_code)
        if passed:
            return code                      # 测试全绿，客观确认通过
        # 把真实的测试报错喂回去——这是不会护短的反馈
        code = revise(task, code, f'测试未通过，输出如下：\\n{log}')
    return code
# 对比 reflexion_loop：这里的「通过」由测试判定，不是模型自我感觉良好。`

export default function Ch6_3() {
  return (
    <>
      <Lead>
        <p>
          自主 Agent 跑在一个循环里，没有人盯着每一步。它走偏了，没人会报警——只能靠它<strong>自己发现自己错了</strong>，
          再改回来。这种「自我察觉 + 自我纠正」的能力，叫<em>反思</em>（reflection / self-correction）。它和你熟悉的
          错误处理是两码事，却同样是 Agent 能不能可靠干完活的关键。
        </p>
      </Lead>

      <h2>反思和「错误处理」不是一回事</h2>
      <p>
        传统的错误处理，依赖一个<strong>明确的失败信号</strong>：API 返回 500、函数抛异常、断言失败——有东西「报警」，
        你的 <code>try/except</code> 才有机会接住。但 Agent 的很多错误不会报警：模型一本正经地编了个不存在的 API、
        把需求理解偏了、推理链中间断了一环——程序层面一切「正常」，结果却是错的。
      </p>
      <p>
        这类「没人报警的错」，只能靠 Agent 自己回头看一眼产出，判断「这对吗、够好吗」，发现不对再改。所以反思不是替代
        错误处理，而是补上它够不着的那一大片——逻辑和质量层面的错误。
      </p>
      <table>
        <thead>
          <tr><th></th><th>错误处理（try/except）</th><th>反思（reflection）</th></tr>
        </thead>
        <tbody>
          <tr><td>触发信号</td><td>明确：异常、500、断言失败</td><td>无信号：要主动回看才发现</td></tr>
          <tr><td>覆盖的错</td><td>程序层面的崩溃/失败</td><td>逻辑、事实、质量、受众不匹配</td></tr>
          <tr><td>判定者</td><td>运行时/代码</td><td>模型自评、独立 critic 或工具</td></tr>
          <tr><td>典型例子</td><td>网络超时、解析失败</td><td>编了个不存在的 API、答非所问</td></tr>
        </tbody>
      </table>

      <h3>四种反思模式</h3>
      <ul>
        <li>
          <strong>自我批评</strong>（self-critique）：让<strong>同一个</strong>模型先答，再在同一段对话里反问自己「上面哪里有问题」，
          然后改。最简单，但有个天生的毛病（见下文）。
        </li>
        <li>
          <em>Reflexion</em>：把「答 → 评 → 改」做成一个显式循环，每轮把上一轮的批评意见当作新的输入，迭代逼近更好的答案。
          这是反思最常见的落地形态。
        </li>
        <li>
          <strong>独立 critic agent</strong>：用<strong>另一个</strong>模型调用（不同的 system prompt、看不到「答题者」的内心戏）
          专门挑错。视角独立，不容易护短。
        </li>
        <li>
          <strong>工具核查</strong>：不靠模型的「感觉」，而是用真实工具验证——编译一下代码、跑一下测试、查一下数据库。
          能用工具核查的地方，永远比让模型自评更可靠。
        </li>
      </ul>

      <KeyIdea title="挑错比答对容易">
        <p>
          反思之所以有效，靠的是一个不对称：<strong>生成一个正确答案很难，但判断一个给定答案哪里不对，要容易得多</strong>。
          就像写一篇文章费劲，但读别人的文章挑毛病轻松。Agent 利用的正是这一点——先尽力答一版（可能不完美），再用相对
          省力的「挑错」能力去发现并修补缺陷。这也解释了为什么「答 → 评 → 改」往往真能把质量抬上去。
        </p>
      </KeyIdea>
      <p>
        但这个不对称<strong>有边界</strong>：当模型连「什么是对的」都不知道时，它既答不对、也评不准。比如问它一个超出知识范围的事实，
        它编了个答案，再让它自评，它照样觉得「挺好」——因为它没有外部参照系。<strong>反思能修补「能力范围内的疏忽」，但修不了「能力范围外的无知」</strong>。
        这正是工具核查不可替代的原因：测试、编译器、数据库给的是模型自身没有的外部真值。
      </p>

      <Example title="一轮 draft → critique → revise">
        <p>任务：「用三句话解释数据库索引，面向初级开发者。」</p>
        <ul>
          <li>
            <strong>draft</strong>　模型答：「索引是一种 B+ 树结构，使用二分查找加速……」——出现了初级开发者未必懂的术语。
          </li>
          <li>
            <strong>critique</strong>　独立 critic 指出：「面向初级读者却用了 B+ 树、二分查找等术语，违背了受众要求；缺少一个直观类比。」
          </li>
          <li>
            <strong>revise</strong>　修订版：「索引就像书末的目录，让数据库不用一页页翻就能快速定位数据。代价是写入会稍慢、要占额外空间。所以查得多、改得少的列才值得加索引。」
          </li>
        </ul>
        <p>第一版不算错，但 critic 抓住了「受众不匹配」这种没有任何程序会报警的问题，改完明显更切题。</p>
      </Example>

      <Callout variant="warn" title="坑：模型会为自己的答案辩护">
        <p>
          让<strong>同一个</strong>模型既当答题者又当批改者，最大的隐患是<strong>自我偏袒</strong>——它倾向于认为自己刚写的答案是对的，
          于是把「批评」写成「夸奖」，或者只挑无关痛痒的小毛病，真正的错误轻轻放过。这会让反思循环空转：转了三轮，答案没实质变化。
          可靠得多的做法是用<strong>独立的 critic</strong>：不同的 system prompt、看不到答题者的推理过程，只对着「任务 + 答案」冷静挑错。
          能上工具核查（编译、跑测试）就更别犹豫，那是最不会护短的「critic」。
        </p>
      </Callout>
      <Callout variant="warn" title="另一个坑：反思也可能把对的改错">
        <p>
          反思不是单调变好。critic 偶尔会提出错误的批评（「这里应该用 X」其实原来的更好），revise 照着改，结果<strong>越改越差</strong>。
          所以一定要<strong>保留历史最优版本</strong>，而不是无脑用最新一版。能打分就给每版打分留最高的；不能打分至少留「最近一次 critic 给 PASS 的版本」。
          反思循环的输出应当是「见过的最好版本」，不是「最后一版」。
        </p>
      </Callout>

      <h2>这对做 Agent / 工程实践意味着什么</h2>
      <p>
        把反思做成一个 <strong>draft → critique → revise 的循环</strong>，并设三道闸：一是<strong>最大轮数</strong>，避免无止境地改
        （和第 1 章的轮数上限同源）；二是<strong>提前退出</strong>，critic 说「PASS」就立刻收工，别为改而改；三是
        <strong>保留最优</strong>——每一轮的修订未必都比上一轮好，要么保留最近通过的版本，要么给每版打分留最高的，
        防止「越改越差」。再叠一条原则：能用工具客观核查的环节，就别让模型自评。这样反思才是净增益，而不是徒增成本。
      </p>
      <p>
        成本上要清醒：反思是用<strong>更多次模型调用换质量</strong>。一个 draft + 三轮 critique/revise 就是七八次调用，比单次答贵好几倍。
        所以别给所有任务都套反思——只在「错误代价高、且值得多花钱」的任务上用（对应第 1 章的四个判断项里的「价值」与「错误代价」）。简单查询直接答，反思纯属浪费。
      </p>
      <CodeBlock lang="python" title="code_reflexion.py" code={toolCheckCode} />
      <p>
        上面这版把「critic」换成了真跑测试：通过与否由 pytest 的返回码客观判定，反馈是真实的报错日志。对比纯模型自评的版本，它几乎不会「护短」，
        也不会被模型的错误批评带偏——这就是「能用工具核查就别让模型自评」的具体落地。
      </p>

      <Practice title="实现 draft → critique → revise 循环">
        <p>
          下面是一个可运行的 Reflexion 循环：<code>draft</code> 出初稿，<code>critique</code> 用<strong>独立 system prompt</strong>
          的 critic 挑错（约定无问题时回复 PASS），<code>revise</code> 据反馈修订，主循环负责控制轮数、提前退出、保留版本。
        </p>
        <CodeBlock lang="python" title="reflexion.py" code={reviseCode} />
        <p>
          三处可以动手深化：把 <code>best</code> 的策略从「留最近一版」改成「让一个 judge 给每版打分、留分数最高的」；
          把 critic 换成同一段对话里的自我批评，对比一下它是不是更容易给自己「放水」；如果任务是写代码，把 critic 换成
          上面的 <code>code_reflexion.py</code>——「真的跑一遍单元测试」的工具核查，体会工具比模型自评可靠多少。
        </p>
      </Practice>

      <Summary
        points={[
          '反思是 Agent 自己发现、自己纠正错误的能力；它补的是错误处理够不着的逻辑与质量层面的「无报警错误」。',
          '四种模式：自我批评、Reflexion（答-评-改循环）、独立 critic agent、工具核查（最可靠）。',
          '反思有效的根基是不对称——挑错比答对容易；但它修不了「能力范围外的无知」，那只能靠工具提供的外部真值。',
          '最大的坑是自我偏袒：同一模型既答又评会替自己辩护，用独立 critic 更可靠，能上工具核查就别靠模型自评。',
          '反思也可能把对的改错，必须保留历史最优版本（能打分留最高、否则留最近 PASS 版），输出「见过的最好版」而非「最后一版」。',
          '工程上把它做成 draft→critique→revise 循环，并设最大轮数、PASS 提前退出、保留最优三道闸。',
          '反思是用更多调用换质量，成本翻几倍，只在错误代价高且值得的任务上用，简单查询别套反思。',
        ]}
      />
    </>
  )
}
