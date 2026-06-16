import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readTool } from '../src/tools/read.js'
import { writeTool } from '../src/tools/write.js'
import { editTool } from '../src/tools/edit.js'

// 工具单测：在临时目录里跑真实的文件读写，验证行为契约。
function tmp(): string {
  return mkdtempSync(join(tmpdir(), 'forge-'))
}

test('write 后 read 能读回内容', async () => {
  const cwd = tmp()
  await writeTool.execute({ path: 'a.txt', content: 'hello' }, { cwd })
  const r = await readTool.execute({ path: 'a.txt' }, { cwd })
  assert.match(r.output, /hello/)
})

test('edit 要求 oldString 唯一：多处命中应报错', async () => {
  const cwd = tmp()
  writeFileSync(join(cwd, 'a.txt'), 'x\nx\n')
  const r = await editTool.execute({ path: 'a.txt', oldString: 'x', newString: 'y' }, { cwd })
  assert.equal(r.isError, true)
})

test('edit 唯一命中时正确替换', async () => {
  const cwd = tmp()
  writeFileSync(join(cwd, 'a.txt'), 'foo bar baz')
  const r = await editTool.execute({ path: 'a.txt', oldString: 'bar', newString: 'BAR' }, { cwd })
  assert.notEqual(r.isError, true)
  assert.equal(readFileSync(join(cwd, 'a.txt'), 'utf8'), 'foo BAR baz')
})

test('read 不存在的文件返回错误结果而非抛异常', async () => {
  const cwd = tmp()
  const r = await readTool.execute({ path: 'nope.txt' }, { cwd })
  assert.equal(r.isError, true)
})
