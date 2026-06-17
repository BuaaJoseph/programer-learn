import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const callbackHellSnippet = `// 旧世界：用 completion handler 串联三个网络请求
func loadProfile(completion: @escaping (Result<Profile, Error>) -> Void) {
    fetchUser { userResult in
        switch userResult {
        case .failure(let error):
            completion(.failure(error))      // 每一层都要手动转发错误
        case .success(let user):
            fetchAvatar(for: user.id) { avatarResult in
                switch avatarResult {
                case .failure(let error):
                    completion(.failure(error))
                case .success(let avatar):
                    fetchPosts(for: user.id) { postsResult in
                        switch postsResult {
                        case .failure(let error):
                            completion(.failure(error))
                        case .success(let posts):
                            // 真正的逻辑被埋在三层缩进的最深处
                            let profile = Profile(user: user, avatar: avatar, posts: posts)
                            completion(.success(profile))
                        }
                    }
                }
            }
        }
    }
}`

const asyncAwaitSnippet = `// 新世界：同样三步，用 async/await 写成「直线」代码
func loadProfile() async throws -> Profile {
    let user = try await fetchUser()              // await：在这里暂停，但不阻塞线程
    let avatar = try await fetchAvatar(for: user.id)
    let posts = try await fetchPosts(for: user.id)
    return Profile(user: user, avatar: avatar, posts: posts)
}

// 异步函数的声明：async 放在箭头前；可能抛错就加 throws
func fetchUser() async throws -> User {
    let (data, _) = try await URLSession.shared.data(from: userURL)
    return try JSONDecoder().decode(User.self, from: data)
}`

const taskBridgeSnippet = `// Task：从同步世界（如按钮回调）进入异步世界的桥
import SwiftUI

struct ProfileButton: View {
    @State private var profile: Profile?

    var body: some View {
        Button("加载") {
            // 按钮回调是同步的，不能直接 await
            // 用 Task 开一个并发上下文，在里面才能 await
            Task {
                do {
                    profile = try await loadProfile()
                } catch {
                    print("加载失败：\\(error)")
                }
            }
        }
    }
}`

const asyncLetSnippet = `// async let：并行发起多个互不依赖的请求，再统一 await 汇合
func loadProfileParallel(id: String) async throws -> Profile {
    // 这三行几乎同时启动，各自在自己的子任务里跑
    async let user = fetchUser()
    async let avatar = fetchAvatar(for: id)
    async let posts = fetchPosts(for: id)

    // await 处才真正等待；三者并行，总耗时约等于最慢的那个
    return try await Profile(user: user, avatar: avatar, posts: posts)
}`

const taskGroupSnippet = `// TaskGroup：数量在运行时才确定时，动态地并行
func loadThumbnails(ids: [String]) async throws -> [String: UIImage] {
    try await withThrowingTaskGroup(of: (String, UIImage).self) { group in
        for id in ids {
            group.addTask {                       // 为每个 id 动态添加一个子任务
                let image = try await fetchThumbnail(for: id)
                return (id, image)
            }
        }

        var result: [String: UIImage] = [:]
        // for await 依完成顺序收集结果（不保证与添加顺序一致）
        for try await (id, image) in group {
            result[id] = image
        }
        return result
    }
}`

const cancellationSnippet = `// 取消会沿父子层级向下传播；任务要主动检查取消
func processItems(_ items: [Item]) async throws -> [Output] {
    var outputs: [Output] = []
    for item in items {
        // 抛出式检查：被取消时抛 CancellationError，提前结束
        try Task.checkCancellation()

        // 或者用布尔式检查，自己决定怎么收尾
        if Task.isCancelled { break }

        outputs.append(try await process(item))
    }
    return outputs
}

// 持有 Task 句柄即可主动取消
let handle = Task { try await processItems(bigList) }
handle.cancel()   // 取消信号会传给 handle 内部及其所有子任务`

export default function Ch1() {
  return (
    <article>
      <Lead>
        网络请求、读写磁盘、等待定时器——这些「要花时间但不占 CPU」的活儿，叫异步操作。
        过去 iOS 用 completion handler（完成回调）来处理它们，写多了就成了「回调地狱」。
        Swift 5.5 引入的 <code>async/await</code> 把异步代码写得像同步代码一样直；
        而<strong>结构化并发</strong>则用「任务有父子层级」的思想，让并发任务的生命周期、
        取消和错误传播都变得可控。这一章我们从回调的痛点讲起，一路讲到 <code>async let</code>
        与 <code>TaskGroup</code> 的并行编排。
      </Lead>

      <h2>一、回调地狱：旧世界的痛</h2>
      <p>
        在 <code>async/await</code> 之前，异步结果靠<strong>闭包回调</strong>送回来。一个函数做完异步活儿，
        就调用你传进去的 <code>completion</code> 闭包，把结果交给你。单个请求还好，可一旦多个请求要
        <strong>按顺序串联</strong>——A 的结果喂给 B、B 的结果喂给 C——回调就会一层层往里嵌套，
        形成俗称的「回调地狱」（callback hell），也叫「金字塔厄运」（pyramid of doom）。
      </p>
      <CodeBlock lang="swift" title="回调地狱：三层嵌套的 completion handler" code={callbackHellSnippet} />
      <p>它的问题不只是「丑」，而是几个实实在在的工程缺陷：</p>
      <ul>
        <li><strong>错误处理重复且易漏</strong>：每一层都要手动 <code>switch</code> 转发 failure，漏一个就静默吞错。</li>
        <li><strong>控制流割裂</strong>：循环、条件分支跨回调时极难写——你没法在回调里直接 <code>return</code> 给外层函数。</li>
        <li><strong>忘记调用 completion</strong>：某条分支忘了调闭包，调用方就永远卡在等待里，且没有编译报错。</li>
        <li><strong>逻辑倒序</strong>：真正的业务逻辑被埋在最深一层，阅读顺序和执行顺序背道而驰。</li>
      </ul>

      <h2>二、async / await：把异步写成直线</h2>
      <KeyIdea>
        在函数返回箭头前加 <code>async</code>，它就成了异步函数；调用异步函数要在前面写 <code>await</code>。
        <code>await</code> 标记一个<strong>暂停点</strong>（suspension point）：当前任务可能在这里挂起，
        把线程<strong>让给别人用</strong>，等异步结果就绪后再从这里恢复——整个过程<strong>不阻塞线程</strong>。
      </KeyIdea>
      <p>
        把第一节那段三层嵌套用 <code>async/await</code> 重写，立刻变成自上而下的「直线」代码：错误用
        <code>try</code> 自动向上抛、控制流就是普通控制流、逻辑顺序和执行顺序一致。
      </p>
      <CodeBlock lang="swift" title="async/await：同样三步，写成直线" code={asyncAwaitSnippet} />
      <p>
        理解 <code>await</code> 的关键，是分清「暂停」和「阻塞」这两个常被混淆的词。
      </p>
      <table>
        <thead>
          <tr><th>概念</th><th>含义</th><th>线程发生了什么</th></tr>
        </thead>
        <tbody>
          <tr><td>阻塞（block）</td><td>线程停在原地空等</td><td>线程被占着、什么也干不了，浪费资源</td></tr>
          <tr><td>暂停（suspend）</td><td>任务交出线程、登记「等会儿叫我」</td><td>线程被释放，去跑别的任务；结果就绪后再恢复</td></tr>
        </tbody>
      </table>
      <p>
        正因为是暂停而非阻塞，一个线程可以在多个 <code>await</code> 暂停点之间来回切换，服务大量并发任务。
        这就是 Swift 并发「用少量线程跑海量任务」的底气。
      </p>
      <Callout variant="warn" title="await 后，世界可能已经变了">
        每个 <code>await</code> 都是潜在的暂停点。任务在这里挂起、稍后恢复，期间<strong>别的代码可能已经运行过</strong>。
        所以不要假设 <code>await</code> 前后的某个共享状态没变化——这正是后面 actor 要解决的问题。
      </Callout>

      <h2>三、Task：进入并发世界的入口</h2>
      <p>
        有个先有蛋的问题：<code>await</code> 只能在异步上下文里用，可程序的起点（按钮回调、
        <code>viewDidLoad</code> 等）都是<strong>同步</strong>的。<code>Task</code> 就是这道桥——它创建一个新的并发上下文，
        在它的闭包内部你就能自由地 <code>await</code> 了。
      </p>
      <CodeBlock lang="swift" title="用 Task 从同步代码桥接到异步" code={taskBridgeSnippet} />
      <p>
        <code>Task {'{ ... }'}</code> 会立刻开始执行其中的异步工作，并返回一个可用于
        <code>await</code> 取值或 <code>cancel()</code> 取消的句柄。它是「非结构化并发」的口子，
        但我们更推荐让它内部使用下面的结构化原语来组织子任务。
      </p>

      <h2>四、结构化并发：任务有了父子层级</h2>
      <KeyIdea>
        结构化并发（structured concurrency）的核心是：并发任务不再是「撒出去就不管」的野线程，
        而是组织成<strong>父子树形层级</strong>。父任务的作用域结束前，会<strong>自动等待所有子任务完成</strong>；
        父任务被取消时，取消信号会<strong>自动向下传播</strong>给所有子任务。生命周期被锁进代码的词法作用域里。
      </KeyIdea>
      <p>
        这条原则带来一个朴素却强大的保证：<strong>子任务不会比创建它的作用域活得更久</strong>。
        你不会出现「函数早就 return 了，后台还有个孤儿任务在偷偷跑」的局面。这让资源管理、
        错误传播、取消都变得可预测。Swift 提供两个结构化原语：<code>async let</code> 和 <code>TaskGroup</code>。
      </p>

      <h3>4.1 async let：静态数量的并行</h3>
      <p>
        当你<strong>事先就知道</strong>要并行发起几个互不依赖的请求时，用 <code>async let</code> 最简洁。
        每个 <code>async let</code> 声明立刻启动一个子任务，几个请求几乎同时跑起来；直到你 <code>await</code>
        它们的值时才真正汇合等待。总耗时约等于「最慢那个」，而非「全部相加」。
      </p>
      <CodeBlock lang="swift" title="async let：三个请求并行，再汇合" code={asyncLetSnippet} />

      <h3>4.2 TaskGroup：动态数量的并行</h3>
      <p>
        如果并行任务的<strong>数量要到运行时才确定</strong>（比如「给数组里每个 id 各拉一张缩略图」），
        <code>async let</code> 就不够用了——你没法写出未知个数的声明。这时用 <code>TaskGroup</code>：
        在一个组里用循环 <code>addTask</code> 动态添加任意多个子任务，再用 <code>for await</code> 依
        完成顺序收集结果。会抛错的版本叫 <code>withThrowingTaskGroup</code>。
      </p>
      <CodeBlock lang="swift" title="TaskGroup：为运行时数量动态并行" code={taskGroupSnippet} />
      <Callout variant="tip" title="结果顺序不等于添加顺序">
        <code>for await</code> 是按子任务<strong>完成的先后</strong>拿到结果的，不保证和 <code>addTask</code> 的
        顺序一致。所以例子里用字典 <code>[id: image]</code> 把结果和身份绑定，而不是依赖数组下标。
      </Callout>

      <Example title="三种写法的对照">
        <p>同样是「取 user / avatar / posts 三块数据」：</p>
        <ul>
          <li><strong>串行 await</strong>：逐行 <code>try await</code>，三步首尾相接。耗时是三者<strong>相加</strong>，适合后一步依赖前一步的结果。</li>
          <li><strong>async let 并行</strong>：三块互不依赖时，三个 <code>async let</code> 同时发起，<code>await</code> 处汇合。耗时约等于<strong>最慢的一个</strong>。</li>
          <li><strong>TaskGroup 动态并行</strong>：任务数量运行时才知道（如 N 张缩略图），循环 <code>addTask</code> 再 <code>for await</code> 收集。</li>
        </ul>
        <p>选择标准只有一句：<strong>有依赖就串行，无依赖且数量已知用 async let，数量动态用 TaskGroup。</strong></p>
      </Example>

      <h2>五、取消的传播</h2>
      <p>
        结构化并发的取消是<strong>协作式</strong>的：取消一个任务<strong>不会</strong>强行杀死它，只是给它打一个
        「你被取消了」的标记，并把这个标记<strong>向下传播</strong>给它的所有子任务。任务自己要在合适的时机
        <strong>主动检查</strong>这个标记，然后决定怎么收尾。
      </p>
      <CodeBlock lang="swift" title="取消检查与传播" code={cancellationSnippet} />
      <p>检查取消有两种方式，按需选用：</p>
      <ul>
        <li><code>try Task.checkCancellation()</code>：已取消就<strong>抛出</strong> <code>CancellationError</code>，让函数顺着 <code>throws</code> 提前退出。</li>
        <li><code>Task.isCancelled</code>：返回布尔值，由你自己决定是 <code>break</code>、返回部分结果还是清理资源。</li>
      </ul>
      <p>
        许多系统异步函数（如 <code>Task.sleep</code>）在被取消时会自动抛 <code>CancellationError</code>，
        天然响应取消。SwiftUI 的 <code>.task {'{ ... }'}</code> 修饰符更贴心：视图消失时会自动取消它启动的任务，
        省得你手动管理句柄。
      </p>

      <h2>六、与旧 GCD 的取舍</h2>
      <p>
        <strong>一句话：</strong>新代码优先用 Swift 并发（<code>async/await</code> + 结构化并发），它类型安全、
        能表达任务层级与取消、且由编译器帮你查并发错误；GCD（<code>DispatchQueue</code>）则保留给少数底层场景
        （如需要精确控制队列、与大量旧回调式 API 交互），属于「能不碰就不碰」的遗产工具。
      </p>

      <Callout variant="tip">
        下一章我们解决一个 <code>await</code> 留下的尾巴：当多个并发任务同时读写<strong>同一块可变状态</strong>时，
        会发生数据竞争。Swift 用 <code>actor</code> 从编译期把这类 bug 消灭掉。
      </Callout>

      <Summary
        points={[
          'completion handler 串联多个异步操作会形成回调地狱：错误处理重复、控制流割裂、易漏调用、逻辑倒序。',
          'async 声明异步函数，await 标记暂停点：任务在此挂起并让出线程（暂停≠阻塞），结果就绪后恢复，全程不阻塞线程。',
          'Task 创建并发上下文，是从同步代码（按钮回调等）桥接进异步世界的入口，返回可取值/可取消的句柄。',
          '结构化并发让任务有父子层级：作用域结束自动等待子任务完成，父任务取消则信号自动向下传播。',
          'async let 用于数量已知的并行（同时发起、await 处汇合）；TaskGroup 用 addTask + for await 处理运行时才确定数量的动态并行。',
          '取消是协作式的：靠 Task.checkCancellation()（抛错）或 Task.isCancelled（布尔）主动检查；新代码优先用 Swift 并发，GCD 仅留给底层遗留场景。',
        ]}
      />
    </article>
  )
}
