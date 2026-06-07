import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: '格式错误' }, { status: 400 })
  }

  const password = typeof body.password === 'string' ? body.password.trim() : ''
  const accessToken = process.env.ACCESS_TOKEN || ''

  if (!accessToken || password !== accessToken) {
    // 故意延迟，防暴力破解
    await new Promise(r => setTimeout(r, 800))
    return Response.json({ error: '密碼不正確' }, { status: 401 })
  }

  return Response.json({ token: accessToken })
}
