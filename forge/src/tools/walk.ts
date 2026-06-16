import { readdir } from 'node:fs/promises'
import { join, relative } from 'node:path'

// 递归遍历目录，跳过常见的噪声目录，返回所有文件的相对路径。
// glob / grep 共用它，避免各写一遍遍历逻辑。
const IGNORE = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage'])

export async function walkFiles(root: string): Promise<string[]> {
  const out: string[] = []
  async function recur(dir: string): Promise<void> {
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entries) {
      if (e.name.startsWith('.') || IGNORE.has(e.name)) continue
      const full = join(dir, e.name)
      if (e.isDirectory()) {
        await recur(full)
      } else if (e.isFile()) {
        out.push(relative(root, full))
      }
    }
  }
  await recur(root)
  return out
}

// 把简化版 glob（支持 * 和 **）编译成正则。
// *  匹配除 / 外的任意字符；** 匹配任意（含 /）。
export function globToRegExp(pattern: string): RegExp {
  let re = ''
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i]
    if (c === '*') {
      if (pattern[i + 1] === '*') {
        re += '.*'
        i++
        if (pattern[i + 1] === '/') i++
      } else {
        re += '[^/]*'
      }
    } else if ('.+^${}()|[]\\'.includes(c)) {
      re += '\\' + c
    } else if (c === '?') {
      re += '[^/]'
    } else {
      re += c
    }
  }
  return new RegExp('^' + re + '$')
}
