import { lazy } from 'react'

export const CONTENT = {
  'mq0-c1': lazy(() => import('./volume0/Ch1.jsx')),
  'mq0-c2': lazy(() => import('./volume0/Ch2.jsx')),
  'mq1-c1': lazy(() => import('./volume1/Ch1.jsx')),
  'mq1-c2': lazy(() => import('./volume1/Ch2.jsx')),
  'mq2-c1': lazy(() => import('./volume2/Ch1.jsx')),
  'mq2-c2': lazy(() => import('./volume2/Ch2.jsx')),
  'mq3-c1': lazy(() => import('./volume3/Ch1.jsx')),
  'mq3-c2': lazy(() => import('./volume3/Ch2.jsx')),
  'mq4-c1': lazy(() => import('./volume4/Ch1.jsx')),
  'mq4-c2': lazy(() => import('./volume4/Ch2.jsx')),
  'mq5-c1': lazy(() => import('./volume5/Ch1.jsx')),
  'mq5-c2': lazy(() => import('./volume5/Ch2.jsx')),
}
export function hasContent(slug) {
  return Object.prototype.hasOwnProperty.call(CONTENT, slug)
}
export function getContent(slug) {
  return CONTENT[slug] || null
}
