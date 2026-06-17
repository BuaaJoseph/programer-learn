import { lazy } from 'react'

export const CONTENT = {
  'v0-c1': lazy(() => import('./volume0/Ch1.jsx')),
  'v0-c2': lazy(() => import('./volume0/Ch2.jsx')),
  'v1-c1': lazy(() => import('./volume1/Ch1.jsx')),
  'v1-c2': lazy(() => import('./volume1/Ch2.jsx')),
  'v2-c1': lazy(() => import('./volume2/Ch1.jsx')),
  'v2-c2': lazy(() => import('./volume2/Ch2.jsx')),
  'v3-c1': lazy(() => import('./volume3/Ch1.jsx')),
  'v3-c2': lazy(() => import('./volume3/Ch2.jsx')),
  'v4-c1': lazy(() => import('./volume4/Ch1.jsx')),
  'v4-c2': lazy(() => import('./volume4/Ch2.jsx')),
  'v5-c1': lazy(() => import('./volume5/Ch1.jsx')),
  'v5-c2': lazy(() => import('./volume5/Ch2.jsx')),
  'v6-c1': lazy(() => import('./volume6/Ch1.jsx')),
  'v6-c2': lazy(() => import('./volume6/Ch2.jsx')),
  'v7-c1': lazy(() => import('./volume7/Ch1.jsx')),
  'v7-c2': lazy(() => import('./volume7/Ch2.jsx')),
  'v8-c1': lazy(() => import('./volume8/Ch1.jsx')),
  'v8-c2': lazy(() => import('./volume8/Ch2.jsx')),
  'v9-c1': lazy(() => import('./volume9/Ch1.jsx')),
  'v9-c2': lazy(() => import('./volume9/Ch2.jsx')),
}
export function hasContent(slug) {
  return Object.prototype.hasOwnProperty.call(CONTENT, slug)
}
export function getContent(slug) {
  return CONTENT[slug] || null
}
