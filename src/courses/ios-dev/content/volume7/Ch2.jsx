import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const basicRequestSnippet = `import Foundation

// 最简单的 GET：data(from:) 直接接收一个 URL
let url = URL(string: "https://api.example.com/users")!
let (data, response) = try await URLSession.shared.data(from: url)
// data 是返回的字节，response 是 URLResponse（含状态码、头等）`

const urlRequestSnippet = `// 需要自定义方法 / 请求头 / 请求体时，构造 URLRequest，
// 再用 data(for:) 发送
var request = URLRequest(url: URL(string: "https://api.example.com/login")!)
request.httpMethod = "POST"
request.setValue("application/json", forHTTPHeaderField: "Content-Type")
request.setValue("Bearer \\(token)", forHTTPHeaderField: "Authorization")

let body = ["username": "alice", "password": "secret"]
request.httpBody = try JSONEncoder().encode(body)

let (data, response) = try await URLSession.shared.data(for: request)`

const codableSnippet = `import Foundation

// 同时遵守 Encodable + Decodable，可写成 Codable
struct User: Codable {
    let id: Int
    let name: String
    let email: String
}

// 解码：JSON -> 模型
let user = try JSONDecoder().decode(User.self, from: data)

// 编码：模型 -> JSON
let json = try JSONEncoder().encode(user)`

const codingKeysSnippet = `// 后端字段是 snake_case，本地想用 Swift 风格的 camelCase
struct Article: Codable {
    let id: Int
    let title: String
    let authorName: String
    let publishedAt: Date

    // 方式一：CodingKeys 逐个改名
    enum CodingKeys: String, CodingKey {
        case id, title
        case authorName = "author_name"
        case publishedAt = "published_at"
    }
}

// 方式二：不写 CodingKeys，让解码器统一转换
let decoder = JSONDecoder()
decoder.keyDecodingStrategy = .convertFromSnakeCase   // author_name -> authorName
decoder.dateDecodingStrategy = .iso8601               // 日期按 ISO8601 解析`

const nestedSnippet = `// 嵌套模型：结构嵌套，Codable 会自动递归解码
struct Feed: Codable {
    let page: Int
    let articles: [Article]   // 数组成员也是 Codable
    let author: Author        // 嵌套对象
}

struct Author: Codable {
    let id: Int
    let name: String
    let avatarURL: URL        // URL 本身就是 Codable
}`

const errorSnippet = `import Foundation

// 自定义错误：把网络层可能出的问题归类
enum APIError: Error {
    case invalidResponse          // 不是 HTTPURLResponse
    case httpStatus(Int)          // 服务器返回了非 2xx 状态码
    case decoding(Error)          // JSON 解码失败
}

func fetchUser(id: Int) async throws -> User {
    let url = URL(string: "https://api.example.com/users/\\(id)")!
    let (data, response) = try await URLSession.shared.data(from: url)

    // 1. 检查响应类型
    guard let http = response as? HTTPURLResponse else {
        throw APIError.invalidResponse
    }
    // 2. 检查 HTTP 状态码（200..<300 才算成功）
    guard (200..<300).contains(http.statusCode) else {
        throw APIError.httpStatus(http.statusCode)
    }
    // 3. 解码，失败时包装成自定义错误
    do {
        return try JSONDecoder().decode(User.self, from: data)
    } catch {
        throw APIError.decoding(error)
    }
}`

const repositorySnippet = `import Foundation

// 协议：对上层只暴露干净的 async 接口，便于替换 / 测试
protocol UserRepository {
    func loadUsers() async throws -> [User]
}

// 实现：内部封装「网络拉取 + 本地缓存」
final class DefaultUserRepository: UserRepository {
    private let session: URLSession
    private let cache: UserCache   // 例如包一层 SwiftData / 文件缓存

    init(session: URLSession = .shared, cache: UserCache) {
        self.session = session
        self.cache = cache
    }

    func loadUsers() async throws -> [User] {
        do {
            // 优先走网络
            let url = URL(string: "https://api.example.com/users")!
            let (data, response) = try await session.data(from: url)
            guard let http = response as? HTTPURLResponse,
                  (200..<300).contains(http.statusCode) else {
                throw APIError.invalidResponse
            }
            let users = try JSONDecoder().decode([User].self, from: data)
            await cache.save(users)     // 成功则更新本地缓存
            return users
        } catch {
            // 网络失败时回退到缓存，保证离线也能用
            if let cached = await cache.load(), !cached.isEmpty {
                return cached
            }
            throw error
        }
    }
}`

const viewModelSnippet = `import SwiftUI

// iOS 17 起用 @Observable 宏标注 ViewModel：
// 属性变化自动驱动 SwiftUI 视图刷新
@Observable
final class UserListViewModel {
    var users: [User] = []
    var isLoading = false
    var errorMessage: String?

    private let repository: UserRepository
    init(repository: UserRepository) {
        self.repository = repository
    }

    // @MainActor 保证 UI 状态在主线程更新
    @MainActor
    func load() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            users = try await repository.loadUsers()   // 调用 Repository 的 async 接口
        } catch {
            errorMessage = "加载失败：\\(error.localizedDescription)"
        }
    }
}

// 视图里触发
struct UserListView: View {
    @State private var vm: UserListViewModel

    var body: some View {
        List(vm.users) { user in Text(user.name) }
            .overlay { if vm.isLoading { ProgressView() } }
            .task { await vm.load() }   // 视图出现时发起加载
    }
}`

const concurrentSnippet = `// 并发：用 async let 同时发多个请求，再一起 await（总耗时≈最慢的那个）
async let profile = fetchProfile(id: id)
async let posts   = fetchPosts(userID: id)
let (p, ps) = try await (profile, posts)

// 超时：在 URLSessionConfiguration 上配置请求 / 资源超时
let config = URLSessionConfiguration.default
config.timeoutIntervalForRequest = 15   // 单次请求超时（秒）
let session = URLSession(configuration: config)`

export default function Ch2() {
  return (
    <article>
      <Lead>
        上一章我们把数据存在了本地，但 App 的另一半数据来自<strong>网络</strong>：从服务器拉列表、
        提交表单、登录鉴权……这一章讲 iOS 网络数据层的两大主角——用 <code>async</code> 风格的
        <strong>URLSession</strong> 发请求，用 <strong>Codable</strong> 把 JSON 自动编解码成模型。
        然后我们把错误处理做扎实，再用一个 <strong>Repository</strong> 把「网络 + 本地缓存」
        封装起来，对上层 ViewModel 只暴露干净的 <code>async</code> 接口。
      </Lead>

      <h2>一、URLSession：iOS 的网络入口</h2>
      <p>
        <code>URLSession</code> 是苹果内置的网络框架，发 HTTP 请求、下载上传文件都靠它。
        过去它用回调（completion handler）风格，回调嵌回调容易写成「回调地狱」。
        从 Swift 并发（<code>async/await</code>）登场后，<code>URLSession</code> 提供了
        <code>async</code> 版本的方法，写网络请求变得像写同步代码一样直白。
      </p>
      <KeyIdea>
        现代 iOS 网络请求的骨架就两行：用 <code>try await URLSession.shared.data(...)</code>
        拿到 <code>(data, response)</code>，再把 <code>data</code> 交给 <code>JSONDecoder</code>
        解成模型。请求是<strong>异步</strong>的（用 <code>await</code> 等待、用 <code>try</code> 接错误），
        但代码读起来是<strong>顺序</strong>的。
      </KeyIdea>
      <CodeBlock lang="swift" title="最简单的 GET：data(from:)" code={basicRequestSnippet} />
      <p>
        要自定义请求——指定方法（POST / PUT / DELETE）、加请求头（如 <code>Authorization</code>）、
        带请求体——就先构造一个 <code>URLRequest</code>，再用 <code>data(for:)</code> 发送。
      </p>
      <CodeBlock lang="swift" title="自定义请求：URLRequest + data(for:)" code={urlRequestSnippet} />
      <table>
        <thead>
          <tr><th>方法</th><th>用途</th></tr>
        </thead>
        <tbody>
          <tr><td><code>data(from: URL)</code></td><td>最简单的 GET，只给一个 URL</td></tr>
          <tr><td><code>data(for: URLRequest)</code></td><td>自定义方法 / 头 / 请求体时用</td></tr>
          <tr><td><code>URLRequest.httpMethod</code></td><td>设置 GET / POST / PUT / DELETE 等</td></tr>
          <tr><td><code>setValue(_:forHTTPHeaderField:)</code></td><td>设置请求头</td></tr>
          <tr><td><code>URLRequest.httpBody</code></td><td>设置请求体（通常是编码后的 JSON）</td></tr>
        </tbody>
      </table>

      <h2>二、Codable：JSON 与模型的自动桥梁</h2>
      <p>
        网络返回的几乎都是 JSON 字节。把 JSON 变成 Swift 模型对象（解码），或把模型变回 JSON（编码），
        就是 <strong>Codable</strong> 干的事。<code>Codable</code> 其实是
        <code>Encodable</code>（可编码）与 <code>Decodable</code>（可解码）两个协议的合称。
        只要你的模型里每个属性的类型都是 Codable 的（Swift 标准类型大都如此），
        编译器就<strong>自动</strong>帮你生成编解码代码，一行不用写。
      </p>
      <CodeBlock lang="swift" title="遵守 Codable，自动编解码" code={codableSnippet} />

      <h3>CodingKeys：字段改名</h3>
      <p>
        现实里后端常用 <code>snake_case</code>（如 <code>author_name</code>），而 Swift 习惯
        <code>camelCase</code>（如 <code>authorName</code>）。两种对齐方式：要么用 <code>CodingKeys</code>
        枚举逐个映射，要么给解码器设 <code>keyDecodingStrategy = .convertFromSnakeCase</code> 统一转换。
      </p>
      <CodeBlock lang="swift" title="CodingKeys 改名 + 日期解码策略" code={codingKeysSnippet} />

      <h3>嵌套模型与日期</h3>
      <p>
        JSON 经常层层嵌套：一个对象里有数组、数组里又是对象。Codable 会<strong>递归</strong>处理——
        只要每一层的类型都遵守 Codable，整棵树就自动解开。日期则需要告诉解码器格式：
        <code>dateDecodingStrategy = .iso8601</code> 是最常见的选择，时间戳可用 <code>.secondsSince1970</code>。
      </p>
      <CodeBlock lang="swift" title="嵌套模型自动递归解码" code={nestedSnippet} />
      <Callout variant="info" title="为什么解码会失败">
        最常见的解码错误是<strong>类型 / 字段对不上</strong>：JSON 里是字符串你声明成了 <code>Int</code>、
        某个字段后端没返回但你声明成了非可选、或字段名拼错。把<strong>可能缺失</strong>的字段声明为
        可选（<code>String?</code>），并在调试时打印 <code>DecodingError</code> 的详情，能快速定位问题。
      </Callout>

      <h2>三、错误处理：别只盯着「成功路径」</h2>
      <p>
        网络是最不可靠的一环：可能断网、超时、服务器返回 500、返回的 JSON 格式变了。
        一个健壮的网络层要把这些都考虑进去。关键有三步：
      </p>
      <ul>
        <li><strong>检查响应类型</strong>：把 <code>URLResponse</code> 转成 <code>HTTPURLResponse</code> 才能读状态码。</li>
        <li><strong>检查 HTTP 状态码</strong>：只有 <code>200..&lt;300</code> 才算成功，其余（401、404、500…）应抛错。</li>
        <li><strong>包装解码错误</strong>：把底层的 <code>DecodingError</code> 归到自己的错误类型里，便于上层统一处理。</li>
      </ul>
      <p>
        Swift 里通常用 <code>throws</code> + 自定义 <code>enum: Error</code> 来表达错误；
        如果不想用抛错，也可以用 <code>Result&lt;Success, Failure&gt;</code> 把成功与失败包在一个返回值里。
        两种风格都常见，本课统一用 <code>async throws</code>。
      </p>
      <CodeBlock lang="swift" title="带状态码检查与错误包装的请求" code={errorSnippet} />

      <h2>四、Repository：把数据层封装起来</h2>
      <KeyIdea>
        不要让 ViewModel 直接写 <code>URLSession</code> 和 <code>JSONDecoder</code>。把网络请求、
        缓存读写、错误归类都收进一个 <strong>Repository（仓库）</strong>，对上层只暴露
        像 <code>func loadUsers() async throws -&gt; [User]</code> 这样干净的 <code>async</code> 接口。
        这样 ViewModel 不关心数据从网络还是缓存来，测试时还能换成假的 Repository。
      </KeyIdea>
      <p>
        Repository 是数据层的「门面」。把它定义成<strong>协议</strong>，再给一个默认实现，好处有三：
        ① 上层与实现解耦，换数据源不动 UI；② 缓存策略（先网络后缓存、离线回退）集中在一处；
        ③ 测试时注入 mock 实现，不必真的发网络。
      </p>
      <CodeBlock lang="swift" title="UserRepository：网络 + 缓存回退" code={repositorySnippet} />

      <h2>五、在 @Observable ViewModel 里调用</h2>
      <p>
        iOS 17 起，ViewModel 推荐用 <code>@Observable</code> 宏标注：它让 ViewModel 的属性变化
        自动驱动 SwiftUI 刷新，比老的 <code>ObservableObject</code> + <code>@Published</code> 更简洁。
        ViewModel 持有 Repository，在 <code>async</code> 方法里调用它，并维护 <code>isLoading</code>、
        <code>errorMessage</code> 等界面状态。注意用 <code>@MainActor</code> 保证 UI 状态在主线程更新。
      </p>
      <Example title="一条完整的数据流">
        <p>
          视图 <code>.task</code> 触发 → ViewModel 的 <code>load()</code> 调
          <code>repository.loadUsers()</code> → Repository 先发网络、失败回退缓存 →
          结果写回 <code>vm.users</code> → <code>@Observable</code> 通知 SwiftUI →
          <code>List</code> 自动重绘。整条链路里 UI 只认 ViewModel，根本不知道网络长什么样。
        </p>
      </Example>
      <CodeBlock lang="swift" title="@Observable ViewModel + 视图触发" code={viewModelSnippet} />

      <h2>六、并发请求与超时（一句话版）</h2>
      <p>
        <strong>并发</strong>：用 <code>async let</code> 同时发起多个互不依赖的请求，再一起 <code>await</code>，
        总耗时约等于最慢的那个，而非各自相加；<strong>超时</strong>：在
        <code>URLSessionConfiguration</code> 上设 <code>timeoutIntervalForRequest</code> 控制单次请求等待上限。
      </p>
      <CodeBlock lang="swift" title="async let 并发与超时配置" code={concurrentSnippet} />

      <h2>七、边界与注意事项</h2>
      <ul>
        <li><strong>状态码不等于成功</strong>：请求「发出去并收到回应」和「业务成功」是两回事，必须显式检查状态码。</li>
        <li><strong>主线程更新 UI</strong>：网络回来后改 UI 状态要回到主线程，用 <code>@MainActor</code> 标注最省心。</li>
        <li><strong>缺失字段要可选</strong>：后端可能不返回某字段，声明为可选能避免整次解码失败。</li>
        <li><strong>不要在 View 里直接发请求</strong>：把网络收进 Repository，View 只通过 ViewModel 拿数据。</li>
        <li><strong>敏感信息别硬编码</strong>：token、密钥不要写死在代码里，更不要随手 print 出来。</li>
      </ul>

      <Callout variant="tip">
        到这里，本地持久化（SwiftData）与网络数据层（URLSession + Codable）就凑齐了 App 的两半数据来源。
        把它们用 Repository 缝合，再用 <code>@Observable</code> ViewModel 暴露给界面，
        你就有了一套清晰、可测试、可离线的现代 iOS 数据层。
      </Callout>

      <Summary
        points={[
          '用 async 版 URLSession 发请求：data(from:) 适合简单 GET，data(for:) 配合 URLRequest 设置方法 / 头 / 体。',
          'Codable = Encodable + Decodable，编译器自动生成编解码；CodingKeys 或 keyDecodingStrategy 改名，dateDecodingStrategy 解析日期，嵌套模型自动递归。',
          '错误处理三步：转 HTTPURLResponse、检查 200..<300 状态码、包装 DecodingError；用 async throws 与自定义 Error，或用 Result。',
          '用 Repository（协议 + 实现）封装网络 + 本地缓存，对上层只暴露 async 接口，便于解耦、集中缓存策略与测试。',
          '在 @Observable ViewModel 里调用 Repository 的 async 方法，维护 isLoading / errorMessage，用 @MainActor 在主线程更新 UI，视图用 .task 触发。',
          '并发用 async let 同时发多请求再一起 await；超时在 URLSessionConfiguration 的 timeoutIntervalForRequest 配置。',
        ]}
      />
    </article>
  )
}
