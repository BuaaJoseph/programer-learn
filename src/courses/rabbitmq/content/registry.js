import { lazy } from 'react'

export const CONTENT = {
  'mq1-c1': lazy(() => import('./volume1/Ch1.jsx')),
  'mq1-c2': lazy(() => import('./volume1/Ch2.jsx')),
  'mq1-c3': lazy(() => import('./volume1/Ch3.jsx')),

  'mq2-c1': lazy(() => import('./volume2/Ch1.jsx')),
  'mq2-c2': lazy(() => import('./volume2/Ch2.jsx')),
  'mq2-c3': lazy(() => import('./volume2/Ch3.jsx')),
  'mq2-c4': lazy(() => import('./volume2/Ch4.jsx')),

  'mq3-c1': lazy(() => import('./volume3/Ch1.jsx')),
  'mq3-c2': lazy(() => import('./volume3/Ch2.jsx')),
  'mq3-c3': lazy(() => import('./volume3/Ch3.jsx')),
}

export function hasContent(slug) {
  return Object.prototype.hasOwnProperty.call(CONTENT, slug)
}

export function getContent(slug) {
  return CONTENT[slug] || null
}
