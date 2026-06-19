import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import AgentLoop from '@/courses/agent-internals/illustrations/AgentLoop.jsx'

const loopCode = `# Agent 主循环的本质（社区把它代号为 nO，约 30 行）

messages = [system_prompt, user_message]   # 一份扁平的消息历史

while True:
    response = model(messages)             # 让模型看着全部历史，生成一轮回复
    messages.append(response)

    if response.has_tool_use():            # 回复里还带着工具调用？
        for call in response.tool_uses:
            result = run_tool(call)         # 真的去执行：读文件 / 改文件 / 跑命令
            messages.append(result)         # 把结果也塞回历史
        continue                            # 带着新结果，再转一圈
    else:                                   # 纯文本、没有工具调用了？
        break                               # 停下，把这轮回复交还给用户`

const bugLoopCode = `场景：修一个「登录后立刻被踢出」的 bug

第 1 轮  收集  Grep('logout')          -> 找到 3 处可疑代码
第 2 轮  收集  Read('auth/session.py') -> 把会话逻辑读进上下文
                （模型从工具结果里发现：token 过期时间被设成了 0 秒）
第 3 轮  行动  Edit('auth/session.py') -> 把过期时间改成 3600 秒
第 4 轮  验证  Bash('pytest tests/auth/test_login.py')
                -> 报错：还有一处测试假设旧值
第 5 轮  行动  Edit('tests/auth/test_login.py') -> 同步更新测试
第 6 轮  验证  Bash('pytest tests/auth/test_login.py') -> 全绿
第 7 轮  （纯文本）「登录踢出问题已修复，根因是会话过期被设成了 0。」
                -> 没有 tool_use，循环停止，交回用户`

const robustLoopCode = `# 把"裸循环"补成"能跑一整天的循环"：难的全在这些分支里

while True:
    response = model(messages)
    messages.append(response)

    if not response.has_tool_use():
        break                               # 纯文本 -> 停

    for call in response.tool_uses:
        if needs_permission(call):          # ① 危险操作？先问用户
            if not ask_user(call):
                messages.append(denied(call))  # 用户拒了，也当成结果喂回去
                continue
        try:
            result = run_tool(call)         # ② 真正执行
        except Exception as e:
            result = format_error(e)        # ③ 抛异常不能崩，转成"对模型友好"的报错
        result = truncate_if_huge(result)   # ④ 输出几千行？截断，别撑爆上下文
        messages.append(result)

    if over_context_limit(messages):        # ⑤ 快满了？压缩历史（见第3章）
        messages = compact(messages)
# —— 主干还是那 5 行，①~⑤ 才是让它可靠的那 98%`

const parallelCode = `# 一轮里模型可以一次发出多个工具调用 —— 该并行还是串行？

# 安全并行：彼此独立的只读操作
Read('a.py')  Read('b.py')  Grep('TODO')     # 互不影响，可同时跑

# 必须串行：有依赖或会改状态的写操作
Edit('config.py')  ->  Bash('pytest')        # 必须先改完再测，顺序不能乱
Bash('git add .')  ->  Bash('git commit')    # 后一步依赖前一步的结果

# 脚手架要替模型判断：哪些能并发省时间，哪些必须排队保正确`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          一个能改一整天代码的 Agent，核心驱动它的那段代码<strong>短得令人意外</strong>——社区逆向分析把它形容成大约
          30 行的一个 <code>while</code> 循环。这一章我们就把这个主循环拆开：它怎么转、靠什么决定下一步、什么时候停，
          以及一个非常反直觉的事实——这段循环本身几乎不含「智能」，真正难的全在它周围。
        </p>
      </Lead>

      <h2>主循环：有工具调用就继续，给纯文本就停</h2>
      <p>
        Claude Code 的主循环，社区逆向分析里给它起了个代号叫 <em>nO</em>。它维护一份<strong>扁平的消息历史</strong>
        （system prompt、用户消息、模型回复、工具结果，全部按顺序排在一个列表里），然后进入一个 <code>while</code> 循环。
        每一圈做的事只有一句话能概括：
      </p>
      <p>
        把整份历史喂给模型，让它生成一轮回复。如果这轮回复里<strong>还带着工具调用</strong>（<code>{'tool_use'}</code>），
        就去执行这些工具、把结果塞回历史，然后<strong>再转一圈</strong>；如果模型这轮给的是<strong>纯文本</strong>、
        不再调用任何工具，就说明它认为活干完了——循环<strong>停下</strong>，把这轮回复交还给用户。
      </p>
      <CodeBlock lang="python" title="main-loop (nO)" code={loopCode} />
      <p>
        就这么简单。整个 Agent「自主干很多步」的能力，本质上就来自这个「只要还有 tool_use 就接着转」的判断。
        模型每生成一个工具调用，循环就给它一次动手的机会；模型一旦觉得够了、改用纯文本回答，循环就交还控制权。
      </p>
      <p>
        为什么要设计成「<strong>每轮都把全部历史重新喂一遍</strong>」？因为大语言模型是<strong>无状态</strong>的——
        它在两次调用之间什么都不记得，没有「内存」「变量」这种东西。它唯一的「记忆」，就是你这一次塞给它的那段文本。
        所以主循环必须把从开头到现在发生的一切（你说的话、它说的话、工具跑出来的结果）原样带在 <code>messages</code> 里，
        模型才能「接着上次往下想」。这也是为什么上下文窗口会越用越满（第三章的主题）——历史只增不减地往里堆。
      </p>
      <p>
        再说判停规则为什么能这么简单。本质是把「要不要继续」这个决策<strong>外包给了模型自己</strong>：
        模型想继续干，就在回复里带上工具调用；想收手，就只给纯文本。脚手架不需要理解任务、不需要预测步数，
        它只做一件极其机械的事——<strong>看回复里有没有 tool_use</strong>。决策的智能在模型那边，循环这边只负责忠实执行。
      </p>

      <h2>每一圈在干什么：收集 — 行动 — 验证</h2>
      <p>
        官方文档（how-claude-code-works）把循环里每一轮的工作划成三个阶段，它们会一圈圈地重复：
      </p>
      <h3>收集上下文</h3>
      <p>
        用 <code>Read</code>、<code>Grep</code>、<code>Glob</code> 这类只读工具，把和任务相关的代码、文件、报错先弄进上下文。
        模型得先「看见」，才能做出靠谱的判断。
      </p>
      <h3>采取行动</h3>
      <p>
        用 <code>Edit</code>、<code>Write</code>、<code>Bash</code> 这类会改变世界的工具，真正动手：改文件、写文件、执行命令。
      </p>
      <h3>验证结果</h3>
      <p>
        动完手不算完——跑测试、读命令输出，确认这步到底成没成。如果失败，模型会把报错读进来，下一圈据此再改。
      </p>
      <p>
        关键在于：<strong>模型每一轮都是看着上一步的结果，临时决定下一个用什么工具、以及什么时候收手。</strong>
        没有人预先写死「先读 A 再改 B 再跑 C」这样的剧本。流程是模型在循环里一步步即兴长出来的，
        这正是它能应对各种事先没法预料的情况的原因。
      </p>
      <p>
        这三阶段不是死板的「一二三」流水线，而更像一个会回头的螺旋：验证失败会把你打回「收集」（去读报错、查相关代码），
        收集到新信息又触发新的「行动」。一次真实任务里，这三阶段会交错重复很多遍。把它对比一下传统自动化脚本就懂了：
        脚本是<strong>预先写死的固定步骤</strong>，遇到没预料的情况就崩；而这个循环是<strong>每步现看现决定</strong>，
        所以能处理「测试报了个你没想到的错」这种脚本根本没法编进去的情况。代价是它更慢、更费 token——
        这是「灵活」换来的，也是一种典型的工程取舍。
      </p>

      <Example title="用主循环修一个登录 bug">
        <p>
          假设有个 bug：用户登录成功后立刻被踢回登录页。看看主循环是怎么一圈圈把它修好的：
        </p>
        <CodeBlock lang="text" title="fix-login-bug" code={bugLoopCode} />
        <p>
          注意第 4 轮：验证<strong>失败</strong>了，但循环没有崩溃，也没有问用户该怎么办——模型把报错当成新的上下文，
          自己决定再去改一处测试，然后重新验证。这种「失败也是一种信息、据此自我纠错」的能力，
          就是「收集—行动—验证—重复」这个循环带来的。最后一轮模型不再调用工具、改成纯文本总结，循环随之停止。
        </p>
        <p>
          再注意第 1、2 轮：模型<strong>没有一上来就改代码</strong>，而是先 Grep、再 Read，把会话逻辑读进上下文之后，
          才发现「过期时间被设成 0」这个真正的根因。这是强 Agent 和弱 Agent 的一个分水岭——
          弱的容易看一眼报错就动手乱改（治标），强的会先收集足够上下文定位根因（治本）。
          而你作为使用者，一句「先别改，先查清根因再说」就能把它往「先收集」那一侧推一把。
        </p>
      </Example>

      <AgentLoop />

      <h2>把「裸循环」补成「能跑一整天的循环」</h2>
      <p>
        前面那 30 行是循环的<strong>主干</strong>，但你真把它原样跑起来，活不过五分钟——第一个工具抛异常它就崩了。
        把它变成产品级、能连轴转一整天的样子，要在每个缝隙里塞进大量「不那么聪明但极其必要」的处理：
      </p>
      <CodeBlock lang="python" title="robust-loop" code={robustLoopCode} />
      <p>
        看清楚：主干还是原来那几行，①~⑤ 这些分支才是工作量的大头。它们一行 AI 都没有，全是确定性的工程判断——
        权限怎么问、异常怎么转成对模型友好的报错、超长输出怎么截断、上下文快满了怎么压缩。
        下一节那个「98%」说的就是它们。
      </p>

      <KeyIdea title="循环极简，约 98% 是确定性基础设施">
        <p>
          这里有个非常反直觉的事实（来自社区逆向分析，注明为社区分析、非官方）：在整个 Claude Code 的运行里，
          那个由模型做决策的部分——「下一步调什么工具、要不要停」——大约只占 <strong>1.6%</strong>；
          剩下约 <strong>98%</strong> 全是<strong>确定性的基础设施</strong>：权限检查、上下文管理、工具路由、结果回填、
          错误处理……这些都是普普通通的、没有 AI 参与的代码。
        </p>
        <p>
          也就是说，让 Agent 显得「聪明」的那段 AI 决策，被夹在大量平凡而可靠的工程代码中间。
          循环本身可以用 30 行写完，但能让这 30 行稳定跑一整天的，是它周围那 98% 的脏活累活。
        </p>
      </KeyIdea>

      <h2>边界情况：循环失控的几种典型方式</h2>
      <p>
        既然「有 tool_use 就继续」这么简单，那它会不会一直转下去停不下来？会。这正是裸循环最危险的地方，
        也是基础设施必须兜住的几个边界：
      </p>
      <ul>
        <li>
          <strong>死循环 / 反复试错</strong>：模型可能在两个错误状态间来回横跳——改 A 导致 B 错，改 B 又导致 A 错。
          所以脚手架通常会设<strong>最大轮数上限</strong>或检测重复模式，到点就停下交还用户，而不是无限烧钱。
        </li>
        <li>
          <strong>提前收手</strong>：模型有时活没干完就给纯文本「我已经处理好了」，循环据此停了，但其实没跑测试。
          这是<strong>判停规则太信任模型</strong>的副作用——它说停就停。对策不在循环本身，而在提示和验证：
          明确要求「测试通过前不算完成」，把收手的门槛抬高。
        </li>
        <li>
          <strong>工具结果撑爆上下文</strong>：一条 <code>Bash</code> 跑出几万行日志，原样塞回历史会瞬间吃光窗口。
          所以要在回填前截断（上面那段代码的第 ④ 步）。
        </li>
      </ul>
      <p>
        把这几条对照着看，你会发现一个规律：<strong>循环的「智能」边界，恰恰要靠"不智能"的确定性规则来兜底</strong>。
        模型负责灵活，工程负责兜底，两者缺一不可。
      </p>

      <h2>一轮多个工具：并行还是串行</h2>
      <p>
        前面把每轮简化成「调一个工具」，但实际上模型<strong>一轮可以一次发出好几个工具调用</strong>。
        这就带来一个工程判断：哪些能并行跑省时间，哪些必须排队保正确？
      </p>
      <CodeBlock lang="text" title="parallel-vs-serial" code={parallelCode} />
      <p>
        规律很清楚：<strong>互相独立的只读操作可以放心并行</strong>（一次读三个文件，比读三次快），
        但<strong>有依赖关系或会改状态的写操作必须串行</strong>（先改完再测，先 add 再 commit，顺序错了结果就错）。
        这个判断也是脚手架要替模型把关的——它不能因为「能并行就更快」而把本该排队的写操作并发出去。
        这又是一个「循环之外的工程细节决定好不好用」的活例子。
      </p>

      <Callout variant="warn" title="循环简单，难的是周边系统">
        <p>
          别被「主循环只有 30 行」骗了，以为做一个好 Agent 很容易。<strong>简单的是循环，难的是周边那一圈系统。</strong>
          工具调用失败了怎么优雅地恢复？危险命令要不要拦下来问用户？上下文快满了怎么压缩？工具返回一坨乱码怎么办？
          多个工具调用要不要并行？——真正决定一个 Agent 好不好用的，恰恰是这些 <code>while</code> 循环之外的工程细节。
          后面几卷讲的工具设计、权限闸门、上下文管理，全都是在填这 98%。
        </p>
      </Callout>

      <h2>这对做 Agent / 用 Agent 意味着什么</h2>
      <p>
        如果你在<strong>做</strong> Agent：不要把力气花在「把循环写得更花哨」上——循环越简单越好。
        真正该投入的，是循环周围的基础设施：把工具结果回填干净、把权限和错误处理做扎实、把验证环节接上。
        一个朴素的 <code>while</code> 加一圈结实的脚手架，胜过一个聪明但脆弱的复杂调度器。
      </p>
      <p>
        如果你在<strong>用</strong> Agent：理解了「有 tool_use 就继续、纯文本就停」，很多现象就讲得通了——
        为什么明确告诉它「跑测试确认通过再说完成」能让它多转几圈、质量更高（你在延长它的验证阶段）；
        为什么它有时草草给个文字答复就停了（它判断没有下一步动作了）。看懂循环，你就知道该在哪儿推它一把。
      </p>
      <p>
        还有一个很实用的推论：既然「纯文本即停止」，那你想让它继续，最有效的办法不是说「继续」，
        而是<strong>给它一个明确的下一步动作目标</strong>——「现在跑一下完整测试套件，把失败的贴出来」。
        前者模糊，它可能又给段文字就停了；后者直接给了它一个该调工具的理由，循环自然接着转。
      </p>

      <Practice title="亲手写出主循环的骨架">
        <p>
          用你熟悉的语言，写一段主循环的<strong>伪代码</strong>，不接真模型也没关系，重点是把控制流写对：
        </p>
        <ul>
          <li>维护一份扁平的 <code>messages</code> 历史；</li>
          <li><code>while</code> 循环里：调用模型 → 把回复加进历史；</li>
          <li>判断回复里有没有 <code>{'tool_use'}</code>：有就逐个执行、把结果加回历史、<code>continue</code>；</li>
          <li>没有（纯文本）就 <code>break</code>，把结果交还用户。</li>
        </ul>
        <p>
          写完后想一个问题：如果某个工具执行抛了异常，你的循环会怎样？这正是那 98% 基础设施要操心的第一件事——
          把它补进去，你就摸到了「让简单循环变得可靠」的门槛。
        </p>
        <p>
          再加三道难度：① 给循环加一个最大轮数上限，防它停不下来；② 工具输出超过一定长度就截断再回填；
          ③ 写出哪几个工具能并行、哪几个必须串行的判断逻辑。把这三条补完，你的玩具循环就从「能跑一遍」
          逼近了「能可靠地跑一整天」——而这一步的代码量，会让你直观体会到那个「98%」到底重在哪。
        </p>
      </Practice>

      <Summary
        points={[
          'Agent 主循环（社区代号 nO）本质是一个约 30 行的 while 循环，维护一份扁平的消息历史。',
          '模型是无状态的：两次调用之间什么都不记得，所以每轮必须把全部历史重新喂一遍——这也是上下文只增不减、越用越满的根源。',
          '判停规则极简：模型回复里只要还有 tool_use 就继续转，给出纯文本（无工具调用）就停下、交回用户；决策外包给模型，循环只机械地看有没有 tool_use。',
          '每一圈分三阶段（官方）：收集上下文（Read/Grep/Glob）→ 采取行动（Edit/Write/Bash）→ 验证结果（跑测试读输出），且会螺旋式回头重复，不是固定流水线。',
          '模型每轮都看着上一步结果临时决定下一个工具与何时停，没有预先写死的剧本——失败也当成信息用来自我纠错；代价是更慢更费 token。',
          '反直觉点（社区分析）：约 98% 是确定性基础设施（权限/上下文/工具路由/错误处理/截断/并发判断），只有约 1.6% 才是 AI 决策。',
          '循环会失控：死循环、提前收手、输出撑爆上下文——都靠"不智能"的确定性规则（轮数上限、验证门槛、截断）来兜底。',
          '循环简单，难的是周边系统：错误恢复、权限拦截、上下文压缩、结果回填、并行/串行判断——做 Agent 的功夫几乎都花在这圈脚手架上。',
        ]}
      />
    </>
  )
}
