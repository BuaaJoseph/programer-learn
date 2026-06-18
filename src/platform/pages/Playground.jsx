import { useState } from 'react'
import PlatformLayout from '../PlatformLayout.jsx'
import PyRunner from '../components/PyRunner.jsx'

// 在线 Python 练习场：在浏览器里直接写 Python 并运行看结果（Pyodide，无需后端）。
const EXAMPLES = [
  {
    id: 'hello',
    label: 'Hello World',
    code: `# 你的第一行 Python：把内容打印出来\nprint("你好，Python！")\nprint("1 + 2 =", 1 + 2)`,
  },
  {
    id: 'var',
    label: '变量与类型',
    code: `name = "小明"\nage = 18\nheight = 1.75\nprint(f"{name} 今年 {age} 岁，身高 {height} 米")\nprint("age 的类型是：", type(age))`,
  },
  {
    id: 'loop',
    label: '循环：九九乘法表',
    code: `for i in range(1, 10):\n    row = ""\n    for j in range(1, i + 1):\n        row += f"{j}x{i}={i*j}\\t"\n    print(row)`,
  },
  {
    id: 'list',
    label: '列表与推导式',
    code: `nums = [3, 1, 4, 1, 5, 9, 2, 6]\nprint("原始：", nums)\nprint("排序：", sorted(nums))\nprint("去重：", sorted(set(nums)))\n\n# 列表推导式：取出所有偶数的平方\nevens = [n * n for n in nums if n % 2 == 0]\nprint("偶数的平方：", evens)`,
  },
  {
    id: 'func',
    label: '函数',
    code: `def fib(n):\n    """返回斐波那契数列的前 n 项"""\n    a, b = 0, 1\n    result = []\n    for _ in range(n):\n        result.append(a)\n        a, b = b, a + b\n    return result\n\nprint(fib(10))`,
  },
  {
    id: 'dict',
    label: '字典：词频统计',
    code: `text = "apple banana apple cherry banana apple"\ncount = {}\nfor word in text.split():\n    count[word] = count.get(word, 0) + 1\n\nfor word, n in sorted(count.items(), key=lambda x: -x[1]):\n    print(f"{word}: {n}")`,
  },
  {
    id: 'oop',
    label: '面向对象',
    code: `class Account:\n    def __init__(self, owner, balance=0):\n        self.owner = owner\n        self.balance = balance\n\n    def deposit(self, amount):\n        self.balance += amount\n        return self.balance\n\n    def __str__(self):\n        return f"{self.owner} 的账户余额：{self.balance}"\n\nacc = Account("小红")\nacc.deposit(100)\nacc.deposit(50)\nprint(acc)`,
  },
  {
    id: 'input',
    label: '读取输入',
    code: `name = input("请输入你的名字：")\nprint(f"欢迎你，{name}！")\nn = int(input("输入一个整数："))\nprint(f"{n} 的平方是 {n * n}")`,
  },
]

export default function Playground() {
  const [exId, setExId] = useState('hello')
  const ex = EXAMPLES.find((e) => e.id === exId) || EXAMPLES[0]

  return (
    <PlatformLayout>
      <div className="container playground">
        <h1 className="browse-h1">Python 在线运行</h1>
        <p className="section-desc">
          在下面的编辑器里直接写 Python 并点「运行」，结果就在页面上显示——完全在你的浏览器里执行，
          无需安装任何环境。第一次运行会从 CDN 加载运行环境（约几秒，仅一次）。
        </p>

        <div className="playground-presets">
          <span className="playground-presets-label">示例：</span>
          {EXAMPLES.map((e) => (
            <button
              key={e.id}
              className={`playground-chip ${e.id === exId ? 'active' : ''}`}
              onClick={() => setExId(e.id)}
            >
              {e.label}
            </button>
          ))}
        </div>

        <PyRunner key={ex.id} initialCode={ex.code} title={`示例 · ${ex.label}`} minLines={8} />

        <div className="playground-note">
          想系统学 Python？去看
          {' '}<a href="/course/python-tutorial">《Python 教程：从入门到 Agent 开发》</a>，
          每节都配可运行的小例子。
        </div>
      </div>
    </PlatformLayout>
  )
}
