'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export const navItems = {
  '/': { name: 'home' },
}

export function Navbar() {
  const pathname = usePathname()
  if (pathname === '/') return null  // home uses the hero + scroll-to-projects

  return (
    <nav className="sp-navback">
      {/* Returns to the homepage and smooth-scrolls to the projects section */}
      <Link href="/#projects" className="sp-navback-link">
        <span aria-hidden>←</span> Back to projects
      </Link>
    </nav>
  )
}
