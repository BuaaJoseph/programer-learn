import { lazy } from 'react'

// 把每个 slug 映射到对应正文组件（React.lazy 按需加载）。
export const CONTENT = {
  'v1-c1': lazy(() => import('./volume1/Ch1.jsx')),
  'v1-c2': lazy(() => import('./volume1/Ch2.jsx')),
  'v1-c3': lazy(() => import('./volume1/Ch3.jsx')),
  'v1-c4': lazy(() => import('./volume1/Ch4.jsx')),
  'v1-c5': lazy(() => import('./volume1/Ch5.jsx')),
  'v1-c6': lazy(() => import('./volume1/Ch6.jsx')),
  'v1-c7': lazy(() => import('./volume1/Ch7.jsx')),

  'v2-c1': lazy(() => import('./volume2/Ch1.jsx')),
  'v2-c2': lazy(() => import('./volume2/Ch2.jsx')),
  'v2-c3': lazy(() => import('./volume2/Ch3.jsx')),
  'v2-c4': lazy(() => import('./volume2/Ch4.jsx')),
  'v2-c5': lazy(() => import('./volume2/Ch5.jsx')),

  'v3-c1': lazy(() => import('./volume3/Ch1.jsx')),
  'v3-c2': lazy(() => import('./volume3/Ch2.jsx')),
  'v3-c3': lazy(() => import('./volume3/Ch3.jsx')),
  'v3-c4': lazy(() => import('./volume3/Ch4.jsx')),
  'v3-c5': lazy(() => import('./volume3/Ch5.jsx')),
  'v3-c6': lazy(() => import('./volume3/Ch6.jsx')),

  'v4-c1': lazy(() => import('./volume4/Ch1.jsx')),
  'v4-c2': lazy(() => import('./volume4/Ch2.jsx')),
  'v4-c3': lazy(() => import('./volume4/Ch3.jsx')),
  'v4-c4': lazy(() => import('./volume4/Ch4.jsx')),

  'v5-c1': lazy(() => import('./volume5/Ch1.jsx')),
  'v5-c2': lazy(() => import('./volume5/Ch2.jsx')),
  'v5-c3': lazy(() => import('./volume5/Ch3.jsx')),
  'v5-c4': lazy(() => import('./volume5/Ch4.jsx')),
  'v5-c5': lazy(() => import('./volume5/Ch5.jsx')),

  'v6-c1': lazy(() => import('./volume6/Ch1.jsx')),
  'v6-c2': lazy(() => import('./volume6/Ch2.jsx')),
  'v6-c3': lazy(() => import('./volume6/Ch3.jsx')),
  'v6-c4': lazy(() => import('./volume6/Ch4.jsx')),
  'v6-c5': lazy(() => import('./volume6/Ch5.jsx')),

  'v7-c1': lazy(() => import('./volume7/Ch1.jsx')),
  'v7-c2': lazy(() => import('./volume7/Ch2.jsx')),
  'v7-c3': lazy(() => import('./volume7/Ch3.jsx')),
  'v7-c4': lazy(() => import('./volume7/Ch4.jsx')),

  'v8-c1': lazy(() => import('./volume8/Ch1.jsx')),
  'v8-c2': lazy(() => import('./volume8/Ch2.jsx')),
  'v8-c3': lazy(() => import('./volume8/Ch3.jsx')),
  'v8-c4': lazy(() => import('./volume8/Ch4.jsx')),
}

export function hasContent(slug) {
  return Object.prototype.hasOwnProperty.call(CONTENT, slug)
}

export function getContent(slug) {
  return CONTENT[slug] || null
}
