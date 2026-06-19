import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const overloadOverrideSnippet = `class Calculator {
    // 重载（overload）：同名、参数列表不同，编译期决定
    int add(int a, int b) { return a + b; }
    double add(double a, double b) { return a + b; }
    int add(int a, int b, int c) { return a + b + c; }
}

class Base {
    Object create() { return new Object(); }
}
class Sub extends Base {
    // 重写（override）：方法签名相同，运行期动态分派
    // 返回类型可协变（String 是 Object 的子类），访问权限不能更严
    @Override String create() { return "sub"; }
}`

const paramPassSnippet = `public class PassByValue {
    static void changePrimitive(int n) { n = 100; }          // 改的是副本
    static void changeRef(StringBuilder sb) { sb.append("!"); } // 改的是同一对象
    static void reassignRef(StringBuilder sb) { sb = new StringBuilder("x"); } // 重指无效

    public static void main(String[] args) {
        int a = 1;
        changePrimitive(a);
        System.out.println(a);              // 1：基本类型传值，原值不变

        StringBuilder s = new StringBuilder("hi");
        changeRef(s);
        System.out.println(s);              // hi!：通过引用副本改到了同一对象

        reassignRef(s);
        System.out.println(s);              // hi!：重新赋值只改了副本指向，原引用不动
    }
}`

const objectMethodsSnippet = `// Object 类的核心方法（所有类都继承）
public boolean equals(Object obj)   // 默认比较引用（==），常需重写
public int hashCode()               // 默认基于地址，重写 equals 必须重写它
public String toString()            // 默认 类名@十六进制hashCode，建议重写
public final Class<?> getClass()    // 运行时类型，反射入口
protected Object clone()            // 浅拷贝，需实现 Cloneable
public final void wait() / notify() / notifyAll()  // 线程协作（配合 synchronized）
protected void finalize()           // 已废弃，不要依赖`

const forEachSnippet = `List<Integer> list = new ArrayList<>(List.of(1, 2, 3, 4));

// 普通 for：有索引，可按下标增删，适合需要索引或反向遍历
for (int i = 0; i < list.size(); i++) {
    System.out.println(list.get(i));
}

// foreach（增强 for）：底层用迭代器，简洁，但不能拿到索引
for (int v : list) {
    System.out.println(v);
}

// 陷阱：foreach 中直接删元素会抛 ConcurrentModificationException
for (int v : list) {
    if (v == 2) list.remove(Integer.valueOf(2));  // 运行时异常！
}`

export default function Ch2() {
  return (
    <article>
      <Lead>
        方法与对象的细节是 Java 笔试面试的高发区：重载和重写老是搞混、静态方法能不能被重写说不清、
        「Java 是值传递还是引用传递」更是经典送命题。本章把这些问题连同 Object 类方法、
        for 与 foreach 的取舍一次讲透，并给出最容易答错的反例。
      </Lead>

      <h2>一、重载 vs 重写</h2>
      <KeyIdea>
        重载（overload）是<strong>同一个类里方法名相同、参数列表不同</strong>，编译期就能确定调谁，属于编译时多态；
        重写（override）是<strong>子类重新实现父类的同签名方法</strong>，运行期根据对象真实类型动态分派，属于运行时多态。
        一句话：重载比参数，重写比类型。
      </KeyIdea>

      <h3>面试题 1：重载和重写的区别？</h3>
      <CodeBlock lang="java" title="重载与重写" code={overloadOverrideSnippet} />
      <table>
        <thead>
          <tr><th>维度</th><th>重载 overload</th><th>重写 override</th></tr>
        </thead>
        <tbody>
          <tr><td>发生位置</td><td>同一个类（或父子类间）</td><td>子类与父类之间</td></tr>
          <tr><td>方法名</td><td>相同</td><td>相同</td></tr>
          <tr><td>参数列表</td><td>必须不同（个数/类型/顺序）</td><td>必须相同</td></tr>
          <tr><td>返回类型</td><td>可不同（不作为区分依据）</td><td>相同或协变（子类型）</td></tr>
          <tr><td>访问权限</td><td>无限制</td><td>不能比父类更严格</td></tr>
          <tr><td>绑定时机</td><td>编译期（静态）</td><td>运行期（动态）</td></tr>
        </tbody>
      </table>
      <Callout variant="warn" title="易错点：返回类型不能用来区分重载">
        两个方法只有返回类型不同、参数完全一样，<strong>不构成重载，编译直接报错</strong>。
        因为调用时编译器无法仅凭返回类型判断该调哪个。区分重载只看「参数列表」。
      </Callout>

      <h3>面试题 2：静态方法和实例方法有什么区别？静态方法能被重写吗？</h3>
      <p>
        静态方法属于<strong>类</strong>，用 <code>类名.方法()</code> 调用，没有 <code>this</code>，
        不能访问实例字段；实例方法属于<strong>对象</strong>，需先 new 出对象再调，能访问实例状态。
      </p>
      <table>
        <thead>
          <tr><th>维度</th><th>静态方法</th><th>实例方法</th></tr>
        </thead>
        <tbody>
          <tr><td>归属</td><td>类</td><td>对象</td></tr>
          <tr><td>调用方式</td><td><code>ClassName.m()</code></td><td><code>obj.m()</code></td></tr>
          <tr><td>this</td><td>无</td><td>有</td></tr>
          <tr><td>访问实例成员</td><td>不能直接访问</td><td>可以</td></tr>
          <tr><td>多态</td><td>不参与重写（静态绑定）</td><td>可被重写（动态分派）</td></tr>
        </tbody>
      </table>
      <Callout variant="note" title="静态方法不能被重写，只能被「隐藏」">
        子类若定义一个与父类同签名的静态方法，那叫<strong>方法隐藏（hiding）</strong>，不是重写。
        区别在于：调用静态方法看的是<strong>引用的声明类型（编译期）</strong>，而非对象真实类型。
        所以 <code>Parent p = new Child(); p.staticM();</code> 调的是 Parent 的版本——这与实例方法重写的动态分派正好相反。
      </Callout>

      <h2>二、参数传递：值还是引用</h2>
      <h3>面试题 3：Java 是值传递还是引用传递？</h3>
      <p>
        标准答案只有一个：<strong>Java 永远是值传递（pass by value）</strong>。
        关键在于理解「值」是什么：基本类型传的是数值的副本；引用类型传的是<strong>引用（地址）的副本</strong>，
        而不是对象本身。所以你能通过这个引用副本去修改它指向的对象，但<strong>重新给参数赋值</strong>不会影响原引用。
      </p>
      <CodeBlock lang="java" title="一段代码看清值传递的本质" code={paramPassSnippet} />
      <Example title="为什么这不是「引用传递」？">
        <p>
          真正的引用传递（如 C++ 的 <code>{'&'}</code> 引用）意味着在方法里给参数重新赋值，
          外部的原变量也会跟着改。但上面 <code>reassignRef</code> 里把 <code>sb</code> 指向新对象后，
          外部的 <code>s</code> 仍指向老对象——说明传进来的只是引用的<strong>副本</strong>。
          能改对象内容，是因为副本和原引用指向同一个对象；不能改原引用指向，证明它是值传递。
        </p>
      </Example>
      <Callout variant="warn" title="送命题应对：一句话框定">
        被问这题，先斩钉截铁说「Java 只有值传递」，再补一句「对象传的是引用的副本，所以能改对象内容但改不了原引用指向」。
        切忌含糊地说「基本类型值传递、对象引用传递」——这是最常见的错误表述。
      </Callout>

      <h2>三、Object 类方法</h2>
      <h3>面试题 4：Object 类有哪些方法？</h3>
      <p>
        所有类都隐式继承 <code>Object</code>，它定义了一组「万物皆有」的方法，是很多机制的根基：
      </p>
      <CodeBlock lang="java" title="Object 的核心方法" code={objectMethodsSnippet} />
      <ul>
        <li><code>equals</code> / <code>hashCode</code>：判等与散列，必须成对重写（详见第三卷）。</li>
        <li><code>toString</code>：默认返回「类名@哈希码十六进制」，业务类一般重写成可读信息。</li>
        <li><code>getClass</code>：拿到运行时类对象，是反射的入口。</li>
        <li><code>clone</code>：受保护的浅拷贝方法，需实现 <code>Cloneable</code> 才能用。</li>
        <li><code>wait</code> / <code>notify</code> / <code>notifyAll</code>：线程间协作，必须在 <code>synchronized</code> 块内调用。</li>
        <li><code>finalize</code>：对象回收前的回调，已被官方废弃，不要依赖。</li>
      </ul>
      <Callout variant="tip" title="为什么 wait/notify 在 Object 而不在 Thread？">
        因为它们是基于<strong>对象监视器（monitor）</strong>的协作机制，锁是加在任意对象上的，
        而不是加在线程上。任何对象都可以作为锁，所以这组方法理应定义在所有对象的共同祖先 Object 里。
        这是个很能体现理解深度的追问点。
      </Callout>

      <h2>四、for 与 foreach</h2>
      <h3>面试题 5：普通 for 和增强 for（foreach）有什么区别？</h3>
      <p>
        普通 for 通过索引访问，能拿到下标、能反向遍历、能在遍历中按下标增删；
        foreach（增强 for）底层是<strong>迭代器</strong>语法糖，写法简洁，但拿不到索引，且遍历中不能直接增删集合。
      </p>
      <CodeBlock lang="java" title="for 与 foreach 及其陷阱" code={forEachSnippet} />
      <table>
        <thead>
          <tr><th>维度</th><th>普通 for</th><th>foreach</th></tr>
        </thead>
        <tbody>
          <tr><td>是否有索引</td><td>有</td><td>无</td></tr>
          <tr><td>底层</td><td>下标访问</td><td>Iterator 迭代</td></tr>
          <tr><td>遍历中删除</td><td>可（注意下标偏移）</td><td>直接删抛 ConcurrentModificationException</td></tr>
          <tr><td>可读性</td><td>一般</td><td>简洁</td></tr>
          <tr><td>适用</td><td>需要索引/反向/边遍历边改</td><td>只读遍历集合或数组</td></tr>
        </tbody>
      </table>
      <Callout variant="warn" title="foreach 删除元素为何抛异常？">
        foreach 编译后用迭代器遍历，集合维护一个 <code>modCount</code> 记录结构性修改次数。
        你直接调 <code>list.remove()</code> 会改 modCount，而迭代器记着旧值，下次取元素时发现对不上，
        就抛 <code>ConcurrentModificationException</code>（快速失败 fail-fast 机制）。
        正确做法是改用 <code>Iterator.remove()</code> 或 <code>removeIf()</code>。
      </Callout>

      <h3>面试题 6：构造方法能被重写、继承、被 final/static 修饰吗？</h3>
      <p>
        构造方法（构造器）是个特殊存在，这道题专考它的边界：
      </p>
      <table>
        <thead>
          <tr><th>问题</th><th>结论</th><th>原因</th></tr>
        </thead>
        <tbody>
          <tr><td>能被继承吗</td><td>不能</td><td>构造器不是普通方法，子类有自己的构造器</td></tr>
          <tr><td>能被重写吗</td><td>不能</td><td>不能继承，自然谈不上重写</td></tr>
          <tr><td>能被重载吗</td><td>能</td><td>同名（类名）不同参数列表，很常见</td></tr>
          <tr><td>能加 static 吗</td><td>不能</td><td>构造器就是为创建实例服务的</td></tr>
          <tr><td>能加 final 吗</td><td>不能</td><td>本就不能被重写，final 无意义</td></tr>
          <tr><td>能加 abstract 吗</td><td>不能</td><td>构造器必须有实现</td></tr>
        </tbody>
      </table>
      <Callout variant="note" title="子类构造一定先调父类构造">
        子类构造器执行前，会先调用父类构造器（默认隐式调 <code>super()</code>，也可显式 <code>super(...)</code>）。
        如果父类没有无参构造器，子类又没显式调有参的，就会编译报错。这保证了「先把父类那部分初始化好，再初始化子类」——
        理解这点能解释很多「为什么父类得加无参构造器」的报错。
      </Callout>

      <Summary
        points={[
          '重载比参数（编译期静态绑定），重写比类型（运行期动态分派）；返回类型不能用来区分重载。',
          '静态方法属于类、无 this、不参与多态；子类同签名静态方法是「隐藏」而非重写，按声明类型静态绑定。',
          'Java 只有值传递：基本类型传数值副本，对象传引用副本——能改对象内容，但重新赋值改不动原引用。',
          'Object 提供 equals/hashCode/toString/getClass/clone/wait/notify/finalize；wait/notify 在 Object 是因为锁加在任意对象上。',
          '普通 for 有索引、可边遍历边按下标改；foreach 是迭代器语法糖，简洁但无索引、直接增删会触发 fail-fast 异常。',
          'foreach 中删元素要用 Iterator.remove() 或 removeIf()，避免 ConcurrentModificationException。',
        ]}
      />
    </article>
  )
}
