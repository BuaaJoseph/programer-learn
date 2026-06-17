import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const entitySnippet = `import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.ColumnInfo

// @Entity 把一个 Kotlin 数据类映射成数据库里的一张表。
// tableName 不写时默认用类名（这里显式写成 "notes"）。
@Entity(tableName = "notes")
data class NoteEntity(
    // 自增主键：插入时传 0，Room 会替你分配真正的 id。
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,

    // 列名默认等于属性名，可用 @ColumnInfo 改名。
    val title: String,

    @ColumnInfo(name = "body")
    val content: String,

    // 这一列存时间戳，用来排序。
    val updatedAt: Long = System.currentTimeMillis()
)`

const daoSnippet = `import androidx.room.Dao
import androidx.room.Query
import androidx.room.Insert
import androidx.room.Update
import androidx.room.Delete
import androidx.room.OnConflictStrategy
import kotlinx.coroutines.flow.Flow

// @Dao 是一个接口：你只写"想做什么"，Room 在编译期生成实现。
@Dao
interface NoteDao {

    // 返回 Flow：表数据一变化，Room 自动重新发射最新结果，
    // UI 订阅后就能自动刷新，无需手动再查一次。
    @Query("SELECT * FROM notes ORDER BY updatedAt DESC")
    fun observeAll(): Flow<List<NoteEntity>>

    // 一次性读取（带参数）。suspend 表示这是个挂起函数，
    // 由协程在后台线程执行，绝不阻塞主线程。
    @Query("SELECT * FROM notes WHERE id = :id")
    suspend fun findById(id: Long): NoteEntity?

    // 主键冲突时用新行替换旧行。insert 返回新行的 rowId。
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(note: NoteEntity): Long

    @Update
    suspend fun update(note: NoteEntity)

    @Delete
    suspend fun delete(note: NoteEntity)
}`

const databaseSnippet = `import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.Room
import android.content.Context

// @Database 把所有 Entity 和版本号登记在一起，
// 并暴露各个 Dao。entities 列出所有表，version 用于迁移。
@Database(
    entities = [NoteEntity::class],
    version = 1,
    exportSchema = true
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun noteDao(): NoteDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        // 单例：整个 App 共用一个数据库连接池，避免重复打开。
        fun get(context: Context): AppDatabase =
            INSTANCE ?: synchronized(this) {
                INSTANCE ?: Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "app.db"
                ).build().also { INSTANCE = it }
            }
    }
}`

const repositorySnippet = `import kotlinx.coroutines.flow.Flow

// Repository 是数据层的"门面"：上层（ViewModel）只跟它打交道，
// 不直接碰 Dao，也不关心数据来自数据库还是网络。
class NoteRepository(private val dao: NoteDao) {

    // 直接把 Dao 的 Flow 透传出去：上层 collect 即可自动收到更新。
    val notes: Flow<List<NoteEntity>> = dao.observeAll()

    suspend fun load(id: Long): NoteEntity? = dao.findById(id)

    // 写操作是 suspend：调用方需在协程里调用，由 Room 在后台执行。
    suspend fun save(title: String, content: String): Long =
        dao.upsert(NoteEntity(title = title, content = content))

    suspend fun remove(note: NoteEntity) = dao.delete(note)
}`

const migrationSnippet = `import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

// 版本从 1 升到 2：给 notes 表加一列。
// 提供了 Migration，老用户的数据就能平滑保留下来。
val MIGRATION_1_2 = object : Migration(1, 2) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL("ALTER TABLE notes ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0")
    }
}

// 构建时登记迁移；记得把 @Database 的 version 改成 2。
Room.databaseBuilder(context, AppDatabase::class.java, "app.db")
    .addMigrations(MIGRATION_1_2)
    .build()`

const dataStoreSnippet = `import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

// DataStore 也是基于 Flow 的：读偏好返回 Flow，异步且不阻塞。
private val DARK_MODE = booleanPreferencesKey("dark_mode")

val darkModeFlow: Flow<Boolean> =
    dataStore.data.map { prefs -> prefs[DARK_MODE] ?: false }

// 写入是 suspend，事务式更新，天生支持协程。
suspend fun setDarkMode(enabled: Boolean) {
    dataStore.edit { prefs -> prefs[DARK_MODE] = enabled }
}`

export default function Ch1() {
  return (
    <article>
      <Lead>
        几乎每个 App 都要把数据存在手机本地：笔记、收藏、离线缓存、用户设置。Android 底层的本地数据库是
        SQLite，但直接写 SQL 字符串、手动游标取值、自己拼对象，既啰嗦又容易在运行时才崩。
        这一章我们讲 <strong>Room</strong>——Jetpack 官方在 SQLite 之上封装的 ORM。它让你用注解描述表与查询，
        把 SQL 的错误提前到<strong>编译期</strong>暴露，再配合协程与 Flow，把"异步读写 + 数据变了自动刷新 UI"
        这件事做得既安全又顺手。
      </Lead>

      <h2>一、Room 是什么：SQLite 之上的一层 ORM</h2>
      <p>
        Android 系统自带 SQLite 数据库引擎，但官方提供的原始 API（<code>SQLiteOpenHelper</code>、
        <code>Cursor</code>）非常底层：你要手写建表 SQL、手写查询字符串、用游标一列一列把值读出来再塞进对象。
        这一过程里的任何拼写错误——表名写错、列名写错、SQL 语法错——都只有在<strong>程序跑到那一行时才会崩溃</strong>。
      </p>
      <p>
        Room 是 Jetpack 的一个库，它在 SQLite 之上做了一层 <strong>ORM</strong>（对象关系映射）：你用 Kotlin 的
        数据类来代表表里的一行，用接口方法来代表一次查询，Room 在<strong>编译期</strong>生成所有样板代码。
        它不是另起炉灶的新数据库，底层依旧是 SQLite，只是把"人写 SQL、手翻对象"这件苦差事自动化了。
      </p>
      <KeyIdea>
        Room = SQLite + 注解 + 编译期校验。你声明"数据长什么样、要做哪些查询"，Room 替你生成实现，
        并在编译期就检查 SQL 是否正确、返回类型是否对得上。错误从运行时崩溃，提前成了一条编译报错。
      </KeyIdea>

      <h2>二、三件套：Entity、Dao、Database</h2>
      <p>
        Room 的世界由三种角色组成，缺一不可。理解了它们的分工，就理解了 Room 的全部骨架。
      </p>
      <table>
        <thead>
          <tr><th>注解</th><th>作用对象</th><th>代表什么</th></tr>
        </thead>
        <tbody>
          <tr><td><code>@Entity</code></td><td>数据类</td><td>一张表，类的每个属性是一列</td></tr>
          <tr><td><code>@Dao</code></td><td>接口</td><td>一组增删改查方法（Data Access Object）</td></tr>
          <tr><td><code>@Database</code></td><td>抽象类</td><td>把所有表与 Dao 汇总，管理版本号</td></tr>
        </tbody>
      </table>

      <h3>@Entity：用数据类描述一张表</h3>
      <p>
        给一个 <code>data class</code> 加上 <code>@Entity</code>，它就成了一张表。每个属性映射成一列；
        必须有一个 <code>@PrimaryKey</code>（主键）。<code>autoGenerate = true</code> 让 Room 自增分配 id。
        想给列改名、改类型行为，用 <code>@ColumnInfo</code>。
      </p>
      <CodeBlock lang="kotlin" title="NoteEntity.kt —— 一张 notes 表" code={entitySnippet} />

      <h3>@Dao：声明式的增删改查接口</h3>
      <p>
        Dao 是一个<strong>接口</strong>——你只写方法签名和注解，Room 在编译期生成真正的实现。常用注解有四个：
        <code>@Query</code>（任意 SQL，读写都行）、<code>@Insert</code>、<code>@Update</code>、<code>@Delete</code>。
        后三个连 SQL 都不用写，Room 根据 Entity 自动生成。
      </p>
      <CodeBlock lang="kotlin" title="NoteDao.kt —— 增删改查接口" code={daoSnippet} />
      <p>
        注意 <code>@Query</code> 里的命名参数：<code>WHERE id = :id</code> 中的 <code>:id</code> 直接绑定方法参数，
        Room 会做参数化绑定，从根上避免 SQL 注入。返回类型也很关键——可以是单个对象、
        <code>List</code>、<code>{'Flow<List<NoteEntity>>'}</code>，Room 会按类型生成对应代码。
      </p>

      <h3>@Database：把一切汇总起来</h3>
      <p>
        <code>@Database</code> 标注一个抽象类，<code>entities</code> 列出所有表，<code>version</code> 是当前版本号
        （迁移时会用到）。类里为每个 Dao 声明一个抽象方法，Room 负责实现。实际使用时通常做成单例，
        让整个 App 共用一个数据库实例。
      </p>
      <CodeBlock lang="kotlin" title="AppDatabase.kt —— 数据库定义与单例" code={databaseSnippet} />

      <h2>三、编译期校验：把崩溃提前到红色波浪线</h2>
      <p>
        这是 Room 相比裸 SQLite 最大的价值。当你写下 <code>{'@Query("SELECT * FROM notes ...")'}</code>，
        Room 的注解处理器会在<strong>编译时</strong>做这些检查：
      </p>
      <ul>
        <li>表名、列名是否真的存在于你的 Entity——写错一个字母，编译就报错。</li>
        <li>SQL 语法是否合法——少个括号、关键字拼错，当场拦下。</li>
        <li>查询返回的列，能不能装进方法声明的返回类型——对不上也会报错。</li>
        <li><code>:param</code> 占位符是否都有对应的方法参数。</li>
      </ul>
      <Callout variant="tip" title="为什么这件事很值钱">
        裸 SQLite 里这些错误都要等到"用户点到那个按钮、代码跑到那一行"才暴露成线上崩溃。
        Room 把它们变成<strong>编译失败</strong>——你在写代码时就被红线拦住，根本提交不出去。
      </Callout>

      <h2>四、异步与响应式：suspend 与 Flow</h2>
      <p>
        数据库读写是 I/O 操作，绝不能放在主线程（UI 线程）上做，否则界面会卡顿甚至 ANR。Room 与 Kotlin
        协程深度集成，给了两种异步姿势。
      </p>
      <h3>suspend：一次性的异步读写</h3>
      <p>
        把 Dao 方法标成 <code>suspend</code>，Room 就会自动在后台线程执行它，并在完成后把结果挂起返回。
        调用方只需在协程里 <code>val note = dao.findById(1)</code>，写起来像同步代码，实际不阻塞主线程。
        插入、更新、删除这类"做一次就完"的操作，用 <code>suspend</code> 最合适。
      </p>
      <h3>Flow：会自动更新的查询</h3>
      <KeyIdea>
        让 <code>@Query</code> 方法返回 <code>{'Flow<List<T>>'}</code>，它就变成一个<strong>可观察的查询</strong>：
        只要这张表的数据发生变化，Room 会自动重新执行查询并把新结果发射出去。UI 一旦 collect 这个 Flow，
        就能"数据变 → 自动刷新"，你再也不用在每次写入后手动重新查一遍。
      </KeyIdea>
      <p>
        这就是响应式数据层的精髓：写入方（某处调用了 <code>upsert</code>）和读取方（UI 订阅了 <code>observeAll</code>）
        彻底解耦。写入方不需要知道谁在看这份数据，读取方自动收到最新值。一次 <code>INSERT</code> 之后，
        列表界面会因为 Flow 重新发射而自动多出一行。
      </p>

      <h2>五、放进 Repository 里用</h2>
      <p>
        实战中，ViewModel 通常不直接调用 Dao，而是隔一层 <strong>Repository</strong>。Repository 是数据层的"门面"：
        它对上提供干净的方法（保存笔记、观察笔记列表），对下封装数据来源的细节。这样上层完全不必关心
        数据是来自 Room、网络还是内存缓存——下一章我们会让同一个 Repository 同时管远程和本地两个数据源。
      </p>
      <CodeBlock lang="kotlin" title="NoteRepository.kt —— 数据层门面" code={repositorySnippet} />
      <Example title="数据是怎么流动的">
        <p>
          用户在界面上点"保存"：ViewModel 在协程里调 <code>repository.save(title, content)</code> →
          Repository 调 <code>dao.upsert(...)</code> → Room 在后台线程把新行写进 SQLite。
        </p>
        <p>
          写入完成的瞬间，notes 表变了 → <code>observeAll()</code> 返回的 Flow 自动重新发射新的列表 →
          正在 collect 这个 Flow 的列表界面<strong>自动刷新</strong>，多出刚保存的那条笔记。整个过程里，
          "保存"和"刷新列表"两段代码彼此不知道对方存在。
        </p>
      </Example>

      <h2>六、数据库迁移：表结构变了怎么办</h2>
      <p>
        App 升级时表结构常常要改——加一列、改个表。如果你只是把 <code>@Database</code> 的 <code>version</code>
        加一却不告诉 Room"怎么从旧结构变到新结构"，Room 默认会拒绝打开，或在配置了
        <code>fallbackToDestructiveMigration</code> 时<strong>直接清空重建</strong>（用户数据全没）。正确做法是提供一个
        <code>Migration</code>，用一句 SQL 描述结构变化，老用户的数据就能平滑保留。
      </p>
      <CodeBlock lang="kotlin" title="Migration —— 从版本 1 升到 2" code={migrationSnippet} />
      <Callout variant="warn" title="别用销毁式迁移糊弄线上">
        <code>fallbackToDestructiveMigration()</code> 很省事，但它的代价是<strong>删库重建</strong>。
        开发期随便用，一旦 App 上线、用户手机里有真实数据，就必须老老实实写 <code>Migration</code>，
        否则一次升级会让用户丢掉全部本地数据。
      </Callout>

      <h2>七、键值偏好：SharedPreferences 与 DataStore</h2>
      <p>
        不是所有数据都值得建表。像"是否开启深色模式""上次选中的标签页"这种零散的<strong>键值偏好</strong>，
        用数据库属于杀鸡用牛刀。Android 为此提供了轻量的键值存储方案。
      </p>
      <p>
        老牌方案是 <strong>SharedPreferences</strong>：API 简单，但它有几个硬伤——读取可能阻塞主线程、
        没有类型安全的异步接口、错误只能靠返回值兜，且不易做事务。Jetpack 的 <strong>DataStore</strong>
        是它的现代替代品：基于协程与 Flow，读是 Flow（异步、可观察），写是 suspend（事务式），
        和 Room 的响应式风格一脉相承。
      </p>
      <CodeBlock lang="kotlin" title="DataStore —— 读写一个布尔偏好" code={dataStoreSnippet} />
      <table>
        <thead>
          <tr><th>维度</th><th>SharedPreferences</th><th>DataStore（Preferences）</th><th>Room</th></tr>
        </thead>
        <tbody>
          <tr><td>适合存什么</td><td>少量键值偏好</td><td>少量键值偏好</td><td>结构化、成批的记录</td></tr>
          <tr><td>异步模型</td><td>同步为主，易阻塞主线程</td><td>协程 + Flow，天生异步</td><td>suspend + Flow</td></tr>
          <tr><td>可观察</td><td>需手动注册监听器</td><td>读即 Flow，自动发射</td><td>Flow 查询自动发射</td></tr>
          <tr><td>类型/SQL 校验</td><td>无</td><td>键有类型</td><td>编译期校验 SQL</td></tr>
          <tr><td>2026 的建议</td><td>遗留，不再新用</td><td>取代 SharedPreferences</td><td>本地数据库首选</td></tr>
        </tbody>
      </table>
      <Callout variant="tip" title="一句话取舍">
        几个开关、几个字符串这类零散偏好 → 用 <strong>DataStore</strong>；成批的、有结构、要查询排序的记录
        → 用 <strong>Room</strong>。新项目里不要再选 SharedPreferences——DataStore 是官方推荐的替代品。
      </Callout>

      <h2>八、小结与下一步</h2>
      <p>
        到这里，本地数据层的全貌就清楚了：Room 用三件套把 SQLite 包成类型安全的 ORM，编译期挡住 SQL 错误，
        suspend 管异步写、Flow 管自动刷新，Repository 把这一切收口成干净的门面。键值偏好则交给 DataStore。
        下一章我们加上网络：用 Retrofit + 协程拉远程数据，并在同一个 Repository 里把"远程获取"和"本地缓存"
        揉成一套"先读缓存、再刷新网络"的流程。
      </p>

      <Summary
        points={[
          'Room 是 SQLite 之上的 ORM：用注解描述表与查询，编译期生成实现，把 SQL 错误从运行时崩溃提前为编译报错。',
          '三件套：@Entity（数据类映射成表）、@Dao（@Query/@Insert/@Update/@Delete 的增删改查接口）、@Database（汇总表与 Dao、管版本号）。',
          'suspend 函数做一次性异步读写，自动在后台线程执行不阻塞主线程；@Query 返回 Flow 则成为可观察查询，数据变了自动重新发射、驱动 UI 刷新。',
          'Repository 作为数据层门面，让 ViewModel 不直接碰 Dao，便于后续统一本地与远程数据源。',
          '改表结构要提供 Migration 保留老用户数据；销毁式迁移会删库重建，只能在开发期用。',
          '零散键值偏好用 DataStore（协程 + Flow，取代老旧的 SharedPreferences）；结构化成批记录用 Room。',
        ]}
      />
    </article>
  )
}
