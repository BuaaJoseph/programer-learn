import { lazy } from 'react'

export const CONTENT = {
  'os1-c1': lazy(() => import('./volume1/Ch1.jsx')),
  'os1-c2': lazy(() => import('./volume1/Ch2.jsx')),
  'os1-c3': lazy(() => import('./volume1/Ch3.jsx')),
  'os1-c4': lazy(() => import('./volume1/Ch4.jsx')),
  'os2-c1': lazy(() => import('./volume2/Ch1.jsx')),
  'os2-c2': lazy(() => import('./volume2/Ch2.jsx')),
  'os2-c3': lazy(() => import('./volume2/Ch3.jsx')),
  'os2-c4': lazy(() => import('./volume2/Ch4.jsx')),
}
export function hasContent(slug) {
  return Object.prototype.hasOwnProperty.call(CONTENT, slug)
}
export function getContent(slug) {
  return CONTENT[slug] || null
}
