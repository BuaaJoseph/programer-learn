import { lazy } from 'react'

export const CONTENT = {
  'jb0-c1': lazy(() => import('./volume0/Ch1.jsx')),
  'jb0-c2': lazy(() => import('./volume0/Ch2.jsx')),
  'jb1-c1': lazy(() => import('./volume1/Ch1.jsx')),
  'jb1-c2': lazy(() => import('./volume1/Ch2.jsx')),
  'jb2-c1': lazy(() => import('./volume2/Ch1.jsx')),
  'jb2-c2': lazy(() => import('./volume2/Ch2.jsx')),
  'jb3-c1': lazy(() => import('./volume3/Ch1.jsx')),
  'jb3-c2': lazy(() => import('./volume3/Ch2.jsx')),
  'jb4-c1': lazy(() => import('./volume4/Ch1.jsx')),
  'jb4-c2': lazy(() => import('./volume4/Ch2.jsx')),
  'jb5-c1': lazy(() => import('./volume5/Ch1.jsx')),
  'jb5-c2': lazy(() => import('./volume5/Ch2.jsx')),
  'jb6-c1': lazy(() => import('./volume6/Ch1.jsx')),
  'jb6-c2': lazy(() => import('./volume6/Ch2.jsx')),
  'jb7-c1': lazy(() => import('./volume7/Ch1.jsx')),
  'jb7-c2': lazy(() => import('./volume7/Ch2.jsx')),
}
export function hasContent(slug) {
  return Object.prototype.hasOwnProperty.call(CONTENT, slug)
}
export function getContent(slug) {
  return CONTENT[slug] || null
}
