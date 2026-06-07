import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '神枢 · 问天',
  description: '叩问苍天，典籍应答。推背图·黄帝内经·易经·道德经·庄子·孙子',
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
