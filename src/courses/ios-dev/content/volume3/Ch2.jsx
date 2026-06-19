import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const raceSnippet = `// 危险：多个任务同时读写同一块可变状态
class Counter {
    var value = 0                  // 普通类的属性，没有任何保护

    func increment() {
        value += 1                 // 这一行不是原子的：读 → 加一 → 写回
    }
}

let counter = Counter()

// 上千个并发任务同时 increment，结果几乎一定 < 1000
await withTaskGroup(of: Void.self) { group in
    for _ in 0..<1000 {
        group.addTask { counter.increment() }   // 多个任务交错读写，丢更新
    }
}`

const actorCounterSnippet = `// actor：同一时刻只有一个任务能进入，自动串行化访问
actor Counter {
    private var value = 0

    func increment() {
        value += 1                 // 这里天生安全：进得来的只有一个任务
    }

    func current() -> Int {
        value
    }
}

let counter = Counter()

await withTaskGroup(of: Void.self) { group in
    for _ in 0..<1000 {
        group.addTask {
            await counter.increment()   // 访问 actor 成员要 await（可能要排队）
        }
    }
}
print(await counter.current())          // 这次稳定输出 1000`

const actorCacheSnippet = `// actor 当作线程安全的缓存：去重并发请求、保护内部字典
actor ImageCache {
    private var cache: [URL: UIImage] = [:]

    func image(for url: URL) async throws -> UIImage {
        // 命中缓存直接返回
        if let cached = cache[url] {
            return cached
        }
        // 未命中才真正下载
        let (data, _) = try await URLSession.shared.data(from: url)
        guard let image = UIImage(data: data) else {
            throw CacheError.decodeFailed
        }
        cache[url] = image            // 写字典受 actor 保护，不会被并发破坏
        return image
    }
}`

const mainActorSnippet = `// @MainActor：保证类型里的代码都在主线程运行
@MainActor
final class ProfileViewModel: ObservableObject {
    @Published var profile: Profile?
    @Published var isLoading = false

    func load(id: String) async {
        isLoading = true             // 改 @Published 属性 → 必须在主线程
        defer { isLoading = false }
        do {
            // await 期间会切到后台跑网络；回到这里时又回到主线程
            profile = try await fetchProfile(id: id)
        } catch {
            print("加载失败：\\(error)")
        }
    }
}

// 也可只标单个函数 / 属性
@MainActor
func updateBadge(_ count: Int) { /* 安全更新 UI */ }`

const sendableSnippet = `// Sendable：标记「可以安全地跨并发域传递」的类型
struct UserDTO: Sendable {           // 值类型且成员都 Sendable → 自动满足
    let id: String
    let name: String
}

// 不可变的引用类型可显式声明 final + Sendable
final class Config: Sendable {
    let baseURL: URL
    init(baseURL: URL) { self.baseURL = baseURL }
}

func handOff(_ user: UserDTO) async {
    await someActor.store(user)      // 编译器检查 user 是 Sendable 才放行
}`

export default function Ch2() {
  return (
    <article>
      <Lead>
        上一章的 <code>await</code> 留了个尾巴：任务在暂停点会让出线程，期间别的任务可能动过同一块状态。
        当多个并发任务<strong>同时读写同一份可变数据</strong>时，就会发生<strong>数据竞争</strong>——一类极难复现、
        极难调试的 bug。这一章讲 Swift 的杀手锏：<code>actor</code> 用「同一时刻只放一个任务进来」从
        <strong>编译期</strong>消灭数据竞争，再讲 <code>@MainActor</code> 如何保证 UI 更新在主线程，
        以及 <code>Sendable</code> 如何为跨并发域传值把关。
      </Lead>

      <h2>一、数据竞争：并发里最阴险的 bug</h2>
      <p>
        <strong>数据竞争</strong>（data race）的定义很精确：两个或更多任务在<strong>没有同步</strong>的情况下访问同一块内存，
        且其中<strong>至少有一个是写操作</strong>。看起来一行 <code>value += 1</code> 很简单，但它其实是三步：
        读出旧值、加一、写回新值。两个任务交错执行这三步时，就可能<strong>丢失更新</strong>。
      </p>
      <CodeBlock lang="swift" title="数据竞争：1000 个任务自增，结果却小于 1000" code={raceSnippet} />
      <p>
        数据竞争的可怕在于它<strong>不确定</strong>：今天跑十次都对，明天上线就崩；调试器一连上反而不复现。
        它不会编译报错，也常常不会立刻崩溃，而是悄悄给出错误结果。传统上要靠锁（<code>NSLock</code>）、
        串行队列等手动同步来防，但<strong>「忘了加锁」本身没有任何编译检查</strong>，全靠人自觉。
      </p>

      <h2>二、actor：用「串行准入」消灭竞争</h2>
      <KeyIdea>
        <code>actor</code> 是一种引用类型，它对自己的可变状态提供<strong>隔离保护</strong>：在任意时刻，
        <strong>最多只有一个任务能进入这个 actor 执行代码</strong>。其他任务想访问就得排队等待。
        这把对内部状态的并发访问自动<strong>串行化</strong>了，于是数据竞争在编译期就被根除。
      </KeyIdea>
      <p>
        把第一节的 <code>class Counter</code> 改成 <code>actor Counter</code>，几乎不用改逻辑，
        竞争就消失了。代价是：从 actor <strong>外部</strong>访问它的属性或方法，编译器强制要求加 <code>await</code>——
        因为你可能要<strong>排队</strong>等里面那个任务先出来。
      </p>
      <CodeBlock lang="swift" title="actor 计数器：访问成员要 await" code={actorCounterSnippet} />
      <p>这里有几条规则值得单独记住：</p>
      <table>
        <thead>
          <tr><th>位置</th><th>访问 actor 成员</th><th>要不要 await</th></tr>
        </thead>
        <tbody>
          <tr><td>actor 内部（自己的方法里）</td><td>直接访问自己的属性/方法</td><td>不要</td></tr>
          <tr><td>actor 外部</td><td>跨进 actor 边界，可能排队</td><td>要 <code>await</code></td></tr>
          <tr><td>外部访问 <code>nonisolated</code> 成员</td><td>不碰可变状态的成员（如常量）</td><td>不要</td></tr>
        </tbody>
      </table>

      <h3>actor 实战：一个线程安全的缓存</h3>
      <p>
        计数器只是教学例子，更典型的用法是把 actor 当成<strong>线程安全的容器</strong>。下面这个图片缓存里有一个
        可变字典 <code>cache</code>，多个并发请求可能同时来读写它；包进 actor 后，这些读写被自动串行化，
        永远不会把字典内部结构搞坏。
      </p>
      <CodeBlock lang="swift" title="ImageCache：用 actor 保护内部字典" code={actorCacheSnippet} />

      <Callout variant="warn" title="actor 重入：await 处可能被「插队」">
        actor 保证「同一时刻只有一个任务在执行」，但<strong>不</strong>保证一个方法从头到尾不被打断。
        当方法内部走到 <code>await</code> 暂停时，它会<strong>让出</strong> actor，别的任务可以进来执行——这叫
        <strong>actor 重入</strong>（reentrancy）。所以别假设「<code>await</code> 前检查过的状态、<code>await</code> 后还原样」，
        跨暂停点要重新校验关键状态。
      </Callout>

      <h2>三、@MainActor：把代码钉在主线程</h2>
      <p>
        iOS 有一条铁律：<strong>所有 UI 更新必须发生在主线程</strong>。在后台线程改 UI 会导致界面错乱甚至崩溃。
        <code>@MainActor</code> 是一个全局的、特殊的 actor，代表「主线程」这个执行域。给函数、属性或整个类型标上它，
        就保证其中的代码<strong>都在主线程运行</strong>。
      </p>
      <KeyIdea>
        <code>@MainActor</code> 把被标记的代码绑定到主线程执行域。SwiftUI 的 <code>ViewModel</code>（通常是
        <code>ObservableObject</code>）几乎都该标 <code>@MainActor</code>：这样改 <code>@Published</code> 属性、
        驱动界面刷新时，天然就在主线程，编译器还会帮你拦住「在后台线程误改 UI 状态」的错误。
      </KeyIdea>
      <CodeBlock lang="swift" title="@MainActor ViewModel：状态更新天然在主线程" code={mainActorSnippet} />
      <p>
        注意 <code>load</code> 里那个 <code>await fetchProfile</code>：耗时的网络请求会在<strong>后台</strong>执行，
        不会卡住主线程；但 <code>await</code> 结束、代码恢复时，<strong>又自动回到主线程</strong>，
        所以紧接着给 <code>profile</code> 赋值是安全的。这种「后台干重活、回到主线程更新 UI」的模式，
        过去要手写 <code>DispatchQueue.main.async</code>，现在由 <code>@MainActor</code> 自动保证。
      </p>

      <h2>四、Sendable：跨并发域传值的安全检查</h2>
      <p>
        actor 把状态关在边界内，但数据总要在不同并发域之间<strong>传递</strong>（传进 actor、从 Task 返回……）。
        如果传过去的是一个<strong>共享的可变引用</strong>，那竞争只是换了个地方发生。<code>Sendable</code> 协议就是为此而生：
        它是一个<strong>标记协议</strong>，表示「这个类型的值可以安全地跨并发域传递」。
      </p>
      <CodeBlock lang="swift" title="Sendable：可安全跨域传递的类型" code={sendableSnippet} />
      <p>哪些类型是 Sendable？编译器按规则自动判断或检查：</p>
      <ul>
        <li><strong>值类型</strong>（<code>struct</code>、<code>enum</code>）：只要所有成员都 Sendable，就自动满足——值语义本身不共享。</li>
        <li><strong>不可变的引用类型</strong>：<code>final class</code> 且所有存储属性都是不可变的 Sendable，可声明遵循。</li>
        <li><strong>actor</strong>：天生 Sendable——它自带隔离保护。</li>
        <li><strong>普通可变 class</strong>：默认<strong>不是</strong> Sendable，强行跨域传递会被编译器警告/报错。</li>
      </ul>
      <Callout variant="tip" title="编译器替你查竞争">
        Swift 6 的并发检查会在跨并发边界传递<strong>非 Sendable</strong> 类型时直接报错。这意味着很多过去要等线上崩溃
        才发现的竞争，现在在编译期就被拦下。把数据建模成 Sendable 的值类型，是写好并发代码的基本功。
      </Callout>

      <Example title="actor 与 @MainActor 各管一摊">
        <p>一个典型的图片列表页，两类隔离各司其职：</p>
        <ul>
          <li><strong><code>ImageCache</code>（普通 actor）</strong>：跑在后台并发域，保护可变字典，把并发下载/读写串行化。</li>
          <li><strong><code>GalleryViewModel</code>（<code>@MainActor</code>）</strong>：跑在主线程，持有 <code>@Published var images</code>，负责刷新 UI。</li>
          <li>数据流：ViewModel 在 <code>Task</code> 里 <code>await cache.image(for:)</code>（跨进后台 actor）→ 拿到结果后回到主线程更新 <code>@Published</code>。</li>
        </ul>
        <p>跨这两个域传的是 <code>UIImage</code>、<code>URL</code> 这类 Sendable 值，编译器一路替你把关。</p>
      </Example>

      <Summary
        points={[
          '数据竞争：多个任务在无同步下访问同一块可变内存且至少一个是写，会丢更新；它不确定、难复现、不编译报错。',
          'actor 是引用类型，保证同一时刻最多一个任务进入，自动串行化对其可变状态的访问，从编译期消灭数据竞争。',
          '从 actor 外部访问其成员必须 await（可能要排队）；内部访问自己的成员不需要 await。',
          'actor 重入：方法走到 await 时会让出 actor，别的任务可插队，所以跨暂停点要重新校验关键状态。',
          '@MainActor 把代码钉在主线程执行域；UI 更新必须在主线程，SwiftUI 的 ViewModel 通常整体标 @MainActor。',
          'Sendable 是标记协议，表示值可安全跨并发域传递：值类型成员全 Sendable 即自动满足，actor 天生 Sendable，普通可变 class 默认不是。',
        ]}
      />
    </article>
  )
}
