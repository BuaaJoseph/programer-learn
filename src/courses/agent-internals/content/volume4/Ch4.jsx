import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const cooksAnalogy = `三个厨师往同一锅汤里加盐。
  厨师 A 尝了一口：淡，加一勺盐。
  厨师 B 同时尝了一口：淡，也加一勺盐。
  厨师 C 同时尝了一口：淡，又加一勺盐。
=> 每个人的判断单独看都对，合起来这锅汤齁咸到没法喝。
这就是「并行写手」的根本问题：行动里携带了隐含决策，而决策之间会冲突。`

export default function Ch4() {
  return (
    <>
      <Lead>
        <p>
          前几章我们见了图编排（deer-flow）、也见了换工程外壳（opencode），但越来越多一线团队的共识却是反方向的：
          <strong>能用一个简单的单 Agent 解决，就别上多 Agent。</strong>这一章把「保持简单常常赢」背后的道理讲透——
          为什么单主线程更可靠、子代理为什么只该当隔离器、Cognition 和 Anthropic 各自给出了什么经验，
          以及那条贯穿全卷的结论：<em>上下文工程</em>才是决定成败的变量。
        </p>
      </Lead>

      <h2>为什么单主线程更可靠</h2>
      <p>
        Claude Code 刻意选了<strong>单主线程加扁平消息历史</strong>这种朴素结构，理由很实在：可靠性和可调试性。
        一条线性的消息历史意味着——出了问题，你从上往下读一遍就能复盘是哪一步歪了；上下文天然连续，
        不会出现「这个角色没看到那个角色干了什么」的割裂；能出错的环节本来就少。结构越简单，
        失败模式越少、越好排查。
      </p>
      <p>
        在这种结构里，子代理不是用来「分头并行干活」的，而只是一个<strong>上下文隔离器</strong>：
        当某个子任务会产生大量噪音（翻半个代码库找一处定义、读一堆日志），主代理把它隔出去，
        子代理在自己的小上下文里折腾完，只把<strong>一句结论</strong>交回主线。主线的上下文因此保持干净、连续。
        注意：隔离器和「多个对等的写手并行改东西」是两回事。
      </p>

      <h2>Cognition：单写手原则</h2>
      <p>
        Cognition 在《Don&apos;t Build Multi-Agents》里给出了两条上下文工程原则：
      </p>
      <ul>
        <li><strong>共享上下文</strong>：参与者应当看到尽量完整、一致的上下文，而不是各自只看到一角。</li>
        <li><strong>行动携带隐含决策</strong>：每一个行动背后都藏着没说出口的判断；当多个 Agent 并行行动时，
          这些隐含的判断会彼此冲突，产出最后拼不到一起。</li>
      </ul>
      <p>
        由这两条推出的结论就是<strong>单写手原则</strong>：负责「动手写」（写代码、写文档、做修改）的，最好只有一个。
        Cognition 推荐的形态是<em>单线程的线性 Agent</em>，再配上<strong>上下文压缩</strong>来维持长任务的连续性——
        而不是把写的工作切给一堆并行 Agent。
      </p>
      <CodeBlock lang="text" title="三个厨师往同一锅加盐" code={cooksAnalogy} />

      <KeyIdea title="共享上下文 + 单写手">
        <p>
          把两条原则压成一句话：<strong>让该看到上下文的都看到，让动手写的只有一个。</strong>
          并行的多个写手，单看每个的判断都没错，合起来却会因为彼此看不见对方的隐含决策而冲突——
          就像三个厨师各自加盐。要避免这种灾难，最稳的办法不是想办法协调他们，而是从一开始就只留一个写手。
        </p>
      </KeyIdea>

      <h2>Anthropic：多 Agent 的适用边界</h2>
      <p>
        Anthropic 的经验给出了多 Agent 该用在哪、不该用在哪的清晰边界。<strong>适合</strong>多 Agent 的是
        <em>广度优先、可独立并行的只读研究</em>——一堆互不依赖的子线索同时去搜，最后汇总。
        <strong>不适合</strong>的是<em>需要共享上下文或步骤强依赖的编码、写作</em>类任务，
        因为这类任务的每一步都吃上一步的完整结果，硬并行只会割裂上下文、产出拼不起来。
      </p>
      <p>
        而且多 Agent 有实打实的成本：Anthropic 观察到多 Agent 系统大约消耗 <strong>15 倍</strong>于单 Agent 的 token。
        这不是个小数字——它意味着只有当任务确实能从并行的广度里获得足够收益时，多 Agent 才划算。
      </p>

      <Callout variant="warn" title="多 Agent 的隐性代价">
        <p>
          在拍板上多 Agent 之前，先把这几笔账算清楚：
        </p>
        <ul>
          <li><strong>token 成本</strong>：约 15× 于单 Agent，每个 Agent 都要带一份上下文反复发给模型。</li>
          <li><strong>延迟</strong>：多了协调、汇总、来回通信的环节，端到端常常更慢。</li>
          <li><strong>上下文割裂</strong>：各 Agent 只看到自己那一角，谁都没有全局视野。</li>
          <li><strong>判断冲突</strong>：并行行动携带的隐含决策彼此打架，产出难以拼接（三个厨师加盐）。</li>
        </ul>
      </Callout>

      <Example title="同一个任务，简单做 vs 复杂做">
        <p>
          任务：「给现有 API 加一个分页功能，并补上测试。」
        </p>
        <p>
          <strong>单 Agent 做法</strong>：一个主循环——读相关代码、改 handler、改查询、写测试、跑测试、按报错回改。
          每一步都建立在前一步的完整结果上，上下文连续，错了好查。
        </p>
        <p>
          <strong>多 Agent 做法</strong>：派一个 Agent 改 handler、一个改查询、一个写测试，并行跑。
          结果三方对「分页参数叫什么、默认页大小是多少」各有各的隐含假设，测试 Agent 写的断言对不上
          handler Agent 的实现，最后还得有人把它们对齐——花了 15× 的 token，反而更慢、更乱。
        </p>
      </Example>

      <h2>结论：上下文工程是决定性变量</h2>
      <p>
        把 Cognition 和 Anthropic 的经验合起来看，共识非常一致：真正决定一个 Agent 系统好不好的，
        不是「用了几个 Agent」「画没画图」，而是<strong>上下文工程</strong>——谁看到什么、谁来动手写。
        简单的单 Agent 之所以常常赢，正是因为它在上下文这件事上几乎不会出错：上下文天然共享、写手天然唯一。
        所以默认就该从单 Agent 起步，<strong>只有当任务确实是广度优先、可独立并行的只读工作，且收益盖得过 15× 的代价时，
        才考虑上多 Agent。</strong>
      </p>

      <h2>这对你意味着什么</h2>
      <p>
        下次你想给一个任务上多 Agent 时，先停一秒问自己三个问题：这些子任务<strong>真的互不依赖</strong>吗？
        它们是<strong>只读</strong>的、还是要并行地<strong>写</strong>东西？省下来的时间，<strong>抵得过 15× 的 token 和多出来的协调成本</strong>吗？
        只要有一个答案是「否」，默认就该回到单 Agent。把功夫花在构造对上下文上，几乎总比把功夫花在堆 Agent 上更值。
      </p>

      <Practice title="「该不该上多 Agent」决策清单">
        <p>
          把下面这份清单存下来，每次想上多 Agent 前过一遍。只要任意一条答「否」，就先别上多 Agent。
        </p>
        <ul>
          <li>子任务彼此<strong>真正独立</strong>吗（一个的结果不影响另一个怎么做）？</li>
          <li>这些子任务是<strong>只读</strong>的吗（不会有多个 Agent 并行去写、去改同一批东西）？</li>
          <li>任务是<strong>广度优先</strong>的吗（要的是覆盖多个方向，而不是顺着一条线深挖）？</li>
          <li>并行省下的时间，<strong>抵得过约 15× 的 token 和额外协调/延迟</strong>吗？</li>
          <li>各 Agent 之间<strong>不需要共享一份连续的上下文</strong>也能各自完成吗？</li>
        </ul>
        <p>
          再拿你手头一个真实任务套一遍这份清单，看看它到底该用单 Agent、还是真值得上多 Agent。
        </p>
      </Practice>

      <Summary
        points={[
          'Claude Code 刻意用单主线程 + 扁平消息历史，图的是可靠性与可调试性：上下文连续、失败模式少、复盘容易。',
          '单主循环里的子代理只该当上下文隔离器，把噪音大的子任务隔出去、只回灌一句结论，而不是并行的对等写手。',
          'Cognition 的两条原则——①共享上下文 ②行动携带隐含决策——推出单写手原则：动手写的最好只有一个，否则像三个厨师往同一锅加盐。',
          'Cognition 推荐单线程线性 Agent + 上下文压缩来保持长任务的连续性，而非把写的工作切给一堆并行 Agent。',
          'Anthropic：多 Agent 适合广度优先、可独立并行的只读研究，不适合需共享上下文或强依赖的编码写作，且约耗 15× token。',
          '共识是上下文工程（谁看到什么、谁来写）才是决定性变量：默认从单 Agent 起步，只有收益盖过代价时才上多 Agent。',
        ]}
      />
    </>
  )
}
