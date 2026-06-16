import { lazy } from 'react'

export const CONTENT = {
  'dp1-c1': lazy(() => import('./volume1/Ch1.jsx')),
  'dp1-c2': lazy(() => import('./volume1/Ch2.jsx')),
  'dp1-c3': lazy(() => import('./volume1/Ch3.jsx')),
  'dp1-c4': lazy(() => import('./volume1/Ch4.jsx')),
  'dp2-c1': lazy(() => import('./volume2/Ch1.jsx')),
  'dp2-c2': lazy(() => import('./volume2/Ch2.jsx')),
  'dp3-c1': lazy(() => import('./volume3/Ch1.jsx')),
  'dp3-c2': lazy(() => import('./volume3/Ch2.jsx')),
}
export function hasContent(slug) {
  return Object.prototype.hasOwnProperty.call(CONTENT, slug)
}
export function getContent(slug) {
  return CONTENT[slug] || null
}
