import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const controlledInput = `function NameField() {
  const [name, setName] = useState('')

  return (
    <input
      value={name}                          // state 是数据源
      onChange={e => setName(e.target.value)} // 输入回流到 state
    />
  )
}`

const uncontrolledInput = `function NameField() {
  const inputRef = useRef(null)

  function handleSubmit() {
    // 不把每次输入放进 state，提交时才用 ref 直接读 DOM
    console.log(inputRef.current.value)
  }

  return (
    <>
      <input ref={inputRef} defaultValue="" />
      <button onClick={handleSubmit}>提交</button>
    </>
  )
}`

const textareaSelect = `// textarea：用 value（不像原生 HTML 把内容写在标签之间）
<textarea value={bio} onChange={e => setBio(e.target.value)} />

// select：value 放在 <select> 上，而不是 <option> 上
<select value={city} onChange={e => setCity(e.target.value)}>
  <option value="hz">杭州</option>
  <option value="bj">北京</option>
  <option value="gz">广州</option>
</select>`

const checkboxRadio = `// 单个 checkbox：用 checked + e.target.checked（布尔）
<input
  type="checkbox"
  checked={agree}
  onChange={e => setAgree(e.target.checked)}
/>

// radio：同名一组，靠 checked 判断哪个选中
<label>
  <input
    type="radio"
    name="gender"
    value="male"
    checked={gender === 'male'}
    onChange={e => setGender(e.target.value)}
  />
  男
</label>`

const objectState = `const [form, setForm] = useState({
  username: '',
  email: '',
  agree: false,
})

// 一个通用 onChange 处理所有字段：用 name + 计算属性名
function handleChange(e) {
  const { name, value, type, checked } = e.target
  setForm(f => ({
    ...f,
    [name]: type === 'checkbox' ? checked : value,
  }))
}

// 各字段只要写好 name 即可复用同一个处理器
<input name="username" value={form.username} onChange={handleChange} />
<input name="email" value={form.email} onChange={handleChange} />
<input type="checkbox" name="agree" checked={form.agree} onChange={handleChange} />`

const fullForm = `import { useState } from 'react'

const initial = { username: '', email: '', city: 'hz', agree: false }

function SignupForm() {
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(null)

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  // 校验：返回一个 { 字段名: 错误信息 } 对象
  function validate(values) {
    const errs = {}
    if (!values.username.trim()) errs.username = '请填写用户名'
    if (!/^[^@]+@[^@]+\\.[^@]+$/.test(values.email)) errs.email = '邮箱格式不对'
    if (!values.agree) errs.agree = '需勾选同意条款'
    return errs
  }

  function handleSubmit(e) {
    e.preventDefault()              // 阻止表单默认刷新
    const errs = validate(form)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return   // 有错就不提交
    setSubmitted(form)              // 这里可换成真实的网络请求
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>用户名</label>
        <input name="username" value={form.username} onChange={handleChange} />
        {errors.username && <span className="err">{errors.username}</span>}
      </div>

      <div>
        <label>邮箱</label>
        <input name="email" value={form.email} onChange={handleChange} />
        {errors.email && <span className="err">{errors.email}</span>}
      </div>

      <div>
        <label>城市</label>
        <select name="city" value={form.city} onChange={handleChange}>
          <option value="hz">杭州</option>
          <option value="bj">北京</option>
          <option value="gz">广州</option>
        </select>
      </div>

      <div>
        <label>
          <input type="checkbox" name="agree" checked={form.agree} onChange={handleChange} />
          我已阅读并同意条款
        </label>
        {errors.agree && <span className="err">{errors.agree}</span>}
      </div>

      <button type="submit">注册</button>

      {submitted && <pre>{JSON.stringify(submitted, null, 2)}</pre>}
    </form>
  )
}`

const fileInput = `// 文件输入必须是非受控：它的 value 不能被 JS 赋值（安全限制）
function Upload() {
  const fileRef = useRef(null)

  function handleSubmit() {
    const file = fileRef.current.files[0]
    console.log(file?.name)
  }

  return (
    <>
      <input type="file" ref={fileRef} />
      <button onClick={handleSubmit}>上传</button>
    </>
  )
}`

const rhfSnippet = `import { useForm } from 'react-hook-form'

function SignupForm() {
  const { register, handleSubmit, formState: { errors } } = useForm()
  const onSubmit = data => console.log(data)

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* register 内部多用非受控 + ref，输入时不引起整表单重渲染 */}
      <input {...register('email', { required: '必填' })} />
      {errors.email && <span>{errors.email.message}</span>}
      <button type="submit">提交</button>
    </form>
  )
}`

export default function Ch2() {
  return (
    <article>
      <Lead>
        表单是交互应用的核心。React 处理表单有两条路线：<strong>受控组件</strong>——让 state 成为输入的
        「唯一数据源」，输入和界面始终同步；以及<strong>非受控组件</strong>——让 DOM 自己保管值，
        需要时用 ref 直接读。这一章我们把两者讲清楚，覆盖 input / textarea / select / checkbox / radio
        各自的写法，演示用一个对象 state 管理多字段表单，并给出一个完整可运行的注册表单（含校验与提交）。
      </Lead>

      <h2>一、受控组件：state 是唯一数据源</h2>
      <KeyIdea>
        受控组件的核心是两件事绑在一起：<code>value</code> 来自 state，<code>onChange</code> 把输入写回 state。
        于是「界面显示什么」永远等于「state 里是什么」——state 成为<strong>唯一数据源
        （single source of truth）</strong>。
      </KeyIdea>
      <CodeBlock lang="jsx" title="最基础的受控 input" code={controlledInput} />
      <p>
        这里形成一个闭环：用户敲键 → 触发 <code>onChange</code> → <code>setName</code> 更新 state →
        组件重渲染 → <code>{'value={name}'}</code> 把新值显示出来。因为值由 React 掌管，你可以随时
        在 <code>onChange</code> 里改写、过滤、格式化输入（比如强制转大写、只留数字），界面会立刻反映出来。
      </p>

      <h2>二、非受控组件：用 ref 读 DOM</h2>
      <p>
        与受控相对，<strong>非受控组件</strong>不把每次输入都放进 state，而是让浏览器 DOM 自己保管值，
        只在需要时（通常是提交时）用 <code>ref</code> 直接去读。初始值用 <code>defaultValue</code>
        （checkbox 用 <code>defaultChecked</code>），而不是 <code>value</code>。
      </p>
      <CodeBlock lang="jsx" title="非受控 input：提交时用 ref 读值" code={uncontrolledInput} />
      <table>
        <thead>
          <tr><th>对比项</th><th>受控组件</th><th>非受控组件</th></tr>
        </thead>
        <tbody>
          <tr><td>值存在哪</td><td>React state</td><td>DOM 自身</td></tr>
          <tr><td>读取方式</td><td>直接读 state</td><td>用 ref 读 DOM</td></tr>
          <tr><td>初始值属性</td><td><code>value</code></td><td><code>defaultValue</code></td></tr>
          <tr><td>实时校验 / 联动</td><td>容易</td><td>较麻烦</td></tr>
          <tr><td>每次输入重渲染</td><td>会</td><td>不会</td></tr>
          <tr><td>典型场景</td><td>多数表单</td><td>文件输入、集成第三方</td></tr>
        </tbody>
      </table>

      <h2>三、各类表单元素的受控写法</h2>
      <h3>textarea 与 select</h3>
      <p>
        React 把它们统一成「<code>value</code> + <code>onChange</code>」模式：原生 HTML 里
        textarea 的内容写在标签之间、select 的选中靠 <code>{'<option selected>'}</code>，
        而 React 里一律用 <code>value</code> 控制，更一致也更好维护。
      </p>
      <CodeBlock lang="jsx" title="textarea / select" code={textareaSelect} />
      <h3>checkbox 与 radio</h3>
      <p>
        这两个特殊：它们用 <code>checked</code>（布尔）而非 <code>value</code> 表示选中状态，
        在 <code>onChange</code> 里读 <code>e.target.checked</code>。一组单选 radio 共享同一个
        <code>name</code>，靠 <code>{'checked={state === 当前值}'}</code> 判断哪个被选中。
      </p>
      <CodeBlock lang="jsx" title="checkbox / radio" code={checkboxRadio} />

      <h2>四、多字段表单：一个对象 state + 计算属性名</h2>
      <p>
        一个表单往往有很多字段。与其为每个字段写一个 <code>useState</code>，不如用<strong>一个对象</strong>
        统一管理，再写<strong>一个通用 <code>onChange</code></strong>。关键技巧是给每个输入加 <code>name</code>，
        然后在更新时用<strong>计算属性名</strong> <code>{'[name]: value'}</code> 动态定位字段。
      </p>
      <CodeBlock lang="jsx" title="一个对象管理整个表单" code={objectState} />
      <Callout variant="info" title="为什么是 setForm(f => ({ ...f, [name]: value }))">
        必须先展开旧对象 <code>{'...f'}</code> 保留其他字段，再用计算属性名覆盖当前字段；
        且要用函数式更新读最新的 <code>f</code>，避免在批量更新时丢字段。
        注意 <code>{'({ ...f })'}</code> 外层的圆括号——箭头函数直接返回对象字面量时不能少。
      </Callout>

      <h2>五、完整示例：带校验与提交的注册表单</h2>
      <p>
        把上面所有点合起来，下面是一个可直接运行的注册表单：对象 state 管理多字段、通用 onChange、
        提交时校验、错误信息逐字段显示、校验通过才「提交」。
      </p>
      <Example title="可运行的受控注册表单">
        <p>
          <code>handleSubmit</code> 里先 <code>e.preventDefault()</code> 阻止默认刷新，
          再跑 <code>validate</code> 得到错误对象；若有错就把 <code>errors</code> 写进 state 并中止，
          界面会在对应字段下显示提示；全部通过才进入提交分支（实战里换成网络请求即可）。
        </p>
      </Example>
      <CodeBlock lang="jsx" title="SignupForm 完整代码" code={fullForm} />

      <h2>六、性能与取舍：是否每次输入都进 state</h2>
      <p>
        受控组件的代价是：<strong>每敲一个字符都会触发一次 setState 与重渲染</strong>。对绝大多数表单，
        这点开销完全可以忽略。但在两种情况下需要留意：
      </p>
      <ul>
        <li>字段极多、或单字段输入会带动一棵很大的子树重渲染时，频繁渲染可能造成输入卡顿。</li>
        <li>把表单值放进<strong>全局状态</strong>（如 Redux / Context）时，每次输入都广播全局更新，代价更大。</li>
      </ul>
      <p>
        一个实用原则：<strong>表单本地状态优先放在组件自己的 state 里</strong>，不要轻易塞进全局。
        只有当多个远处组件确实需要共享这份值时，才上提到全局。需要时也可以用防抖、把重子树用
        <code>React.memo</code> 隔离，或干脆改用非受控来削减渲染。
      </p>

      <h2>七、何时用 ref / 非受控</h2>
      <p>
        非受控不是「落后写法」，在以下场景它反而更合适：
      </p>
      <ul>
        <li><strong>文件输入 <code>{'<input type="file" />'}</code></strong>：浏览器出于安全，其 <code>value</code> 不能被 JS 设置，因此<strong>只能非受控</strong>，用 ref 读 <code>files</code>。</li>
        <li><strong>集成第三方 / 非 React 的 DOM 库</strong>：那些库自己操作 DOM，用 ref 把节点交给它们更顺手。</li>
        <li><strong>只在提交时取值、不需要实时联动的简单表单</strong>：非受控能省掉每次输入的重渲染。</li>
        <li>聚焦、滚动、测量尺寸等<strong>命令式操作</strong>，也都靠 ref。</li>
      </ul>
      <CodeBlock lang="jsx" title="文件输入：必须非受控" code={fileInput} />

      <h2>八、表单库：什么时候该上 react-hook-form</h2>
      <p>
        当表单变得很大（几十个字段）、校验规则复杂、还要管脏值 / 触碰状态 / 异步校验时，手写会很啰嗦。
        这时可以引入表单库。社区最常用的是 <strong>react-hook-form</strong>：它内部大量采用
        <strong>非受控 + ref</strong>，输入时不会引起整张表单重渲染，性能很好，API 也简洁。
      </p>
      <CodeBlock lang="jsx" title="react-hook-form 速览" code={rhfSnippet} />
      <Callout variant="tip">
        小表单（一两个字段）手写受控完全够用，别为了用库而用库；
        字段多、校验杂、对性能敏感时，再考虑 react-hook-form 这类方案。
      </Callout>

      <Summary
        points={[
          '受控组件：value 来自 state、onChange 写回 state，state 成为唯一数据源（single source of truth）。',
          '非受控组件：值存在 DOM 里，用 ref 读取，初始值用 defaultValue / defaultChecked。',
          'textarea 与 select 用 value 控制；checkbox / radio 用 checked + e.target.checked。',
          '多字段表单用一个对象 state + 通用 onChange，靠 name 与计算属性名 setForm(f => ({ ...f, [name]: value })) 更新。',
          '提交时 e.preventDefault()，校验得到错误对象、逐字段显示，通过后才提交。',
          '受控每次输入都重渲染：本地状态优先，别轻易塞进全局；必要时用 memo / 防抖 / 非受控削减渲染。',
          '文件输入只能非受控，集成第三方库也用 ref；字段多、校验复杂时考虑 react-hook-form。',
        ]}
      />
    </article>
  )
}
