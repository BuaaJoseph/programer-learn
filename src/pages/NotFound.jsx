import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="center-pane">
      <h1>404 · 页面不存在</h1>
      <p>你访问的页面找不到了，可能链接已失效或地址输入有误。</p>
      <Link className="btn btn-primary" to="/">
        返回首页
      </Link>
    </div>
  )
}
