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

// 六十四卦（通行本顺序），用于“起卦”——卦辞文字古奥，语义检索无法稳定命中，
// 传统起卦本就是依问题与时机“起”出一卦再解读，而非按相似度找卦。
const HEXAGRAMS_64 = [
  '乾为天', '坤为地', '水雷屯', '山水蒙', '水天需', '天水讼', '地水师', '水地比',
  '风天小畜', '天泽履', '地天泰', '天地否', '天火同人', '火天大有', '地山谦', '雷地豫',
  '泽雷随', '山风蛊', '地泽临', '风地观', '火雷噬嗑', '山火贲', '山地剥', '地雷复',
  '天雷无妄', '山天大畜', '山雷颐', '泽风大过', '坎为水', '离为火', '泽山咸', '雷风恒',
  '天山遁', '雷天大壮', '火地晋', '地火明夷', '风火家人', '火泽睽', '水山蹇', '雷水解',
  '山泽损', '风雷益', '泽天夬', '天风姤', '泽地萃', '地风升', '泽水困', '水风井',
  '泽火革', '火风鼎', '震为雷', '艮为山', '风山渐', '雷泽归妹', '雷火丰', '火山旅',
  '巽为风', '兑为泽', '风水涣', '水泽节', '风泽中孚', '雷山小过', '水火既济', '火水未济',
]

// 依问题文字 + 当日日期起卦：同一问题当天得同一卦，隔日可变（呼应“时机”）。
function castHexagram(question: string): string {
  let h = 2166136261
  for (const ch of question) {
    h ^= ch.charCodeAt(0)
    h = Math.imul(h, 16777619)
  }
  const day = Math.floor(Date.now() / 86_400_000)
  h = (h ^ day) >>> 0
  return HEXAGRAMS_64[h % 64]
}

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

  // 起卦场景：不做语义检索，直接为问题“起”出一卦，取该卦原文交给 AI 解读。
  // 卦辞古奥，语义检索无法稳定命中真卦；传统起卦本也不靠相似度，而是依问题与时机起卦。
  if (scene === 'D') {
    const castName = castHexagram(q)
    const { data, error } = await supabase
      .from('classics')
      .select('id, source, chapter, content, scene, keywords')
      .eq('source', '易经')
      .eq('chapter', castName)
      .limit(1)
    if (error) {
      console.error('起卦失败:', error)
      return []
    }
    return ((data as ClassicResult[]) || []).map(r => ({ ...r, similarity: 1 }))
  }

  // 生成查询向量
  const queryEmbedding = await embed(queryText)

  // 向量检索
  const { data, error } = await supabase.rpc('search_classics', {
    query_embedding: queryEmbedding,
    scene_filter: scene === 'ALL' ? 'ALL' : scene,
    match_count: count,
    match_threshold: 0.45,
  })

  if (error) {
    console.error('向量检索失败:', error)
    return []
  }

  return ((data as ClassicResult[]) || []).slice(0, count)
}

// ══════════════════════════════════════════════
//  格式化典籍上下文（给 AI 看的格式）
// ══════════════════════════════════════════════
export function formatClassicsContext(results: ClassicResult[]): string {
  if (!results.length) return '（未检索到相关典籍）'

  // 直接按 searchClassics 给定的顺序取前 5 条，不再重排：
  // 普通场景 results 已按相似度排好；起卦场景已把易经卦辞排在最前，
  // 这样 AI 上下文才会真正包含卦辞，而不是被高相似度的通俗典籍挤掉。
  return results
    .slice(0, 5)
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
