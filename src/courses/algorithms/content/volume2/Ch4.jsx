import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import SortPlayer from '@/courses/algorithms/illustrations/SortFigure.jsx'

const code = `def merge_sort(a):
    if len(a) <= 1:           # 单个元素天然有序，递归出口
        return a
    mid = len(a) // 2
    left = merge_sort(a[:mid])    # 递归排左半
    right = merge_sort(a[mid:])   # 递归排右半
    return merge(left, right)     # 合并两个有序段

def merge(left, right):
    res = []
    i = j = 0
    while i < len(left) and j < len(right):
        # 比较两段头部，取较小的放入结果（<= 保证稳定）
        if left[i] <= right[j]:
            res.append(left[i]); i += 1
        else:
            res.append(right[j]); j += 1
    res.extend(left[i:])      # 剩下的直接接上
    res.extend(right[j:])
    return res`

export default function Ch4() {
  return (
    <>
      <Lead>
        <p>
          快速排序是「先划分、后递归」，归并排序反过来：<strong>先递归拆、后合并</strong>。
          它的思路简单到近乎天真——把数组对半拆，拆到每段只剩一个元素（一个元素当然是有序的），
          然后把相邻的两个有序段<em>合并</em>成一个更大的有序段，一层层并回去，整个数组就有序了。
          难点不在拆，而在「<strong>怎么把两个有序段合成一个</strong>」。
        </p>
      </Lead>

      <h2>合并：双指针择小而取</h2>
      <p>
        这是归并的精髓。两个段各自已经有序，各放一根指针指向头部，
        每次<strong>比较两个指针所指的元素，把较小的那个放进结果，并让它前进一格</strong>。
        因为两段都有序，头部就是各自最小的，所以这样依次取出的结果天然从小到大。一段取空了，把另一段剩下的整体接上即可。
        合并 n 个元素只需扫一遍，是 O(n)。
      </p>

      <h2>按下播放，看「拆开再合并」</h2>
      <p>
        动画聚焦在<strong>合并</strong>这一关键步骤上：橙色是两个有序段中正在被比较的头部元素，
        蓝色表示合并后的结果正被写回原位置。注意每次合并完，那一整段就变得局部有序了，
        有序的范围逐次翻倍，直到覆盖全部。
      </p>

      <SortPlayer algo="merge" data={[5, 2, 8, 1, 9, 3, 7]} />

      <CodeBlock lang="python" title="merge_sort.py" code={code} />

      <h2>稳定、可预测，但要额外空间</h2>
      <p>
        归并排序有两个快排没有的优点：
      </p>
      <ul>
        <li><strong>最坏也是 O(n log n)</strong>：拆分总是严格对半（log n 层），合并总是 O(n)，与数据是否有序无关——非常稳定可预测。</li>
        <li><strong>它是稳定排序</strong>：合并时用「小于等于」决定先取左段，相等元素的相对次序不会被打乱。</li>
      </ul>
      <p>
        代价是合并需要一个和原数组等大的<strong>额外数组</strong>来暂存结果，空间复杂度 O(n)，不像快排那样原地。这是它最主要的短板。
      </p>

      <Callout variant="note" title="归并是「外部排序」的基石">
        <p>
          当数据大到内存装不下、只能放在磁盘上时，快排那种随机访问就很吃亏，而归并的「顺序读 + 顺序写 + 合并」天然适合磁盘。
          做法是：把大文件切成内存能装下的小块，各自排好序写回磁盘，再用<strong>多路归并</strong>把这些有序块合并成最终结果。
          数据库的大规模排序、大数据框架的 shuffle 排序，底层都是这个思路。
        </p>
      </Callout>

      <Example title="四种排序，怎么选">
        <p>
          <strong>小数据 / 近乎有序</strong> → 插入排序；<strong>一般通用、追求平均最快且省内存</strong> → 快速排序（多数语言默认）；
          <strong>要稳定、要最坏也 O(n log n)、或数据放不进内存</strong> → 归并排序。冒泡基本只用于教学。
          理解了它们各自的取舍，你就能在面试里讲清「为什么这里用这个排序」，而不是只会背复杂度。
        </p>
      </Example>

      <table>
        <thead><tr><th>排序</th><th>平均</th><th>最坏</th><th>空间</th><th>稳定</th></tr></thead>
        <tbody>
          <tr><td>插入</td><td>O(n²)</td><td>O(n²)</td><td>O(1)</td><td>是</td></tr>
          <tr><td>冒泡</td><td>O(n²)</td><td>O(n²)</td><td>O(1)</td><td>是</td></tr>
          <tr><td>快速</td><td>O(n log n)</td><td>O(n²)</td><td>O(log n)</td><td>否</td></tr>
          <tr><td>归并</td><td>O(n log n)</td><td><strong>O(n log n)</strong></td><td>O(n)</td><td><strong>是</strong></td></tr>
        </tbody>
      </table>

      <KeyIdea title="一句话记住归并排序">
        <p>
          对半递归拆到单元素，再用双指针「择小而取」把两个有序段合并回去。最坏也是 O(n log n)、稳定、可预测，
          代价是 O(n) 额外空间。它是外部排序与大规模数据排序的基础。
        </p>
      </KeyIdea>

      <Summary
        points={[
          '归并排序先把数组对半拆到单元素，再两两合并成更大的有序段。',
          '合并用双指针：比较两个有序段的头部，择小放入结果，是 O(n) 的关键步骤。',
          '最坏也是 O(n log n)、稳定可预测，但需要 O(n) 额外空间，不是原地排序。',
          '它天然适合磁盘上的「外部排序」（多路归并），是大规模数据排序的基石。',
        ]}
      />
    </>
  )
}
