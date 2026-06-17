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

  'rpc4-c1': lazy(() => import('./volume4/Ch1.jsx')),
  'rpc4-c2': lazy(() => import('./volume4/Ch2.jsx')),
  'rpc4-c3': lazy(() => import('./volume4/Ch3.jsx')),

  'rpc5-c1': lazy(() => import('./volume5/Ch1.jsx')),
  'rpc5-c2': lazy(() => import('./volume5/Ch2.jsx')),
  'rpc5-c3': lazy(() => import('./volume5/Ch3.jsx')),
}

export function hasContent(slug) {
  return Object.prototype.hasOwnProperty.call(CONTENT, slug)
}

export function getContent(slug) {
  return CONTENT[slug] || null
}
