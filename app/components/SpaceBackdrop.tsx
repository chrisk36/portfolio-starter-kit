'use client'

import { useEffect, useRef } from 'react'

/**
 * Fixed, full-viewport space background (gradient + twinkling starfield) that stays put
 * behind the whole page as you scroll — so the space vibe is continuous from the hero
 * down through the projects section. The hero's 3D canvas is transparent and layers over
 * this; the projects section dims it with a scrim for readability.
 */
export default function SpaceBackdrop() {
  const fieldRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const field = fieldRef.current
    if (!field) return
    const nodes: HTMLDivElement[] = []
    for (let i = 0; i < 120; i++) {
      const s = document.createElement('div')
      s.className = 'sp-star'
      const size = 1 + Math.random() * 2
      s.style.width = `${size}px`
      s.style.height = `${size}px`
      s.style.top = `${Math.random() * 100}%`
      s.style.left = `${Math.random() * 100}%`
      s.style.animationDuration = `${2 + Math.random() * 3.5}s`
      s.style.animationDelay = `${Math.random() * 5}s`
      field.appendChild(s)
      nodes.push(s)
    }
    return () => nodes.forEach((n) => n.remove())
  }, [])

  return (
    <div className="sp-backdrop" aria-hidden>
      <div ref={fieldRef} className="sp-star-field" />
    </div>
  )
}
