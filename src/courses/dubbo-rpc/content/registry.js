import { lazy } from 'react'

export const CONTENT = {
  'rpc1-c1': lazy(() => import('./volume1/Ch1.jsx')),
  'rpc1-c2': lazy(() => import('./volume1/Ch2.jsx')),
  'rpc1-c3': lazy(() => import('./volume1/Ch3.jsx')),

  'rpc2-c1': lazy(() => import('./volume2/Ch1.jsx')),
  'rpc2-c2': lazy(() => import('./volume2/Ch2.jsx')),
  'rpc2-c3': lazy(() => import('./volume2/Ch3.jsx')),
  'rpc2-c4': lazy(() => import('./volume2/Ch4.jsx')),

  'rpc3-c1': lazy(() => import('./volume3/Ch1.jsx')),
  'rpc3-c2': lazy(() => import('./volume3/Ch2.jsx')),
  'rpc3-c3': lazy(() => import('./volume3/Ch3.jsx')),
}

export function hasContent(slug) {
  return Object.prototype.hasOwnProperty.call(CONTENT, slug)
}

export function getContent(slug) {
  return CONTENT[slug] || null
}
