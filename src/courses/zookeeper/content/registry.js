import { lazy } from 'react'

export const CONTENT = {
  'zk1-c1': lazy(() => import('./volume1/Ch1.jsx')),
  'zk1-c2': lazy(() => import('./volume1/Ch2.jsx')),
  'zk1-c3': lazy(() => import('./volume1/Ch3.jsx')),
  'zk2-c1': lazy(() => import('./volume2/Ch1.jsx')),
  'zk2-c2': lazy(() => import('./volume2/Ch2.jsx')),
  'zk2-c3': lazy(() => import('./volume2/Ch3.jsx')),
  'zk2-c4': lazy(() => import('./volume2/Ch4.jsx')),
  'zk2-c5': lazy(() => import('./volume2/Ch5.jsx')),
}
export function hasContent(slug) {
  return Object.prototype.hasOwnProperty.call(CONTENT, slug)
}
export function getContent(slug) {
  return CONTENT[slug] || null
}
