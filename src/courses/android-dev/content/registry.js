import { lazy } from 'react'

export const CONTENT = {
  'a0-c1': lazy(() => import('./volume0/Ch1.jsx')),
  'a0-c2': lazy(() => import('./volume0/Ch2.jsx')),
  'a1-c1': lazy(() => import('./volume1/Ch1.jsx')),
  'a1-c2': lazy(() => import('./volume1/Ch2.jsx')),
  'a2-c1': lazy(() => import('./volume2/Ch1.jsx')),
  'a2-c2': lazy(() => import('./volume2/Ch2.jsx')),
  'a3-c1': lazy(() => import('./volume3/Ch1.jsx')),
  'a3-c2': lazy(() => import('./volume3/Ch2.jsx')),
  'a4-c1': lazy(() => import('./volume4/Ch1.jsx')),
  'a4-c2': lazy(() => import('./volume4/Ch2.jsx')),
  'a5-c1': lazy(() => import('./volume5/Ch1.jsx')),
  'a5-c2': lazy(() => import('./volume5/Ch2.jsx')),
  'a6-c1': lazy(() => import('./volume6/Ch1.jsx')),
  'a6-c2': lazy(() => import('./volume6/Ch2.jsx')),
  'a7-c1': lazy(() => import('./volume7/Ch1.jsx')),
  'a7-c2': lazy(() => import('./volume7/Ch2.jsx')),
  'a8-c1': lazy(() => import('./volume8/Ch1.jsx')),
  'a8-c2': lazy(() => import('./volume8/Ch2.jsx')),
}
export function hasContent(slug) {
  return Object.prototype.hasOwnProperty.call(CONTENT, slug)
}
export function getContent(slug) {
  return CONTENT[slug] || null
}
