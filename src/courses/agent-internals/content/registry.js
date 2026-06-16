import { lazy } from 'react'

export const CONTENT = {
  'ai1-c1': lazy(() => import('./volume1/Ch1.jsx')),
  'ai1-c2': lazy(() => import('./volume1/Ch2.jsx')),
  'ai1-c3': lazy(() => import('./volume1/Ch3.jsx')),
  'ai2-c1': lazy(() => import('./volume2/Ch1.jsx')),
  'ai2-c2': lazy(() => import('./volume2/Ch2.jsx')),
  'ai2-c3': lazy(() => import('./volume2/Ch3.jsx')),
  'ai2-c4': lazy(() => import('./volume2/Ch4.jsx')),
  'ai3-c1': lazy(() => import('./volume3/Ch1.jsx')),
  'ai3-c2': lazy(() => import('./volume3/Ch2.jsx')),
  'ai3-c3': lazy(() => import('./volume3/Ch3.jsx')),
  'ai4-c1': lazy(() => import('./volume4/Ch1.jsx')),
  'ai4-c2': lazy(() => import('./volume4/Ch2.jsx')),
  'ai4-c3': lazy(() => import('./volume4/Ch3.jsx')),
  'ai4-c4': lazy(() => import('./volume4/Ch4.jsx')),
  'ai4-c5': lazy(() => import('./volume4/Ch5.jsx')),
}
export function hasContent(slug) {
  return Object.prototype.hasOwnProperty.call(CONTENT, slug)
}
export function getContent(slug) {
  return CONTENT[slug] || null
}
