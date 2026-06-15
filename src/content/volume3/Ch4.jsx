import Lead from '../../components/cards/Lead.jsx'
import KeyIdea from '../../components/cards/KeyIdea.jsx'
import Example from '../../components/cards/Example.jsx'
import Practice from '../../components/cards/Practice.jsx'
import Callout from '../../components/cards/Callout.jsx'
import CodeBlock from '../../components/cards/CodeBlock.jsx'
import Summary from '../../components/cards/Summary.jsx'

const chatFmtCode = `// chat 格式：每条样本是一段对话，存成一行 JSON（jsonl）
// 文件 train.jsonl，每行一条，行内不换行：
{"messages": [{"role": "system", "content": "你是简洁的客服助手。"}, {"role": "user", "content": "怎么退款？"}, {"role": "assistant", "content": "进入订单页，点退款，3 个工作日到账。"}]}
{"messages": [{"role": "user", "content": "运费多少？"}, {"role": "assistant", "content": "满 99 包邮，否则收 8 元。"}]}`

const buildCode = `import json
import random
import hashlib

random.seed(42)  # 固定随机种子，切分可复现

SYSTEM = '你是简洁、礼貌的电商客服助手。'

def load_raw(path):
    """读原始数据：假设每行是 {"q": ..., "a": ...}。"""
    rows = []
    with open(path, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows

def clean(rows):
    """清洗：去空、去过短、去重。"""
    seen = set()
    out = []
    for r in rows:
        q = (r.get('q') or '').strip()
        a = (r.get('a') or '').strip()
        if len(q) < 2 or len(a) < 2:        # 太短的丢掉
            continue
        key = hashlib.md5((q + '|' + a).encode('utf-8')).hexdigest()
        if key in seen:                      # 完全重复的丢掉
            continue
        seen.add(key)
        out.append({'q': q, 'a': a})
    return out

def to_chat(r):
    """转成 chat 格式的一条样本。"""
    return {'messages': [
        {'role': 'system', 'content': SYSTEM},
        {'role': 'user', 'content': r['q']},
        {'role': 'assistant', 'content': r['a']},
    ]}

def split(rows, val_ratio=0.1):
    """切分 train/val。先打乱再切，避免顺序带来的偏差。"""
    rows = rows[:]
    random.shuffle(rows)
    n_val = int(len(rows) * val_ratio)
    return rows[n_val:], rows[:n_val]   # train, val

def dump(rows, path):
    with open(path, 'w', encoding='utf-8') as f:
        for r in rows:
            f.write(json.dumps(to_chat(r), ensure_ascii=False) + '\\n')

if __name__ == '__main__':
    raw = load_raw('raw.jsonl')
    cleaned = clean(raw)
    train, val = split(cleaned)
    dump(train, 'train.jsonl')
    dump(val, 'val.jsonl')
    print(f'原始 {len(raw)} -> 清洗后 {len(cleaned)}')
    print(f'train {len(train)} / val {len(val)}')`

export default function Ch3_4() {
  return (
    <>
      <Lead>
        <p>
          上一章说 SFT 的成败八成在数据。这一章就把这八成讲透。一句话先记住：<strong>数据是模型的镜子</strong>——
          数据里有的毛病，模型会一字不差地学到。你给它看的示范有错别字，它就学着写错别字；示范前后矛盾，它就学得人格分裂。
          所以造数据集这件「看起来不性感」的活，才是微调里真正决定成败的工程。
        </p>
      </Lead>

      <h2>数据是模型的镜子</h2>
      <p>
        模型没有判断力，它不会自动「纠正」你给的坏示范，只会忠实地模仿统计规律。如果训练集里 30% 的答案啰嗦冗长，
        模型就会学得啰嗦；如果一半样本用「您好」开头、一半用「嗨」，模型就会随机地两种都来。
        微调时你要时刻提醒自己：<strong>我现在喂进去的每一条，都是在告诉模型「以后就该这么答」</strong>。
      </p>

      <h2>chat 格式与 jsonl</h2>
      <p>
        现在主流的微调数据用 <em>chat 格式</em>：每条样本是一段对话，由若干 <code>messages</code> 组成，每条消息带 <code>role</code>
        （<code>system</code> / <code>user</code> / <code>assistant</code>）和 <code>content</code>。整个数据集存成 <em>jsonl</em>
        ——每行一个 JSON 对象，行与行之间互不影响，方便流式读取和按行切分。
      </p>
      <CodeBlock lang="json" title="train.jsonl（节选）" code={chatFmtCode} />
      <p>
        这种格式的好处是它和模型实际推理时的输入结构一致：训练里 assistant 段是你给的理想答案，推理时这一段就是模型要生成的内容，
        前后完全对得上。
      </p>

      <KeyIdea title="好数据的四要素">
        <ul>
          <li>
            <strong>正确</strong>——答案本身要对。错误的示范比没有示范更糟，它会把模型往错的方向带。
          </li>
          <li>
            <strong>一致</strong>——同类问题用同一种风格、格式、口径回答。不一致的数据会让模型学得飘忽不定。
          </li>
          <li>
            <strong>多样</strong>——覆盖足够多的提问方式、边界情况、难易程度。只喂相似样本，模型一出训练分布就崩。
          </li>
          <li>
            <strong>干净</strong>——没有重复、乱码、HTML 残留、敏感信息。脏数据既浪费算力，又会被模型当成「该学的规律」。
          </li>
        </ul>
      </KeyIdea>

      <Example title="一致性有多重要">
        <p>同一个问题「怎么查物流」，下面两条示范单看都没错，但放在同一个数据集里就糟了：</p>
        <ul>
          <li>样本 A 的答案：<code>在「我的订单」里点物流即可查看。</code></li>
          <li>样本 B 的答案：<code>亲，您可以去订单页瞅一眼物流哦~</code></li>
        </ul>
        <p>
          一个简洁、一个卖萌，模型学完会两种语气随机蹦出来。要么统一成简洁，要么统一成卖萌，<strong>不能混</strong>。
        </p>
      </Example>

      <h2>train / val 切分与数据泄漏</h2>
      <p>
        造好数据后要切出一小份做<em>验证集</em>（val），它不参与训练，只用来在训练中观察模型在「没见过的数据」上表现如何，
        从而判断过拟合。常见切 5% 到 10%。但切分有个隐藏的坑叫<em>数据泄漏</em>（data leakage）：如果验证集里的样本
        其实是训练集样本的变体（同一问题换个说法、同一文档的不同片段），那验证分数会虚高，因为模型「偷看」过答案。
      </p>

      <Callout variant="warn" title="避免数据泄漏的几个动作">
        <ul>
          <li><strong>先去重再切分</strong>——把完全重复和近似重复的样本先合并，避免同一条同时落进 train 和 val。</li>
          <li><strong>按来源/实体切，而不是按行随机切</strong>——如果数据按用户、文档、对话分组，应整组分到一边，别让同组样本横跨两集。</li>
          <li><strong>切分用固定随机种子</strong>——保证每次切的结果一致，实验才可复现、可对比。</li>
        </ul>
      </Callout>

      <h2>这对做 Agent / 工程实践意味着什么</h2>
      <p>
        数据集不是一次性产物，而是要<strong>版本化、可复现</strong>的工程资产。把「原始数据 → 清洗 → 转格式 → 切分」写成一个脚本、
        固定随机种子、记录每一步的样本数变化，比手工攒一堆 JSON 文件靠谱得多。当模型效果出问题，你第一个该回去查的就是数据：
        是不是有脏样本？是不是风格不一致？是不是 val 泄漏了？把造数据当成正经的数据管线来做，微调的迭代才稳。
      </p>

      <Practice title="写一个完整的数据构建脚本">
        <p>
          下面这个 <code>build_dataset.py</code> 把整条管线串起来：读原始数据 → 清洗去重 → 转成 chat jsonl → 切分 train/val。
          它故意写得很朴素，方便你照着改成自己的数据格式：
        </p>
        <CodeBlock lang="python" title="build_dataset.py" code={buildCode} />
        <p>
          跑完看一眼打印的样本数变化——清洗砍掉了多少、train 和 val 各多少。这几个数字是你数据质量的第一道体检。
        </p>
      </Practice>

      <Summary
        points={[
          '数据是模型的镜子：数据里有的毛病模型会原样学到，模型没有判断力不会自动纠错。',
          'chat 格式用 messages（system/user/assistant + content），整个数据集存成 jsonl，每行一条，和推理输入结构一致。',
          '好数据四要素：正确、一致、多样、干净；错误和不一致的示范比没有示范更伤模型。',
          '切出 5%~10% 的验证集观察过拟合，但要警惕数据泄漏：先去重、按来源整组切、固定随机种子。',
          '把「读取→清洗→转格式→切分」写成可复现的脚本并版本化，数据集是正经的工程资产。',
          '模型效果出问题，第一个该回去查的永远是数据。',
        ]}
      />
    </>
  )
}
