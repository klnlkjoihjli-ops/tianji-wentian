import OpenAI from 'openai'

export const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
})

const zhipu = new OpenAI({
  apiKey: process.env.ZHIPU_API_KEY!,
  baseURL: 'https://open.bigmodel.cn/api/paas/v4/',
})

export async function embed(text: string): Promise<number[]> {
  const res = await zhipu.embeddings.create({
    model: 'embedding-3',
    input: text.slice(0, 2000),
  })
  return res.data[0].embedding
}

export async function streamChat(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 3000
) {
  return deepseek.chat.completions.create({
    model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
    max_tokens: maxTokens,
    temperature: 0.88,
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  })
}

export async function chat(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 1000
): Promise<string> {
  const res = await deepseek.chat.completions.create({
    model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
    max_tokens: maxTokens,
    temperature: 0.7,
    stream: false,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  })
  return res.choices[0].message.content ?? ''
}
