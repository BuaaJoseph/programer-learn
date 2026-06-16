import { lazy } from 'react'

export const CONTENT = {
  'net1-c1': lazy(() => import('./volume1/Ch1.jsx')),
  'net1-c2': lazy(() => import('./volume1/Ch2.jsx')),
  'net2-c1': lazy(() => import('./volume2/Ch1.jsx')),
  'net2-c2': lazy(() => import('./volume2/Ch2.jsx')),
  'net2-c3': lazy(() => import('./volume2/Ch3.jsx')),
  'net2-c4': lazy(() => import('./volume2/Ch4.jsx')),
  'net3-c1': lazy(() => import('./volume3/Ch1.jsx')),
  'net3-c2': lazy(() => import('./volume3/Ch2.jsx')),
  'net3-c3': lazy(() => import('./volume3/Ch3.jsx')),
}
export function hasContent(slug) {
  return Object.prototype.hasOwnProperty.call(CONTENT, slug)
}
export function getContent(slug) {
  return CONTENT[slug] || null
}
