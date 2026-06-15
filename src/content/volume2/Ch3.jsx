import Lead from '../../components/cards/Lead.jsx'
import KeyIdea from '../../components/cards/KeyIdea.jsx'
import Example from '../../components/cards/Example.jsx'
import Practice from '../../components/cards/Practice.jsx'
import Callout from '../../components/cards/Callout.jsx'
import CodeBlock from '../../components/cards/CodeBlock.jsx'
import Summary from '../../components/cards/Summary.jsx'

const cotCompareCode = `# 对比：有无 CoT 的 prompt
# 同一道题，加一句「一步步想」往往就能把对错翻过来

question = (
    '一家店周一卖了 23 个杯子，周二卖的是周一的 2 倍，'
    '周三比周二少卖 9 个。三天一共卖了多少个？'
)

# 直接要答案：模型容易在一步里算错
prompt_direct = question + '\\n只输出最终数字。'

# zero-shot CoT：加一句引导，让它把推理过程写出来
prompt_cot = question + '\\n让我们一步一步地想，最后单独给出答案。'

# few-shot CoT：先给一个带推理过程的范例，再问新题
prompt_few_shot = (
    '问：小明有 5 个苹果，又买了 3 袋，每袋 4 个，一共多少个？\\n'
    '答：先算买的：3 乘 4 等于 12；再加原有的 5；12 加 5 等于 17。答案：17。\\n\\n'
    '问：' + question + '\\n答：'
)`

const selfConsistencyCode = `# self-consistency：对同一道题多次采样，取多数答案
import re
from collections import Counter
from openai import OpenAI

client = OpenAI()

def ask_once(question, temperature=0.7):
    resp = client.chat.completions.create(
        model='gpt-4o-mini',
        messages=[{
            'role': 'user',
            'content': question + '\\n一步步推理，最后用「答案：N」给出整数。',
        }],
        temperature=temperature,   # 调高一点，制造多样的推理路径
    )
    return resp.choices[0].message.content

def extract_answer(text):
    m = re.findall(r'答案[:：]\\s*(-?\\d+)', text)
    return m[-1] if m else None     # 取最后一个，通常是最终答案

def self_consistency(question, n=5):
    answers = []
    for _ in range(n):
        ans = extract_answer(ask_once(question))
        if ans is not None:
            answers.append(ans)
    if not answers:
        return None, {}
    votes = Counter(answers)
    best, _ = votes.most_common(1)[0]
    return best, dict(votes)

if __name__ == '__main__':
    q = '一家店周一卖了 23 个杯子，周二是周一的 2 倍，周三比周二少卖 9 个。三天共卖多少个？'
    final, votes = self_consistency(q, n=5)
    print('投票分布:', votes)
    print('最终答案:', final)`

export default function Ch3() {
  return (
    <>
      <Lead>
        <p>
          模型一次只生成一个 token，每个 token 背后的算力是<strong>固定且有限</strong>的。
          难题要是逼它「一步算到底」，它就得在那一步里塞下全部推理——往往算不动、就蒙一个。
          <em>思维链</em>（chain-of-thought, CoT）的全部窍门，
          就是让它把推理过程一个 token 一个 token 地<strong>写出来</strong>，相当于给它一张草稿纸。
        </p>
      </Lead>

      <h2>CoT 为什么有用：把算力摊开到更多 token 上</h2>
      <p>
        回顾第 1 卷：模型生成是自回归的，一次只吐一个词，而每生成一个 token 的计算量是大致恒定的。
        这意味着模型在「单个 token」上能做的运算量有上限。直接问「答案是多少」，
        等于要求它在生成那一个答案 token 之前，在脑子里（前向传播一次）把整道题算完——复杂题根本来不及。
      </p>
      <p>
        而如果让它先写「第一步……第二步……所以……」，每一步都是新生成的 token，
        又都会回流进上下文成为下一步的输入。于是：
      </p>
      <ul>
        <li><strong>把难题摊成多步</strong>：每一步只需做一点点运算，难度被切碎了。</li>
        <li><strong>用上下文当草稿纸</strong>：中间结果写在文本里，后面的步骤能「看到」并接着用，不必全凭一次前向传播记住。</li>
        <li><strong>更多 token = 更多算力</strong>：推理过程越长，分摊到整道题上的总计算量越大。</li>
      </ul>
      <p>这就是为什么「让我们一步一步想」这种看似空洞的一句话，能实打实提高数学、逻辑题的正确率。</p>

      <h3>三种常见用法</h3>
      <ul>
        <li>
          <strong>zero-shot CoT</strong>：不给示例，只在问题后加一句引导，如「让我们一步一步地想」。
          最省事，对许多任务立竿见影。
        </li>
        <li>
          <strong>few-shot CoT</strong>：先给一两个<strong>带完整推理过程</strong>的范例，再问新题。
          示例既教了「要写推理」，也示范了推理的格式和粒度，通常比 zero-shot 更稳。
        </li>
        <li>
          <strong>self-consistency</strong>：对同一道题，把温度调高、采样多条不同的推理路径，
          最后对它们的<strong>最终答案投票</strong>，取多数。不同路径可能各有各的错，但正确答案往往是「最多条路径殊途同归」的那个。
        </li>
      </ul>

      <Example title="同一道题，直接问 vs. 让它一步步想">
        <p>
          下面三个 prompt 问的是同一道题：直接要答案、zero-shot CoT、few-shot CoT。
          直接要答案时模型常在「周二是周一 2 倍」这步打滑；让它写出过程后，错误率显著下降。
        </p>
        <CodeBlock lang="python" title="cot_compare.py" code={cotCompareCode} />
        <p>
          正确推理是：周一 23、周二 46、周三 37，合计 106。
          你会发现 CoT 版本不仅更容易答对，过程还能被你检查——错在哪一步一目了然。
        </p>
      </Example>

      <KeyIdea title="推理过程就是外置的草稿纸">
        <p>
          CoT 不是让模型「变聪明」了，而是把它对单个 token 的算力限制<strong>绕开</strong>了：
          把一道大题拆成一串小步，让每一步的中间结果落到文本里，成为下一步可读的输入。
          本质上，你是在用「更多的 token」换「更强的有效计算」。这也解释了为什么专门的推理模型
          会在回答前生成一大段「思考」内容——那段思考就是它的草稿纸。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="unfaithful CoT：写出的理由未必是真的">
        <p>
          有个反直觉但重要的局限：模型写出来的推理过程，<strong>不一定是它真正得出答案的过程</strong>。
          研究发现，模型可能先「倾向于」某个答案，再编一段看起来合理的推理去圆它——
          这叫 <em>unfaithful CoT</em>（不忠实的思维链）。后果是：
        </p>
        <ul>
          <li>推理文字读起来头头是道，结论却错；或者结论对，但中间某步其实是错的（碰巧抵消了）。</li>
          <li>不能把 CoT 文本当成「模型内部真实计算的忠实记录」，更不能仅凭它来判断答案一定可信。</li>
          <li>真要确保正确，得靠外部校验：让它调计算器/代码执行结果、用 self-consistency 投票、或对关键步骤做断言检查。</li>
        </ul>
      </Callout>

      <h2>这对做 Agent / 工程实践意味着什么</h2>
      <p>
        CoT 是后面 Agent 推理范式的地基。当你把「写出推理」和「调用工具、观察结果、再推理」拼在一起，
        就得到了 <em>ReAct</em>（Reason + Act）——模型先想一步（reason），决定调哪个工具（act），
        看到工具返回（observation），再接着想。这正是第 4 卷的主线。
        工程上要记两点：一是 CoT 会显著增加 token 消耗和延迟，要权衡何时开；
        二是别把模型自陈的推理当作可信审计日志，关键结论务必用工具或代码<strong>实算一遍</strong>来验证。
      </p>

      <Practice title="自己跑一遍 CoT 与 self-consistency 投票">
        <p>
          先用上面的 <code>cot_compare.py</code> 把三种 prompt 各跑几次，对比正确率和稳定性。
          然后用下面的 self-consistency 脚本：把温度调到 0.7、采样 5 条路径，对最终答案投票。
        </p>
        <CodeBlock lang="python" title="self_consistency.py" code={selfConsistencyCode} />
        <p>
          练习：把 <code>n</code> 从 1 加到 9，观察投票分布怎么收敛；
          再找一道你知道答案、但模型偶尔会错的题，看看投票能不能把偶发错误「平均掉」。
          顺便留意有没有 unfaithful 的情况——某条路径过程明明错了，结论却蒙对了。
        </p>
      </Practice>

      <Summary
        points={[
          '模型一次只生成一个 token、单步算力有限；CoT 把推理写出来，等于给它一张草稿纸。',
          '把难题摊成多步、让中间结果落进上下文、用更多 token 换更强的有效计算，是 CoT 见效的根本原因。',
          'zero-shot CoT 加一句「一步步想」；few-shot CoT 给带推理过程的范例；self-consistency 多次采样后对答案投票。',
          'unfaithful CoT：写出的理由未必是真实计算过程，结论与过程可能各自出错，不能当审计日志。',
          '要保证正确，靠外部校验——工具实算、代码执行、self-consistency 投票、关键步骤断言。',
          'CoT 是 ReAct（边推理边调工具）的地基，预告第 4 卷；工程上要权衡它带来的 token 与延迟开销。',
        ]}
      />
    </>
  )
}
