import { lazy } from 'react'

export const CONTENT = {
  'df0-c1': lazy(() => import('./volume0/Ch1.jsx')),
  'df0-c2': lazy(() => import('./volume0/Ch2.jsx')),
  'df0-c3': lazy(() => import('./volume0/Ch3.jsx')),
  'df1-c1': lazy(() => import('./volume1/Ch1.jsx')),
  'df1-c2': lazy(() => import('./volume1/Ch2.jsx')),
  'df1-c3': lazy(() => import('./volume1/Ch3.jsx')),
  'df2-c1': lazy(() => import('./volume2/Ch1.jsx')),
  'df2-c2': lazy(() => import('./volume2/Ch2.jsx')),
  'df2-c3': lazy(() => import('./volume2/Ch3.jsx')),
  'df3-c1': lazy(() => import('./volume3/Ch1.jsx')),
  'df3-c2': lazy(() => import('./volume3/Ch2.jsx')),
  'df4-c1': lazy(() => import('./volume4/Ch1.jsx')),
  'df4-c2': lazy(() => import('./volume4/Ch2.jsx')),
  'df5-c1': lazy(() => import('./volume5/Ch1.jsx')),
  'df5-c2': lazy(() => import('./volume5/Ch2.jsx')),
  'df6-c1': lazy(() => import('./volume6/Ch1.jsx')),
  'df6-c2': lazy(() => import('./volume6/Ch2.jsx')),
  'df7-c1': lazy(() => import('./volume7/Ch1.jsx')),
  'df7-c2': lazy(() => import('./volume7/Ch2.jsx')),
  'df7-c3': lazy(() => import('./volume7/Ch3.jsx')),
}
export function hasContent(slug) {
  return Object.prototype.hasOwnProperty.call(CONTENT, slug)
}
export function getContent(slug) {
  return CONTENT[slug] || null
}
