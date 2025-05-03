"use client"

import './globals.css'
// Prefix for static assets when running under subdirectory
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

import Script from 'next/script'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import * as gtag from '@/lib/gtag'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  useEffect(() => {
    if (typeof window.gtag !== 'undefined') {
      gtag.pageview(pathname)
    }
  }, [pathname])

  // Global error tracking
  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      gtag.reportError({ description: `${e.message} at ${e.filename}:${e.lineno}:${e.colno}` })
    }
    const handleRejection = (e: PromiseRejectionEvent) => {
      const msg = e.reason?.message || String(e.reason)
      gtag.reportError({ description: `UnhandledRejection: ${msg}` })
    }
    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleRejection)
    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleRejection)
    }
  }, [])

  return (
    <html lang="en">
      <head>
        {/* Page metadata */}
        <title>Vigesh QDA Tool</title>
        <meta name="description" content="Vignesh QDA Tool - The free qualitative data analysis application" />
        <link rel="icon" href={`${basePath}/favicon.ico`} />
        {/* Google Analytics */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${gtag.GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);} 
gtag('js', new Date());
gtag('config', '${gtag.GA_MEASUREMENT_ID}', { page_path: window.location.pathname });`}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  )
}
