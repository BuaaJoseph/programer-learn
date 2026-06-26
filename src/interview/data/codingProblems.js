// 编程考察题库：均为中等及以上难度，来源于 LeetCode / 牛客等公开题型（已用自己的话改写）。
// 面试时会随机抽取一道。每题给出题面与样例；用户在编辑器里写「完整可运行程序」，
// 从标准输入读数据、向标准输出打印结果（运行时可在「输入」框提供 stdin）。
export const CODING_PROBLEMS = [
  {
    id: 'two-sum-ii',
    title: '两数之和 II（有序数组）',
    difficulty: '中等',
    tags: ['数组', '双指针'],
    statement:
      '给定一个已按升序排列的整数数组 numbers 和目标值 target，请找出两个数使它们相加之和等于 target，返回这两个数的下标（从 1 开始），要求空间复杂度 O(1)。\n\n输入：第一行为目标值 target，第二行为以空格分隔的有序数组。\n输出：两个下标，空格分隔。',
    sampleInput: '9\n2 7 11 15',
    sampleOutput: '1 2',
  },
  {
    id: 'longest-substring',
    title: '无重复字符的最长子串',
    difficulty: '中等',
    tags: ['滑动窗口', '哈希'],
    statement:
      '给定一个字符串 s，找出其中不含重复字符的最长子串的长度。\n\n输入：一行字符串 s。\n输出：最长无重复子串的长度。',
    sampleInput: 'abcabcbb',
    sampleOutput: '3',
  },
  {
    id: 'add-two-numbers',
    title: '两个大数相加（字符串）',
    difficulty: '中等',
    tags: ['字符串', '模拟'],
    statement:
      '给定两个用字符串表示的非负大整数 a、b（可能超过 long 范围），返回它们之和（字符串）。\n\n输入：两行，分别为 a 和 b。\n输出：a + b。',
    sampleInput: '99999999999999999999\n1',
    sampleOutput: '100000000000000000000',
  },
  {
    id: 'lru-cache',
    title: 'LRU 缓存机制',
    difficulty: '中等',
    tags: ['设计', '哈希', '双向链表'],
    statement:
      '设计并实现一个 LRU（最近最少使用）缓存，支持 get 和 put，容量满时淘汰最久未使用的项，均要求 O(1)。\n\n输入：第一行为容量 cap 与操作数 n；接下来 n 行，每行形如 "put 1 1" 或 "get 1"。\n输出：每个 get 操作的返回值（未命中输出 -1），空格分隔在一行。',
    sampleInput: '2 5\nput 1 1\nput 2 2\nget 1\nput 3 3\nget 2',
    sampleOutput: '1 -1',
  },
  {
    id: 'longest-palindrome',
    title: '最长回文子串',
    difficulty: '中等',
    tags: ['字符串', '动态规划'],
    statement:
      '给定字符串 s，返回它的最长回文子串。\n\n输入：一行字符串 s。\n输出：最长回文子串（若有多个，输出任意一个）。',
    sampleInput: 'babad',
    sampleOutput: 'bab',
  },
  {
    id: 'three-sum',
    title: '三数之和',
    difficulty: '中等',
    tags: ['数组', '双指针'],
    statement:
      '给定数组 nums，找出所有和为 0 且不重复的三元组，按升序输出。\n\n输入：一行以空格分隔的整数数组。\n输出：每行一个三元组（升序、空格分隔）；无解输出空。',
    sampleInput: '-1 0 1 2 -1 -4',
    sampleOutput: '-1 -1 2\n-1 0 1',
  },
  {
    id: 'container-water',
    title: '盛最多水的容器',
    difficulty: '中等',
    tags: ['双指针', '贪心'],
    statement:
      '给定 n 个非负整数表示柱子高度，找出两条柱子使其与 x 轴构成的容器能盛最多的水，输出最大面积。\n\n输入：一行以空格分隔的高度数组。\n输出：最大面积。',
    sampleInput: '1 8 6 2 5 4 8 3 7',
    sampleOutput: '49',
  },
  {
    id: 'coin-change',
    title: '零钱兑换',
    difficulty: '中等',
    tags: ['动态规划'],
    statement:
      '给定硬币面额数组 coins 和总金额 amount，求凑成总金额所需最少硬币数；无法凑成输出 -1。\n\n输入：第一行 amount；第二行硬币面额（空格分隔）。\n输出：最少硬币数。',
    sampleInput: '11\n1 2 5',
    sampleOutput: '3',
  },
  {
    id: 'word-break',
    title: '单词拆分',
    difficulty: '中等',
    tags: ['动态规划', '字符串'],
    statement:
      '给定字符串 s 和单词字典 wordDict，判断 s 是否能被空格拆分成字典中的单词序列。\n\n输入：第一行 s；第二行字典单词（空格分隔）。\n输出：true 或 false。',
    sampleInput: 'leetcode\nleet code',
    sampleOutput: 'true',
  },
  {
    id: 'num-islands',
    title: '岛屿数量',
    difficulty: '中等',
    tags: ['DFS', 'BFS', '并查集'],
    statement:
      "给定由 '1'（陆地）和 '0'（水）组成的二维网格，计算岛屿数量。岛屿由相邻（上下左右）陆地连接。\n\n输入：第一行 m n；接下来 m 行，每行 n 个 0/1（空格分隔）。\n输出：岛屿数量。",
    sampleInput: '3 3\n1 1 0\n0 1 0\n0 0 1',
    sampleOutput: '2',
  },
  {
    id: 'course-schedule',
    title: '课程表（拓扑排序）',
    difficulty: '中等',
    tags: ['图', '拓扑排序'],
    statement:
      '共有 numCourses 门课，先修关系给定为 [a, b]（学 a 前必须先学 b）。判断能否完成所有课程。\n\n输入：第一行 numCourses 与边数 m；接下来 m 行每行两个数 a b。\n输出：true 或 false。',
    sampleInput: '2 1\n1 0',
    sampleOutput: 'true',
  },
  {
    id: 'kth-largest',
    title: '数组中的第 K 个最大元素',
    difficulty: '中等',
    tags: ['堆', '快速选择'],
    statement:
      '在未排序数组中找到第 k 个最大的元素。\n\n输入：第一行 k；第二行数组（空格分隔）。\n输出：第 k 大的元素。',
    sampleInput: '2\n3 2 1 5 6 4',
    sampleOutput: '5',
  },
  {
    id: 'merge-intervals',
    title: '合并区间',
    difficulty: '中等',
    tags: ['排序', '区间'],
    statement:
      '给定若干区间，合并所有重叠区间。\n\n输入：第一行区间数 n；接下来 n 行每行两个数 start end。\n输出：合并后的区间，每行两个数（按起点升序）。',
    sampleInput: '4\n1 3\n2 6\n8 10\n15 18',
    sampleOutput: '1 6\n8 10\n15 18',
  },
  {
    id: 'rotate-image',
    title: '旋转图像',
    difficulty: '中等',
    tags: ['数组', '矩阵'],
    statement:
      '给定 n×n 矩阵，将其原地顺时针旋转 90 度。\n\n输入：第一行 n；接下来 n 行每行 n 个数。\n输出：旋转后的矩阵。',
    sampleInput: '3\n1 2 3\n4 5 6\n7 8 9',
    sampleOutput: '7 4 1\n8 5 2\n9 6 3',
  },
  {
    id: 'subsets',
    title: '子集',
    difficulty: '中等',
    tags: ['回溯', '位运算'],
    statement:
      '给定一个不含重复元素的整数数组 nums，返回其所有可能的子集（幂集）。\n\n输入：一行数组（空格分隔）。\n输出：每行一个子集（空格分隔，含空行表示空集），顺序不限。',
    sampleInput: '1 2 3',
    sampleOutput: '\n1\n2\n1 2\n3\n1 3\n2 3\n1 2 3',
  },
  {
    id: 'permutations',
    title: '全排列',
    difficulty: '中等',
    tags: ['回溯'],
    statement:
      '给定不含重复数字的数组 nums，返回其所有全排列。\n\n输入：一行数组（空格分隔）。\n输出：每行一个排列（空格分隔），顺序不限。',
    sampleInput: '1 2 3',
    sampleOutput: '1 2 3\n1 3 2\n2 1 3\n2 3 1\n3 1 2\n3 2 1',
  },
  {
    id: 'search-rotated',
    title: '搜索旋转排序数组',
    difficulty: '中等',
    tags: ['二分查找'],
    statement:
      '整数数组 nums 升序排列后在某个未知点旋转，给定 target，存在则返回下标，否则返回 -1，要求 O(log n)。\n\n输入：第一行 target；第二行数组。\n输出：下标或 -1。',
    sampleInput: '0\n4 5 6 7 0 1 2',
    sampleOutput: '4',
  },
  {
    id: 'product-except-self',
    title: '除自身以外数组的乘积',
    difficulty: '中等',
    tags: ['数组', '前缀积'],
    statement:
      '给定数组 nums，返回数组 answer，其中 answer[i] 等于 nums 中除 nums[i] 之外其余元素的乘积，不能使用除法，O(n)。\n\n输入：一行数组。\n输出：结果数组（空格分隔）。',
    sampleInput: '1 2 3 4',
    sampleOutput: '24 12 8 6',
  },
  {
    id: 'daily-temperatures',
    title: '每日温度（单调栈）',
    difficulty: '中等',
    tags: ['单调栈'],
    statement:
      '给定每日温度数组，返回数组 answer，answer[i] 表示第 i 天之后要等多少天才会有更高温度；若不存在则为 0。\n\n输入：一行温度数组。\n输出：结果数组（空格分隔）。',
    sampleInput: '73 74 75 71 69 72 76 73',
    sampleOutput: '1 1 4 2 1 1 0 0',
  },
  {
    id: 'min-path-sum',
    title: '最小路径和',
    difficulty: '中等',
    tags: ['动态规划', '矩阵'],
    statement:
      '给定 m×n 非负网格，从左上走到右下，每次只能向右或向下，求路径上数字和的最小值。\n\n输入：第一行 m n；接下来 m 行每行 n 个数。\n输出：最小路径和。',
    sampleInput: '3 3\n1 3 1\n1 5 1\n4 2 1',
    sampleOutput: '7',
  },
  {
    id: 'unique-paths',
    title: '不同路径',
    difficulty: '中等',
    tags: ['动态规划', '组合数学'],
    statement:
      'm×n 网格，机器人从左上到右下，每次只能向右或向下，求不同路径总数。\n\n输入：一行 m n。\n输出：路径数。',
    sampleInput: '3 7',
    sampleOutput: '28',
  },
  {
    id: 'max-subarray',
    title: '最大子数组和',
    difficulty: '中等',
    tags: ['动态规划', '分治'],
    statement:
      '给定整数数组 nums，找到具有最大和的连续子数组，返回其和。\n\n输入：一行数组。\n输出：最大子数组和。',
    sampleInput: '-2 1 -3 4 -1 2 1 -5 4',
    sampleOutput: '6',
  },
  {
    id: 'group-anagrams',
    title: '字母异位词分组',
    difficulty: '中等',
    tags: ['哈希', '字符串'],
    statement:
      '给定字符串数组，把字母异位词组合在一起。\n\n输入：一行若干单词（空格分隔）。\n输出：每行一组异位词（空格分隔），组内与组间顺序不限。',
    sampleInput: 'eat tea tan ate nat bat',
    sampleOutput: 'eat tea ate\ntan nat\nbat',
  },
  {
    id: 'spiral-matrix',
    title: '螺旋矩阵',
    difficulty: '中等',
    tags: ['矩阵', '模拟'],
    statement:
      '给定 m×n 矩阵，按顺时针螺旋顺序返回所有元素。\n\n输入：第一行 m n；接下来 m 行每行 n 个数。\n输出：螺旋顺序的所有元素（空格分隔，一行）。',
    sampleInput: '3 3\n1 2 3\n4 5 6\n7 8 9',
    sampleOutput: '1 2 3 6 9 8 7 4 5',
  },
  {
    id: 'jump-game',
    title: '跳跃游戏',
    difficulty: '中等',
    tags: ['贪心'],
    statement:
      '给定非负整数数组 nums，初始位于下标 0，每个元素代表在该位置可跳跃的最大长度，判断能否到达最后一个下标。\n\n输入：一行数组。\n输出：true 或 false。',
    sampleInput: '2 3 1 1 4',
    sampleOutput: 'true',
  },
  {
    id: 'longest-consecutive',
    title: '最长连续序列',
    difficulty: '中等',
    tags: ['哈希', '并查集'],
    statement:
      '给定未排序数组 nums，找出数字连续的最长序列长度，要求 O(n)。\n\n输入：一行数组。\n输出：最长连续序列长度。',
    sampleInput: '100 4 200 1 3 2',
    sampleOutput: '4',
  },
  {
    id: 'top-k-frequent',
    title: '前 K 个高频元素',
    difficulty: '中等',
    tags: ['堆', '哈希'],
    statement:
      '给定整数数组 nums 和整数 k，返回出现频率前 k 高的元素（按频率从高到低）。\n\n输入：第一行 k；第二行数组。\n输出：前 k 个高频元素（空格分隔）。',
    sampleInput: '2\n1 1 1 2 2 3',
    sampleOutput: '1 2',
  },
  {
    id: 'decode-ways',
    title: '解码方法',
    difficulty: '中等',
    tags: ['动态规划', '字符串'],
    statement:
      "数字到字母的映射为 '1'->A ... '26'->Z。给定只含数字的字符串 s，计算它有多少种解码方法。\n\n输入：一行数字字符串 s。\n输出：解码方法数。",
    sampleInput: '226',
    sampleOutput: '3',
  },
  {
    id: 'validate-bst',
    title: '验证二叉搜索树',
    difficulty: '中等',
    tags: ['树', 'DFS'],
    statement:
      '给定二叉树的层序遍历（null 表示空节点），判断它是否是有效的二叉搜索树。\n\n输入：一行层序遍历，节点值或 null，空格分隔。\n输出：true 或 false。',
    sampleInput: '5 1 4 null null 3 6',
    sampleOutput: 'false',
  },
  {
    id: 'gas-station',
    title: '加油站',
    difficulty: '中等',
    tags: ['贪心'],
    statement:
      '环路上有 n 个加油站，gas[i] 为可加油量，cost[i] 为到下一站的耗油。从某站出发绕一圈，返回可行的起始站下标，无解返回 -1。\n\n输入：第一行 gas 数组；第二行 cost 数组。\n输出：起始站下标或 -1。',
    sampleInput: '1 2 3 4 5\n3 4 5 1 2',
    sampleOutput: '3',
  },
  {
    id: 'partition-equal',
    title: '分割等和子集',
    difficulty: '中等',
    tags: ['动态规划', '背包'],
    statement:
      '给定只含正整数的非空数组 nums，判断能否将其分割成两个和相等的子集。\n\n输入：一行数组。\n输出：true 或 false。',
    sampleInput: '1 5 11 5',
    sampleOutput: 'true',
  },
  {
    id: 'house-robber-ii',
    title: '打家劫舍 II（环形）',
    difficulty: '中等',
    tags: ['动态规划'],
    statement:
      '房屋围成一圈，相邻两间不能同时偷。给定每间金额数组 nums，求能偷到的最高金额。\n\n输入：一行数组。\n输出：最高金额。',
    sampleInput: '2 3 2',
    sampleOutput: '3',
  },
  {
    id: 'find-duplicate',
    title: '寻找重复数',
    difficulty: '中等',
    tags: ['双指针', '快慢指针'],
    statement:
      '给定 n+1 个整数的数组 nums，数字都在 [1, n] 内，存在且仅存在一个重复数，找出它（不修改数组、O(1) 空间）。\n\n输入：一行数组。\n输出：重复的数字。',
    sampleInput: '1 3 4 2 2',
    sampleOutput: '2',
  },
  {
    id: 'min-window',
    title: '最小覆盖子串',
    difficulty: '困难',
    tags: ['滑动窗口', '哈希'],
    statement:
      '给定字符串 s 和 t，返回 s 中涵盖 t 所有字符的最小子串；不存在则返回空串。\n\n输入：第一行 s；第二行 t。\n输出：最小覆盖子串。',
    sampleInput: 'ADOBECODEBANC\nABC',
    sampleOutput: 'BANC',
  },
  {
    id: 'trapping-rain',
    title: '接雨水',
    difficulty: '困难',
    tags: ['双指针', '单调栈'],
    statement:
      '给定 n 个非负整数表示柱子高度图，计算下雨后能接多少雨水。\n\n输入：一行高度数组。\n输出：能接的雨水总量。',
    sampleInput: '0 1 0 2 1 0 1 3 2 1 2 1',
    sampleOutput: '6',
  },
  {
    id: 'edit-distance',
    title: '编辑距离',
    difficulty: '困难',
    tags: ['动态规划'],
    statement:
      '给定两个单词 word1 和 word2，返回将 word1 转换成 word2 所使用的最少操作数（插入/删除/替换）。\n\n输入：两行，分别为 word1 和 word2。\n输出：最少操作数。',
    sampleInput: 'horse\nros',
    sampleOutput: '3',
  },
  {
    id: 'lis',
    title: '最长递增子序列',
    difficulty: '中等',
    tags: ['动态规划', '二分'],
    statement:
      '给定整数数组 nums，找到其中最长严格递增子序列的长度。\n\n输入：一行数组。\n输出：最长递增子序列长度。',
    sampleInput: '10 9 2 5 3 7 101 18',
    sampleOutput: '4',
  },
]

// 各语言的起手模板：用户写完整程序，从 stdin 读、向 stdout 打印。
export const CODE_TEMPLATES = {
  python: `import sys

def solve(data):
    # data 是按行切分的输入列表；在这里实现你的逻辑并 print 结果
    pass

def main():
    data = sys.stdin.read().split('\\n')
    solve(data)

if __name__ == '__main__':
    main()
`,
  java: `import java.util.*;
import java.io.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        // 在这里读取输入、实现逻辑并 System.out.println 输出结果
        // String line = br.readLine();
    }
}
`,
}

export function randomProblem() {
  const i = Math.floor(Math.random() * CODING_PROBLEMS.length)
  return CODING_PROBLEMS[i]
}
