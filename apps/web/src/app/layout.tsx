import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'A/B Test Dashboard',
  description: 'CVS A/B Test 분석 대시보드',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
