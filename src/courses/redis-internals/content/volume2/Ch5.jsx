import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import Seckill from '@/courses/redis-internals/illustrations/Seckill.jsx'

const badPseudo = `# 错误示范：读-判断-扣减 三步分开（会超卖）
stock = int(redis.get('seckill:1001'))  # 1. 读库存
if stock > 0:                           # 2. 判断有货
    redis.decr('seckill:1001')          # 3. 扣减
    create_order()
# 并发下：一万个线程几乎同时读到 stock=5，全部通过判断，
# 一起 DECR，库存被扣成负数 → 超卖`

const luaStock = `-- 库存扣减 Lua 脚本：判断 + 扣减 原子完成
-- KEYS[1] = 库存 key   ARGV[1] = 本次购买数量
local stock = tonumber(redis.call('GET', KEYS[1]))
if stock == nil then
    return -1            -- 库存 key 不存在
end
if stock < tonumber(ARGV[1]) then
    return 0             -- 库存不足，扣减失败
end
redis.call('DECRBY', KEYS[1], ARGV[1])
return 1                 -- 扣减成功`

const evalCall = `# 初始化库存
SET seckill:1001 1000

# 每次抢购调用脚本，原子地判断并扣 1 件
EVAL "local s=tonumber(redis.call('GET',KEYS[1])) if s==nil then return -1 end if s<tonumber(ARGV[1]) then return 0 end redis.call('DECRBY',KEYS[1],ARGV[1]) return 1" 1 seckill:1001 1
# 返回 1 = 抢到；返回 0 = 已售罄；返回 -1 = 活动未开始`

export default function Ch5() {
  return (
    <>
      <Lead>
        <p>
          秒杀是 Redis 面试的压轴题：1000 件商品，上万人同一秒来抢，既不能<strong>超卖</strong>（卖出比库存多），
          又得扛住瞬时洪峰。数据库直接顶这种并发必崩，于是核心思路是把扣库存放到 Redis，
          用一段 <em>Lua</em> 脚本把「判断 + 扣减」做成<strong>原子操作</strong>，从根上杜绝超卖。
        </p>
      </Lead>

      <h2>超卖是怎么发生的</h2>
      <p>
        最自然的写法分三步：读库存 → 判断是否大于 0 → 扣减。单线程没问题，但高并发下这三步<strong>不是原子的</strong>，
        会被交错执行。
      </p>

      <Example title="1000 件商品万人抢">
        <p>
          库存只剩 5 件，但有一万个请求几乎同一时刻到来。它们几乎<strong>同时</strong>执行「读库存」，
          全都读到 <code>stock = 5</code>；于是全都通过了「stock &gt; 0」的判断；接着一起执行扣减，
          库存被减成 <strong>负数</strong>，结果远超 5 个人抢到——这就是<strong>超卖</strong>。
        </p>
        <p>
          根因就一句话：<strong>读、判断、扣减三步之间留了缝</strong>，并发请求挤进了这条缝里都读到了「有货」。
        </p>
      </Example>

      <h2>用 Lua 脚本消除那条缝</h2>
      <p>
        Redis 是单线程执行命令的，而且<strong>整段 Lua 脚本会被当成一个不可分割的操作</strong>执行完，
        中途不会插入别的命令。把「判断库存够不够 + 扣减」写进一个 Lua 脚本，
        一万个请求就只能<strong>排队一个个</strong>执行这段脚本：第一个扣到 0 之后，后面的脚本读到库存不足直接返回失败。超卖彻底消失。
      </p>

      <KeyIdea title="为什么 Lua 能保证原子">
        <p>
          因为 Redis 用单线程跑命令，<code>EVAL</code> 提交的脚本期间，服务器<strong>不会处理其它客户端的命令</strong>。
          所以脚本里的「GET 判断」和「DECRBY 扣减」之间不可能被别人插队，等价于把这两步焊成了一步。
          这也是为什么扣库存要写成 Lua，而不是在应用层「先 GET 再 DECR」。
        </p>
      </KeyIdea>

      <Seckill />

      <h2>完整链路：预扣库存 + 异步下单</h2>
      <p>
        光有原子扣减还不够，下单还要写订单、扣真实库存、发优惠券……这些都压到数据库仍会崩。成熟秒杀的套路是：
      </p>
      <ul>
        <li><strong>预扣库存</strong>：抢购请求先用 Lua 在 Redis 里扣减，扣成功才算「抢到资格」，扣失败立刻返回「已售罄」。</li>
        <li>
          <strong>异步下单</strong>：抢到资格后，往消息队列（MQ）丢一条消息就返回，让用户看到「抢购中」；
          后台消费者再<strong>慢慢</strong>把订单落库、扣 DB 库存。Redis 削峰，数据库按自己的节奏处理。
        </li>
      </ul>
      <Callout variant="warn" title="还要配合三件套">
        <p>
          <strong>限流</strong>：网关层就拦掉绝大多数流量（不可能让一万人都打到 Redis），常用令牌桶/漏桶；
          <strong>幂等</strong>：MQ 可能重复投递、用户可能重复点，下单要按订单号或用户+商品去重，避免一个人抢到多份；
          <strong>防超卖</strong>：数据库最终扣减时也要带 <code>WHERE stock &gt; 0</code> 兜底，Redis 与 DB 双保险。
        </p>
      </Callout>

      <Practice title="写一段库存扣减 Lua 脚本">
        <p>
          脚本接收库存 key（KEYS[1]）和购买数量（ARGV[1]），原子地判断库存是否充足，够则扣减并返回成功。
        </p>
        <CodeBlock lang="lua" title="seckill_stock.lua" code={luaStock} />
        <CodeBlock lang="bash" title="用 EVAL 调用" code={evalCall} />
        <p>对照下面这段会超卖的错误写法，体会「把判断和扣减合成一步」到底解决了什么：</p>
        <CodeBlock lang="python" title="反例：三步分开会超卖" code={badPseudo} />
      </Practice>

      <Summary
        points={[
          '超卖的根因是「读库存 → 判断 → 扣减」三步非原子，并发请求都读到有货，一起扣成负数。',
          'Redis 单线程执行命令，整段 Lua 脚本不可被打断，把「判断 + 扣减」写进一个脚本即可原子完成，杜绝超卖。',
          'Lua 脚本里先 GET 判断库存是否充足，够则 DECRBY 并返回成功，不够返回失败，请求自然排队执行。',
          '完整秒杀用「预扣库存 + 异步下单」：Redis 原子扣减抢资格，再经 MQ 异步落库，给数据库削峰。',
          '还要配合限流（网关拦流量）、幂等（按订单号去重防重复下单）、数据库 WHERE stock>0 兜底防超卖。',
          '核心心法：把高并发的关键判定收敛成一个原子操作，并尽量把重活从同步请求里挪到异步链路。',
        ]}
      />
    </>
  )
}
