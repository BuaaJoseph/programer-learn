import { lazy } from 'react'

export const CONTENT = {
  'af0-c1': lazy(() => import('./volume0/Ch1.jsx')),
  'af0-c2': lazy(() => import('./volume0/Ch2.jsx')),
  'af0-c3': lazy(() => import('./volume0/Ch3.jsx')),
  'af1-c1': lazy(() => import('./volume1/Ch1.jsx')),
  'af1-c2': lazy(() => import('./volume1/Ch2.jsx')),
  'af2-c1': lazy(() => import('./volume2/Ch1.jsx')),
  'af2-c2': lazy(() => import('./volume2/Ch2.jsx')),
  'af3-c1': lazy(() => import('./volume3/Ch1.jsx')),
  'af3-c2': lazy(() => import('./volume3/Ch2.jsx')),
  'af4-c1': lazy(() => import('./volume4/Ch1.jsx')),
  'af4-c2': lazy(() => import('./volume4/Ch2.jsx')),
  'af5-c1': lazy(() => import('./volume5/Ch1.jsx')),
  'af5-c2': lazy(() => import('./volume5/Ch2.jsx')),
  'af6-c1': lazy(() => import('./volume6/Ch1.jsx')),
  'af6-c2': lazy(() => import('./volume6/Ch2.jsx')),
}
export function hasContent(slug) {
  return Object.prototype.hasOwnProperty.call(CONTENT, slug)
}
export function getContent(slug) {
  return CONTENT[slug] || null
}
