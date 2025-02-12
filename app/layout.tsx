import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Vignesh - The research assistant',
  description: 'Easy-to-use, open-source Computer-Assisted Qualitative Data Analysis (CAQDAS) tool.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
