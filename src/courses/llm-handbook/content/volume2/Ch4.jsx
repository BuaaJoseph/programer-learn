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

      <KeyIdea title="格式可锁，内容不可锁">
        <p>
          约束解码和 schema 能 100% 保证输出的<strong>形状</strong>对：合法 JSON、字段齐、类型符。
          但它<strong>管不了内容对不对</strong>——schema 能强制 <code>age</code> 是整数，挡不住模型把年龄填成 <code>999</code>，
          也挡不住 <code>name</code> 被填成一个根本不存在于原文的名字。
          「锁格式」和「保内容」是两回事：前者交给 schema，后者得靠你自己的业务校验和事实核对。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="结构化输出的常见坑">
        <ul>
          <li><strong>以为 JSON mode 就保结构</strong>——它只保「合法 JSON」，字段对不对得靠 schema（第③级）。</li>
          <li><strong>schema 过严导致模型卡死或截断</strong>——必填项太多、嵌套太深时，配合 max_tokens 容易被截断成半截 JSON。</li>
          <li><strong>拿到结构就直接信内容</strong>——格式对不等于内容对，务必再做业务校验（范围、枚举、引用是否存在）。</li>
          <li><strong>用正则去抠模型输出里的 JSON</strong>——脆弱不堪，能用 schema/JSON mode 就别手撸解析。</li>
        </ul>
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
