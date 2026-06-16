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
}
export function hasContent(slug) {
  return Object.prototype.hasOwnProperty.call(CONTENT, slug)
}
export function getContent(slug) {
  return CONTENT[slug] || null
}
