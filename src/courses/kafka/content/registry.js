import { lazy } from 'react'

export const CONTENT = {
  'k1-c1': lazy(() => import('./volume1/Ch1.jsx')),
  'k1-c2': lazy(() => import('./volume1/Ch2.jsx')),
  'k1-c3': lazy(() => import('./volume1/Ch3.jsx')),
  'k2-c1': lazy(() => import('./volume2/Ch1.jsx')),
  'k2-c2': lazy(() => import('./volume2/Ch2.jsx')),
  'k2-c3': lazy(() => import('./volume2/Ch3.jsx')),
  'k3-c1': lazy(() => import('./volume3/Ch1.jsx')),
  'k3-c2': lazy(() => import('./volume3/Ch2.jsx')),
  'k3-c3': lazy(() => import('./volume3/Ch3.jsx')),
}
export function hasContent(slug) {
  return Object.prototype.hasOwnProperty.call(CONTENT, slug)
}
export function getContent(slug) {
  return CONTENT[slug] || null
}
