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

// 八卦二进制（自下而上：[初,中,上]，阳=1 阴=0）与卦名解析，用于推算变卦
const TRIGRAM_BITS: Record<string, number[]> = {
  乾: [1, 1, 1], 兑: [1, 1, 0], 离: [1, 0, 1], 震: [1, 0, 0],
  巽: [0, 1, 1], 坎: [0, 1, 0], 艮: [0, 0, 1], 坤: [0, 0, 0],
}
const ELEM_TO_TRIGRAM: Record<string, string> = {
  天: '乾', 泽: '兑', 火: '离', 雷: '震', 风: '巽', 水: '坎', 山: '艮', 地: '坤',
}
const DOUBLE_GUA: Record<string, [string, string]> = {
  乾为天: ['乾', '乾'], 坤为地: ['坤', '坤'], 坎为水: ['坎', '坎'], 离为火: ['离', '离'],
  震为雷: ['震', '震'], 艮为山: ['艮', '艮'], 巽为风: ['巽', '巽'], 兑为泽: ['兑', '兑'],
}
// 卦名 -> [上卦, 下卦]
function guaTrigrams(name: string): [string, string] {
  if (DOUBLE_GUA[name]) return DOUBLE_GUA[name]
  return [ELEM_TO_TRIGRAM[name[0]], ELEM_TO_TRIGRAM[name[1]]]
}
// 卦名 -> 六爻（自下而上，0..5）= 下卦三爻 + 上卦三爻
function guaLines(name: string): number[] {
  const [up, lo] = guaTrigrams(name)
  return [...TRIGRAM_BITS[lo], ...TRIGRAM_BITS[up]]
}
// 六爻 -> 卦名
const LINES_TO_NAME: Record<string, string> = {}
for (const n of HEXAGRAMS_64) LINES_TO_NAME[guaLines(n).join('')] = n
// 变卦：翻转第 yao(1..6) 爻后的卦名
function bianGua(name: string, yao: number): string {
  const lines = guaLines(name).slice()
  lines[yao - 1] ^= 1
  return LINES_TO_NAME[lines.join('')] || name
}

// 小六壬六宫（自大安起）。按问题 + 月/日/时辰三步掐课，落宫即为本课。
const LIUREN_PALACES = ['大安', '留连', '速喜', '赤口', '小吉', '空亡']
function castXiaoLiuren(question: string): { palace: string; path: string[] } {
  let base = 2166136261
  for (const ch of question) { base ^= ch.charCodeAt(0); base = Math.imul(base, 16777619) }
  base = (base >>> 0) % 6
  // 取中国标准时间的月、日、时辰（呼应起课讲究的“时机”）
  const sh = new Date(Date.now() + 8 * 3600 * 1000)
  const month = sh.getUTCMonth() + 1
  const day = sh.getUTCDate()
  const hourBranch = Math.floor(((sh.getUTCHours() + 1) % 24) / 2) + 1 // 子时=1..亥时=12
  const p1 = (base + month) % 6        // 月宫
  const p2 = (p1 + day) % 6            // 日宫
  const p3 = (p2 + hourBranch) % 6     // 时宫（本课）
  return { palace: LIUREN_PALACES[p3], path: [LIUREN_PALACES[p1], LIUREN_PALACES[p2], LIUREN_PALACES[p3]] }
}

// 依问题文字 + 当日日期起卦：返回本卦与动爻（1..6）。同一问题当天结果一致，隔日可变。
function castGua(question: string): { ben: string; yao: number } {
  let h = 2166136261
  for (const ch of question) {
    h ^= ch.charCodeAt(0)
    h = Math.imul(h, 16777619)
  }
  const day = Math.floor(Date.now() / 86_400_000)
  h = (h ^ day) >>> 0
  const ben = HEXAGRAMS_64[h % 64]
  // 动爻用另一段散列，避免与卦号强相关
  const yao = (Math.imul(h ^ 0x9e3779b9, 2654435761) >>> 0) % 6 + 1
  return { ben, yao }
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

  // 起卦场景：不做语义检索，直接为问题“起”出本卦、动爻、变卦，取原文交给 AI 解读。
  // 卦辞古奥，语义检索无法稳定命中真卦；传统起卦本也不靠相似度，而是依问题与时机起卦。
  if (scene === 'D') {
    const { ben, yao } = castGua(q)
    const bian = bianGua(ben, yao)
    // 取本卦、变卦的卦爻辞，以及本卦的彖传（判词，深化义理）
    const names = Array.from(new Set([ben, bian, ben + '·彖传']))
    const { data, error } = await supabase
      .from('classics')
      .select('id, source, chapter, content, scene, keywords')
      .eq('source', '易经')
      .in('chapter', names)
    if (error) {
      console.error('起卦失败:', error)
      return []
    }
    const rows = (data as ClassicResult[]) || []
    const benRow = rows.find(r => r.chapter === ben)
    const bianRow = rows.find(r => r.chapter === bian)
    const tuanRow = rows.find(r => r.chapter === ben + '·彖传')
    // 按问题相关性，捞 2 条义理/断法心法（梅花、六爻、序卦/杂卦/文言等），
    // 排除易经卦辞本身（卦由掐课而来，不靠检索），让解读带上相关的术数义理。
    let interp: ClassicResult[] = []
    try {
      const qEmb = await embed(queryText)
      const { data: hits } = await supabase.rpc('search_classics', {
        query_embedding: qEmb, scene_filter: 'D', match_count: 12, match_threshold: 0.3,
      })
      // 只保留术数义理/断法层：六爻、梅花、以及易传（系辞/说卦/序卦/杂卦/文言）；
      // 排除卦辞本身与论语/增广贤文等通用典籍，专注于断卦的义理参考。
      const isInterp = (r: ClassicResult) =>
        r.source === '六爻' || r.source === '梅花易数'
        || (r.source === '易经' && /系辞|说卦|序卦|杂卦|文言/.test(r.chapter))
      interp = ((hits as ClassicResult[]) || []).filter(isInterp).slice(0, 2)
    } catch { /* 检索失败不影响起卦主体 */ }
    // 兜底：若没捞到义理，则给一条核心梅花心法
    if (!interp.length) {
      const { data: mh } = await supabase
        .from('classics')
        .select('id, source, chapter, content, scene, keywords')
        .eq('source', '梅花易数').eq('chapter', '体用生克').limit(1)
      interp = (mh as ClassicResult[]) || []
    }
    // 同时起一课小六壬，作为快速印证
    const lr = castXiaoLiuren(q)
    const { data: lrData } = await supabase
      .from('classics')
      .select('id, source, chapter, content, scene, keywords')
      .eq('source', '小六壬')
      .eq('chapter', lr.palace)
      .limit(1)
    const lrRow = ((lrData as ClassicResult[]) || [])[0]
    // 合成“起卦结果”说明，放在最前，告诉 AI 本卦/动爻/变卦 与 小六壬课
    const summary: ClassicResult = {
      id: -1, source: '起卦', scene: 'D', similarity: 1, keywords: [],
      chapter: '本次起卦结果',
      content: `易经本卦：${ben}（看当前情势）。动爻：第${yao}爻（变化的关键，应重点参看本卦此爻的爻辞）。`
        + (bianRow ? `变卦：${bian}（事态发展的趋向）。` : '本卦六爻无动，以卦辞与象辞为主。')
        + `小六壬得「${lr.palace}」课（${lr.path.join('→')}），作快速吉凶印证。`
        + '解读时：先以本卦定当前格局，再就第' + yao + '爻爻辞看转折关键，以变卦看走向，最后用小六壬课断作一句吉凶印证；可参以梅花易数体用生克之理。',
    }
    const out: ClassicResult[] = [summary]
    if (benRow) out.push({ ...benRow, chapter: benRow.chapter + '（本卦）', similarity: 1 })
    if (tuanRow) out.push({ ...tuanRow, similarity: 1 })
    if (bianRow) out.push({ ...bianRow, chapter: bianRow.chapter + '（变卦）', similarity: 1 })
    if (lrRow) out.push({ ...lrRow, similarity: 1 })
    for (const m of interp) out.push({ ...m, similarity: 1 })
    return out
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
  // 普通场景 results 已按相似度排好；起卦场景已把本卦/变卦排在最前。
  // 起卦相关条目（起卦说明、易经卦辞、梅花心法）需保留较完整内容，
  // 否则动爻的爻辞会被截断，AI 无法据此解读。
  const fullSources = new Set(['起卦', '易经', '梅花易数', '小六壬'])
  return results
    .slice(0, 7)
    .map(r => {
      const limit = fullSources.has(r.source) ? 400 : 120
      return `【${r.source}·${r.chapter}】\n${r.content.slice(0, limit)}`
    })
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
