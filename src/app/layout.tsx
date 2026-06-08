import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '天機 · 問天',
  description: '叩問蒼天，典籍應答。推背圖·黃帝內經·易經·道德經·莊子·孫子',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body style={{ margin: 0, padding: 0, background: '#000' }}>
        {children}
      </body>
    </html>
  )
}
