import { lazy } from 'react'

export const CONTENT = {
  'i0-c1': lazy(() => import('./volume0/Ch1.jsx')),
  'i0-c2': lazy(() => import('./volume0/Ch2.jsx')),
  'i1-c1': lazy(() => import('./volume1/Ch1.jsx')),
  'i1-c2': lazy(() => import('./volume1/Ch2.jsx')),
  'i2-c1': lazy(() => import('./volume2/Ch1.jsx')),
  'i2-c2': lazy(() => import('./volume2/Ch2.jsx')),
  'i3-c1': lazy(() => import('./volume3/Ch1.jsx')),
  'i3-c2': lazy(() => import('./volume3/Ch2.jsx')),
  'i4-c1': lazy(() => import('./volume4/Ch1.jsx')),
  'i4-c2': lazy(() => import('./volume4/Ch2.jsx')),
  'i5-c1': lazy(() => import('./volume5/Ch1.jsx')),
  'i5-c2': lazy(() => import('./volume5/Ch2.jsx')),
  'i6-c1': lazy(() => import('./volume6/Ch1.jsx')),
  'i6-c2': lazy(() => import('./volume6/Ch2.jsx')),
  'i7-c1': lazy(() => import('./volume7/Ch1.jsx')),
  'i7-c2': lazy(() => import('./volume7/Ch2.jsx')),
  'i8-c1': lazy(() => import('./volume8/Ch1.jsx')),
  'i8-c2': lazy(() => import('./volume8/Ch2.jsx')),
}
export function hasContent(slug) {
  return Object.prototype.hasOwnProperty.call(CONTENT, slug)
}
export function getContent(slug) {
  return CONTENT[slug] || null
}
