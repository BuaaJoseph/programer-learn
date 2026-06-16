import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const incrCode = `int i = 0;
i = i++;
// 等价于操作数栈上的执行过程：
// 1) iload   i      把 i 的当前值 0 压入操作数栈
// 2) iinc    i, 1   直接给局部变量表里的 i 加 1，i 变成 1
// 3) istore  i      把栈顶的旧值 0 弹出，写回局部变量表的 i
// 最终 i = 0，而不是 1 —— 经典面试坑`

const sofCode = `// 运行参数：-Xss256k
// 递归没有出口，每调用一次就压入一个栈帧，永不返回
public class Recursion {
    private static int depth = 0;

    static void dive() {
        depth++;
        dive(); // 自己调自己，栈帧只进不出
    }

    public static void main(String[] args) {
        try {
            dive();
        } catch (StackOverflowError e) {
            System.out.println("栈溢出时的递归深度：" + depth);
        }
    }
}
// -Xss 越小，能压入的栈帧越少，打印出的 depth 越小`

export default function Ch3() {
  return (
    <>
      <Lead>
        <p>
          第一章说虚拟机栈是线程私有的，第二章说方法调用会「压栈帧、弹栈帧」。这一章就把这个最小执行单元——
          <em>栈帧</em>（stack frame）拆开看：它由哪几部分组成、一次方法调用在栈上怎么进出、
          为什么递归太深会 <em>StackOverflowError</em> 而线程太多会 <em>OutOfMemoryError</em>。
          把栈帧搞透，你就真正理解了「Java 方法是怎么跑起来的」。
        </p>
      </Lead>

      <h2>虚拟机栈与栈帧的关系</h2>
      <p>
        每个线程有一个自己的虚拟机栈，这个栈里装的就是一个个<em>栈帧</em>。
        线程每调用一个方法，就为它创建一个栈帧压入栈顶；方法执行完毕（正常返回或抛异常），这个栈帧就出栈销毁。
        正在执行的那个方法对应的栈帧，永远在栈顶，叫<em>当前栈帧</em>（current frame）。
        所以一个线程的调用链有多深，它的虚拟机栈里就叠了多少个栈帧。
      </p>

      <h3>栈帧的四个组成部分</h3>
      <ul>
        <li>
          <strong>局部变量表</strong>（local variable table）：存方法的参数和方法内定义的局部变量。
          它以「槽」（slot）为单位，一个 slot 放一个 <code>int</code>、<code>float</code>、引用等，
          <code>long</code> 和 <code>double</code> 占两个 slot。表的大小在编译期就确定了。
        </li>
        <li>
          <strong>操作数栈</strong>（operand stack）：一个后进先出的工作区，字节码指令就是在这里取操作数、做运算、放结果。
          比如做加法，就是把两个数压栈、执行 <code>iadd</code> 弹出两个、把和压回去。
        </li>
        <li>
          <strong>动态链接</strong>（dynamic linking）：指向运行时常量池里该方法的引用，
          用于把字节码里的「符号引用」（方法名等）在运行期转换成实际的「直接引用」（内存地址），支撑方法的动态调用。
        </li>
        <li>
          <strong>方法返回地址</strong>（return address）：记录方法返回后，调用者应当从哪条指令继续执行，
          相当于「执行完这个方法，回到哪里」的书签。
        </li>
      </ul>

      <Example title="i = i++ 为什么不自增：操作数栈视角">
        <p>
          这道经典面试题，用操作数栈和局部变量表的配合就能讲清。<code>i = i++</code> 编译后大致是三步：
          先把 <code>i</code> 的旧值压入操作数栈，再直接对局部变量表里的 <code>i</code> 做自增，
          最后把栈顶那个「旧值」写回 <code>i</code>，于是自增的结果被旧值覆盖了。
        </p>
        <CodeBlock lang="java" title="i = i++ 的字节码语义" code={incrCode} />
        <p>
          关键在于：<code>i++</code> 是「先取值后自增」，取出的旧值被暂存在操作数栈上，
          而 <code>istore</code> 又把这个旧值写了回去，所以最终 <code>i</code> 还是 0。
          这正说明了局部变量表和操作数栈是两个独立的位置，值在它们之间来回搬动。
        </p>
      </Example>

      <KeyIdea title="一次调用 = 压栈帧，一次返回 = 弹栈帧">
        <p>
          把方法调用想象成叠盘子：调用 <code>a()</code>，压入 a 的栈帧；a 里调用 <code>b()</code>，再压入 b 的栈帧；
          b 返回，弹出 b 的栈帧，控制权（靠方法返回地址）回到 a；a 返回，弹出 a 的栈帧。
          整个过程严格后进先出。理解了这一点，就能解释为什么<strong>局部变量天生线程安全</strong>——
          它们活在各自线程私有的栈帧里，别的线程根本碰不到。
        </p>
      </KeyIdea>

      <h2>两种栈相关的错误：SOF 还是 OOM</h2>
      <p>
        虚拟机栈会抛两种不同的错误，面试常拿来对比。
        第一种是 <em>StackOverflowError</em>：单个线程请求的栈深度超过了允许的最大深度。
        最典型的诱因就是<strong>没有终止条件的递归</strong>——栈帧只压不弹，很快把这一个线程的栈空间叠满。
        第二种是 <em>OutOfMemoryError</em>：当虚拟机栈允许动态扩展、却无法再申请到足够内存时抛出，
        实践中更常见的触发方式是<strong>创建大量线程</strong>——每个线程都要分配一块栈空间，线程太多就把内存耗尽了。
      </p>
      <Callout variant="warn" title="想缓解线程太多的 OOM，别盲目调大 -Xss">
        <p>
          这里有个反直觉的点：当 OOM 是「线程太多」导致的，<strong>调小</strong> <code>-Xss</code>（每个线程栈更小）
          反而能容纳更多线程；而调大 <code>-Xss</code> 会让每个线程更费内存，能创建的线程数变少。
          <code>-Xss</code> 调大是用来缓解「单线程递归太深的 StackOverflowError」的，两个场景别搞反。
        </p>
      </Callout>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问「栈帧由什么组成」，答「局部变量表、操作数栈、动态链接、方法返回地址」四部分，能各说一句作用更佳。
        被问「StackOverflowError 和 OOM 的区别」，答「前者是单线程栈太深（常因递归无出口），
        后者常因线程太多耗尽内存」，并补一句「<code>-Xss</code> 调大治递归深、调小反而能开更多线程」。
        被问「为什么局部变量不用考虑线程安全」，答「它们存在线程私有的栈帧的局部变量表里，不被共享」。
      </p>

      <Practice title="复现栈溢出并观察 -Xss 的影响">
        <p>
          写一个没有出口的递归就能稳定复现 <em>StackOverflowError</em>。
          在 <code>catch</code> 里打印出溢出时的递归深度，再配合不同的 <code>-Xss</code> 反复运行，
          就能直观看到「栈越小、能叠的栈帧越少、深度越浅」。
        </p>
        <CodeBlock lang="java" title="Recursion.java（配 -Xss256k）" code={sofCode} />
        <p>
          先用默认参数跑一次记下深度，再加 <code>-Xss256k</code> 跑，深度会明显变小；
          换成 <code>-Xss1m</code> 深度又会回升。如果在 <code>dive</code> 里多声明几个局部变量，
          每个栈帧变大，相同 <code>-Xss</code> 下溢出深度也会变浅——这正好印证了栈帧大小和栈容量的关系。
        </p>
      </Practice>

      <Summary
        points={[
          '虚拟机栈由栈帧组成，每个线程一个栈；正在执行的方法对应栈顶的当前栈帧。',
          '栈帧四部分：局部变量表、操作数栈、动态链接、方法返回地址。',
          '一次方法调用即压入一个栈帧，一次返回即弹出一个栈帧，严格后进先出。',
          'i = i++ 不自增，是因为旧值先被压上操作数栈，最后又写回覆盖了自增结果。',
          'StackOverflowError 多因单线程递归太深；OutOfMemoryError 多因线程太多耗尽内存。',
          '-Xss 调大缓解递归深的栈溢出，调小反而能创建更多线程，两个场景别用反。',
        ]}
      />
    </>
  )
}
