import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const decideCode = `def should_finetune(case):
    """一个粗糙但好用的决策清单：返回该走哪条路。
    输入 case 是一个描述需求的字典。"""

    # 1) 先问：问题出在「知识」还是「行为」？
    if case['need'] == 'fresh_facts':
        # 需要最新的、私有的、会变的事实 -> 这是 RAG 的活
        return 'RAG'

    # 2) 行为问题：能不能用 prompt 说清楚？
    if case['can_describe_in_prompt'] and case['volume'] == 'low':
        # 规则能写进 system prompt，调用量也不大 -> 先 prompt
        return 'PROMPT'

    # 3) 行为稳定、且满足下面任一条，才考虑微调
    finetune_signals = [
        case['need'] == 'fixed_style',      # 固定风格/语气/格式
        case['need'] == 'strict_format',    # 必须严格结构化输出
        case['need'] == 'cut_token_cost',   # 用小模型省 token
        case['need'] == 'distill',          # 蒸馏大模型能力到小模型
    ]
    if any(finetune_signals) and case['has_labeled_data']:
        return 'FINETUNE'

    # 4) 默认：先把 prompt 和 RAG 榨干，别急着微调
    return 'PROMPT_THEN_RAG'`

export default function Ch3_1() {
  return (
    <>
      <Lead>
        <p>
          很多团队一遇到「模型表现不够好」，第一反应就是「那我们微调一个吧」。这往往是最贵、最慢、最容易翻车的选择。
          在动手之前，你需要先想清楚一件事：你到底是想改变模型的<strong>行为</strong>，还是想给它补充<strong>知识</strong>？
          这一章不写代码，只帮你把这个判断做对。
        </p>
      </Lead>

      <h2>改变模型行为的三层</h2>
      <p>
        想让一个大模型按你的意思办事，你能动的东西其实只有三层，从轻到重排列：
      </p>
      <ul>
        <li>
          <strong>Prompt</strong>——改的是「题面」。你不碰模型，只是把任务、规则、示例写进上下文里，让冻结的参数在更好的引导下作答。
        </li>
        <li>
          <strong>RAG</strong>——改的是「资料」。你在推理时临时检索外部文档塞进上下文，给模型补上它参数里没有的事实。
        </li>
        <li>
          <strong>微调</strong>（fine-tuning）——改的是「权重」。你真的去更新模型参数，把某种行为永久地刻进它体内。
        </li>
      </ul>
      <p>
        前两层都是在<em>推理时</em>动上下文，模型本身一个字节都没变；只有第三层是真正改了模型。理解这个分层，
        是做技术选型的起点。
      </p>

      <h3>一句话记住核心判断</h3>
      <p>
        <strong>微调改行为，RAG 注事实。</strong>这八个字能挡掉大半的错误决策。如果你的痛点是「模型不知道我们公司上周发布的新规」，
        那是知识缺口，再怎么微调也是徒劳——你今天微调进去的事实，下周又过期了。反过来，如果痛点是「不管我怎么写 prompt，
        它的语气就是不像我们品牌」，那再多检索文档也救不了，这是行为问题，才该考虑微调。
      </p>

      <Example title="同一个症状，不同的解法">
        <p>客服机器人「答得不好」，拆开看可能是三种完全不同的病：</p>
        <ul>
          <li>
            答案<strong>事实错误</strong>（报错了退款政策的天数）→ 知识问题 → 用 <em>RAG</em> 把最新政策文档检索进来。
          </li>
          <li>
            答案<strong>语气太机械</strong>（不像我们温暖的品牌调性）→ 行为问题，但能描述清楚 → 先在 <em>system prompt</em> 里写风格要求。
          </li>
          <li>
            语气要求<strong>极其细腻、prompt 写到几百字还是不稳</strong>，而且每天几百万次调用 → 这才轮到 <em>微调</em>。
          </li>
        </ul>
      </Example>

      <KeyIdea title="决策顺序：prompt → RAG → 微调">
        <p>
          这三层不是平行的选项，而是有<strong>先后顺序</strong>的阶梯：永远先用最便宜的 prompt 试，不行再上 RAG，
          实在还不行才动微调。原因很现实——微调最贵：它需要标注数据、训练算力、版本管理、上线后还要持续维护一套自己的模型。
          prompt 改一行就能上线，RAG 换个文档库就生效，而微调的每次迭代都是以天甚至周计的工程。<strong>把微调放在最后</strong>，
          不是因为它没用，而是因为它的成本应该匹配它的收益。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="别用微调去做这两件事">
        <ul>
          <li>
            <strong>别用微调灌输事实</strong>——模型不会因为你训练过几条数据就「记住」某个事实，它只是把统计规律调了调；
            想灌进去新知识需要海量重复样本，且无法精确控制，还会引入幻觉。事实交给 RAG。
          </li>
          <li>
            <strong>别用微调替代能力</strong>——如果基座模型本身不会写代码，微调几千条样本也教不会它编程；微调是「塑形」已有能力，
            不是「凭空长出」新能力。
          </li>
        </ul>
      </Callout>

      <h2>什么场景才真该微调</h2>
      <p>
        说了这么多「先别微调」，那到底什么时候该微调？下面四类场景是微调真正发光的地方：
      </p>
      <ul>
        <li>
          <strong>固定风格 / 格式</strong>——你要的输出有非常稳定的结构或腔调（比如永远输出某种 JSON schema、永远用某种法律文书口吻），
          用 prompt 描述要写很长还不稳，微调能把这种「定式」固化下来。
        </li>
        <li>
          <strong>领域语气</strong>——医疗、法律、金融等领域有自己的措辞习惯和谨慎度，微调能让模型自然地说「行话」。
        </li>
        <li>
          <strong>降低 token 成本</strong>——如果你每次调用都要塞几千 token 的示例和规则，微调可以把这些「内化」进权重，
          从此 prompt 写得很短就能达到同样效果，高频调用下省下的钱非常可观。
        </li>
        <li>
          <strong>蒸馏</strong>（distillation）——用大而贵的模型生成高质量数据，再去微调一个小而快的模型，让小模型在你这个具体任务上逼近大模型，
          兼顾质量和成本。
        </li>
      </ul>

      <h2>这对做 Agent / 工程实践意味着什么</h2>
      <p>
        在 Agent 系统里，模型只是其中一环，外面还包着工具调用、检索、记忆、编排。盲目微调会让这一环变成<strong>难以维护的黑盒</strong>：
        换基座要重训，加新行为要重训，出了问题难以定位。工程上的健康做法是——尽量把<strong>可变的东西</strong>（事实、规则、工具说明）
        留在上下文里，用 prompt 和 RAG 解决，只把<strong>真正稳定且高频</strong>的行为沉淀为微调。这样系统的大部分逻辑都是
        「看得见、改得动」的，迭代速度才快。微调是终点，不是起点。
      </p>

      <Practice title="先跑一遍决策清单">
        <p>
          把你手头那个「想微调」的需求，套进下面这个判断函数走一遍。重点不是这段代码本身，而是它逼你回答的那几个问题：
          你缺的是事实还是行为？能不能用 prompt 描述清楚？有没有标注数据？
        </p>
        <CodeBlock lang="python" title="should_finetune.py" code={decideCode} />
        <p>
          如果跑下来结果是 <code>PROMPT</code> 或 <code>RAG</code>，恭喜你省下了一大笔训练成本；只有当它返回 <code>FINETUNE</code>，
          再翻开后面几章正式动手。
        </p>
      </Practice>

      <Summary
        points={[
          '改变模型行为有三层：prompt 改「题面」、RAG 改「资料」、微调改「权重」；前两层不动模型，只有微调真改参数。',
          '核心判断只有八个字：微调改行为，RAG 注事实——事实缺口别指望靠微调补。',
          '决策有先后顺序：先 prompt、再 RAG、最后才微调，因为微调最贵、最慢、最难维护。',
          '别用微调灌事实或凭空造能力；微调是给已有能力「塑形」，不是长出新能力。',
          '真该微调的场景：固定风格/格式、领域语气、降低 token 成本、蒸馏小模型。',
          '工程上把可变的东西留在上下文，只把稳定高频的行为沉淀为微调，系统才迭代得快。',
        ]}
      />
    </>
  )
}
