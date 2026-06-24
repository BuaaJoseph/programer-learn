import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import { ArrayMemory } from '@/courses/algorithms/illustrations/StructureFigures.jsx'

const code = `# 数组的随机访问：靠下标一步定位
a = [12, 25, 7, 40, 18, 33]
print(a[3])      # 40 —— 不管数组多大，取任意下标都是一样快

# 在中间插入，要把后面的元素整体后移
a.insert(2, 99)  # [12, 25, 99, 7, 40, 18, 33]，7 及其后都搬了一格
# 删除同理，后面的元素要整体前移`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          想象一排紧挨着的储物柜，编号 0、1、2…… 每个柜子一样大。只要知道第一个柜子的位置和柜子的大小，
          想找第 5 个柜子，根本不用一个个数过去——直接算「起点 + 5 × 柜子宽度」就到了。
          这就是<strong>数组</strong>：把元素一个挨一个放在一整块<em>连续内存</em>里，用下标当编号。
        </p>
      </Lead>

      <h2>为什么数组的随机访问是 O(1)</h2>
      <p>
        数组的全部魔力都来自「连续」两个字。元素既然等大又挨着排，那么第 <code>i</code> 个元素的地址就是一个简单的乘加：
        <code>地址 = 首地址 + i × 每个元素的字节数</code>。这是一次算术运算，跟数组有 10 个还是 1000 万个元素毫无关系——
        所以按下标读写是常数时间 <strong>O(1)</strong>。下面这张图可以点不同下标，看地址是怎么一步算出来的。
      </p>

      <ArrayMemory />

      <CodeBlock lang="python" title="array_access.py" code={code} />

      <h2>代价：插入和删除要搬家</h2>
      <p>
        连续存储带来了极快的随机访问，但反过来也成了负担。如果要在数组<em>中间</em>插入一个元素，
        为了维持「连续且有序」，后面所有元素都得整体向后挪一格；删除则要整体向前补位。
        最坏情况下要搬动几乎整个数组，是 <strong>O(n)</strong>。这就是数组的根本权衡：
        <strong>读快、改慢</strong>。
      </p>

      <Callout variant="note" title="为什么下标从 0 开始">
        <p>
          因为下标的本质是「相对首地址的偏移量」。第一个元素就在首地址处，偏移 0；第二个偏移 1 个元素宽……
          下标从 0 开始，地址公式 <code>首地址 + i × 宽度</code> 才最自然。这不是数学家的怪癖，而是内存模型的直接结果。
        </p>
      </Callout>

      <Example title="动态数组：扩容是怎么回事">
        <p>
          像 Java 的 <code>ArrayList</code>、Python 的 <code>list</code> 这种「能自动变长」的数组，底层仍是定长数组。
          当装满后再 append，它会<strong>申请一块更大的内存（通常是原来的 1.5～2 倍）、把旧数据整体拷过去</strong>，再追加新元素。
          单次扩容是 O(n)，但因为容量成倍增长、扩容不常发生，把成本摊到每次 append 上，平均仍是 O(1)——
          这叫<em>均摊（amortized）复杂度</em>。
        </p>
      </Example>

      <KeyIdea title="数组的能力与代价一句话">
        <p>
          连续内存 + 等大元素 ⇒ 下标随机访问 <strong>O(1)</strong>（数组最大的优势）；
          但中间插入/删除要搬移后续元素 <strong>O(n)</strong>，且容量固定、扩容需整体拷贝。
          需要频繁按位置读、很少在中间增删时，数组是首选。
        </p>
      </KeyIdea>

      <Summary
        points={[
          '数组把元素等大、连续地存在一块内存里，下标本质是相对首地址的偏移量。',
          '随机访问靠地址公式一步算出，是 O(1)，与数组大小无关——这是数组的核心优势。',
          '在中间插入/删除要搬移后续所有元素，最坏 O(n)；数组的取舍是「读快改慢」。',
          '动态数组（ArrayList/list）靠成倍扩容 + 整体拷贝实现变长，append 均摊 O(1)。',
        ]}
      />
    </>
  )
}
