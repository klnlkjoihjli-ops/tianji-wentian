import type { ClassicResult } from './retrieval'

import baopuzi from '../../../scripts/data/baopuzi.json'
import bencao from '../../../scripts/data/bencao.json'
import caigentan from '../../../scripts/data/caigentan.json'
import cantongqi from '../../../scripts/data/cantongqi.json'
import daxueZhongyong from '../../../scripts/data/daxue-zhongyong.json'
import ganyingpian from '../../../scripts/data/ganyingpian.json'
import guiguzi from '../../../scripts/data/guiguzi.json'
import hanfeizi from '../../../scripts/data/hanfeizi.json'
import huainanzi from '../../../scripts/data/huainanzi.json'
import huangtingjing from '../../../scripts/data/huangtingjing.json'
import jinkui from '../../../scripts/data/jinkui.json'
import liaofan from '../../../scripts/data/liaofan.json'
import liezi from '../../../scripts/data/liezi.json'
import liji from '../../../scripts/data/liji.json'
import liutaoSanlue from '../../../scripts/data/liutao-sanlue.json'
import liuyao from '../../../scripts/data/liuyao.json'
import lunyu from '../../../scripts/data/lunyu.json'
import lvsichunqiu from '../../../scripts/data/lvsichunqiu.json'
import meihua from '../../../scripts/data/meihua.json'
import meihuaExtra from '../../../scripts/data/meihua-extra.json'
import mengziExtra from '../../../scripts/data/mengzi-extra.json'
import neijingFull from '../../../scripts/data/neijing-full.json'
import qingjingjing from '../../../scripts/data/qingjingjing.json'
import sanshiliu from '../../../scripts/data/sanshiliu.json'
import seasonalExtra from '../../../scripts/data/seasonal-extra.json'
import shanghan from '../../../scripts/data/shanghan.json'
import shennong from '../../../scripts/data/shennong.json'
import sunzi from '../../../scripts/data/sunzi.json'
import sushu from '../../../scripts/data/sushu.json'
import tuanzhuan from '../../../scripts/data/tuanzhuan.json'
import xiaoliuren from '../../../scripts/data/xiaoliuren.json'
import xunzi from '../../../scripts/data/xunzi.json'
import yanshijiaxun from '../../../scripts/data/yanshijiaxun.json'
import yijingMissing from '../../../scripts/data/yijing-missing.json'
import yijingYaociFull from '../../../scripts/data/yijing-yaoci-full.json'
import yinfujing from '../../../scripts/data/yinfujing.json'
import yizhuanExtra from '../../../scripts/data/yizhuan-extra.json'
import zengguangxianwen from '../../../scripts/data/zengguangxianwen.json'
import zhanguoce from '../../../scripts/data/zhanguoce.json'
import zhuangzi from '../../../scripts/data/zhuangzi.json'
import zuowanglun from '../../../scripts/data/zuowanglun.json'

type KeyedText = { key?: string[]; keywords?: string[] }
type PianText = KeyedText & { pian: string; text: string }
type FinalText = KeyedText & { source: string; chapter: string; content: string }

type LocalClassic = Omit<ClassicResult, 'similarity'> & {
  searchText: string
}

const TU_BEI_FALLBACK = [
  {
    chapter: '第一象 甲子',
    chen: '茫茫天地，不知所止。日月循环，周而复始。',
    song: '自从盘古迄希夷，虎斗龙争事正奇。悟得循环真谛理，试观玄女演周期。',
    keywords: ['循环', '周期', '大势', '趋势'],
  },
  {
    chapter: '第五象 戊辰',
    chen: '一龙一猪，相争相斗。市里坐江山，万里一孤守。',
    song: '运际一阳来复时，日月当空紫气微。木下一了结春秋，流水行云物竞移。',
    keywords: ['相争', '来复', '更替', '竞争'],
  },
  {
    chapter: '第二十象 癸未',
    chen: '大道之行，天下为公。用舍行藏，因时为雄。',
    song: '自古人生有盛衰，盛时志气贯云霄。若还盛极而衰处，须向行藏悟进退。',
    keywords: ['进退', '盛衰', '取舍', '时机'],
  },
  {
    chapter: '第二十三象 丙戌',
    chen: '大风起兮，草木皆折。南征北战，东荡西决。',
    song: '否极泰来运已通，草衣木食入山中。时来骏马如龙走，地下纵横有老翁。',
    keywords: ['否极泰来', '动荡', '转机', '时来'],
  },
  {
    chapter: '第三十九象 壬寅',
    chen: '水势滔天，土崩鱼烂。气数已尽，变生肘腋。',
    song: '忽逢大水际天来，鱼鳖虾蟹化尘埃。此时须是英雄定，长揖雄图万古开。',
    keywords: ['变局', '危机', '倾覆', '英雄'],
  },
  {
    chapter: '第五十九象 壬戌',
    chen: '一阴一阳，道之所在。天下太平，大道复见。',
    song: '否极泰来事事宜，天下升平人所知。可笑蜗角蛮触争，毕竟谁胜更谁负。',
    keywords: ['阴阳', '太平', '否极泰来', '争斗'],
  },
  {
    chapter: '第六十象 癸亥',
    chen: '茫茫天地，不知所止。曰：终而复始。',
    song: '万古乾坤一局棋，输赢胜负各相宜。自从推背图成后，世世代代有人知。',
    keywords: ['终而复始', '输赢', '胜负', '周期'],
  },
]

let cachedLocalClassics: LocalClassic[] | null = null

function keys(row: KeyedText): string[] {
  return row.key || row.keywords || []
}

function add(
  rows: LocalClassic[],
  source: string,
  chapter: string,
  content: string,
  scene: string,
  keywords: string[] = []
) {
  rows.push({
    id: -rows.length - 1,
    source,
    chapter,
    content,
    scene,
    keywords,
    searchText: `${source} ${chapter} ${keywords.join(' ')} ${content}`,
  })
}

function addPian(rows: LocalClassic[], data: PianText[], source: string, scene: string) {
  data.forEach((row) => add(rows, source, row.pian, row.text, scene, keys(row)))
}

function addFinal(rows: LocalClassic[], data: FinalText[], scene: string) {
  data.forEach((row) => add(rows, row.source, row.chapter, row.content, scene, keys(row)))
}

function tokenize(text: string): string[] {
  const normalized = text
    .replace(/[^\p{Script=Han}a-zA-Z0-9]+/gu, ' ')
    .toLowerCase()
  const tokens = new Set<string>()
  for (const part of normalized.split(/\s+/).filter(Boolean)) {
    tokens.add(part)
    for (let i = 0; i < part.length; i++) {
      for (let len = 2; len <= 4; len++) {
        if (i + len <= part.length) tokens.add(part.slice(i, i + len))
      }
    }
  }
  return [...tokens]
}

function sceneMatches(row: LocalClassic, scene: string) {
  if (scene === 'A' || scene === 'C') return row.source === '推背图' && row.scene === scene
  return scene === 'ALL' || row.scene === scene || row.scene === 'ALL'
}

function buildLocalClassics(): LocalClassic[] {
  const rows: LocalClassic[] = []

  TU_BEI_FALLBACK.forEach((row) =>
    add(
      rows,
      '推背图',
      row.chapter,
      `谶曰：${row.chen} 颂曰：${row.song}`,
      'A',
      row.keywords
    )
  )
  TU_BEI_FALLBACK.forEach((row) =>
    add(
      rows,
      '推背图',
      row.chapter,
      `谶曰：${row.chen} 颂曰：${row.song}`,
      'C',
      row.keywords
    )
  )

  ;(yijingYaociFull as FinalText[]).forEach((row) =>
    add(rows, row.source, row.chapter, row.content, 'D', keys(row))
  )
  ;(yijingMissing as FinalText[]).forEach((row) => {
    if (!rows.some((r) => r.source === row.source && r.chapter === row.chapter)) {
      add(rows, row.source, row.chapter, row.content, 'D', keys(row))
    }
  })
  addFinal(rows, tuanzhuan as FinalText[], 'D')
  addFinal(rows, yizhuanExtra as FinalText[], 'D')
  ;(meihua as Array<KeyedText & { zhang: string; text: string }>).forEach((row) =>
    add(rows, '梅花易数', row.zhang, row.text, 'D', keys(row))
  )
  addFinal(rows, meihuaExtra as FinalText[], 'D')
  addFinal(rows, xiaoliuren as FinalText[], 'D')
  addFinal(rows, liuyao as FinalText[], 'D')

  addPian(rows, neijingFull as PianText[], '黄帝内经', 'B')
  addPian(rows, shanghan as PianText[], '伤寒论', 'B')
  addPian(rows, jinkui as PianText[], '金匮要略', 'B')
  ;(bencao as Array<KeyedText & { lei: string; ming: string; text: string }>).forEach((row) =>
    add(rows, '本草纲目', `${row.lei}·${row.ming}`, `${row.ming}：${row.text}`, 'B', keys(row))
  )
  ;(shennong as Array<KeyedText & { pin: string; text: string }>).forEach((row) =>
    add(rows, '神农本草经', row.pin, row.text, 'B', keys(row))
  )

  ;(seasonalExtra as Array<KeyedText & { jie: string; source?: string; text: string }>).forEach((row) =>
    add(rows, row.source || '遵生八笺', row.jie, row.text, 'E', keys(row))
  )

  addPian(rows, zhuangzi as PianText[], '庄子', 'ALL')
  addPian(rows, liezi as PianText[], '列子', 'F')
  addPian(rows, huainanzi as PianText[], '淮南子', 'F')
  addFinal(rows, liaofan as FinalText[], 'F')
  addFinal(rows, yinfujing as FinalText[], 'F')
  addFinal(rows, cantongqi as FinalText[], 'F')
  addFinal(rows, qingjingjing as FinalText[], 'F')
  addFinal(rows, ganyingpian as FinalText[], 'F')
  addFinal(rows, baopuzi as FinalText[], 'F')
  addFinal(rows, zuowanglun as FinalText[], 'F')
  addFinal(rows, huangtingjing as FinalText[], 'F')

  addPian(rows, lunyu as PianText[], '论语', 'ALL')
  addFinal(rows, mengziExtra as FinalText[], 'G')
  addPian(rows, liji as PianText[], '礼记', 'G')
  addPian(rows, xunzi as PianText[], '荀子', 'G')
  ;(daxueZhongyong as PianText[]).forEach((row) =>
    add(rows, row.pian === '大学' ? '大学' : '中庸', row.pian, row.text, 'G', keys(row))
  )
  addFinal(rows, yanshijiaxun as FinalText[], 'G')

  addPian(rows, sunzi as PianText[], '孙子兵法', 'H')
  ;(liutaoSanlue as PianText[]).forEach((row) =>
    add(rows, row.pian.includes('略') ? '三略' : '六韬', row.pian, row.text, 'H', keys(row))
  )
  ;(sanshiliu as Array<KeyedText & { ji: string; text: string }>).forEach((row) =>
    add(rows, '三十六计', row.ji, row.text, 'H', keys(row))
  )
  addPian(rows, guiguzi as PianText[], '鬼谷子', 'H')
  ;(sushu as Array<KeyedText & { zhang: string; text: string }>).forEach((row) =>
    add(rows, '素书', row.zhang, row.text, 'H', keys(row))
  )

  addPian(rows, zhanguoce as PianText[], '战国策', 'C')
  addPian(rows, hanfeizi as PianText[], '韩非子', 'C')
  addPian(rows, lvsichunqiu as PianText[], '吕氏春秋', 'C')

  ;(caigentan as Array<KeyedText & { bu: string; text: string }>).forEach((row) =>
    add(rows, '菜根谭', row.bu, row.text, 'ALL', keys(row))
  )
  ;(zengguangxianwen as Array<KeyedText & { lei: string; text: string }>).forEach((row) =>
    add(rows, '增广贤文', row.lei, row.text, 'ALL', keys(row))
  )

  return rows
}

function getLocalClassics(): LocalClassic[] {
  cachedLocalClassics ??= buildLocalClassics()
  return cachedLocalClassics
}

function score(row: LocalClassic, queryTokens: string[], query: string): number {
  let value = 0
  if (query.includes(row.source) || query.includes(row.chapter)) value += 8
  for (const keyword of row.keywords) {
    if (keyword && query.includes(keyword)) value += 7
  }
  for (const token of queryTokens) {
    if (row.searchText.includes(token)) value += token.length >= 3 ? 2 : 1
  }
  return value
}

export function searchLocalClassics(q: string, scene: string, count = 8): ClassicResult[] {
  const queryTokens = tokenize(q)
  const seen = new Set<string>()
  const candidates = getLocalClassics()
    .filter((row) => sceneMatches(row, scene))
    .map((row) => ({ row, score: score(row, queryTokens, q) }))
    .sort((a, b) => b.score - a.score)
    .filter(({ row }) => {
      const key = `${row.source}\u0000${row.chapter}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

  const top = candidates.slice(0, Math.max(count * 2, 10))
  const bestScore = top[0]?.score || 0
  return top
    .filter((item, index) => index < count || item.score > 0)
    .slice(0, count)
    .map(({ row, score: itemScore }) => ({
      id: row.id,
      source: row.source,
      chapter: row.chapter,
      content: row.content,
      scene: row.scene,
      keywords: row.keywords,
      similarity: bestScore > 0 ? Math.max(0.46, Math.min(0.82, itemScore / bestScore * 0.72)) : 0.46,
    }))
}

export function findLocalClassicsBySourceChapters(source: string, chapters: string[]): ClassicResult[] {
  const clean = (value: string) => value.replace(/（.*?）/g, '').trim()
  const wanted = new Set(chapters.map(clean))
  return getLocalClassics()
    .filter((row) => row.source === source && wanted.has(clean(row.chapter)))
    .map((row) => ({
      id: row.id,
      source: row.source,
      chapter: row.chapter,
      content: row.content,
      scene: row.scene,
      keywords: row.keywords,
      similarity: 1,
    }))
}
