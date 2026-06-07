import { NextRequest } from 'next/server'
import { accessPasswordMatches, createAccessToken } from '@/lib/auth'

export const runtime = 'nodejs'

const AUTH_WINDOW_MS = 15 * 60_000
const AUTH_MAX_ATTEMPTS = 5

type AuthAttempt = { count: number; resetAt: number }
const globalForAuth = globalThis as typeof globalThis & {
  tianjiAuthAttempts?: Map<string, AuthAttempt>
}
const authAttempts = globalForAuth.tianjiAuthAttempts ?? new Map<string, AuthAttempt>()
globalForAuth.tianjiAuthAttempts = authAttempts

function getClientId(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  return forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'local'
}

function getAttempt(clientId: string): AuthAttempt {
  const now = Date.now()
  const current = authAttempts.get(clientId)
  if (!current || current.resetAt <= now) {
    const next = { count: 0, resetAt: now + AUTH_WINDOW_MS }
    authAttempts.set(clientId, next)
    return next
  }
  return current
}

export async function POST(req: NextRequest) {
  const clientId = getClientId(req)
  const attempt = getAttempt(clientId)
  if (attempt.count >= AUTH_MAX_ATTEMPTS) {
    return Response.json(
      { error: '尝试次数过多，请稍后再试', retryAfter: attempt.resetAt },
      { status: 429 }
    )
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: '格式错误' }, { status: 400 })
  }

  const password = typeof body.password === 'string' ? body.password.trim() : ''

  if (!accessPasswordMatches(password)) {
    attempt.count += 1
    await new Promise(r => setTimeout(r, 800))
    return Response.json({ error: '密碼不正確' }, { status: 401 })
  }

  authAttempts.delete(clientId)
  return Response.json(createAccessToken(), {
    headers: { 'Cache-Control': 'no-store' },
  })
}
