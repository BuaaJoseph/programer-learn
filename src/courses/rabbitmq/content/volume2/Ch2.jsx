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

const stateCode = `-- 方案三：状态机判断，用一次条件更新同时完成「判重」和「推进」
-- 只有当前是「待支付」才更新为「已支付」，更新行数=0 说明已处理过
UPDATE orders
SET status = 'PAID', pay_no = 'PAY20260616001', updated_at = NOW()
WHERE order_no = 'ORD1001'
  AND status = 'WAIT_PAY';     -- 关键：把状态当成乐观锁的条件

-- 应用层判断：
-- affectedRows == 1 → 本次推进成功，执行后续业务
-- affectedRows == 0 → 状态已不是待支付（重复消息），直接 ack 丢弃`

const versionCode = `-- 方案四：乐观锁版本号，适合余额、库存这类「带数值变更」的更新
-- 扣款时带上当前 version，重复消息因 version 已变而更新 0 行
UPDATE account
SET balance = balance - 99, version = version + 1
WHERE user_id = 1001
  AND version = 7;            -- 读到的版本号

-- 重复执行时 version 已是 8，条件不满足，更新 0 行，扣款不会再发生`

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
      <p>
        本质上，这三类都源于同一个分布式难题：<strong>「业务处理」和「确认动作」无法绑成一个原子操作</strong>。
        只要这两步之间任意一步崩溃或网络丢包，系统就只能选择「宁可重投不可漏投」（at-least-once），重复因此不可避免。
      </p>

      <h3>为什么不能靠「不重复」，而要靠「幂等」</h3>
      <p>
        分布式系统里，「消息恰好被处理一次」（exactly-once）在工程上极难做到——因为「处理业务」和「回 ack」
        是两个动作，中间任何一个环节崩溃都会导致状态不一致。业界的现实做法是 <em>at-least-once</em>（至少一次）投递
        <strong>加上消费端幂等</strong>，组合出「效果上的恰好一次」。换句话说：把重复当成常态接受，
        然后让代码对重复「免疫」。
      </p>
      <p>
        顺带辨析三种投递语义：<strong>at-most-once</strong>（至多一次，可能丢，autoAck 就是）、
        <strong>at-least-once</strong>（至少一次，可能重，手动 ack + 重试）、<strong>exactly-once</strong>
        （恰好一次，理论理想）。RabbitMQ 默认提供的是 at-least-once，所谓 exactly-once 都是
        「at-least-once 投递 + 消费端幂等」在效果上模拟出来的，没有哪个 MQ 能在端到端真正做到 exactly-once。
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

      <Callout variant="warn" title="别用消息 ID 当唯一键，要用业务键">
        <p>
          一个高频翻车点：拿 RabbitMQ 的 messageId 或自动生成的 UUID 当幂等键。问题在于
          <strong>生产者重发时往往会生成一个新的 messageId</strong>，于是同一笔业务的两条消息 ID 不同，去重失效。
          正确做法是用<strong>业务自身的唯一标识</strong>（支付流水号、订单号），它在重发时保持不变，才挡得住重复。
        </p>
      </Callout>

      <h2>四种常用幂等方案</h2>
      <ul>
        <li><strong>唯一索引</strong>：用业务唯一键建数据库唯一索引，重复插入直接报错，最简单可靠。</li>
        <li><strong>Redis SETNX 去重表</strong>：用唯一键做 key，SETNX 成功才处理；高并发下轻量快速。</li>
        <li><strong>状态机判断</strong>：业务本身有状态流转（待支付 → 已支付），处理前先判断当前状态，已是终态就跳过。</li>
        <li><strong>乐观锁版本号</strong>：更新时带上 version，<code>UPDATE ... WHERE version = ?</code>，
          重复操作因版本不匹配而更新 0 行，自然失效。</li>
      </ul>
      <p>状态机方案的精髓是把「判重」和「推进状态」合并成一条带条件的更新，避免「先查后改」的并发竞态：</p>
      <CodeBlock lang="sql" title="状态机条件更新" code={stateCode} />
      <p>带数值变更（扣款、扣库存）的场景更适合乐观锁版本号，靠版本不匹配天然挡住重复执行：</p>
      <CodeBlock lang="sql" title="乐观锁版本号" code={versionCode} />

      <Callout variant="warn" title="Redis 去重不是绝对安全">
        <p>
          只用 Redis SETNX 做幂等，要小心两点：一是 key 过期后若消息又迟到重投，会被当成新消息；
          二是「SETNX 成功」和「业务处理」之间若进程崩溃，标记已置但业务没做完。所以<strong>强一致场景下，
          最终兜底仍要落在数据库唯一索引或事务上</strong>，Redis 只做前置的快速拦截。
        </p>
      </Callout>

      <h2>方案选型对比</h2>
      <table>
        <thead>
          <tr><th>方案</th><th>一致性</th><th>性能</th><th>适用场景</th></tr>
        </thead>
        <tbody>
          <tr><td>唯一索引</td><td>强</td><td>中</td><td>插入型业务（流水、记录），最终兜底</td></tr>
          <tr><td>Redis SETNX</td><td>弱（可丢标记）</td><td>高</td><td>高并发前置拦截</td></tr>
          <tr><td>状态机</td><td>强</td><td>中</td><td>有明确状态流转的业务</td></tr>
          <tr><td>乐观锁版本号</td><td>强</td><td>中</td><td>余额、库存等数值更新</td></tr>
        </tbody>
      </table>
      <p>
        实战常用<strong>组合拳</strong>：Redis SETNX 做高并发前置拦截（挡掉 99% 的重复），数据库唯一索引/状态机做最终兜底
        （保证那 1% 也不出错）。单用任何一种都有边界，组合才稳。
      </p>

      <h2>面试怎么答 / 实战要点</h2>
      <p>
        被问「怎么避免重复消费」，先纠正问题：“重复挡不住，只能做幂等。” 然后讲三句：重复来自 ack 丢失、
        消费超时重投、生产者重发；解决靠消费端幂等，落地方案是业务唯一键 + 唯一索引兜底，高并发再叠一层 Redis SETNX
        做快速拦截，有状态流转的业务用状态机判断。最后点一句「at-least-once + 幂等 = 效果上的 exactly-once」，
        立刻显出理解深度。
      </p>
      <Callout variant="info" title="高频追问">
        <ul>
          <li>
            <strong>追问：所有操作都需要幂等吗？</strong> 不是。天然幂等的操作（如「把状态置为已支付」「SET 余额=100」）
            不需要额外处理；需要处理的是「累加型」操作（扣款、加积分、发短信）。识别哪些操作非幂等，是第一步。
          </li>
          <li>
            <strong>追问：发短信这种没有数据库的副作用怎么幂等？</strong> 同样用去重表：发之前查「这条短信任务是否发过」，
            发完记一条已发标记，重复消息查到标记就跳过。
          </li>
          <li>
            <strong>误区：以为开了手动 ack 就不会重复。</strong> 恰恰相反，手动 ack + 重试正是重复的主要来源，幂等是它的配套。
          </li>
        </ul>
      </Callout>

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
          怎样靠数据库这一层保证最终的强一致。再换成状态机方案，体会一条带 <code>WHERE status=...</code>
          的更新如何把「判重 + 推进」合并成一个原子动作。
        </p>
      </Practice>

      <Summary
        points={[
          '为了不丢消息开了重试，重复消费就成了必然副产物，根因是「业务处理」与「确认」无法原子化。',
          '重复三大来源：消费端 ack 丢失被重投、消费超时重投、生产端没收到 confirm 而重发。',
          '三种投递语义：at-most-once 会丢、at-least-once 会重、exactly-once 是理想；RabbitMQ 默认 at-least-once。',
          '工程方案是 at-least-once 投递 + 消费端幂等，组合出效果上的 exactly-once。',
          '幂等钥匙是稳定的业务唯一键（支付号/订单号），别用会变的 messageId/UUID。',
          '四种方案：唯一索引、Redis SETNX、状态机条件更新、乐观锁版本号，常用 Redis 前置 + 数据库兜底的组合拳。',
          '天然幂等的操作无需处理，要处理的是扣款/加积分等累加型副作用。',
        ]}
      />
    </>
  )
}
