"use client"

// import type { Metadata } from 'next'
import './globals.css'

// export const metadata: Metadata = {
//   title: 'Vighesh - QDA Tool',
//   description: 'Created with v0',
//   generator: 'v0.dev',
// }

import Script from 'next/script'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import * as gtag from '@/lib/gtag'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  useEffect(() => {
    if (typeof window.gtag !== 'undefined') {
      gtag.pageview(pathname);
    }
  }, [pathname]);
  // Global error tracking
  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      gtag.reportError({ description: `${e.message} at ${e.filename}:${e.lineno}:${e.colno}` });
    };
    const handleRejection = (e: PromiseRejectionEvent) => {
      const msg = e.reason?.message || String(e.reason);
      gtag.reportError({ description: `UnhandledRejection: ${msg}` });
    };
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);
  return (
    <html lang="en">
      <head>
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
