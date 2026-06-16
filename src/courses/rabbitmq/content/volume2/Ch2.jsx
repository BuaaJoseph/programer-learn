import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import Idempotent from '@/courses/rabbitmq/illustrations/Idempotent.jsx'

const indexCode = `-- 方案一：业务唯一键 + 唯一索引（最朴素也最可靠）
-- 用消息里的业务唯一号建唯一索引，重复插入会直接报错
CREATE TABLE pay_record (
    id        BIGINT PRIMARY KEY AUTO_INCREMENT,
    pay_no    VARCHAR(64) NOT NULL,    -- 支付流水号，全局唯一
    order_no  VARCHAR(64) NOT NULL,
    amount    DECIMAL(10,2) NOT NULL,
    UNIQUE KEY uk_pay_no (pay_no)      -- 唯一索引兜底
);

-- 消费回调时：先插入，靠唯一索引挡住重复
INSERT INTO pay_record (pay_no, order_no, amount)
VALUES ('PAY20260616001', 'ORD1001', 99.00);
-- 若抛 DuplicateKeyException，说明这条已处理过，直接 ack 丢弃即可`

const redisCode = `// 方案二：Redis SETNX 做去重表，适合高并发、轻量场景
public void onPayCallback(PayMessage msg) {
    String key = "idem:pay:" + msg.getPayNo();
    // setIfAbsent = SET key value NX EX 600
    Boolean first = redis.opsForValue()
            .setIfAbsent(key, "1", Duration.ofMinutes(10));
    if (Boolean.FALSE.equals(first)) {
        // 已经处理过，直接返回，不再扣款
        return;
    }
    try {
        doPay(msg);        // 真正的扣款 / 入账业务
    } catch (Exception e) {
        redis.delete(key); // 处理失败要删掉标记，允许重试
        throw e;
    }
}`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          上一节为了不丢消息，开了重试、手动 ack——代价是同一条消息<strong>可能被投递多次</strong>。
          于是面试官紧接着会问：“怎么保证不重复消费？” 这里有个认知陷阱：你<strong>挡不住</strong>重复，
          只能让重复消费<strong>不产生副作用</strong>，这就叫<em>幂等</em>（idempotent）。
        </p>
      </Lead>

      <h2>重复消费是从哪来的</h2>
      <p>
        重复几乎是「保证不丢」的必然副产物，常见来源有三类：
      </p>
      <ul>
        <li><strong>ack 丢失</strong>：消费者处理成功了，但回给 broker 的 ack 在网络中丢了，broker 以为没消费，于是重投。</li>
        <li><strong>消费超时重投</strong>：业务处理太慢，超过了消费超时或消费者断连，broker 把消息重新分给别人。</li>
        <li><strong>生产者重发</strong>：生产端没收到 confirm 回执，以为没发成功，又发了一遍（其实第一条已经到了）。</li>
      </ul>

      <h3>为什么不能靠「不重复」，而要靠「幂等」</h3>
      <p>
        分布式系统里，「消息恰好被处理一次」（exactly-once）在工程上极难做到——因为「处理业务」和「回 ack」
        是两个动作，中间任何一个环节崩溃都会导致状态不一致。业界的现实做法是 <em>at-least-once</em>（至少一次）投递
        <strong>加上消费端幂等</strong>，组合出「效果上的恰好一次」。换句话说：把重复当成常态接受，
        然后让代码对重复「免疫」。
      </p>

      <Example title="支付回调被投两次，不能扣两次款">
        <p>
          第三方支付成功后，回调消息「订单 1001 已支付 99 元」进了队列。由于 ack 丢失，这条消息被投了两次。
          如果你的回调代码每收到一次就「账户余额 - 99」，用户就被扣了 198 元——这就是非幂等的灾难。
        </p>
        <p>
          幂等的写法是：先看支付流水号 <code>PAY...001</code> 是否已处理过，处理过就直接忽略。无论这条消息来几次，
          扣款都只发生一次。<strong>幂等的本质，就是「同一个操作执行一次和执行多次，结果完全一样」。</strong>
        </p>
      </Example>

      <Idempotent />

      <KeyIdea title="幂等的钥匙是「业务唯一键」">
        <p>
          所有幂等方案的核心，都是先找到一个能唯一标识「这次业务」的键——支付流水号、订单号、消息 ID 等。
          有了它，去重就有了抓手：插数据库靠它建唯一索引、进 Redis 靠它做 SETNX、查状态靠它定位记录。
          <strong>没有稳定的业务唯一键，幂等就无从谈起。</strong>
        </p>
      </KeyIdea>

      <h2>四种常用幂等方案</h2>
      <ul>
        <li><strong>唯一索引</strong>：用业务唯一键建数据库唯一索引，重复插入直接报错，最简单可靠。</li>
        <li><strong>Redis SETNX 去重表</strong>：用唯一键做 key，SETNX 成功才处理；高并发下轻量快速。</li>
        <li><strong>状态机判断</strong>：业务本身有状态流转（待支付 → 已支付），处理前先判断当前状态，已是终态就跳过。</li>
        <li><strong>乐观锁版本号</strong>：更新时带上 version，<code>UPDATE ... WHERE version = ?</code>，
          重复操作因版本不匹配而更新 0 行，自然失效。</li>
      </ul>

      <Callout variant="warn" title="Redis 去重不是绝对安全">
        <p>
          只用 Redis SETNX 做幂等，要小心两点：一是 key 过期后若消息又迟到重投，会被当成新消息；
          二是「SETNX 成功」和「业务处理」之间若进程崩溃，标记已置但业务没做完。所以<strong>强一致场景下，
          最终兜底仍要落在数据库唯一索引或事务上</strong>，Redis 只做前置的快速拦截。
        </p>
      </Callout>

      <h2>面试怎么答 / 实战要点</h2>
      <p>
        被问「怎么避免重复消费」，先纠正问题：“重复挡不住，只能做幂等。” 然后讲三句：重复来自 ack 丢失、
        消费超时重投、生产者重发；解决靠消费端幂等，落地方案是业务唯一键 + 唯一索引兜底，高并发再叠一层 Redis SETNX
        做快速拦截，有状态流转的业务用状态机判断。最后点一句「at-least-once + 幂等 = 效果上的 exactly-once」，
        立刻显出理解深度。
      </p>

      <Practice title="给支付回调加上幂等">
        <p>
          以「支付回调可能被投多次」为场景，分别用数据库唯一索引和 Redis SETNX 实现幂等，
          再用同一条消息连发两次，验证扣款只发生一次。
        </p>
        <CodeBlock lang="sql" title="idempotent_unique_index.sql" code={indexCode} />
        <p>高并发场景下用 Redis SETNX 做前置去重：</p>
        <CodeBlock lang="java" title="PayCallbackHandler.java" code={redisCode} />
        <p>
          进阶：把「SETNX 拦截」和「数据库唯一索引兜底」组合起来，思考 Redis 标记已置但业务未完成时，
          怎样靠数据库这一层保证最终的强一致。
        </p>
      </Practice>

      <Summary
        points={[
          '为了不丢消息开了重试，重复消费就成了必然副产物，必须正面解决。',
          '重复三大来源：消费端 ack 丢失被重投、消费超时重投、生产端没收到 confirm 而重发。',
          '工程上做不到真正 exactly-once，现实方案是 at-least-once 投递 + 消费端幂等。',
          '幂等的本质是「执行一次和执行多次结果一样」，钥匙是稳定的业务唯一键。',
          '四种方案：唯一索引、Redis SETNX 去重表、状态机判断、乐观锁版本号，按一致性和并发取舍。',
          '强一致场景以数据库唯一索引/事务兜底，Redis 只做前置快速拦截。',
        ]}
      />
    </>
  )
}
