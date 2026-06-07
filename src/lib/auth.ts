import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

const TOKEN_TTL_MS = 8 * 60 * 60 * 1000

type AccessPayload = {
  iat: number
  exp: number
  nonce: string
}

function getSigningSecret(): string {
  return process.env.AUTH_SECRET || process.env.ACCESS_TOKEN || ''
}

function sign(value: string): string {
  return createHmac('sha256', getSigningSecret()).update(value).digest('base64url')
}

export function createAccessToken(): { token: string; expiresAt: number } {
  const now = Date.now()
  const payload: AccessPayload = {
    iat: now,
    exp: now + TOKEN_TTL_MS,
    nonce: randomBytes(12).toString('base64url'),
  }
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return {
    token: `${encoded}.${sign(encoded)}`,
    expiresAt: payload.exp,
  }
}

export function verifyAccessToken(token: string | null): boolean {
  const secret = getSigningSecret()
  if (!secret || !token) return false

  const [encoded, signature, extra] = token.split('.')
  if (!encoded || !signature || extra) return false

  const expected = sign(encoded)
  const actualBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (
    actualBuffer.length !== expectedBuffer.length
    || !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return false
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8')
    ) as Partial<AccessPayload>
    return typeof payload.exp === 'number' && payload.exp > Date.now()
  } catch {
    return false
  }
}

export function accessPasswordMatches(password: string): boolean {
  const expected = process.env.ACCESS_TOKEN || ''
  if (!expected || password.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(password), Buffer.from(expected))
}
