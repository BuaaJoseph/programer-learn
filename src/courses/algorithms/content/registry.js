import { lazy } from 'react'

export const CONTENT = {
  'alg1-c1': lazy(() => import('./volume1/Ch1.jsx')),
  'alg1-c2': lazy(() => import('./volume1/Ch2.jsx')),
  'alg1-c3': lazy(() => import('./volume1/Ch3.jsx')),
  'alg1-c4': lazy(() => import('./volume1/Ch4.jsx')),
  'alg1-c5': lazy(() => import('./volume1/Ch5.jsx')),
  'alg1-c6': lazy(() => import('./volume1/Ch6.jsx')),
  'alg2-c1': lazy(() => import('./volume2/Ch1.jsx')),
  'alg2-c2': lazy(() => import('./volume2/Ch2.jsx')),
  'alg2-c3': lazy(() => import('./volume2/Ch3.jsx')),
  'alg2-c4': lazy(() => import('./volume2/Ch4.jsx')),
  'alg3-c1': lazy(() => import('./volume3/Ch1.jsx')),
  'alg3-c2': lazy(() => import('./volume3/Ch2.jsx')),
  'alg3-c3': lazy(() => import('./volume3/Ch3.jsx')),
}
export function hasContent(slug) {
  return Object.prototype.hasOwnProperty.call(CONTENT, slug)
}
export function getContent(slug) {
  return CONTENT[slug] || null
}
