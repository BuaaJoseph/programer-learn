import Lead from '../../components/cards/Lead.jsx'
import KeyIdea from '../../components/cards/KeyIdea.jsx'
import Example from '../../components/cards/Example.jsx'
import Practice from '../../components/cards/Practice.jsx'
import Callout from '../../components/cards/Callout.jsx'
import CodeBlock from '../../components/cards/CodeBlock.jsx'
import Summary from '../../components/cards/Summary.jsx'

const routeCode = `from dataclasses import dataclass

# 价格按「每百万 token」算，输入/输出分开计费（数值仅为示意，请以实际为准）。
@dataclass
class ModelTier:
    name: str
    in_price: float    # 输入价：USD / 1M tokens
    out_price: float   # 输出价：USD / 1M tokens（通常是输入的 3~5 倍）

TIERS = {
    'small':  ModelTier('haiku',  0.80,  4.00),
    'medium': ModelTier('sonnet', 3.00, 15.00),
    'large':  ModelTier('opus',  15.00, 75.00),
}


def estimate_cost(tier_key, tokens_in, tokens_out):
    t = TIERS[tier_key]
    return (tokens_in * t.in_price + tokens_out * t.out_price) / 1_000_000


def route_model(task: str, *, needs_reasoning: bool, input_len: int) -> str:
    # 分级路由：用任务特征选最小够用的模型，而不是无脑上最强的。
    if task in ('classify', 'extract', 'format', 'route'):
        return 'small'                      # 结构化、判别类任务，小模型足矣
    if needs_reasoning or input_len > 8000:
        return 'large'                      # 多步推理 / 超长上下文才动用大模型
    return 'medium'                          # 默认中档：日常对话、改写、总结


if __name__ == '__main__':
    # 假设一天 10 万次请求，平均 input 1500 / output 400 token
    n, t_in, t_out = 100_000, 1500, 400

    all_large = n * estimate_cost('large', t_in, t_out)

    # 分级路由后的真实占比：60% 小、30% 中、10% 大
    mixed = (
        0.6 * n * estimate_cost('small',  t_in, t_out)
        + 0.3 * n * estimate_cost('medium', t_in, t_out)
        + 0.1 * n * estimate_cost('large',  t_in, t_out)
    )

    print(f'全用大模型:   USD {all_large:,.0f} / 天')
    print(f'分级路由:     USD {mixed:,.0f} / 天')
    print(f'省下:         {(1 - mixed / all_large):.0%}')`

export default function Ch8_2() {
  return (
    <>
      <Lead>
        <p>
          Demo 跑通和上线运营之间，隔着一张账单和一条延迟曲线。一个看起来很聪明的多 Agent 系统，
          可能在真实流量下每天烧掉四位数美金、让用户等上十几秒。本章讲两件最现实的事：
          钱花在哪、时间耗在哪，以及怎么在<strong>不明显牺牲质量</strong>的前提下把它们压下来。
        </p>
      </Lead>

      <h2>账单是怎么算出来的</h2>
      <p>
        LLM 按 <em>token</em> 计费，而且<strong>输入 token 和输出 token 分别计价</strong>。关键的反直觉点是：
        <strong>输出通常比输入贵 3 到 5 倍</strong>。原因在于生成是自回归的——每吐一个输出 token 都要把
        整段上下文重新前向计算一遍，算力开销远大于一次性读入的输入。
      </p>
      <p>
        所以「让模型少说废话」不只是体验问题，更是直接省钱。一个动辄输出三百字解释的 Agent，
        和一个只回必要结论的 Agent，账单可能差一倍。
      </p>

      <Callout variant="warn" title="多 Agent / 多轮会让账单滚雪球">
        <p>
          单次调用看着便宜，但 Agent 系统的成本是<strong>乘出来的</strong>。每多一个 Agent、每多一轮对话，
          都意味着把<strong>越滚越长的上下文</strong>重新喂一遍。一个协调器 + 三个专家 Agent 的系统，
          处理一个请求可能产生七八次 LLM 调用，而且每次都带着前面累积的全部历史。
          上下文越长，单次输入 token 越多，再乘以调用次数——成本不是加法，是<strong>近乎平方级</strong>的增长。
          这就是为什么「能用一次调用解决就别用两次」。
        </p>
      </Callout>

      <h3>先量后优：别凭感觉优化</h3>
      <p>
        优化的第一条铁律和普通性能调优一样：<strong>先 profile，再动手</strong>。在没有数据之前就去「优化」，
        十有八九是在改一个根本不重要的地方。上一章的 trace 此刻就派上用场了——把每个 span 的 token 数和耗时
        聚合起来，你会立刻看到真相：往往 80% 的成本集中在某一两类调用上，80% 的延迟卡在某一个慢工具上。
        <strong>优化那两个，别动其余的。</strong>
      </p>

      <Example title="profile 之后常见的真相">
        <p>给一个客服 Agent 做一周的 trace 聚合，结果往往长这样：</p>
        <ul>
          <li>62% 的成本来自「生成最终回复」这一步——因为它用了大模型且输出很长。</li>
          <li>71% 的 P95 延迟来自一次外部订单查询工具——网络往返慢。</li>
          <li>每次请求平均重复携带了 4000 token 的历史，其中大半已无关。</li>
        </ul>
        <p>
          看到这张表，优化方向就不用猜了：回复步骤换分级模型、订单查询加缓存、历史做裁剪。
          其余的代码一行都不用碰。
        </p>
      </Example>

      <h2>六招砍成本与延迟</h2>
      <p>下面六招按性价比从高到低排，多数项目用前三招就能砍掉一大半开销：</p>
      <ul>
        <li>
          <strong>裁剪上下文</strong>：别把全部历史无脑塞进去。做摘要、只留最近 N 轮、只检索相关片段。
          上下文短了，输入 token 直接下降，延迟也跟着降。
        </li>
        <li>
          <strong>模型分级路由</strong>：判别/分类/格式化这类活儿交给小模型，只有需要多步推理时才动用大模型。
          这是省钱最猛的一招，详见本章 Practice。
        </li>
        <li>
          <strong>prompt 缓存</strong>：系统提示、知识库片段这些每次都一样的前缀，用 <em>prompt caching</em>
          缓存起来，命中后这部分输入 token 大幅打折，延迟也降。
        </li>
        <li>
          <strong>并行调用</strong>：互不依赖的多个工具/检索，别串行等待，用并发一起发出去，总延迟取最慢的那个而非求和。
        </li>
        <li>
          <strong>流式输出</strong>：用 <em>streaming</em> 边生成边返回。它不降低总成本，但让用户在几百毫秒内就看到
          第一个字，<strong>体感延迟</strong>大幅改善——这往往比真实延迟更影响满意度。
        </li>
        <li>
          <strong>减少调用次数</strong>：能合并的步骤合并，能一轮搞定就别两轮。每砍掉一次 LLM 调用，
          省的是一整段上下文的输入成本加一次网络往返。
        </li>
      </ul>

      <KeyIdea title="质量 × 成本 × 延迟：三角权衡">
        <p>
          这三者是一个<strong>不可能三角</strong>：想又快又便宜，质量大概率打折；想最高质量又便宜，
          就得忍受延迟（比如让小模型多想几轮）；想又快又好，那就准备好付钱。
          工程的本质不是「全都要」，而是<strong>针对每一类任务</strong>选定一个合适的点。
          简单分类任务可以果断牺牲质量上限换成本，核心退款决策则反过来不惜成本保质量。
          没有放之四海皆准的配置，只有「这个场景该站在三角的哪个角」。
        </p>
      </KeyIdea>

      <h2>这对做 Agent / 工程实践意味着什么</h2>
      <p>
        成本和延迟不是上线后再操心的「运维问题」，它们应该是<strong>架构决策</strong>的一部分。
        在设计每一个 Agent 步骤时就问自己：这步真的需要大模型吗？这段上下文能裁吗？这几个调用能并行吗？
        把分级路由、上下文裁剪、缓存做进框架，而不是散落在各处临时补丁。
        而所有这些判断的依据，都来自上一章那套 trace——<strong>先量，后优，再验证</strong>，形成闭环。
      </p>

      <Practice title="分级路由的成本对比与实现">
        <p>
          先看一张对比表，直观感受分级路由能省多少（数值按「全用大模型」与「6/3/1 分级」对比，单价为示意）：
        </p>
        <ul>
          <li><code>全用大模型</code>：每天约 USD 5,250</li>
          <li><code>分级路由(60% 小 / 30% 中 / 10% 大)</code>：每天约 USD 1,400</li>
          <li><code>节省</code>：约 73%</li>
        </ul>
        <p>
          下面这段代码实现了一个 <code>route_model</code> 函数：按任务类型和是否需要推理选择最小够用的模型，
          并算出两种策略一天的成本对比。注意输出价是输入价的约 5 倍，这正是「让模型少废话」省钱的根据。
        </p>
        <CodeBlock lang="python" title="cost_routing.py" code={routeCode} />
        <p>
          把 <code>route_model</code> 接到协调器里：每次调用前先判定任务难度，再决定喂给哪个档位的模型。
          配合上一章的 trace，你还能持续观测各档位的真实占比，反过来校准路由规则。
        </p>
      </Practice>

      <Summary
        points={[
          'LLM 按 token 计费，输入与输出分开算，且输出通常比输入贵 3~5 倍，所以让模型少废话能直接省钱。',
          '多 Agent/多轮会重复携带越滚越长的上下文，成本近乎平方级增长，能一次解决就别两次。',
          '优化铁律：先 profile 后优化，用 trace 聚合找出占大头的成本与延迟热点，只优化那少数几个。',
          '六招：裁剪上下文、模型分级路由、prompt 缓存、并行调用、流式输出改善体感延迟、减少调用次数。',
          '质量×成本×延迟是不可能三角，工程要做的是为每类任务选定合适的点，而非全都要。',
          '成本与延迟是架构决策，应把分级路由/裁剪/缓存做进框架，并用 trace 闭环验证效果。',
        ]}
      />
    </>
  )
}
