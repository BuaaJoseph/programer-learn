import { lazy } from 'react'

export const CONTENT = {
  'af0-c1': lazy(() => import('./volume0/Ch1.jsx')),
  'af0-c2': lazy(() => import('./volume0/Ch2.jsx')),
  'af0-c3': lazy(() => import('./volume0/Ch3.jsx')),
}
export function hasContent(slug) {
  return Object.prototype.hasOwnProperty.call(CONTENT, slug)
}
export function getContent(slug) {
  return CONTENT[slug] || null
}
