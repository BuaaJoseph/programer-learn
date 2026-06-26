import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import { StackQueueView } from '@/courses/algorithms/illustrations/StructureFigures.jsx'

const code = `# 栈：用数组的尾部当「顶」，push/pop 都在尾部，O(1)
stack = []
stack.append('A')   # push
stack.append('B')
stack.pop()         # pop -> 'B'（后进先出）

# 队列：从一端进、另一端出
from collections import deque
q = deque()
q.append('A')       # 入队（队尾）
q.append('B')
q.popleft()         # 出队 -> 'A'（先进先出）`

export default function Ch3() {
  return (
    <>
      <Lead>
        <p>
          数组和链表都能任意位置存取，自由但也容易乱。<strong>栈和队列</strong>反其道而行：
          它们故意<em>限制</em>你只能从特定的位置进出。这种自我约束不是缺陷，而是为了换来一种确定、清晰的处理顺序——
          很多算法正是靠这种顺序才得以成立。
        </p>
      </Lead>

      <h2>栈：后进先出（LIFO）</h2>
      <p>
        栈就像一摞盘子：你只能往最上面放（<code>push</code>），也只能从最上面拿（<code>pop</code>）。
        最后放上去的，最先被拿走——这叫<strong>后进先出（Last In, First Out）</strong>。
        它天然适合表达「嵌套」与「回退」：函数调用、括号匹配、浏览器的后退按钮、撤销操作，本质都是栈。
      </p>

      <h2>队列：先进先出（FIFO）</h2>
      <p>
        队列就像排队买票：新人从队尾加入（<code>enqueue</code>），服务从队首开始（<code>dequeue</code>）。
        先来的先被处理——<strong>先进先出（First In, First Out）</strong>，保证了公平和顺序。
        消息队列、任务调度、打印机排队，都是它。
      </p>

      <StackQueueView />

      <CodeBlock lang="python" title="stack_queue.py" code={code} />

      <Callout variant="tip" title="这一章是后面遍历算法的钥匙">
        <p>
          为什么要在讲遍历之前先讲栈和队列？因为<strong>深度优先搜索（DFS）的本质就是用栈，广度优先搜索（BFS）的本质就是用队列</strong>。
          栈让你「一条路走到黑、再回退」，队列让你「一圈圈向外扩散」。记住这两种「下一个该处理谁」的取法，
          第三卷的遍历算法就会变得理所当然。
        </p>
      </Callout>

      <Example title="用栈检查括号是否匹配">
        <p>
          遇到左括号就 push，遇到右括号就 pop 出栈顶看是否配对。读完后栈正好空，说明全部匹配。
          这是栈「后进先出」匹配「最近未闭合」语义的经典应用——编译器检查代码括号、编辑器高亮配对括号都靠它。
        </p>
        <CodeBlock
          lang="python"
          title="valid_parentheses.py"
          code={`def is_valid(s):
    pairs = {')': '(', ']': '[', '}': '{'}
    stack = []
    for c in s:
        if c in '([{':
            stack.append(c)
        else:
            if not stack or stack.pop() != pairs[c]:
                return False
    return not stack`}
        />
      </Example>

      <KeyIdea title="一句话区分栈和队列">
        <p>
          <strong>栈 = 后进先出</strong>，只在一端进出，对应「嵌套 / 回退」——DFS 用它。
          <strong>队列 = 先进先出</strong>，一端进另一端出，对应「公平 / 顺序」——BFS 用它。
          两者都能用数组或链表实现，push/pop、入队/出队都是 O(1)。
        </p>
      </KeyIdea>

      <Summary
        points={[
          '栈和队列是「受限的线性表」：故意限制进出位置，换来确定的处理顺序。',
          '栈后进先出（LIFO），只在顶部 push/pop，适合嵌套与回退：函数调用、括号匹配、撤销。',
          '队列先进先出（FIFO），队尾进、队首出，适合公平排队：消息队列、任务调度。',
          'DFS 的核心是栈、BFS 的核心是队列——这是打开第三卷遍历算法的钥匙。',
        ]}
      />
    </>
  )
}
