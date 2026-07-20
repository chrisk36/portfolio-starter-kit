'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export const navItems = {
  '/': { name: 'home' },
  '/code': { name: 'code' },
  '/design': { name: 'design' },
}

export function Navbar() {
  const pathname = usePathname()
  if (pathname === '/') return null  // home uses SpaceHero's built-in nav

  return (
    <nav className="flex justify-end gap-3 mb-10">
      <Link
        href="/code"
        className={`text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${
          pathname.startsWith('/code')
            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
            : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
        }`}
      >
        Code
      </Link>
      <Link
        href="/design"
        className={`text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${
          pathname.startsWith('/design')
            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
            : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
        }`}
      >
        Design
      </Link>
    </nav>
  )
}
