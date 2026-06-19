import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const modelSnippet = `import SwiftData
import Foundation

@Model
final class TodoItem {
    // 普通存储属性：默认就会被持久化，无需任何额外标注
    var title: String
    var isDone: Bool
    var createdAt: Date

    // @Attribute(.unique) 可声明唯一约束，写入重复值时会去重 / 报错
    @Attribute(.unique) var id: UUID

    init(title: String, isDone: Bool = false) {
        self.id = UUID()
        self.title = title
        self.isDone = isDone
        self.createdAt = Date()
    }
}`

const containerSnippet = `import SwiftUI
import SwiftData

@main
struct TodoApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        // 注入容器：这一行会为整个视图树建立 ModelContainer，
        // 并把它的主 ModelContext 写进 SwiftUI 环境
        .modelContainer(for: TodoItem.self)
    }
}`

const querySnippet = `import SwiftUI
import SwiftData

struct TodoListView: View {
    // @Query 自动查询并订阅：底层数据一变，视图自动刷新
    // sort 指定排序，filter 可传谓词（#Predicate）
    @Query(sort: \\.createdAt, order: .reverse) private var todos: [TodoItem]

    // 从环境里取出当前 ModelContext，用来做增删改
    @Environment(\\.modelContext) private var context

    var body: some View {
        List {
            ForEach(todos) { todo in
                HStack {
                    Text(todo.title)
                    Spacer()
                    if todo.isDone { Image(systemName: "checkmark") }
                }
                .onTapGesture { todo.isDone.toggle() } // 改：直接改属性即可
            }
            .onDelete(perform: deleteItems)
        }
        .toolbar {
            Button("添加") { addItem() }
        }
    }

    private func addItem() {
        let item = TodoItem(title: "新任务")
        context.insert(item)   // 增：插入到上下文
        // 通常无需手动 context.save()，SwiftData 会自动保存；
        // 需要立刻落盘时可显式 try? context.save()
    }

    private func deleteItems(at offsets: IndexSet) {
        for index in offsets {
            context.delete(todos[index])   // 删：从上下文移除
        }
    }
}`

const predicateSnippet = `// 谓词：只查未完成、且标题包含关键字的任务
let keyword = "报告"
let descriptor = FetchDescriptor<TodoItem>(
    predicate: #Predicate { item in
        item.isDone == false && item.title.contains(keyword)
    },
    sortBy: [SortDescriptor(\\.createdAt, order: .reverse)]
)
let results = try context.fetch(descriptor)

// 在 @Query 里也能直接写过滤条件
// @Query(filter: #Predicate<TodoItem> { !$0.isDone }) var pending: [TodoItem]`

const relationSnippet = `@Model
final class TodoList {
    var name: String
    // 一对多关系：删除清单时，级联删除其下所有任务
    @Relationship(deleteRule: .cascade, inverse: \\TodoItem.list)
    var items: [TodoItem] = []

    init(name: String) { self.name = name }
}

@Model
final class TodoItem {
    var title: String
    var list: TodoList?   // 反向关系：每个任务属于某个清单
    init(title: String) { self.title = title }
}`

const appStorageSnippet = `import SwiftUI

struct SettingsView: View {
    // @AppStorage 是对 UserDefaults 的 SwiftUI 包装：
    // 读写即存，值变化自动刷新视图
    @AppStorage("isDarkMode") private var isDarkMode = false
    @AppStorage("username") private var username = ""

    var body: some View {
        Form {
            Toggle("深色模式", isOn: $isDarkMode)
            TextField("昵称", text: $username)
        }
    }
}

// 不依赖 SwiftUI 时，直接用 UserDefaults
UserDefaults.standard.set(true, forKey: "isDarkMode")
let dark = UserDefaults.standard.bool(forKey: "isDarkMode")`

export default function Ch1() {
  return (
    <article>
      <Lead>
        几乎每个 App 都要回答同一个问题：用户关掉应用、重启手机之后，数据还在不在？这就是
        <strong>持久化</strong>。从 iOS 17 开始，苹果给出了新一代答案——<strong>SwiftData</strong>：
        一个声明式、与 SwiftUI 深度咬合的持久化框架。这一章我们讲透它的来历、核心组件
        （<code>@Model</code>、<code>ModelContainer</code>、<code>ModelContext</code>、<code>@Query</code>），
        它与老牌 Core Data 的关系与取舍，再聊聊什么时候该用更轻量的 <code>UserDefaults</code>，
        最后用一个待办（Todo）例子把增删查跑通。
      </Lead>

      <h2>一、为什么需要一个持久化框架</h2>
      <p>
        最朴素的持久化就是把数据写进文件——存成 JSON、写进 plist、或者直接操作 SQLite 数据库。
        小数据这么干没问题，但一旦数据有<strong>结构</strong>（对象之间有关系）、有<strong>查询</strong>需求
        （按条件筛选、排序、分页）、还要在<strong>多个界面间保持一致</strong>，手写文件读写就会迅速失控：
        你得自己管 id、自己拼查询、自己在数据变化后通知每一个相关界面刷新。
      </p>
      <p>
        持久化框架（也叫 ORM，对象关系映射）的价值就在这里：你只用<strong>面向对象</strong>的方式
        描述「我有哪些模型、它们之间什么关系」，框架替你把对象映射进底层数据库，并提供查询、
        增删改、关系维护、变更通知等一整套能力。SwiftData 正是苹果在 Swift 时代给出的这样一套框架。
      </p>

      <h2>二、SwiftData 是什么：站在 Core Data 肩膀上的声明式框架</h2>
      <KeyIdea>
        SwiftData 是苹果在 iOS 17 / 2023 年推出的新一代持久化框架。它<strong>建立在 Core Data
        之上</strong>（底层仍是经过十多年打磨的 Core Data 引擎与 SQLite），但提供了一套
        <strong>声明式、纯 Swift、与 SwiftUI 深度集成</strong>的现代 API：用宏（macro）代替
        繁琐的模型编辑器与样板代码。
      </KeyIdea>
      <p>
        要理解 SwiftData，先得知道它替谁而来。<strong>Core Data</strong> 是苹果自 2005 年起的持久化
        方案，能力极强但「年代感」很重：你要在 Xcode 里用可视化编辑器画
        <code>.xcdatamodeld</code> 模型文件，要和 <code>NSManagedObject</code>、
        <code>NSFetchRequest</code>、<code>NSManagedObjectContext</code> 这些带 <code>NS</code> 前缀的
        Objective-C 时代类型打交道，样板代码多、与 SwiftUI 的衔接也不够顺滑。
      </p>
      <p>
        SwiftData 把这一切现代化了：模型就是一个普通的 Swift <code>class</code>，加上一个
        <code>@Model</code> 宏即可；不再需要可视化模型文件；查询用属性包装器 <code>@Query</code>
        一行声明；与 SwiftUI 的环境、刷新机制天然打通。它不是推倒重来，而是给 Core Data
        套上了一层让人愉快的现代外衣。
      </p>
      <table>
        <thead>
          <tr><th>维度</th><th>事实</th></tr>
        </thead>
        <tbody>
          <tr><td>出品方</td><td>Apple</td></tr>
          <tr><td>登场</td><td>iOS 17 / 2023（WWDC23）</td></tr>
          <tr><td>底层</td><td>建立在 Core Data 引擎之上（最终落到 SQLite）</td></tr>
          <tr><td>风格</td><td>声明式、纯 Swift、用宏标注、与 SwiftUI 深度集成</td></tr>
          <tr><td>定位</td><td>结构化、可查询、需跨界面同步的本地数据</td></tr>
        </tbody>
      </table>

      <h2>三、第一根支柱：@Model 宏</h2>
      <p>
        SwiftData 的模型就是一个加了 <code>@Model</code> 宏的类。这个宏在编译期帮你做了大量工作：
        把类的存储属性变成<strong>可持久化的字段</strong>，自动生成访问、变更追踪、与底层存储映射的代码。
        你写的还是普通 Swift 属性，但读写它们时，框架已经在背后记录「谁变了、何时该存」。
      </p>
      <CodeBlock lang="swift" title="用 @Model 定义一个可持久化模型" code={modelSnippet} />
      <p>
        几点要记住：① 普通存储属性<strong>默认就会被持久化</strong>，不需要任何额外标注；
        ② 想加约束时用 <code>@Attribute</code>，例如 <code>@Attribute(.unique)</code> 声明唯一键；
        ③ 模型一般写成 <code>final class</code>（SwiftData 模型是引用类型，因为要做变更追踪），
        而不是 <code>struct</code>；④ 不希望被存的临时属性可以用 <code>@Transient</code> 排除。
      </p>

      <h2>四、第二、三根支柱：ModelContainer 与 ModelContext</h2>
      <p>
        模型只是「数据长什么样」的描述，真正管理数据的是两个角色：
      </p>
      <ul>
        <li>
          <strong>ModelContainer（容器）</strong>：整个持久化栈的根。它知道有哪些模型、
          数据存在磁盘的哪个位置、用什么配置。一个 App 通常只建一个容器。
        </li>
        <li>
          <strong>ModelContext（上下文）</strong>：你日常打交道的工作区。所有的
          <strong>增（<code>insert</code>）、删（<code>delete</code>）、存（<code>save</code>）</strong>
          都通过它进行。它像一块「暂存画布」：你在上面增删改对象，这些改动先记在内存，
          调用 <code>save()</code>（或自动保存触发）时才一起落盘。
        </li>
      </ul>
      <p>
        在 SwiftUI 里，最省事的方式是用 <code>.modelContainer(for:)</code> 修饰符注入容器——
        它会自动建好容器、生成一个主上下文，并放进 SwiftUI 环境，供 <code>@Query</code> 和
        <code>@Environment(\.modelContext)</code> 取用。
      </p>
      <CodeBlock lang="swift" title="在 App 入口注入 ModelContainer" code={containerSnippet} />
      <Callout variant="info" title="insert / delete / save 的关系">
        <code>insert</code> 和 <code>delete</code> 只是把对象登记 / 注销到上下文，
        改的是「内存中的暂存状态」。把状态真正写进磁盘的是 <code>save()</code>。
        好消息是：SwiftData 在大多数场景会<strong>自动保存</strong>（视图刷新、App 进入后台等时机），
        你常常不需要手动调 <code>save()</code>；只有要确保某一刻数据立即落盘时才显式调用。
      </Callout>

      <h2>五、第四根支柱：@Query —— 查询即 UI 数据源</h2>
      <KeyIdea>
        <code>@Query</code> 是 SwiftData 与 SwiftUI 结合得最漂亮的地方：它在视图里声明一个查询，
        既是<strong>数据获取</strong>，又是<strong>数据订阅</strong>。底层数据一旦变化，
        被 <code>@Query</code> 标注的属性会自动更新，SwiftUI 随即重绘相关视图——
        你不用写任何「数据变了去刷新界面」的代码。
      </KeyIdea>
      <p>
        <code>@Query</code> 可以指定排序（<code>sort</code> / <code>order</code>）和过滤条件
        （<code>filter</code>，传一个 <code>#Predicate</code> 谓词）。它返回的就是一个普通数组，
        你可以直接喂给 <code>List</code> 或 <code>ForEach</code>。
      </p>

      <h2>六、关系与谓词（一句话版）</h2>
      <p>
        <strong>关系</strong>：用 <code>@Relationship</code> 声明模型之间的一对多 / 多对多，
        并能指定删除规则（如 <code>.cascade</code> 级联删除）；<strong>谓词</strong>：用
        <code>#Predicate</code> 宏写类型安全的查询条件，编译期就能检查字段是否存在。
      </p>
      <CodeBlock lang="swift" title="关系：清单与任务（一对多 + 级联删除）" code={relationSnippet} />
      <CodeBlock lang="swift" title="谓词：手动 FetchDescriptor 与 @Query 过滤" code={predicateSnippet} />

      <h2>七、完整例子：一个能增删的待办列表</h2>
      <p>
        把前面四根支柱串起来：<code>@Model</code> 定义 <code>TodoItem</code>，App 入口用
        <code>.modelContainer</code> 注入，列表视图用 <code>@Query</code> 取数据、用
        <code>@Environment(\.modelContext)</code> 拿上下文做增删，改则直接修改对象属性。
      </p>
      <Example title="待办列表：@Query 驱动 UI，context 负责增删">
        <p>
          点「添加」会 <code>insert</code> 一个新任务，划动删除会 <code>delete</code>，点一行会切换完成态。
          注意整段代码<strong>没有一处手动刷新 UI</strong>——数据一变，<code>@Query</code> 自动把新列表
          推给 <code>List</code>，这正是 SwiftData + SwiftUI 的精髓。
        </p>
      </Example>
      <CodeBlock lang="swift" title="TodoListView：增删查改全在这里" code={querySnippet} />

      <h2>八、何时用 SwiftData，何时用 Core Data，何时用 UserDefaults</h2>
      <p>
        <strong>SwiftData vs Core Data</strong>：新项目、最低支持 iOS 17 及以上、又主要用 SwiftUI 的，
        优先 SwiftData，开发体验明显更好。但 SwiftData 还年轻，一些 Core Data 的高级能力
        （复杂迁移、细粒度并发控制、某些性能调优、成熟的 CloudKit 深度配置）仍以 Core Data 更完备；
        要兼容老系统、或维护已有 Core Data 工程时，继续用 Core Data 更稳妥。两者底层同源，
        也支持在同一工程里共存与迁移。
      </p>
      <p>
        <strong>SwiftData vs UserDefaults</strong>：不是所有数据都值得动用持久化框架。像「是否开启深色模式」
        「上次选的标签页」「用户昵称」这种<strong>少量、扁平的键值</strong>，用 <code>UserDefaults</code>
        （在 SwiftUI 里用 <code>@AppStorage</code> 包装）才合适——它轻、零样板、读写即存。
        反过来，用 <code>UserDefaults</code> 去存大量结构化、需要查询的数据则是误用。
      </p>
      <CodeBlock lang="swift" title="轻量键值：@AppStorage 与 UserDefaults" code={appStorageSnippet} />
      <table>
        <thead>
          <tr><th>方案</th><th>适合存什么</th><th>不适合</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><code>UserDefaults</code> / <code>@AppStorage</code></td>
            <td>少量配置、开关、偏好等扁平键值</td>
            <td>大量数据、需要查询 / 关系的结构化数据</td>
          </tr>
          <tr>
            <td><code>SwiftData</code></td>
            <td>结构化、可查询、需跨界面同步的本地数据（iOS 17+，SwiftUI 优先）</td>
            <td>极简键值（杀鸡用牛刀）、需兼容旧系统</td>
          </tr>
          <tr>
            <td><code>Core Data</code></td>
            <td>需要高级迁移 / 并发 / 兼容旧系统的成熟工程</td>
            <td>追求最简开发体验的全新 SwiftUI 小项目</td>
          </tr>
        </tbody>
      </table>

      <h2>九、边界与注意事项</h2>
      <ul>
        <li><strong>模型必须是 class</strong>：因为要做变更追踪，<code>@Model</code> 不能用在 <code>struct</code> 上。</li>
        <li><strong>系统门槛</strong>：SwiftData 需要 iOS 17+。要支持更老系统就只能回退 Core Data。</li>
        <li><strong>并发</strong>：跨线程操作要小心，<code>ModelContext</code> 不是随便跨线程共享的；后台批量写入应使用专门的后台上下文。</li>
        <li><strong>不要把它当数据库直接 SQL 用</strong>：SwiftData 是对象层抽象，复杂聚合查询能力不如直接写 SQL。</li>
        <li><strong>自动保存有时机</strong>：依赖自动保存时，关键节点（如即将退出某流程）仍建议显式 <code>save()</code> 兜底。</li>
      </ul>

      <Callout variant="tip">
        本地数据搞定了，App 的另一半数据来自网络。下一章我们讲 <code>URLSession</code> + <code>Codable</code>：
        如何用 <code>async</code> 发请求、把 JSON 自动解码成模型，并用一个 Repository 把
        「网络拉取 + 本地缓存」封装起来，对上层只暴露干净的 <code>async</code> 接口。
      </Callout>

      <Summary
        points={[
          'SwiftData 是苹果 iOS 17 推出的新一代持久化框架，建立在 Core Data 之上，但提供声明式、纯 Swift、与 SwiftUI 深度集成的现代 API。',
          '@Model 宏把一个普通 class 变成可持久化模型：普通存储属性默认即被持久化，@Attribute 加约束。',
          'ModelContainer 是持久化栈的根，ModelContext 是日常工作区，增 insert、删 delete、存 save 都经由它；SwiftUI 用 .modelContainer 注入。',
          '@Query 在视图里声明查询并自动订阅：数据一变 UI 自动刷新，无需手写刷新逻辑；可配 sort 与 #Predicate 过滤。',
          '关系用 @Relationship（含级联删除等规则），谓词用类型安全的 #Predicate 宏。',
          '取舍：SwiftUI + iOS 17 新项目优先 SwiftData，兼容旧系统 / 高级能力用 Core Data，少量扁平键值用 UserDefaults / @AppStorage。',
        ]}
      />
    </article>
  )
}
