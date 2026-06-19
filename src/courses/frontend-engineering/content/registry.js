import { lazy } from 'react'

export const CONTENT = {
  'e0-c1': lazy(() => import('./volume0/Ch1.jsx')),
  'e0-c2': lazy(() => import('./volume0/Ch2.jsx')),
  'e1-c1': lazy(() => import('./volume1/Ch1.jsx')),
  'e1-c2': lazy(() => import('./volume1/Ch2.jsx')),
  'e2-c1': lazy(() => import('./volume2/Ch1.jsx')),
  'e2-c2': lazy(() => import('./volume2/Ch2.jsx')),
  'e3-c1': lazy(() => import('./volume3/Ch1.jsx')),
  'e3-c2': lazy(() => import('./volume3/Ch2.jsx')),
  'e4-c1': lazy(() => import('./volume4/Ch1.jsx')),
  'e4-c2': lazy(() => import('./volume4/Ch2.jsx')),
  'e5-c1': lazy(() => import('./volume5/Ch1.jsx')),
  'e5-c2': lazy(() => import('./volume5/Ch2.jsx')),
  'e6-c1': lazy(() => import('./volume6/Ch1.jsx')),
  'e6-c2': lazy(() => import('./volume6/Ch2.jsx')),
  'e7-c1': lazy(() => import('./volume7/Ch1.jsx')),
  'e7-c2': lazy(() => import('./volume7/Ch2.jsx')),
}
export function hasContent(slug) {
  return Object.prototype.hasOwnProperty.call(CONTENT, slug)
}
export function getContent(slug) {
  return CONTENT[slug] || null
}
