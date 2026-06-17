import { lazy } from 'react'

export const CONTENT = {
  'm1-c1': lazy(() => import('./volume1/Ch1.jsx')),
  'm1-c2': lazy(() => import('./volume1/Ch2.jsx')),

  'm2-c1': lazy(() => import('./volume2/Ch1.jsx')),
  'm2-c2': lazy(() => import('./volume2/Ch2.jsx')),
  'm2-c3': lazy(() => import('./volume2/Ch3.jsx')),
  'm2-c4': lazy(() => import('./volume2/Ch4.jsx')),

  'm3-c1': lazy(() => import('./volume3/Ch1.jsx')),
  'm3-c2': lazy(() => import('./volume3/Ch2.jsx')),
  'm3-c3': lazy(() => import('./volume3/Ch3.jsx')),
  'm3-c4': lazy(() => import('./volume3/Ch4.jsx')),

  'm4-c1': lazy(() => import('./volume4/Ch1.jsx')),
  'm4-c2': lazy(() => import('./volume4/Ch2.jsx')),

  'm5-c1': lazy(() => import('./volume5/Ch1.jsx')),
  'm5-c2': lazy(() => import('./volume5/Ch2.jsx')),
  'm5-c3': lazy(() => import('./volume5/Ch3.jsx')),
  'm5-c4': lazy(() => import('./volume5/Ch4.jsx')),

  'm6-c1': lazy(() => import('./volume6/Ch1.jsx')),
  'm6-c2': lazy(() => import('./volume6/Ch2.jsx')),
  'm6-c3': lazy(() => import('./volume6/Ch3.jsx')),
  'm6-c4': lazy(() => import('./volume6/Ch4.jsx')),
}

export function hasContent(slug) {
  return Object.prototype.hasOwnProperty.call(CONTENT, slug)
}

export function getContent(slug) {
  return CONTENT[slug] || null
}
