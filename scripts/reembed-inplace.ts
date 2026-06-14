// 原地重嵌：逐行读取 classics，用修正后的 float 编码重新生成 embedding 并按 id 更新。
// 只更新 embedding 列，不动 source/chapter/content/scene/keywords。
// 用法：npx tsx scripts/reembed-inplace.ts
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import * as fs from 'fs'
import * as path from 'path'

const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const idx = line.indexOf('=')
    if (idx > 0) {
      const k = line.slice(0, idx).trim()
      if (!process.env[k]) process.env[k] = line.slice(idx + 1).trim()
    }
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const zhipu = new OpenAI({
  apiKey: process.env.ZHIPU_API_KEY!,
  baseURL: 'https://open.bigmodel.cn/api/paas/v4/',
})

async function embed(text: string, retries = 3): Promise<number[]> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await zhipu.embeddings.create({
        model: 'embedding-3',
        input: text.slice(0, 2000),
        dimensions: 512,
        encoding_format: 'float',
      })
      return res.data[0].embedding
    } catch (e) {
      if (i === retries - 1) throw e
      await new Promise(r => setTimeout(r, 1000 * (i + 1)))
    }
  }
  return []
}

async function main() {
  // 分页拉取全部 id + content
  const all: Array<{ id: number; content: string }> = []
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from('classics')
      .select('id, content')
      .order('id', { ascending: true })
      .range(from, from + 999)
    if (error) throw error
    if (!data || !data.length) break
    all.push(...data)
    if (data.length < 1000) break
    from += 1000
  }
  console.log(`共 ${all.length} 条待重嵌`)

  let ok = 0, fail = 0
  for (let i = 0; i < all.length; i++) {
    const row = all[i]
    process.stdout.write(`\r重嵌中: ${i + 1}/${all.length} ✓${ok} ✗${fail}  `)
    try {
      const embedding = await embed(row.content)
      const { error } = await supabase.from('classics').update({ embedding }).eq('id', row.id)
      if (error) throw error
      ok++
      await new Promise(r => setTimeout(r, 120))
    } catch (e) {
      fail++
      console.error(`\n✗ id=${row.id}`, (e as Error).message)
    }
  }
  console.log(`\n完成：成功 ${ok}，失败 ${fail}`)
}

main().catch(e => { console.error(e); process.exit(1) })
