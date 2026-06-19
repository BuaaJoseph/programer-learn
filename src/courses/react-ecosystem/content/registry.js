import { lazy } from 'react'

export const CONTENT = {
  'r0-c1': lazy(() => import('./volume0/Ch1.jsx')),
  'r0-c2': lazy(() => import('./volume0/Ch2.jsx')),
  'r1-c1': lazy(() => import('./volume1/Ch1.jsx')),
  'r1-c2': lazy(() => import('./volume1/Ch2.jsx')),
  'r2-c1': lazy(() => import('./volume2/Ch1.jsx')),
  'r2-c2': lazy(() => import('./volume2/Ch2.jsx')),
  'r3-c1': lazy(() => import('./volume3/Ch1.jsx')),
  'r3-c2': lazy(() => import('./volume3/Ch2.jsx')),
  'r4-c1': lazy(() => import('./volume4/Ch1.jsx')),
  'r4-c2': lazy(() => import('./volume4/Ch2.jsx')),
  'r4-c3': lazy(() => import('./volume4/Ch3.jsx')),
  'r5-c1': lazy(() => import('./volume5/Ch1.jsx')),
  'r5-c2': lazy(() => import('./volume5/Ch2.jsx')),
  'r6-c1': lazy(() => import('./volume6/Ch1.jsx')),
  'r6-c2': lazy(() => import('./volume6/Ch2.jsx')),
  'r7-c1': lazy(() => import('./volume7/Ch1.jsx')),
  'r7-c2': lazy(() => import('./volume7/Ch2.jsx')),
  'r8-c1': lazy(() => import('./volume8/Ch1.jsx')),
  'r8-c2': lazy(() => import('./volume8/Ch2.jsx')),
  'r9-c1': lazy(() => import('./volume9/Ch1.jsx')),
  'r9-c2': lazy(() => import('./volume9/Ch2.jsx')),
}
export function hasContent(slug) {
  return Object.prototype.hasOwnProperty.call(CONTENT, slug)
}
export function getContent(slug) {
  return CONTENT[slug] || null
}
