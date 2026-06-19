import { lazy } from 'react'

export const CONTENT = {
  'ba0-c1': lazy(() => import('./volume0/Ch1.jsx')),
  'ba0-c2': lazy(() => import('./volume0/Ch2.jsx')),
  'ba0-c3': lazy(() => import('./volume0/Ch3.jsx')),
  'ba1-c1': lazy(() => import('./volume1/Ch1.jsx')),
  'ba1-c2': lazy(() => import('./volume1/Ch2.jsx')),
  'ba1-c3': lazy(() => import('./volume1/Ch3.jsx')),
  'ba1-c4': lazy(() => import('./volume1/Ch4.jsx')),
  'ba1-c5': lazy(() => import('./volume1/Ch5.jsx')),
  'ba1-c6': lazy(() => import('./volume1/Ch6.jsx')),
  'ba2-c1': lazy(() => import('./volume2/Ch1.jsx')),
  'ba2-c2': lazy(() => import('./volume2/Ch2.jsx')),
  'ba2-c3': lazy(() => import('./volume2/Ch3.jsx')),
  'ba3-c1': lazy(() => import('./volume3/Ch1.jsx')),
  'ba3-c2': lazy(() => import('./volume3/Ch2.jsx')),
  'ba3-c3': lazy(() => import('./volume3/Ch3.jsx')),
  'ba4-c1': lazy(() => import('./volume4/Ch1.jsx')),
  'ba4-c2': lazy(() => import('./volume4/Ch2.jsx')),
  'ba4-c3': lazy(() => import('./volume4/Ch3.jsx')),
  'ba4-c4': lazy(() => import('./volume4/Ch4.jsx')),
  'ba5-c1': lazy(() => import('./volume5/Ch1.jsx')),
  'ba5-c2': lazy(() => import('./volume5/Ch2.jsx')),
  'ba5-c3': lazy(() => import('./volume5/Ch3.jsx')),
  'ba6-c1': lazy(() => import('./volume6/Ch1.jsx')),
  'ba6-c2': lazy(() => import('./volume6/Ch2.jsx')),
  'ba6-c3': lazy(() => import('./volume6/Ch3.jsx')),
  'ba7-c1': lazy(() => import('./volume7/Ch1.jsx')),
  'ba7-c2': lazy(() => import('./volume7/Ch2.jsx')),
  'ba7-c3': lazy(() => import('./volume7/Ch3.jsx')),
  'ba7-c4': lazy(() => import('./volume7/Ch4.jsx')),
  'ba8-c1': lazy(() => import('./volume8/Ch1.jsx')),
  'ba8-c2': lazy(() => import('./volume8/Ch2.jsx')),
  'ba8-c3': lazy(() => import('./volume8/Ch3.jsx')),
  'ba8-c4': lazy(() => import('./volume8/Ch4.jsx')),
}
export function hasContent(slug) {
  return Object.prototype.hasOwnProperty.call(CONTENT, slug)
}
export function getContent(slug) {
  return CONTENT[slug] || null
}
