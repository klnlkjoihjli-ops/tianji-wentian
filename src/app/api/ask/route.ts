import { NextRequest } from 'next/server'
import { searchClassics, formatClassicsContext, saveConversation, getRecentHistory } from '@/lib/rag/retrieval'
import { streamChat } from '@/lib/deepseek'
import { SCENE_PROMPTS, detectScene } from '@/lib/prompts'
import { verifyAccessToken } from '@/lib/auth'
import type { AnalysisResult, ClassicResult } from '@/lib/rag/retrieval'

export const runtime = 'nodejs'
export const maxDuration = 90

const VALID_SCENES = new Set(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'])
const VALID_RESPONSE_MODES = new Set(['brief', 'deep'])
const QUESTION_MAX_LENGTH = 1200
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 6
const EMPTY_ANALYSIS: AnalysisResult = {
  topic: '',
  domains: [],
  mood: '求知',
  concepts: [],
  classics: [],
}

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

function getSafetyNotice(scene: string): string {
  if (scene === 'B' || scene === 'E') {
    return '内容仅供传统养生与文化参考，不能替代专业医疗诊断；如有急症或持续不适，请及时就医。'
  }
  if (scene === 'C') {
    return '时势判断存在不确定性，请结合最新可靠信息独立判断，不应作为投资或重大决策的唯一依据。'
  }
  if (scene === 'A' || scene === 'D') {
    return '命理与卦象属于传统文化解释，不代表确定预测；重要决定仍应依据现实信息与个人判断。'
  }
  return '内容基于传统典籍的现代解释，仅供思考与自我整理。'
}

function uniqueSources(results: ClassicResult[]) {
  const seen = new Set<string>()
  return results.flatMap(result => {
    const key = `${result.source}\u0000${result.chapter}`
    if (seen.has(key)) return []
    seen.add(key)
    return [{
      source: result.source,
      chapter: result.chapter,
      similarity: Number(Number(result.similarity).toFixed(3)),
      excerpt: result.content.slice(0, 180),
    }]
  }).slice(0, 5)
}

function getConfidence(results: ClassicResult[]): 'high' | 'medium' | 'low' | 'none' {
  if (!results.length) return 'none'
  const top = Math.max(...results.map(result => Number(result.similarity) || 0))
  if (top >= 0.65) return 'high'
  if (top >= 0.5) return 'medium'
  return 'low'
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function actions(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter(item => typeof item === 'string').map(String).slice(0, 3)
  }
  const valueText = text(value)
  if (!valueText) return []
  return valueText
    .split(/\n+|(?=[二三四五六]、)|(?=\d+[.、])/)
    .map(item => item.replace(/^[一二三四五六\d]+[.、]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 3)
}

function buildAdvisor(parsed: Record<string, unknown> | null) {
  if (!parsed) return null
  const actionList = actions(parsed.actions)
  const fallbackActions = actions(
    parsed.remedy ?? parsed.advice ?? parsed.verdict ?? parsed.practice ?? parsed.strategy
  )
  return {
    conclusion: (
      text(parsed.conclusion)
      || text(parsed.motto)
      || text(parsed.title)
      || text(parsed.answer)
      || text(parsed.diagnosis)
      || text(parsed.analysis)
    ).slice(0, 160),
    modernExplanation: (
      text(parsed.modernExplanation)
      || text(parsed.interp)
      || text(parsed.jiedu)
      || text(parsed.analysis)
      || text(parsed.guaDesc)
      || text(parsed.diagnosis)
      || text(parsed.decode)
      || text(parsed.yangsheng)
    ).slice(0, 360),
    actions: actionList.length ? actionList : fallbackActions,
  }
}

export async function POST(req: NextRequest) {
  const accessToken = process.env.ACCESS_TOKEN
  if (accessToken && !verifyAccessToken(req.headers.get('x-access-token'))) {
    return Response.json({ error: '登录已失效，请重新进入' }, { status: 401 })
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
    : 'brief'
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
        send('progress', { step: 1, text: '理解问题并查阅典籍……' })
        const [results, historyContext] = await Promise.all([
          searchClassics(question, EMPTY_ANALYSIS, scene, 8),
          sessionId ? getRecentHistory(sessionId) : Promise.resolve(''),
        ])
        const analysis = EMPTY_ANALYSIS
        send('analysis', analysis)

        send('progress', { step: 2, text: '参阅典籍原文……' })
        const ctx = formatClassicsContext(results)
        const sources = uniqueSources(results)
        const confidence = getConfidence(results)
        const safetyNotice = getSafetyNotice(scene)
        send('classics', {
          count: results.length,
          sources,
          confidence,
        })

        send('progress', { step: 3, text: '整合依据，生成建议……' })

        const analysisText = `
核心议题：${analysis.topic}
用户状态：${analysis.mood}
关键概念：${(analysis.concepts || []).join('、')}
应参考典籍：${(analysis.classics || []).join('、')}
`.trim()

        const scenePrompt = SCENE_PROMPTS[scene]?.(ctx, analysisText)
          ?? SCENE_PROMPTS.A(ctx, analysisText)
        const trustInstruction = results.length
          ? '只能引用【典籍原文】中出现的文字和篇章；不得补造、拼接或把现代解释写成原文。'
          : '本次没有检索到足够典籍依据。不得生成直接引文；引用字段填写“本次未检索到可核验原文”，并明确降低判断强度。'
        const classicRefInstruction = results.length
          ? '\n另外必须返回 classicRef 字段：值为你实际引用的那条原文所属的【典籍名称+篇章】，格式为”书名·篇章”（例如”金匮要略·百合狐惑阴阳毒病证治第三”）。只能从【典籍原文】里选，不得捏造。'
          : ''
        const responseInstruction = responseMode === 'brief'
          ? `【回答模式：简要，优先级最高】忽略前文所有”至少多少字”和长篇展开要求。保留场景既定字段，但每个旧字段压缩到30-90字；额外返回 conclusion（25-50字）、modernExplanation（80-140字）、actions（严格3条数组，每条30-60字）。整个JSON控制在900个中文字以内，确保JSON完整闭合。直接、清晰、避免重复。${trustInstruction}${classicRefInstruction}`
          : `【回答模式：深度】保留场景既定字段，并额外返回 conclusion（30-70字）、modernExplanation（100-180字）、actions（3-5条数组）。充分展开但避免重复。${trustInstruction}${classicRefInstruction}`
        const historySection = historyContext
          ? `\n\n【本次会话历史，供追问参考】\n${historyContext}`
          : ''
        const systemPrompt = `${currentDateContext}${historySection}\n\n${scenePrompt}\n\n${responseInstruction}`

        const userMsg = `${currentDateContext}\n\n回答模式：${responseMode === 'brief' ? '简要' : '深度'}\n用户问：${question}\n\n请基于以上分析和典籍原文，给出有温度、有具体见解的回答。`

        const chatStream = await streamChat(systemPrompt, userMsg, 1300)

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

        // 用 AI 输出的 classicRef 字段匹配检索结果，获取精确来源
        let matchedSource: { source: string; chapter: string } | null = null
        if (parsed && results.length) {
          const ref = String(parsed.classicRef || '').trim()
          if (ref.length >= 2) {
            // classicRef 格式如 "金匮要略·百合狐惑阴阳毒病证治第三"，按·分割
            const dotIdx = ref.indexOf('·')
            const refSource = dotIdx > 0 ? ref.slice(0, dotIdx).trim() : ref
            const refChapter = dotIdx > 0 ? ref.slice(dotIdx + 1).trim() : ''
            // 在 RAG 结果中找最匹配的条目
            const hit = results.find(r =>
              r.source.includes(refSource) || refSource.includes(r.source)
            )
            if (hit) {
              // 优先用 AI 指定的章节，找不到对应条目则用 hit 自己的章节
              const chapterHit = refChapter
                ? results.find(r => r.source === hit.source && r.chapter.includes(refChapter))
                : null
              matchedSource = chapterHit
                ? { source: chapterHit.source, chapter: chapterHit.chapter }
                : { source: hit.source, chapter: refChapter || hit.chapter }
            }
          }
        }

        send('done', {
          scene,
          raw: fullText,
          parsed,
          advisor: buildAdvisor(parsed),
          sources,
          matchedSource,
          confidence,
          safetyNotice,
        })

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
        send('error', { error: msg, message: msg })
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
