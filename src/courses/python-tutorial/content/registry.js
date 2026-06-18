import { lazy } from 'react'

export const CONTENT = {
  'py0-c1': lazy(() => import('./volume0/Ch1.jsx')),
  'py0-c2': lazy(() => import('./volume0/Ch2.jsx')),
  'py1-c1': lazy(() => import('./volume1/Ch1.jsx')),
  'py1-c2': lazy(() => import('./volume1/Ch2.jsx')),
  'py2-c1': lazy(() => import('./volume2/Ch1.jsx')),
  'py2-c2': lazy(() => import('./volume2/Ch2.jsx')),
  'py3-c1': lazy(() => import('./volume3/Ch1.jsx')),
  'py3-c2': lazy(() => import('./volume3/Ch2.jsx')),
  'py4-c1': lazy(() => import('./volume4/Ch1.jsx')),
  'py4-c2': lazy(() => import('./volume4/Ch2.jsx')),
  'py5-c1': lazy(() => import('./volume5/Ch1.jsx')),
  'py5-c2': lazy(() => import('./volume5/Ch2.jsx')),
  'py6-c1': lazy(() => import('./volume6/Ch1.jsx')),
  'py6-c2': lazy(() => import('./volume6/Ch2.jsx')),
  'py7-c1': lazy(() => import('./volume7/Ch1.jsx')),
  'py7-c2': lazy(() => import('./volume7/Ch2.jsx')),
  'py8-c1': lazy(() => import('./volume8/Ch1.jsx')),
  'py8-c2': lazy(() => import('./volume8/Ch2.jsx')),
  'py9-c1': lazy(() => import('./volume9/Ch1.jsx')),
  'py9-c2': lazy(() => import('./volume9/Ch2.jsx')),
  'py10-c1': lazy(() => import('./volume10/Ch1.jsx')),
  'py10-c2': lazy(() => import('./volume10/Ch2.jsx')),
}
export function hasContent(slug) {
  return Object.prototype.hasOwnProperty.call(CONTENT, slug)
}
export function getContent(slug) {
  return CONTENT[slug] || null
}
