import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import SortPlayer from '@/courses/algorithms/illustrations/SortFigure.jsx'

const code = `def quick_sort(a, lo=0, hi=None):
    if hi is None:
        hi = len(a) - 1
    if lo >= hi:
        return a
    pivot = a[hi]           # 取末尾为基准
    i = lo                  # i 指向「小于区」的下一个空位
    for j in range(lo, hi):
        if a[j] < pivot:
            a[i], a[j] = a[j], a[i]
            i += 1
    a[i], a[hi] = a[hi], a[i]   # 基准归位：左边都小、右边都大
    quick_sort(a, lo, i - 1)    # 递归排左半
    quick_sort(a, i + 1, hi)    # 递归排右半
    return a`

export default function Ch3() {
  return (
    <>
      <Lead>
        <p>
          插入和冒泡都是 O(n²)，慢在哪？慢在它们每次只挪动<em>一步</em>之遥。
          <strong>快速排序</strong>换了一种格局更大的思路——<em>分而治之</em>：
          与其慢慢挪，不如先选一个基准，一刀把数据劈成「比它小的」和「比它大的」两堆，
          基准当场归位，再对两堆<strong>递归</strong>地重复。每一刀都让问题规模减半。
        </p>
      </Lead>

      <h2>一次「分区」做了什么</h2>
      <p>
        选数组里一个元素当<strong>基准（pivot）</strong>（这里取末尾）。然后用一根指针 <code>i</code> 标记「小于区」的边界，
        让另一根指针 <code>j</code> 从左扫到右：每遇到一个比基准小的，就把它换到小于区里、<code>i</code> 前进一格。
        扫完后，把基准换到 <code>i</code> 的位置——此刻<strong>基准左边全比它小、右边全比它大，基准永久就位</strong>。
        这一步叫分区（partition），是快排的心脏。
      </p>

      <h2>按下播放，看基准如何一刀两断</h2>
      <p>
        紫色是基准 pivot，橙色是正在和基准比较的元素，红色是被换进小于区的元素，绿色是已经永久归位的基准。
        每当一个紫色变绿，就意味着一个元素一步到位、再也不用动了——这正是快排比冒泡快的关键。
      </p>

      <SortPlayer algo="quick" data={[5, 2, 8, 1, 9, 3, 7]} />

      <CodeBlock lang="python" title="quick_sort.py" code={code} />

      <h2>为什么平均是 O(n log n)</h2>
      <p>
        每次分区要扫一遍当前区间，是 O(n)。如果基准每次都把区间大致<strong>对半</strong>分，那么只需 <em>log n</em> 层就能把规模降到 1，
        总共 <strong>O(n log n)</strong>。这比 O(n²) 快了一个数量级——n=100 万时，相差上万倍。
      </p>

      <Callout variant="warn" title="最坏情况 O(n²)：基准选砸了">
        <p>
          如果每次都挑到当前区间的最大或最小值当基准（比如对<strong>已经有序</strong>的数组总取末尾），分区就会一边空一边全满，
          退化成 n 层，变回 <strong>O(n²)</strong>。解法是别固定取末尾：<em>随机选基准</em>，或取首/中/尾三个数的中位数（三数取中）。
          工程实现（如 C++ 的 <code>sort</code>）还会在递归过深时切换到堆排序兜底，这叫 introsort。
        </p>
      </Callout>

      <Example title="快排 vs 归并：都是分治，差在哪">
        <p>
          两者都用分治，但分工相反。<strong>快排是「先分区再递归」</strong>——划分时就把元素大致排好，合并时什么都不用做；
          <strong>归并是「先递归再合并」</strong>——拆分时什么都不做，真正的排序发生在合并。
          快排<em>原地</em>排序、常数小、平均最快，所以是多数语言的默认；但它不稳定、最坏 O(n²)。下一章的归并正好补上这两个短板。
        </p>
      </Example>

      <KeyIdea title="一句话记住快速排序">
        <p>
          选基准 → 分区（小的甩左、大的甩右、基准归位）→ 对左右两半递归。平均 O(n log n)、原地、常数小，是工程默认排序；
          但不稳定，且基准选砸时最坏 O(n²)，用随机基准或三数取中规避。
        </p>
      </KeyIdea>

      <Summary
        points={[
          '快速排序用分治：选基准把数组分成「小于」和「大于」两区，基准一次归位，再递归两区。',
          '分区是核心：一遍扫描把比基准小的换到左侧，最后基准就位，左小右大。',
          '基准每次大致对半分时为 O(n log n)；原地、常数小，是多数语言的默认排序。',
          '基准选砸（如对有序数组固定取端点）会退化到 O(n²)，用随机基准/三数取中规避；快排不稳定。',
        ]}
      />
    </>
  )
}
