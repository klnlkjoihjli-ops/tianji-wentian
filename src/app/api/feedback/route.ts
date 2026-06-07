import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'

const VALID_SCENES = new Set(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'])

function hashQuestion(q: string): string {
  // 取前64字作为可读标识
  return q.slice(0, 64).replace(/\s+/g, ' ').trim()
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: '请求格式无效' }, { status: 400 })
  }

  const scene = typeof body.scene === 'string' ? body.scene : ''
  const helpful = typeof body.helpful === 'boolean' ? body.helpful : null
  const question = typeof body.question === 'string' ? body.question : ''
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.slice(0, 128) : null

  if (!VALID_SCENES.has(scene) || helpful === null) {
    return Response.json({ error: '参数无效' }, { status: 400 })
  }

  try {
    const supabase = createServiceClient()
    await supabase.from('feedback').insert({
      scene,
      helpful,
      question_hash: hashQuestion(question),
      session_id: sessionId,
    })
  } catch (err) {
    console.error('feedback insert error', err)
    // 不向用户暴露存储错误
  }

  return Response.json({ ok: true })
}
