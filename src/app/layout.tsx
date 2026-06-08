import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '天機 · 問天',
  description: '叩問蒼天，典籍應答。以推背圖·黃帝內經·易經·道德經·莊子·孫子兵法為依據，AI 陪你把問題看得更深。',
  openGraph: {
    title: '天機 · 問天',
    description: '叩問蒼天，典籍應答。東方典籍 AI 顧問——看清局勢、安頓內心、調養身心、輔助決策。',
    type: 'website',
    locale: 'zh_TW',
  },
  twitter: {
    card: 'summary',
    title: '天機 · 問天',
    description: '以推背圖·黃帝內經·易經·道德經等典籍為依據的 AI 顧問，陪你把問題看得更深。',
  },
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
