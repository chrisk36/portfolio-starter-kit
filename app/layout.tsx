import './global.css'
import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Navbar } from './components/nav'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { baseUrl } from './sitemap'

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'Next.js Portfolio Starter',
    template: '%s | Next.js Portfolio Starter',
  },
  description: 'This is my portfolio.',
  openGraph: {
    title: 'My Portfolio',
    description: 'This is my portfolio.',
    url: baseUrl,
    siteName: 'My Portfolio',
    locale: 'en_US',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

const cx = (...classes: (string | undefined | null | false)[]) =>
  classes.filter(Boolean).join(' ')

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={cx(
        // background moved to body so we can set a nicer light gray-blue
        'text-black dark:text-white',
        GeistSans.variable,
        GeistMono.variable
      )}
    >
      <body
        className={cx(
          'antialiased',
          // light gray-blue background (light mode) + true black (dark mode)
          'bg-[#f4f7fb] dark:bg-black',
          // page padding
          'px-6 sm:px-8',
          // vertical spacing
          'py-10'
        )}
      >
        {/* Controls site width */}
        <div className="mx-auto max-w-6xl">
          <main className="flex-auto min-w-0 flex flex-col">
            <Navbar />
            {children}
<Analytics />
            <SpeedInsights />
          </main>
        </div>
      </body>
    </html>
  )
}
