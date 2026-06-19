import { lazy } from 'react'

export const CONTENT = {
  'nt0-c1': lazy(() => import('./volume0/Ch1.jsx')),
  'nt0-c2': lazy(() => import('./volume0/Ch2.jsx')),
  'nt1-c1': lazy(() => import('./volume1/Ch1.jsx')),
  'nt1-c2': lazy(() => import('./volume1/Ch2.jsx')),
}
export function hasContent(slug) {
  return Object.prototype.hasOwnProperty.call(CONTENT, slug)
}
export function getContent(slug) {
  return CONTENT[slug] || null
}
