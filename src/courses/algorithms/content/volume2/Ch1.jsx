import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import SortPlayer from '@/courses/algorithms/illustrations/SortFigure.jsx'

const code = `def insertion_sort(a):
    # 把第 0 个看作已排好；从第 1 个开始，逐个往左边的有序区里插
    for i in range(1, len(a)):
        key = a[i]          # 当前要插入的牌
        j = i - 1
        # 在有序区里从右往左找位置：比 key 大的都右移让位
        while j >= 0 and a[j] > key:
            a[j + 1] = a[j]
            j -= 1
        a[j + 1] = key      # 空位就是 key 该待的地方
    return a`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          摸一手扑克牌，你是怎么理顺的？多数人会这样：左手攥着已经排好的牌，右手每抓一张新牌，
          就从右往左在手里比一比，插到合适的位置。<strong>插入排序</strong>就是把这个再自然不过的动作写成了算法——
          它也是我们理解一切排序的最佳起点。
        </p>
      </Lead>

      <h2>核心思路：维护一个「有序区」</h2>
      <p>
        把数组从逻辑上分成两段：左边是<em>已排好序的区</em>，右边是<em>还没处理的区</em>。
        一开始有序区只有第一个元素（单个元素天然有序）。然后每次从右边取出第一个元素当作 <code>key</code>，
        在左边有序区里<strong>从右往左</strong>找它该待的位置：凡是比它大的元素，都向右挪一格让位，直到找到空位把 key 放进去。
        每做一轮，有序区就长大一个，直到覆盖整个数组。
      </p>

      <h2>按下播放，亲眼看它怎么动</h2>
      <p>
        橙色是正在比较的元素，红色是正在后移让位的元素，绿色表示已经进入有序区。
        盯住绿色区域——它会从左边一格一格地长大，这正是「有序区不断扩张」的过程。
      </p>

      <SortPlayer algo="insertion" data={[5, 2, 8, 1, 9, 3, 7]} />

      <CodeBlock lang="python" title="insertion_sort.py" code={code} />

      <h2>它快还是慢？看数据「乱不乱」</h2>
      <p>
        插入排序的耗时高度依赖输入：
      </p>
      <ul>
        <li><strong>最好情况 O(n)</strong>：数据已经基本有序时，每个 key 几乎不用移动，扫一遍就完事。</li>
        <li><strong>最坏 / 平均 O(n²)</strong>：数据完全逆序时，每个新元素都要移到最前面，移动次数像 1+2+3+…+n 那样累加。</li>
      </ul>
      <p>
        正因为「越有序越快」，插入排序在<strong>小规模或近乎有序</strong>的数据上非常实用。很多工业级排序（如快速排序）在子区间很小时，
        会切换成插入排序来收尾，就是看中了这一点。
      </p>

      <Callout variant="tip" title="稳定排序：相等元素不乱序">
        <p>
          插入排序是<strong>稳定</strong>的：当 <code>a[j]</code> 等于 key 时，循环条件用的是「大于」而非「大于等于」，所以不会把相等元素交换过去，
          它们的先后相对次序保持不变。需要「按多关键字排序」（先按价格、价格相同再按销量）时，稳定性很重要。
        </p>
      </Callout>

      <KeyIdea title="一句话记住插入排序">
        <p>
          维护左侧有序区，每次把下一个元素「插」到有序区里正确的位置（比它大的统统右移让位）。
          实现简单、稳定、原地排序，近乎有序时接近 O(n)，但平均与最坏是 O(n²)，只适合小数据。
        </p>
      </KeyIdea>

      <Summary
        points={[
          '插入排序 = 整理扑克牌：左手有序区，右手逐张往里插。',
          '每轮把一个元素插入左侧有序区的正确位置，比它大的元素右移让位。',
          '最好 O(n)（近乎有序）、平均与最坏 O(n²)（逆序）；原地、稳定。',
          '小规模或近乎有序的数据上很快，常被用作高级排序在小区间的收尾。',
        ]}
      />
    </>
  )
}
