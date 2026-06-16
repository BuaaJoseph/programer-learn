import { lazy } from 'react'

export const CONTENT = {
  's1-c1': lazy(() => import('./volume1/Ch1.jsx')),
  's1-c2': lazy(() => import('./volume1/Ch2.jsx')),

  's2-c1': lazy(() => import('./volume2/Ch1.jsx')),
  's2-c2': lazy(() => import('./volume2/Ch2.jsx')),
  's2-c3': lazy(() => import('./volume2/Ch3.jsx')),

  's3-c1': lazy(() => import('./volume3/Ch1.jsx')),
  's3-c2': lazy(() => import('./volume3/Ch2.jsx')),
}

export function hasContent(slug) {
  return Object.prototype.hasOwnProperty.call(CONTENT, slug)
}

export function getContent(slug) {
  return CONTENT[slug] || null
}
