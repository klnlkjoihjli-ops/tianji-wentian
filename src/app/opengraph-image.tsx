import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = '天機 · 問天 — 東方典籍 AI 顧問'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// 用 Google Fonts 的 text= 子集，只取所需字形（几 KB），并用旧 UA 拿到 TTF（satori 可用）
async function loadFont(family: string, text: string): Promise<ArrayBuffer | null> {
  try {
    const api = `https://fonts.googleapis.com/css2?family=${family}&text=${encodeURIComponent(text)}`
    const css = await (
      await fetch(api, {
        headers: {
          // 旧 UA 让 Google 返回 truetype 而非 woff2
          'User-Agent':
            'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40 Safari/537.36',
        },
      })
    ).text()
    const url = css.match(/src:\s*url\(([^)]+)\)/)?.[1]
    if (!url) return null
    return await (await fetch(url)).arrayBuffer()
  } catch {
    return null
  }
}

export default async function Image() {
  const title = '天機'
  const tagline = '叩問蒼天 · 典籍應答'
  const kicker = '東方典籍 AI 顧問'
  const allText = title + tagline + kicker
  const [brush, serif] = await Promise.all([
    loadFont('Ma+Shan+Zheng', title),
    loadFont('Noto+Serif+SC:wght@400', tagline + kicker),
  ])
  const fonts = [
    ...(brush ? [{ name: 'Brush', data: brush, style: 'normal' as const, weight: 400 as const }] : []),
    ...(serif ? [{ name: 'Serif', data: serif, style: 'normal' as const, weight: 400 as const }] : []),
  ]

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'radial-gradient(circle at 50% 38%, #15110a 0%, #0a0907 48%, #030303 100%)',
          position: 'relative',
        }}
      >
        {/* 金色光晕 */}
        <div
          style={{
            position: 'absolute',
            width: 760,
            height: 760,
            top: -120,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(201,168,76,0.20) 0%, rgba(201,168,76,0.05) 42%, transparent 70%)',
            display: 'flex',
          }}
        />
        {/* 外圈 */}
        <div
          style={{
            position: 'absolute',
            width: 520,
            height: 520,
            top: 55,
            borderRadius: '50%',
            border: '1px solid rgba(201,168,76,0.22)',
            display: 'flex',
          }}
        />
        <div
          style={{
            fontSize: 30,
            letterSpacing: 14,
            color: 'rgba(201,168,76,0.78)',
            fontFamily: 'Serif',
            marginBottom: 26,
            display: 'flex',
          }}
        >
          {kicker}
        </div>
        <div
          style={{
            fontSize: 200,
            letterSpacing: 30,
            color: '#f4d98a',
            fontFamily: brush ? 'Brush' : 'Serif',
            display: 'flex',
            lineHeight: 1.05,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 38,
            letterSpacing: 10,
            color: 'rgba(245,232,200,0.82)',
            fontFamily: 'Serif',
            marginTop: 30,
            display: 'flex',
          }}
        >
          {tagline}
        </div>
        <div
          style={{
            marginTop: 30,
            width: 240,
            height: 1,
            background:
              'linear-gradient(90deg, transparent, rgba(201,168,76,0.7), transparent)',
            display: 'flex',
          }}
        />
      </div>
    ),
    { ...size, fonts }
  )
}
