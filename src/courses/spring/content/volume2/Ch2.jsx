import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const selfInvokeCode = `@Service
class OrderService {

    public void createOrder() {
        // 同类内部直接调 this.saveLog()，走的是原始对象、不是代理对象，
        // @Transactional 完全不生效！
        saveLog();
    }

    @Transactional
    public void saveLog() {
        // 这里的事务注解被「绕过」了
        logMapper.insert(new Log());
        throw new RuntimeException("出错也不会回滚");
    }
}`

const requiresNewCode = `@Service
class OrderService {
    @Autowired
    private LogService logService;

    @Transactional   // 默认 REQUIRED：加入当前事务
    public void createOrder() {
        orderMapper.insert(order);
        try {
            logService.writeLog();   // 内部开了独立事务
        } catch (Exception e) {
            // 即使写日志失败，订单事务也不被它牵连
        }
        // 这里抛异常，order 会回滚，但上面已提交的日志不受影响
    }
}

@Service
class LogService {
    // REQUIRES_NEW：挂起外层事务，开一个全新的独立事务，独立提交/回滚
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void writeLog() {
        logMapper.insert(new Log());
    }
}`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          声明式事务用起来只是一个 <code>@Transactional</code> 注解，但面试官真正想考的是它背后的两件事：
          <em>propagation</em>（传播行为）决定「方法之间事务怎么组合」，而<strong>事务失效场景</strong>则是踩坑重灾区——
          很多人写了注解却发现根本没回滚。这一章把传播行为讲透，再把失效的坑一次性列清。
        </p>
      </Lead>

      <h2>声明式事务的本质：AOP 代理</h2>
      <p>
        <code>@Transactional</code> 之所以能「自动开启、自动提交、出错回滚」，靠的是 Spring AOP：
        容器为你的 Bean 生成一个<strong>代理对象</strong>，调用被注解的方法时，代理会先开启事务，方法正常返回则提交、
        抛异常则回滚。理解这一点是后面所有「失效场景」的钥匙——<strong>只有走代理的调用，事务才生效</strong>。
      </p>

      <h3>七种传播行为</h3>
      <p>
        <em>propagation</em> 描述「当前方法的事务该如何与调用它的外层事务协作」，共七种，最常考的是前三种：
      </p>
      <ul>
        <li><strong>REQUIRED（默认）</strong>：外层有事务就加入，没有就新建。两者同生共死，任一回滚则全部回滚。</li>
        <li><strong>REQUIRES_NEW</strong>：无论外层有没有事务，都<em>挂起</em>外层、开一个全新的独立事务，独立提交、独立回滚，互不牵连。</li>
        <li><strong>NESTED</strong>：在外层事务里开一个<em>嵌套事务</em>（基于 savepoint）。内层回滚只回到 savepoint，不影响外层；但外层回滚会带着内层一起回。</li>
        <li><strong>SUPPORTS</strong>：有事务就用，没有就以非事务方式运行。</li>
        <li><strong>NOT_SUPPORTED</strong>：以非事务方式运行，有事务则挂起。</li>
        <li><strong>MANDATORY</strong>：必须在已有事务中运行，否则抛异常。</li>
        <li><strong>NEVER</strong>：必须在非事务中运行，存在事务则抛异常。</li>
      </ul>
      <p>
        一句话记 REQUIRES_NEW 与 NESTED 的区别：前者是<strong>两个完全独立</strong>的事务（外层回滚不影响已提交的内层）；
        后者是<strong>父子关系</strong>（外层回滚会连内层一起回，内层回滚只回到 savepoint）。
      </p>

      <h3>隔离级别</h3>
      <p>
        <em>isolation</em> 控制并发事务间的可见性，对应数据库的四个标准级别：
        <code>READ_UNCOMMITTED</code>（脏读）、<code>READ_COMMITTED</code>（解决脏读）、
        <code>REPEATABLE_READ</code>（解决不可重复读，MySQL 默认）、<code>SERIALIZABLE</code>（最严、解决幻读但性能最差）。
        Spring 默认用 <code>DEFAULT</code>，即跟随底层数据库的隔离级别。
      </p>

      <Example title="内部方法调用导致事务不生效">
        <p>
          下面这段代码是最经典的「事务莫名不回滚」：<code>createOrder()</code> 内部直接调用了同类的
          <code>saveLog()</code>。由于是 <code>this.saveLog()</code>，走的是<strong>原始对象</strong>而非代理对象，
          代理织入的事务逻辑被整个绕开，<code>@Transactional</code> 形同虚设。
        </p>
        <CodeBlock lang="java" title="同类自调用，事务失效" code={selfInvokeCode} />
        <p>
          解法：把方法拆到另一个 Bean 里调用，或注入自身代理（<code>AopContext.currentProxy()</code> 或自注入），
          让调用重新经过代理。
        </p>
      </Example>

      <KeyIdea title="默认只回滚运行时异常">
        <p>
          Spring 的默认回滚策略只覆盖 <em>RuntimeException</em> 和 <em>Error</em>。
          也就是说，如果你的方法抛的是<strong>受检异常</strong>（checked exception，如 <code>IOException</code>、
          <code>SQLException</code>），事务<strong>不会回滚</strong>，数据照样提交。想让受检异常也回滚，
          必须显式声明 <code>@Transactional(rollbackFor = Exception.class)</code>。这是最隐蔽的失效场景之一，
          因为代码没报错、注解也在，数据却悄悄落库了。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="事务失效的经典场景清单">
        <p>记住这一串，面试和排错都够用：</p>
        <ul>
          <li><strong>方法非 public</strong>：Spring 默认只对 public 方法织入事务，private 或 protected 不生效。</li>
          <li><strong>同类内部自调用</strong>：<code>this.method()</code> 不走代理，事务被绕过（上面的例子）。</li>
          <li><strong>异常被 catch 吞掉</strong>：方法内 try-catch 后没有重新抛出，代理感知不到异常，自然不回滚。</li>
          <li><strong>抛检查异常</strong>：默认只对运行时异常回滚，受检异常需配置 <code>rollbackFor = Exception.class</code>。</li>
          <li><strong>多线程</strong>：事务靠 ThreadLocal 绑定连接，新开线程拿不到同一个连接，事务不共享。</li>
          <li><strong>数据库引擎不支持</strong>：如 MySQL 用 MyISAM 引擎本身不支持事务，注解再多也没用（须用 InnoDB）。</li>
          <li><strong>Bean 没被 Spring 管理</strong>：自己 new 出来的对象不是代理，注解无效。</li>
        </ul>
      </Callout>

      <h2>实战 / 面试怎么答</h2>
      <p>
        先点出根：「声明式事务靠 <strong>AOP 代理</strong>，所以一切让调用<em>不经过代理</em>或让代理<em>感知不到异常</em>的情况，都会导致失效。」
        然后分两条线展开：传播行为重点讲清 REQUIRED / REQUIRES_NEW / NESTED 的区别；失效场景按上面的清单逐条列出，
        每条都能补一句「为什么」。能讲出「ThreadLocal 绑连接、默认只回滚运行时异常需 <code>rollbackFor</code>」这种细节，会显得很扎实。
      </p>

      <Practice title="REQUIRES_NEW 示例 + 失效场景自测">
        <p>
          用 REQUIRES_NEW 实现「主业务回滚、日志照样落库」：外层订单事务失败时，内层日志事务因为独立提交而不受影响。
        </p>
        <CodeBlock lang="java" title="OrderService.java" code={requiresNewCode} />
        <p>动手把下面每条失效场景都复现一遍，亲眼确认「没回滚」：</p>
        <ul>
          <li>把 <code>@Transactional</code> 方法改成 <code>private</code>，观察不再回滚。</li>
          <li>同类里用 <code>this.xxx()</code> 调用带事务的方法，确认失效。</li>
          <li>方法内 try-catch 吞掉异常，确认数据已提交。</li>
          <li>抛一个受检异常（如 <code>IOException</code>），确认默认不回滚，再加 <code>rollbackFor = Exception.class</code> 后回滚。</li>
        </ul>
      </Practice>

      <Summary
        points={[
          '声明式事务的本质是 AOP 代理：只有经过代理的调用，@Transactional 才生效。',
          '七种传播行为重点记三种：REQUIRED 加入当前事务，REQUIRES_NEW 挂起外层开独立事务，NESTED 基于 savepoint 的嵌套事务。',
          'REQUIRES_NEW 是两个独立事务互不牵连；NESTED 是父子关系，外层回滚会连带内层。',
          '隔离级别对应数据库四级，默认 DEFAULT 跟随数据库（MySQL InnoDB 默认 REPEATABLE_READ）。',
          '失效场景：非 public、同类自调用、异常被吞、抛检查异常未配 rollbackFor、多线程、引擎不支持、Bean 未被管理。',
          '面试落点：先讲清「靠代理」这个根，再用它推导每一种失效原因，最后给出对应解法。',
        ]}
      />
    </>
  )
}
