import { NextRequest } from 'next/server'
import { analyzeQuestion, searchClassics, formatClassicsContext, saveConversation, getRecentHistory } from '@/lib/rag/retrieval'
import { streamChat } from '@/lib/deepseek'
import { SCENE_PROMPTS, detectScene } from '@/lib/prompts'

export const runtime = 'nodejs'
export const maxDuration = 90

const VALID_SCENES = new Set(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'])
const VALID_RESPONSE_MODES = new Set(['brief', 'deep'])
const QUESTION_MAX_LENGTH = 1200
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 6

type RateLimitEntry = { count: number; resetAt: number }

const globalForRateLimit = globalThis as typeof globalThis & {
  shenshuRateLimit?: Map<string, RateLimitEntry>
}

const rateLimit = globalForRateLimit.shenshuRateLimit ?? new Map<string, RateLimitEntry>()
globalForRateLimit.shenshuRateLimit = rateLimit

function getClientId(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  return forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'local'
}

function isRateLimited(clientId: string): boolean {
  const now = Date.now()
  const current = rateLimit.get(clientId)

  if (!current || current.resetAt <= now) {
    rateLimit.set(clientId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  current.count += 1
  return current.count > RATE_LIMIT_MAX_REQUESTS
}

function getCurrentDateContext(): string {
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date())
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(part => part.type === type)?.value ?? ''
  const year = Number(value('year'))
  const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
  const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
  const animals = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪']
  const offset = ((year - 1984) % 60 + 60) % 60

  return [
    '【当前真实时间，必须遵守】',
    `当前日期是 ${year}年${value('month')}月${value('day')}日 ${value('hour')}:${value('minute')}（中国标准时间）。`,
    `当前干支纪年为${stems[offset % 10]}${branches[offset % 12]}年（${animals[offset % 12]}年）。`,
    `凡提及“今年”“当前”“当下”，均指 ${year} 年。禁止写成其他年份；若不需要年份，使用“今年”或“当前”。`,
  ].join('\n')
}

export async function POST(req: NextRequest) {
  // 访问令牌校验
  const accessToken = process.env.ACCESS_TOKEN
  if (accessToken) {
    const clientToken = req.headers.get('x-access-token')
    if (clientToken !== accessToken) {
      return Response.json({ error: '无访问权限' }, { status: 401 })
    }
  }

  if (isRateLimited(getClientId(req))) {
    return Response.json({ error: '请求过于频繁，请稍后再试' }, { status: 429 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: '请求格式无效' }, { status: 400 })
  }

  const question = typeof body.question === 'string' ? body.question.trim() : ''
  const forceScene = typeof body.scene === 'string' ? body.scene : ''
  const responseMode = typeof body.responseMode === 'string' && VALID_RESPONSE_MODES.has(body.responseMode)
    ? body.responseMode
    : 'deep'
  const sessionId = typeof body.sessionId === 'string'
    ? body.sessionId.slice(0, 128)
    : ''

  if (!question) {
    return Response.json({ error: '请输入问题' }, { status: 400 })
  }
  if (question.length > QUESTION_MAX_LENGTH) {
    return Response.json({ error: `问题请控制在 ${QUESTION_MAX_LENGTH} 字以内` }, { status: 400 })
  }
  if (forceScene && !VALID_SCENES.has(forceScene)) {
    return Response.json({ error: '无效的场景类型' }, { status: 400 })
  }

  const scene = forceScene || detectScene(question)
  const currentDateContext = getCurrentDateContext()
  const encoder = new TextEncoder()

  // SSE 流式响应
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(msg))
      }

      try {
        // ── Step 1：意图分析 ──
        send('progress', { step: 1, text: '解析问题意图……' })
        const analysis = await analyzeQuestion(question)
        send('analysis', analysis)

        // ── Step 2：向量语义检索 ──
        send('progress', { step: 2, text: '参阅典籍原文……' })
        const results = await searchClassics(question, analysis, scene, 10)
        const ctx = formatClassicsContext(results)
        send('classics', {
          count: results.length,
          sources: results.map(r => `${r.source}·${r.chapter}`),
        })

        // ── Step 3：流式生成最终回答 ──
        send('progress', { step: 3, text: '推演天机，整合回答……' })

        // ── 对话历史（追问上下文）──
        const historyContext = sessionId ? await getRecentHistory(sessionId) : ''

        const analysisText = `
核心议题：${analysis.topic}
用户状态：${analysis.mood}
关键概念：${(analysis.concepts || []).join('、')}
应参考典籍：${(analysis.classics || []).join('、')}
`.trim()

        const scenePrompt = SCENE_PROMPTS[scene]?.(ctx, analysisText)
          ?? SCENE_PROMPTS.A(ctx, analysisText)
        const responseInstruction = responseMode === 'brief'
          ? '【回答模式：简要】保持既定 JSON 字段不变；每个解释字段控制在80-140字，建议保留3条且每条30-60字。直接、清晰、避免重复。'
          : '【回答模式：深度】按场景要求充分展开，保留完整分析与3-5条可执行建议。'
        const historySection = historyContext
          ? `\n\n【本次会话历史，供追问参考】\n${historyContext}`
          : ''
        const systemPrompt = `${currentDateContext}${historySection}\n\n${scenePrompt}\n\n${responseInstruction}`

        const userMsg = `${currentDateContext}\n\n回答模式：${responseMode === 'brief' ? '简要' : '深度'}\n用户问：${question}\n\n请基于以上分析和典籍原文，给出有温度、有具体见解的回答。`

        const chatStream = await streamChat(systemPrompt, userMsg, responseMode === 'brief' ? 1600 : 3000)

        let fullText = ''
        for await (const chunk of chatStream) {
          const delta = chunk.choices[0]?.delta?.content ?? ''
          if (delta) {
            fullText += delta
            send('delta', { text: delta })
          }
        }

        // 解析 JSON 结果
        let parsed: Record<string, unknown> | null = null
        try {
          const s = fullText.replace(/```json|```/g, '').trim()
          const a = s.indexOf('{'), b = s.lastIndexOf('}')
          parsed = JSON.parse(s.slice(a, b + 1))
        } catch {
          // 解析失败也把原文发出去
        }

        send('done', { scene, raw: fullText, parsed })

        // 后台保存对话（不阻塞响应）
        if (sessionId) {
          saveConversation({
            sessionId,
            question,
            scene,
            analysis,
            answer: parsed ?? { raw: fullText },
            classicsUsed: results.map(r => `${r.source}·${r.chapter}`),
          }).catch(console.error)
        }

      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '未知错误'
        send('error', { message: msg })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
