import { lazy } from 'react'

export const CONTENT = {
  'r1-c1': lazy(() => import('./volume1/Ch1.jsx')),
  'r1-c2': lazy(() => import('./volume1/Ch2.jsx')),
  'r1-c3': lazy(() => import('./volume1/Ch3.jsx')),

  'r2-c1': lazy(() => import('./volume2/Ch1.jsx')),
  'r2-c2': lazy(() => import('./volume2/Ch2.jsx')),
  'r2-c3': lazy(() => import('./volume2/Ch3.jsx')),
  'r2-c4': lazy(() => import('./volume2/Ch4.jsx')),
  'r2-c5': lazy(() => import('./volume2/Ch5.jsx')),

  'r3-c1': lazy(() => import('./volume3/Ch1.jsx')),
  'r3-c2': lazy(() => import('./volume3/Ch2.jsx')),
  'r3-c3': lazy(() => import('./volume3/Ch3.jsx')),
  'r3-c4': lazy(() => import('./volume3/Ch4.jsx')),

  'r4-c1': lazy(() => import('./volume4/Ch1.jsx')),
  'r4-c2': lazy(() => import('./volume4/Ch2.jsx')),
  'r4-c3': lazy(() => import('./volume4/Ch3.jsx')),
  'r4-c4': lazy(() => import('./volume4/Ch4.jsx')),

  'r5-c1': lazy(() => import('./volume5/Ch1.jsx')),
  'r5-c2': lazy(() => import('./volume5/Ch2.jsx')),
  'r5-c3': lazy(() => import('./volume5/Ch3.jsx')),

  'r6-c1': lazy(() => import('./volume6/Ch1.jsx')),
  'r6-c2': lazy(() => import('./volume6/Ch2.jsx')),
  'r6-c3': lazy(() => import('./volume6/Ch3.jsx')),
}

export function hasContent(slug) {
  return Object.prototype.hasOwnProperty.call(CONTENT, slug)
}

export function getContent(slug) {
  return CONTENT[slug] || null
}
