import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const hierarchySnippet = `Throwable
├── Error                 // 严重错误，程序通常无法恢复，不该 catch
│   ├── OutOfMemoryError
│   └── StackOverflowError
└── Exception
    ├── RuntimeException   // 运行时异常（非受检 unchecked）
    │   ├── NullPointerException
    │   ├── IndexOutOfBoundsException
    │   └── IllegalArgumentException
    └── 其它 Exception      // 受检异常（checked），必须处理或声明
        ├── IOException
        └── SQLException`

const checkedSnippet = `// 受检异常（checked）：编译器强制处理——要么 try-catch，要么 throws 声明
void read() throws IOException {        // 必须声明
    Files.readString(Path.of("a.txt")); // 可能抛 IOException
}

// 运行时异常（unchecked）：编译器不强制，通常是编程 bug
int divide(int a, int b) {
    return a / b;                       // b==0 抛 ArithmeticException，无需声明
}`

const finallySnippet = `// finally 一定执行（即使 try/catch 里 return）
int test() {
    try {
        return 1;
    } finally {
        System.out.println("finally 总会执行");
        // 注意：别在 finally 里 return，会吞掉 try 的返回值/异常
    }
}

// try-with-resources：自动关闭资源，等价于 finally 里 close，更安全
try (var in = Files.newInputStream(Path.of("a.txt"))) {
    in.read();
}   // 退出时自动调用 in.close()`

const threeFinalSnippet = `// 三个长得像但毫不相关的关键字
final int X = 1;            // final：变量不可重新赋值 / 方法不可重写 / 类不可继承

try {
    risky();
} finally {                 // finally：异常处理块，无论是否异常都执行
    cleanup();
}

@Override
protected void finalize() { // finalize：对象被回收前的回调（已废弃，别用）
}`

export default function Ch1() {
  return (
    <article>
      <Lead>
        异常处理是写出健壮代码的基本功，也是面试高频区。本章讲清 Exception 与 Error 的分界、
        运行时异常与编译时（受检）异常怎么区分、try-catch-finally 的执行规律，
        以及 <code>final</code>、<code>finally</code>、<code>finalize</code> 这三个名字像、含义却毫不相干的关键字。
      </Lead>

      <h2>一、异常体系</h2>
      <KeyIdea>
        Java 异常的根是 <code>Throwable</code>，下分两支：<strong>Error</strong>（严重错误，程序一般无法也不该恢复，
        如内存溢出）和 <strong>Exception</strong>（可处理的异常）。Exception 又分<strong>运行时异常（unchecked）</strong>
        和<strong>受检异常（checked）</strong>。理清这棵树，异常的题基本都能答。
      </KeyIdea>
      <CodeBlock lang="text" title="异常类层次" code={hierarchySnippet} />

      <h3>面试题 1：Exception 和 Error 有什么区别？</h3>
      <table>
        <thead>
          <tr><th>维度</th><th>Error</th><th>Exception</th></tr>
        </thead>
        <tbody>
          <tr><td>性质</td><td>JVM 层面的严重问题</td><td>程序层面可预料/可处理的问题</td></tr>
          <tr><td>能否恢复</td><td>通常不能，不该 catch</td><td>可以捕获并处理</td></tr>
          <tr><td>典型</td><td>OutOfMemoryError、StackOverflowError</td><td>IOException、NullPointerException</td></tr>
          <tr><td>来源</td><td>资源耗尽、JVM 内部错误</td><td>业务逻辑、外部 IO、编程 bug</td></tr>
        </tbody>
      </table>
      <p>
        一句话：<strong>Error 是「天塌了」，Exception 是「出岔子但能救」</strong>。
        Error 多由 JVM 抛出，捕获它通常没意义（内存都没了，catch 里也干不了什么）；
        Exception 才是日常要处理的对象。
      </p>
      <Callout variant="note" title="为什么不该 catch Error？">
        Error 表示系统已处于无法正常运行的状态（如堆内存耗尽）。即便 catch 住，程序大概率也无法继续可靠工作，
        强行恢复反而可能掩盖问题、造成数据错乱。正确做法是让它向上抛出、让进程失败并被监控告警，而不是吞掉。
      </Callout>

      <h2>二、受检 vs 运行时异常</h2>
      <h3>面试题 2：编译时异常（受检）和运行时异常有什么区别？</h3>
      <p>
        分界标准是：是否继承自 <code>RuntimeException</code>。<strong>运行时异常（unchecked）</strong>继承
        <code>RuntimeException</code>，编译器<strong>不强制</strong>处理；<strong>受检异常（checked）</strong>
        是 Exception 下非 RuntimeException 的那些，编译器<strong>强制</strong>你要么 try-catch、要么用 <code>throws</code> 声明。
      </p>
      <CodeBlock lang="java" title="受检与运行时异常的处理差异" code={checkedSnippet} />
      <table>
        <thead>
          <tr><th>维度</th><th>受检异常 checked</th><th>运行时异常 unchecked</th></tr>
        </thead>
        <tbody>
          <tr><td>继承</td><td>Exception（非 RuntimeException）</td><td>RuntimeException</td></tr>
          <tr><td>编译器</td><td>强制处理或声明</td><td>不强制</td></tr>
          <tr><td>语义</td><td>可预料的外部异常（IO、网络）</td><td>多为编程 bug（空指针、越界）</td></tr>
          <tr><td>典型</td><td>IOException、SQLException</td><td>NPE、IndexOutOfBounds、IllegalArgument</td></tr>
        </tbody>
      </table>
      <Callout variant="tip" title="设计取舍：受检异常用得越来越少">
        受检异常的初衷是「逼调用方处理可恢复的外部错误」，但实践中它常导致一堆样板 try-catch 或
        到处 throws 污染签名。现代框架（如 Spring）倾向把受检异常包成运行时异常往上抛，
        让业务代码更干净。面试能讲出这个权衡是加分项。
      </Callout>

      <h2>三、try-catch-finally</h2>
      <h3>面试题 3：finally 一定会执行吗？</h3>
      <p>
        <strong>几乎一定执行</strong>：无论 try 块是正常结束、抛异常、还是里面有 <code>return</code>，
        finally 都会在方法真正返回前执行。唯一的例外是：try/finally 执行前 JVM 退出了（如 <code>System.exit()</code>）、
        线程被杀死、或机器断电。
      </p>
      <CodeBlock lang="java" title="finally 的执行规律与资源关闭" code={finallySnippet} />
      <Callout variant="warn" title="易错点：别在 finally 里 return 或抛异常">
        如果 finally 里有 <code>return</code>，它会<strong>覆盖</strong> try 块里的返回值；
        如果 finally 里抛异常，会<strong>吞掉</strong> try 块原本要抛的异常。这两种写法都会让真正的结果/错误丢失，
        极难排查。finally 应只做清理（关流、释放锁），不要改变控制流。
      </Callout>
      <Callout variant="tip" title="优先用 try-with-resources">
        手写 finally 里 close 容易漏、容易写错。实现了 <code>AutoCloseable</code> 的资源应放进
        try-with-resources，JVM 会自动按声明的逆序关闭，且能正确处理 close 时的异常（变成被抑制异常），比手写 finally 更安全。
      </Callout>

      <h2>四、final、finally、finalize</h2>
      <h3>面试题 4：final、finally、finalize 有什么区别？</h3>
      <p>这三个名字像，但毫不相干，是经典的「看你是否真懂」的题：</p>
      <CodeBlock lang="java" title="三个关键字各司其职" code={threeFinalSnippet} />
      <table>
        <thead>
          <tr><th>关键字</th><th>是什么</th><th>作用</th></tr>
        </thead>
        <tbody>
          <tr><td><code>final</code></td><td>修饰符</td><td>变量不可重新赋值、方法不可重写、类不可继承</td></tr>
          <tr><td><code>finally</code></td><td>异常处理块</td><td>无论是否异常都执行，用于资源清理</td></tr>
          <tr><td><code>finalize</code></td><td>Object 的方法</td><td>对象被 GC 回收前的回调（已废弃，禁止依赖）</td></tr>
        </tbody>
      </table>
      <Example title="为什么 finalize 被废弃？">
        <p>
          <code>finalize</code> 的执行时机完全不确定（取决于 GC 何时回收，甚至可能永远不执行），
          还会拖慢回收、可能让对象「复活」，问题一大堆。所以它从 JDK 9 起被标记为废弃。
          需要在对象生命周期结束时清理资源，正确做法是实现 <code>AutoCloseable</code> + try-with-resources，
          或用 <code>java.lang.ref.Cleaner</code>，绝不要依赖 finalize。
        </p>
      </Example>
      <Callout variant="note" title="final 的三种用法别只记一种">
        被问 final 时，把「变量、方法、类」三种用法都说全：修饰变量是常量/不可重新赋值，
        修饰方法是禁止子类重写，修饰类是禁止被继承（如 String）。再补一句「final 修饰引用时，
        只锁引用不锁对象内容」，就很完整了。
      </Callout>

      <h3>面试题 5：自定义异常应该继承谁？受检还是非受检？</h3>
      <p>
        实践中常需要定义业务异常（如 <code>OrderNotFoundException</code>）。该继承哪个，取决于你想要哪种语义：
      </p>
      <table>
        <thead>
          <tr><th>继承</th><th>类型</th><th>适用</th></tr>
        </thead>
        <tbody>
          <tr><td><code>extends Exception</code></td><td>受检异常</td><td>调用方「必须」处理的可恢复错误</td></tr>
          <tr><td><code>extends RuntimeException</code></td><td>非受检异常</td><td>业务校验失败等，不想强制处理</td></tr>
        </tbody>
      </table>
      <p>
        现代 Web 开发里，自定义业务异常<strong>多继承 RuntimeException</strong>：一方面避免到处 throws 污染方法签名，
        另一方面配合全局异常处理器（如 Spring 的 <code>@ControllerAdvice</code>）统一捕获、转成友好的错误响应。
      </p>
      <Callout variant="tip" title="抛异常的最佳实践">
        ① 抛<strong>具体</strong>的异常类型，别一律抛 <code>Exception</code>；
        ② 异常信息要<strong>带上下文</strong>（哪个订单、哪个参数），方便排查；
        ③ 包装异常时用「<strong>异常链</strong>」（<code>throw new XxxException(msg, cause)</code>）保留原始原因，别把 cause 丢了；
        ④ 不要用异常控制正常业务流程（异常开销大且语义混乱）。
      </Callout>

      <h3>面试题 6：try-catch 会影响性能吗？异常的开销在哪？</h3>
      <p>
        关键结论：<strong>「正常路径」上的 try-catch 几乎没有开销</strong>——只要不真的抛异常，
        进入 try 块基本是零成本。真正的开销在<strong>异常被抛出时</strong>，尤其是构造异常对象时要
        <strong>填充调用栈轨迹（stack trace）</strong>，这一步相对昂贵。
      </p>
      <ul>
        <li>没异常发生时：try-catch 对性能影响可忽略，放心用。</li>
        <li>异常抛出时：抓栈轨迹是主要成本，所以别把异常当流程控制在热点循环里反复抛。</li>
        <li>优化手段：高频场景可重写 <code>fillInStackTrace</code> 或用不带栈的异常，省去抓栈开销。</li>
      </ul>
      <Callout variant="warn" title="反模式：用异常做流程控制">
        有人用「抛异常 + catch」来代替正常的条件判断（比如用异常判断循环结束）。这既<strong>语义混乱</strong>
        （异常应表示「意外」），又<strong>性能差</strong>（每次抛都抓栈）。正常能用 if/返回值表达的分支，
        就不要用异常——异常是给「真正异常的情况」准备的。
      </Callout>

      <Summary
        points={[
          'Throwable 下分 Error（JVM 严重错误，不该 catch）和 Exception（可处理）；Exception 再分运行时异常和受检异常。',
          'Error 是「天塌了」无法恢复，Exception 是「出岔子但能救」；catch Error 通常无意义，应让进程失败并告警。',
          '受检异常（继承 Exception 非 RuntimeException）编译器强制处理或 throws 声明；运行时异常（继承 RuntimeException）不强制，多为编程 bug。',
          'finally 几乎一定执行（除非 System.exit/线程死亡/断电）；别在 finally 里 return 或抛异常，会覆盖/吞掉 try 的结果。',
          '优先用 try-with-resources 自动关闭 AutoCloseable 资源，比手写 finally close 更安全。',
          'final（修饰符：变量/方法/类）、finally（异常清理块）、finalize（已废弃的 GC 回调）三者毫不相关；资源清理用 AutoCloseable/Cleaner，别用 finalize。',
        ]}
      />
    </article>
  )
}
