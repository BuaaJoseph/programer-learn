import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const fourLevelsCode = `# 四级办法，担保强度从弱到强
# 同一个需求：抽取出 name 和 age

# 1) 仅在 prompt 里要求 JSON —— 最弱，可能多出解释、用错引号、字段缺失
prompt = '抽取姓名和年龄，只输出 JSON：{"name": ..., "age": ...}。文本：张三今年 28 岁。'

# 2) JSON mode —— 保证是合法 JSON，但不保证字段和你想的一样
#    response_format={'type': 'json_object'}

# 3) JSON Schema / structured outputs —— 保证结构符合你给的 schema
#    response_format={'type': 'json_schema', 'json_schema': {...}}

# 4) function calling —— 模型按工具参数 schema 产出调用参数（本质也是 schema 约束）
#    tools=[{'type': 'function', 'function': {'name': ..., 'parameters': {...}}}]`

const pydanticCode = `# pydantic 模型 + structured outputs 拿到结构化结果，再二次校验
from pydantic import BaseModel, field_validator
from openai import OpenAI

client = OpenAI()

class Person(BaseModel):
    name: str
    age: int

    @field_validator('age')
    @classmethod
    def age_in_range(cls, v):
        # schema 保证 age 是整数，但保证不了它「合理」——内容校验得自己来
        if not (0 <= v <= 150):
            raise ValueError('age 超出合理范围')
        return v

def extract_person(text):
    resp = client.chat.completions.create(
        model='gpt-4o-mini',
        messages=[
            {'role': 'system', 'content': '从用户文本中抽取人物信息。'},
            {'role': 'user', 'content': text},
        ],
        response_format={
            'type': 'json_schema',
            'json_schema': {
                'name': 'Person',
                'strict': True,           # 严格模式：强制符合 schema
                'schema': {
                    'type': 'object',
                    'properties': {
                        'name': {'type': 'string'},
                        'age': {'type': 'integer'},
                    },
                    'required': ['name', 'age'],
                    'additionalProperties': False,
                },
            },
        },
    )
    raw = resp.choices[0].message.content
    # 第一层：schema 已保证是合法且结构正确的 JSON
    # 第二层：pydantic 再校验类型 + 业务规则（age 范围）
    return Person.model_validate_json(raw)

if __name__ == '__main__':
    p = extract_person('我叫李雷，今年 31 岁，是名工程师。')
    print(p)            # name='李雷' age=31`

export default function Ch4() {
  return (
    <>
      <Lead>
        <p>
          只要你想把模型接进程序，迟早会撞上同一个需求：让它<strong>稳定地吐出机器能解析的结构</strong>，
          通常是 JSON。模型骨子里是个文本续写器，它「想」输出自然语言。
          本章把「逼它产出结构化输出」的四级办法摆清楚——关键是看清<strong>每一级到底担保什么</strong>。
        </p>
      </Lead>

      <h2>四级办法：担保强度从弱到强</h2>
      <p>从「全靠模型自觉」到「服务端硬性约束」，办法大致分四级。越往后越可靠，但能力支持和写法成本也越高。</p>

      <h3>① 在 prompt 里要求 JSON（最弱）</h3>
      <p>
        最朴素：在 prompt 里写「只输出 JSON，格式是……」。它<strong>什么都不担保</strong>——
        模型可能在 JSON 前后多写解释、用单引号、漏字段、把数字写成字符串、被 Markdown 代码块包起来。
        临时脚本能用，生产环境别只靠它。
      </p>

      <p>
        别小看「全靠模型自觉」这级的脆弱程度。同一个 prompt，模型今天可能乖乖给纯 JSON，明天就给你裹上一层
        <code>{'```json ... ```'}</code> 的 Markdown 代码块，后天又在前面加一句「好的，这是您要的 JSON：」。
        你的 <code>json.loads</code> 一遇到这些就崩。生产环境里靠正则去「抠」出 JSON、或写一堆 <code>strip</code> 清洗，都是<strong>治标</strong>，
        迟早被某种新花样绕过——根治要靠下面的服务端约束。
      </p>

      <h3>② JSON mode：保证是合法 JSON</h3>
      <p>
        打开 JSON mode（<code>response_format</code> 设为 json_object），服务端会保证返回的是
        <strong>一段能被解析的合法 JSON</strong>。但它只管「语法合法」，<strong>不管字段对不对</strong>——
        字段名、层级、类型都可能跟你期望的不一样。它解决的是「能不能 <code>json.loads</code>」，不是「内容对不对」。
      </p>

      <h3>③ JSON Schema / structured outputs：保证符合 schema</h3>
      <p>
        更进一步，你给一份 <em>JSON Schema</em>（字段、类型、必填项、是否允许多余字段），
        开启严格模式后，服务端保证返回的 JSON <strong>结构上符合这份 schema</strong>：
        该有的字段都在、类型对、不冒出多余字段。这一级才真正适合喂给下游代码。
      </p>

      <h3>④ function calling：按工具参数 schema 产出</h3>
      <p>
        当目的是「让模型决定调哪个函数、传什么参数」时，用 <em>function calling</em>：
        你声明工具及其参数 schema，模型产出的就是<strong>符合参数 schema 的调用参数</strong>。
        本质上它和第③级是同一回事——都是用 schema 约束输出，只是语义上专门服务于「调工具」（这正是第 4 卷 Agent 的核心机制）。
      </p>
      <p>
        什么时候用③、什么时候用④？看意图：你只是想<strong>把一段文本解析成结构</strong>（抽取字段、分类打标）→ 用第③级 structured outputs；
        你想让模型<strong>决定下一步做什么动作</strong>（查天气、搜数据库、发请求）→ 用第④级 function calling。
        前者的产物直接是数据，后者的产物是「一个待执行的动作」。两者底层同源，但用错语义会让代码逻辑别扭。
      </p>

      <h3>为什么模型「天生」不爱吐结构</h3>
      <p>
        先理解对手。模型是在海量<strong>自然语言</strong>上训练的，它的本能是「把话说圆」——加铺垫、给解释、用 Markdown 美化。
        而严格的 JSON 是一种反人类直觉的、机器味十足的格式：不能多一个字、引号花括号必须配平、不能有解释。
        让一个被训练成「能说会道」的模型憋出干巴巴的 JSON，本身就是在和它的本能对抗。
      </p>
      <p>
        这解释了为什么「光在 prompt 里求它」最不可靠：你是在<strong>劝</strong>一个本能想多说话的模型闭嘴。
        而后面的约束解码之所以是质变，是因为它不再「劝」，而是从机制上<strong>不给它说废话的机会</strong>。理解这个对抗关系，
        你就明白为什么生产环境一定要往第③④级走。

      </p>

      <h3>底层是怎么做到的：约束解码</h3>
      <p>
        第③④级的硬担保，靠的是 <em>constrained decoding</em>（约束解码）。回忆第 1 卷：模型每步在词表上输出一个概率分布。
        约束解码做的事很直接——在每一步，把<strong>所有会破坏 schema 的 token 概率压到零</strong>，
        只允许从「合法的下一个 token」里采样。比如此刻 JSON 语法要求下一个必须是 <code>"</code> 或 <code>&#125;</code>，
        那别的 token 一律禁掉。如此一来，生成出的串<strong>不可能</strong>违反 schema——这不是「劝模型守规矩」，
        是从机制上让它没法越界。
      </p>

      <Example title="同一需求，四级写法对照">
        <p>
          需求都是「从一句话里抽出 name 和 age」。从第①级的纯 prompt，到第②③④级逐步交给服务端约束。
        </p>
        <CodeBlock lang="python" title="four_levels.py" code={fourLevelsCode} />
        <p>
          注意第①级里那段 prompt 看起来很明确，但它对模型只是「建议」；
          第③级的 schema 才是「服务端兜底的硬约束」。生产系统优先用第③或第④级。
        </p>
      </Example>

      <h2>写 schema 的实战要点</h2>
      <p>
        约束解码虽强，但 schema 写不好照样出问题。几条经验：
      </p>
      <ul>
        <li>
          <strong>每个字段加 description</strong>：schema 里的字段描述会进上下文，相当于「就地的迷你 prompt」，
          能显著提升模型填对内容的概率。<code>age</code> 配一句「用户的周岁年龄，整数」，比光给个 <code>integer</code> 强得多。
        </li>
        <li>
          <strong>能用枚举就用枚举</strong>：分类字段别用自由字符串，用 <code>enum</code> 把取值锁死（如情绪只能是「正面/负面/中性」），
          约束解码会从机制上保证它不会蹦出第四个值。
        </li>
        <li>
          <strong>设 <code>additionalProperties: false</code></strong>：禁止模型自己加字段，输出更干净可控。</li>
        <li>
          <strong>别过度嵌套、别过多必填</strong>：schema 太复杂会让模型「填得很累」，配合 <code>max_tokens</code> 容易中途截断成半截 JSON。
          能拍平就拍平，必填项只留真正必须的。
        </li>
        <li>
          <strong>给「兜底字段」</strong>：模型可能遇到「抽不出」的情况，与其逼它硬填，不如设计一个可选的 <code>null</code> 或
          一个 <code>"not_found"</code> 枚举值，让它有合法的「我没找到」出口，避免它编造。
        </li>
      </ul>

      <KeyIdea title="格式可锁，内容不可锁">
        <p>
          约束解码和 schema 能 100% 保证输出的<strong>形状</strong>对：合法 JSON、字段齐、类型符。
          但它<strong>管不了内容对不对</strong>——schema 能强制 <code>age</code> 是整数，挡不住模型把年龄填成 <code>999</code>，
          也挡不住 <code>name</code> 被填成一个根本不存在于原文的名字。
          「锁格式」和「保内容」是两回事：前者交给 schema，后者得靠你自己的业务校验和事实核对。
        </p>
      </KeyIdea>

      <Example title="四级担保，一张表说清「保什么、不保什么」">
        <table>
          <thead>
            <tr><th>级别</th><th>保证</th><th>不保证</th><th>适用</th></tr>
          </thead>
          <tbody>
            <tr><td>① prompt 要求</td><td>（什么都不保）</td><td>能否解析、字段、内容</td><td>临时脚本、探索</td></tr>
            <tr><td>② JSON mode</td><td>是合法 JSON</td><td>字段、结构、内容</td><td>只需「能解析」的轻量场景</td></tr>
            <tr><td>③ JSON Schema</td><td>合法 JSON + 结构符合 schema</td><td>内容对不对</td><td>喂给下游代码的生产场景</td></tr>
            <tr><td>④ function calling</td><td>符合工具参数 schema</td><td>内容对不对、选没选对工具</td><td>Agent 调工具</td></tr>
          </tbody>
        </table>
        <p>
          看这张表只需记一条主线：<strong>越往下，「形状」越有保障，但「内容对不对」从头到尾都没人替你保</strong>。
          这正是下一个 KeyIdea 的「格式可锁、内容不可锁」。
        </p>
      </Example>

      <Callout variant="warn" title="结构化输出的常见坑">
        <ul>
          <li><strong>以为 JSON mode 就保结构</strong>——它只保「合法 JSON」，字段对不对得靠 schema（第③级）。</li>
          <li><strong>schema 过严导致模型卡死或截断</strong>——必填项太多、嵌套太深时，配合 max_tokens 容易被截断成半截 JSON。</li>
          <li><strong>拿到结构就直接信内容</strong>——格式对不等于内容对，务必再做业务校验（范围、枚举、引用是否存在）。</li>
          <li><strong>用正则去抠模型输出里的 JSON</strong>——脆弱不堪，能用 schema/JSON mode 就别手撸解析。</li>
          <li><strong>schema 改了忘了同步改 prompt/模型类</strong>——schema、pydantic 模型、示例三处描述同一个结构，改一处要全改，否则静默出错。</li>
        </ul>
      </Callout>

      <h2>function calling：结构化输出的「主场」</h2>
      <p>
        第④级单独展开，因为它是 Agent 的命脉。当你给模型一组工具（每个带名字、描述、参数 schema），模型不再直接答用户，
        而是产出一个<strong>结构化的「调用意图」</strong>：调哪个工具、传什么参数。你的代码拿到这个意图，真正去执行工具，
        把结果塞回上下文，模型再接着往下走。整个 ReAct / Agent 循环（第 4 卷）就架在这套机制上。
      </p>
      <p>
        关键认知：function calling 里<strong>模型并不执行任何函数</strong>，它只是按参数 schema「填一张调用单」。
        真正执行的是你的代码。所以工具的描述写得好不好，直接决定模型选不选对工具、传不传对参数——
        工具的 <code>description</code> 和参数 schema，本质上也是 prompt 的一部分，要当 prompt 一样认真写。
      </p>
      <Callout variant="info" title="多个工具时，最大的坑是「选错工具」">
        <p>
          一旦工具多起来（七八个甚至几十个），模型最容易出的不是「参数填错」，而是「<strong>该用 A 却调了 B</strong>」，
          或者「本该直接回答却硬要调工具」。缓解办法：工具描述写清楚「什么时候用它、什么时候<strong>不</strong>用」，
          工具之间职责别重叠，工具数量控制在模型能 hold 住的范围（太多就分层、按场景只暴露相关的那几个）。
        </p>
      </Callout>

      <h2>这对做 Agent / 工程实践意味着什么</h2>
      <p>
        Agent 的每一步几乎都依赖结构化输出：决定调哪个工具、传什么参数，全靠 function calling 产出的结构化调用。
        如果这一环不稳，整条 Agent 流水线就会在解析处崩掉。工程上的标准做法是<strong>双重保险</strong>：
        用 schema / structured outputs 锁住格式，再用 <em>pydantic</em> 这类库做第二层校验——
        既兜住类型，又把「内容是否合理」的业务规则写进 validator。
        记住那句话：<strong>格式可锁、内容不可锁</strong>，所以校验这一步永远省不掉。
      </p>

      <Practice title="pydantic 双重校验拿结构化输出">
        <p>
          下面用 <code>response_format</code> 的 json_schema 严格模式拿到结构正确的 JSON，
          再交给 pydantic 做第二层校验——类型由 schema 和 pydantic 共同兜底，
          而 <code>age</code> 的合理范围这种<strong>内容规则</strong>只能由 validator 来管。
        </p>
        <CodeBlock lang="python" title="extract_person.py" code={pydanticCode} />
        <p>
          练习：把输入换成「我今年 200 岁」，看 schema 让它通过、却被 pydantic 的范围校验拦下——
          亲手体会「格式可锁、内容不可锁」。再给 <code>Person</code> 加一个 <code>email</code> 字段，
          同步改 schema 和模型，观察少改一处会发生什么。
        </p>
      </Practice>

      <Summary
        points={[
          '四级办法担保强度递增：①prompt 要求 JSON（最弱）②JSON mode（保合法 JSON）③JSON Schema/structured outputs（保符合 schema）④function calling（按工具参数 schema）。',
          'JSON mode 只保证「能解析」，不保证字段和结构；要结构正确得用 JSON Schema。',
          '约束解码 constrained decoding 的原理是：每一步把会破坏 schema 的 token 概率压到零，从机制上禁止越界。',
          'function calling 本质也是 schema 约束，专门服务于「让模型决定调哪个工具、传什么参数」，是第 4 卷 Agent 的核心。',
          '核心铁律：格式可锁、内容不可锁——schema 保形状，内容对不对得靠业务校验。',
          '工程标配是双重保险：schema 锁格式 + pydantic 校验类型与业务规则，解析与校验这步永远不能省。',
        ]}
      />
    </>
  )
}
