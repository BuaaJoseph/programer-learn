import { lazy } from 'react'

export const CONTENT = {
  'es1-c1': lazy(() => import('./volume1/Ch1.jsx')),
  'es1-c2': lazy(() => import('./volume1/Ch2.jsx')),
  'es1-c3': lazy(() => import('./volume1/Ch3.jsx')),
  'es2-c1': lazy(() => import('./volume2/Ch1.jsx')),
  'es2-c2': lazy(() => import('./volume2/Ch2.jsx')),
  'es2-c3': lazy(() => import('./volume2/Ch3.jsx')),
  'es2-c4': lazy(() => import('./volume2/Ch4.jsx')),
  'es3-c1': lazy(() => import('./volume3/Ch1.jsx')),
  'es3-c2': lazy(() => import('./volume3/Ch2.jsx')),
}
export function hasContent(slug) {
  return Object.prototype.hasOwnProperty.call(CONTENT, slug)
}
export function getContent(slug) {
  return CONTENT[slug] || null
}
