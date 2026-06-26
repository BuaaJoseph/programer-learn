import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import SortPlayer from '@/courses/algorithms/illustrations/SortFigure.jsx'

const code = `def bubble_sort(a):
    n = len(a)
    for i in range(n - 1):
        swapped = False
        # 每一轮把当前最大的元素冒到右端；右边 i 个已就位，不用再比
        for j in range(n - 1 - i):
            if a[j] > a[j + 1]:
                a[j], a[j + 1] = a[j + 1], a[j]
                swapped = True
        if not swapped:        # 一整轮没换过 → 已经有序，提前退出
            break
    return a`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          上一章的插入排序是「把元素搬到该去的地方」。这一章的<strong>冒泡排序</strong>换一种武器——<em>交换</em>：
          只盯着<strong>相邻</strong>的两个元素，谁大就把谁往右换。一轮扫下来，最大的那个元素会像水里的气泡一样，
          一路被换到最右端「浮」出水面。
        </p>
      </Lead>

      <h2>核心思路：相邻比较，大的右移</h2>
      <p>
        从左到右走一遍，每一步比较相邻的 <code>a[j]</code> 和 <code>a[j+1]</code>，如果左边比右边大就交换。
        这样最大的元素会被「接力」一直往右推，<strong>一轮结束，末尾就锁定了一个最大值</strong>。
        下一轮只需在剩下的左边部分重复，每轮右端的有序区长大一格，直到全部就位。
      </p>

      <h2>按下播放，看气泡怎么浮上去</h2>
      <p>
        橙色是正在比较的相邻一对，红色表示发生了交换，绿色是已经沉到位、不再参与比较的元素。
        注意每一轮过后，<strong>右边的绿色区域</strong>都会多一个——那就是刚刚冒到位的最大值。
      </p>

      <SortPlayer algo="bubble" data={[5, 2, 8, 1, 9, 3, 7]} />

      <CodeBlock lang="python" title="bubble_sort.py" code={code} />

      <h2>一个小优化：提前收工</h2>
      <p>
        如果某一整轮下来<strong>一次交换都没发生</strong>，说明数组已经有序，可以立刻停止——代码里的 <code>swapped</code> 标志就是干这个的。
        有了它，冒泡排序在已经有序的数据上能达到最好情况 <strong>O(n)</strong>（只扫一遍确认无需交换）。
        但平均和最坏依然是 <strong>O(n²)</strong>：n 个元素、约 n 轮、每轮约 n 次比较。
      </p>

      <Callout variant="warn" title="冒泡排序慢，但它教会你的东西不慢">
        <p>
          论实战，冒泡排序几乎不会被真正使用——它的交换次数太多。但它把「<strong>相邻比较 + 交换</strong>」这个最朴素的排序思想讲得最透。
          下一章的快速排序，本质也是比较和交换，只是换了个聪明得多的<em>交换策略</em>。先把冒泡看懂，快排就有了参照。
        </p>
      </Callout>

      <table>
        <thead><tr><th>排序</th><th>最好</th><th>平均/最坏</th><th>稳定</th><th>特点</th></tr></thead>
        <tbody>
          <tr><td>插入排序</td><td>O(n)</td><td>O(n²)</td><td>是</td><td>近乎有序时快，搬移</td></tr>
          <tr><td>冒泡排序</td><td>O(n)</td><td>O(n²)</td><td>是</td><td>相邻交换，交换次数多</td></tr>
        </tbody>
      </table>

      <KeyIdea title="一句话记住冒泡排序">
        <p>
          反复扫描数组，相邻两个一比，大的往右换，每轮把一个最大值冒到末尾。
          加「本轮无交换则停」的优化后最好 O(n)，但平均与最坏仍是 O(n²)，稳定、原地。它的价值在于讲清「交换排序」的思想。
        </p>
      </KeyIdea>

      <Summary
        points={[
          '冒泡排序只比较相邻元素，大的往右交换，每轮把一个最大值「冒」到末尾。',
          '每轮过后右端有序区长大一格，约 n 轮完成，平均与最坏都是 O(n²)。',
          '「本轮无交换则提前结束」的优化让已有序数据达到最好情况 O(n)。',
          '实战很少用它，但它把「相邻比较 + 交换」的排序思想讲得最清楚，是快排的铺垫。',
        ]}
      />
    </>
  )
}
