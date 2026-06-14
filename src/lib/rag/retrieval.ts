import { createServiceClient } from '@/lib/supabase'
import { embed, chat } from '@/lib/deepseek'

export interface ClassicResult {
  id: number
  source: string
  chapter: string
  content: string
  scene: string
  keywords: string[]
  similarity: number
}

export interface AnalysisResult {
  topic: string
  domains: string[]
  mood: string
  concepts: string[]
  classics: string[]
}

// ══════════════════════════════════════════════
//  Step 1：语义分析问题意图
// ══════════════════════════════════════════════
export async function analyzeQuestion(q: string): Promise<AnalysisResult> {
  const sys = `你是中华古典学术的问题分析师。
分析用户问题，提取：
1. topic：核心议题（10字以内）
2. domains：涉及领域（命理/养生/时事/易学/节气/道家，可多选）
3. mood：用户情绪状态（担忧/困惑/求知/焦虑/探索/决策）
4. concepts：最相关的3-5个中医或哲学核心概念（如：肝气郁结、否极泰来、无为而治）
5. classics：最应参考的典籍篇章（如：黄帝内经灵枢本神、道德经第十六章）

JSON格式，只输出JSON。`

  const raw = await chat(sys, `用户问：${q}`, 500)
  
  try {
    const s = raw.replace(/```json|```/g, '').trim()
    const a = s.indexOf('{'), b = s.lastIndexOf('}')
    return JSON.parse(s.slice(a, b + 1))
  } catch {
    return { topic: q, domains: [], mood: '求知', concepts: [], classics: [] }
  }
}

// ══════════════════════════════════════════════
//  Step 2：向量语义检索典籍
// ══════════════════════════════════════════════
export async function searchClassics(
  q: string,
  analysis: AnalysisResult,
  scene: string,
  count = 8
): Promise<ClassicResult[]> {
  const supabase = createServiceClient()

  // 用问题 + 核心概念组合查询，提升召回率
  const queryText = [
    q,
    ...(analysis.concepts || []),
    ...(analysis.classics || []),
  ].join(' ')

  // 生成查询向量
  const queryEmbedding = await embed(queryText)

  // 易经起卦场景：通俗典籍（论语/道德经等 ALL 标签）语言更贴近现代提问，
  // 会把古奥的卦辞挤到很靠后。这里拉大候选集，确保真正的易经卦辞优先出现。
  const isYijing = scene === 'D'
  const fetchCount = isYijing ? Math.max(count * 6, 48) : count

  // 向量检索
  const { data, error } = await supabase.rpc('search_classics', {
    query_embedding: queryEmbedding,
    scene_filter: scene === 'ALL' ? 'ALL' : scene,
    match_count: fetchCount,
    match_threshold: 0.45,
  })

  if (error) {
    console.error('向量检索失败:', error)
    return []
  }

  const results = (data as ClassicResult[]) || []
  if (!isYijing) return results.slice(0, count)

  // 起卦：优先保留相似度最高的易经卦辞，再用其他典籍补足，保证“起卦”能引到真卦
  const yijing = results.filter(r => r.source === '易经')
  const others = results.filter(r => r.source !== '易经')
  const yiQuota = Math.min(yijing.length, Math.max(count - 2, 4))
  const merged = [...yijing.slice(0, yiQuota), ...others].slice(0, count)
  return merged.length ? merged : results.slice(0, count)
}

// ══════════════════════════════════════════════
//  格式化典籍上下文（给 AI 看的格式）
// ══════════════════════════════════════════════
export function formatClassicsContext(results: ClassicResult[]): string {
  if (!results.length) return '（未检索到相关典籍）'

  return results
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5)  // 只取相关度最高的5条，减少输入 token
    .map(r => `【${r.source}·${r.chapter}】\n${r.content.slice(0, 120)}`)
    .join('\n\n')
}

// ══════════════════════════════════════════════
//  保存对话记录
// ══════════════════════════════════════════════
export async function saveConversation(data: {
  sessionId: string
  question: string
  scene: string
  analysis: AnalysisResult
  answer: object
  classicsUsed: string[]
}) {
  const supabase = createServiceClient()
  
  await supabase.from('conversations').insert({
    session_id: data.sessionId,
    question: data.question,
    scene: data.scene,
    analysis: data.analysis,
    answer: data.answer,
    classics_used: data.classicsUsed,
  })
}

// ══════════════════════════════════════════════
//  获取最近对话历史
// ══════════════════════════════════════════════
export async function getRecentHistory(
  sessionId: string,
  limit = 2
): Promise<string> {
  if (!sessionId) return ''

  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('conversations')
      .select('question, answer')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error || !data || data.length === 0) return ''

    // reverse to chronological order (oldest first)
    const history = [...data].reverse()

    return history
      .map((row) => {
        const q = typeof row.question === 'string' ? row.question : ''
        const ans = row.answer as Record<string, unknown> | null
        const summary = (ans ? Object.values(ans) : [])
          .filter((v) => typeof v === 'string' && v.trim().length > 10)
          .map((s) => String(s).slice(0, 100))
          .join('；')
          .slice(0, 200)
        return `上轮问题：${q}\n上轮回答要点：${summary || '（无摘要）'}`
      })
      .join('\n\n')
  } catch {
    return ''
  }
}
