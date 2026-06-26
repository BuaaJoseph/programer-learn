// 排序算法的「帧录制器」——纯逻辑、无 UI，便于单测。
// 每个 build* 把一次排序过程录成 frames：[{ arr, note, roles, sorted:Set, pointers }]。

function recorder() {
  const frames = []
  const snap = (arr, note, { roles = {}, sorted = [], pointers = [] } = {}) => {
    frames.push({ arr: [...arr], note, roles, sorted: new Set(sorted), pointers })
  }
  return { frames, snap }
}

// 插入排序：维护左侧有序区，逐个把新元素插进去。
export function buildInsertion(input) {
  const arr = [...input]
  const { frames, snap } = recorder()
  const sorted = [0]
  snap(arr, '初始：把第 1 个元素看作已排好的「有序区」，从第 2 个开始逐个插入。', { sorted: [0] })
  for (let i = 1; i < arr.length; i++) {
    const key = arr[i]
    snap(arr, `取出 arr[${i}] = ${key} 作为待插入元素，准备在左边有序区里找位置。`, {
      roles: { [i]: 'key' }, sorted: [...sorted], pointers: [{ i, label: 'key' }],
    })
    let j = i - 1
    while (j >= 0 && arr[j] > key) {
      snap(arr, `arr[${j}] = ${arr[j]} > ${key}，比它大，需要给 key 让位。`, {
        roles: { [j]: 'cmp', [j + 1]: 'key' }, sorted: [...sorted], pointers: [{ i: j, label: 'j' }],
      })
      arr[j + 1] = arr[j]
      snap(arr, `把 arr[${j}] 后移一位到 arr[${j + 1}]，腾出空位。`, {
        roles: { [j + 1]: 'write' }, sorted: [...sorted],
      })
      j--
    }
    arr[j + 1] = key
    sorted.push(i)
    snap(arr, `把 key = ${key} 放进空位 arr[${j + 1}]。现在前 ${i + 1} 个元素有序。`, {
      roles: { [j + 1]: 'sorted' }, sorted: [...sorted],
    })
  }
  snap(arr, '全部插入完毕，数组有序。✅', { sorted: arr.map((_, i) => i) })
  return frames
}

// 冒泡排序：相邻比较交换，每轮把最大值冒到右端。
export function buildBubble(input) {
  const arr = [...input]
  const { frames, snap } = recorder()
  const n = arr.length
  const sorted = []
  snap(arr, '初始：每一轮从左到右两两比较，把更大的元素像气泡一样「冒」到右端。', {})
  for (let i = 0; i < n - 1; i++) {
    let swapped = false
    for (let j = 0; j < n - 1 - i; j++) {
      snap(arr, `比较相邻的 arr[${j}] = ${arr[j]} 和 arr[${j + 1}] = ${arr[j + 1]}。`, {
        roles: { [j]: 'cmp', [j + 1]: 'cmp' }, sorted: [...sorted], pointers: [{ i: j, label: 'j' }, { i: j + 1, label: 'j+1' }],
      })
      if (arr[j] > arr[j + 1]) {
        ;[arr[j], arr[j + 1]] = [arr[j + 1], arr[j]]
        swapped = true
        snap(arr, '左边更大，交换它俩，让大的往右走。', {
          roles: { [j]: 'swap', [j + 1]: 'swap' }, sorted: [...sorted],
        })
      }
    }
    sorted.unshift(n - 1 - i)
    snap(arr, `第 ${i + 1} 轮结束，最大的元素已沉到位置 ${n - 1 - i}。`, { sorted: [...sorted] })
    if (!swapped) {
      snap(arr, '本轮没有发生任何交换，说明已经有序，提前结束。', { sorted: arr.map((_, k) => k) })
      break
    }
  }
  if (frames[frames.length - 1].sorted.size < n) {
    snap(arr, '全部冒泡完毕，数组有序。✅', { sorted: arr.map((_, i) => i) })
  }
  return frames
}

// 快速排序：Lomuto 分区，取末尾为基准，pivot 一次归位后递归左右。
export function buildQuick(input) {
  const arr = [...input]
  const { frames, snap } = recorder()
  const placed = new Set()
  snap(arr, '初始：选一个「基准 pivot」，把比它小的甩到左边、大的甩到右边，pivot 就归位了，再对左右两段递归。', {})

  const partition = (lo, hi) => {
    const pivot = arr[hi]
    snap(arr, `区间 [${lo}, ${hi}]：选末尾 arr[${hi}] = ${pivot} 作为基准 pivot。`, {
      roles: { [hi]: 'pivot' }, sorted: [...placed], pointers: [{ i: hi, label: 'pivot' }],
    })
    let i = lo
    for (let j = lo; j < hi; j++) {
      snap(arr, `比较 arr[${j}] = ${arr[j]} 与 pivot ${pivot}。i 指向「小于区」的下一个空位。`, {
        roles: { [j]: 'cmp', [hi]: 'pivot' }, sorted: [...placed], pointers: [{ i, label: 'i' }, { i: j, label: 'j' }],
      })
      if (arr[j] < pivot) {
        if (i !== j) {
          ;[arr[i], arr[j]] = [arr[j], arr[i]]
          snap(arr, `arr[${j}] 比 pivot 小，交换到小于区位置 ${i}。`, {
            roles: { [i]: 'swap', [j]: 'swap', [hi]: 'pivot' }, sorted: [...placed],
          })
        }
        i++
      }
    }
    ;[arr[i], arr[hi]] = [arr[hi], arr[i]]
    placed.add(i)
    snap(arr, `把 pivot 换到位置 ${i}：它左边都比它小、右边都比它大，pivot 永久归位。`, {
      roles: { [i]: 'sorted' }, sorted: [...placed],
    })
    return i
  }
  const qsort = (lo, hi) => {
    if (lo > hi) return
    if (lo === hi) { placed.add(lo); return }
    const p = partition(lo, hi)
    qsort(lo, p - 1)
    qsort(p + 1, hi)
  }
  qsort(0, arr.length - 1)
  snap(arr, '所有 pivot 都归位，数组有序。✅', { sorted: arr.map((_, i) => i) })
  return frames
}

// 归并排序：自顶向下对半拆，再两两合并有序段。
export function buildMerge(input) {
  const arr = [...input]
  const { frames, snap } = recorder()
  snap(arr, '初始：把数组不断对半拆，拆到单个元素天然有序，再两两「合并」成更大的有序段。', {})

  const merge = (lo, mid, hi) => {
    const range = []
    for (let k = lo; k <= hi; k++) range.push(k)
    snap(arr, `合并左段 [${lo}, ${mid}] 与右段 [${mid + 1}, ${hi}]：各自已有序，比较头部择小放入。`, {
      roles: Object.fromEntries(range.map((k) => [k, 'cmp'])),
    })
    const tmp = []
    let i = lo, j = mid + 1
    while (i <= mid && j <= hi) {
      snap(arr, `比较左段 arr[${i}] = ${arr[i]} 和右段 arr[${j}] = ${arr[j]}，取较小的。`, {
        roles: { [i]: 'cmp', [j]: 'cmp' }, pointers: [{ i, label: 'i' }, { i: j, label: 'j' }],
      })
      if (arr[i] <= arr[j]) tmp.push(arr[i++])
      else tmp.push(arr[j++])
    }
    while (i <= mid) tmp.push(arr[i++])
    while (j <= hi) tmp.push(arr[j++])
    for (let k = 0; k < tmp.length; k++) arr[lo + k] = tmp[k]
    snap(arr, `把合并结果写回 [${lo}, ${hi}]，这一段现在整体有序。`, {
      roles: Object.fromEntries(range.map((k) => [k, 'write'])),
    })
  }
  const msort = (lo, hi) => {
    if (lo >= hi) return
    const mid = (lo + hi) >> 1
    msort(lo, mid)
    msort(mid + 1, hi)
    merge(lo, mid, hi)
  }
  msort(0, arr.length - 1)
  snap(arr, '最后一次合并完成，整个数组有序。✅', { sorted: arr.map((_, i) => i) })
  return frames
}

export const SORT_BUILDERS = { insertion: buildInsertion, bubble: buildBubble, quick: buildQuick, merge: buildMerge }
export const SORT_LABELS = { insertion: '插入排序', bubble: '冒泡排序', quick: '快速排序', merge: '归并排序' }
