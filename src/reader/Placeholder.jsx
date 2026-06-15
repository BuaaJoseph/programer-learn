import { Link } from 'react-router-dom'

export default function Placeholder({ title, courseSlug }) {
  return (
    <div className="center-pane">
      <h1>本章正文撰写中</h1>
      <p>{title ? `《${title}》` : '这一章'}的内容还在编写，敬请期待。你可以先去学习其它已上线的章节。</p>
      <Link className="btn btn-primary" to={courseSlug ? `/course/${courseSlug}` : '/'}>
        返回课程目录
      </Link>
    </div>
  )
}
