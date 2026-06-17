import { lazy } from 'react'

export const CONTENT = {
  'j0-c1': lazy(() => import('./volume0/Ch1.jsx')),
  'j0-c2': lazy(() => import('./volume0/Ch2.jsx')),
  'j1-c1': lazy(() => import('./volume1/Ch1.jsx')),
  'j1-c2': lazy(() => import('./volume1/Ch2.jsx')),
  'j2-c1': lazy(() => import('./volume2/Ch1.jsx')),
  'j2-c2': lazy(() => import('./volume2/Ch2.jsx')),
  'j3-c1': lazy(() => import('./volume3/Ch1.jsx')),
  'j3-c2': lazy(() => import('./volume3/Ch2.jsx')),
  'j4-c1': lazy(() => import('./volume4/Ch1.jsx')),
  'j4-c2': lazy(() => import('./volume4/Ch2.jsx')),
  'j5-c1': lazy(() => import('./volume5/Ch1.jsx')),
  'j5-c2': lazy(() => import('./volume5/Ch2.jsx')),
  'j6-c1': lazy(() => import('./volume6/Ch1.jsx')),
  'j6-c2': lazy(() => import('./volume6/Ch2.jsx')),
  'j7-c1': lazy(() => import('./volume7/Ch1.jsx')),
  'j7-c2': lazy(() => import('./volume7/Ch2.jsx')),
  'j8-c1': lazy(() => import('./volume8/Ch1.jsx')),
  'j8-c2': lazy(() => import('./volume8/Ch2.jsx')),
}
export function hasContent(slug) {
  return Object.prototype.hasOwnProperty.call(CONTENT, slug)
}
export function getContent(slug) {
  return CONTENT[slug] || null
}
