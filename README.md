# 神枢 · 问天

叩问苍天，典籍应答。推背图·黄帝内经·易经·道德经·庄子·孙子

## 架构

```
用户问题
   ↓
Next.js 前端 (Vercel)
   ↓
/api/ask  ← 三步链式生成
   ↓ Step1: 意图分析（DeepSeek Chat）
   ↓ Step2: 向量语义检索（Supabase pgvector）
   ↓ Step3: SSE流式生成（DeepSeek Chat）
   ↓
Supabase ← 典籍向量库 + 对话历史
```

## 快速开始

### 1. 准备账号

- [DeepSeek Platform](https://platform.deepseek.com) - 注册获取 API Key
- [Supabase](https://supabase.com) - 免费创建项目

### 2. 初始化数据库

在 Supabase 项目的 **SQL Editor** 里粘贴并执行：
```
scripts/schema.sql
```

### 3. 配置环境变量

```bash
cp .env.example .env.local
```

编辑 `.env.local`，填入：
- `DEEPSEEK_API_KEY` - DeepSeek 的 sk- 开头的 key
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase 项目 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

> Supabase 的这三个值在：项目 → Settings → API

### 4. 安装依赖

```bash
npm install
```

### 5. 向量化典籍（首次运行）

```bash
npm run embed
```

这会把所有典籍段落生成向量存入 Supabase，约需 10-20 分钟（取决于典籍数量）。

### 6. 启动开发服务器

```bash
npm run dev
```

打开 http://localhost:3000

### 7. 部署到 Vercel

```bash
npm install -g vercel
vercel
```

按提示操作，在 Vercel 控制台填入环境变量即可。

---

## 项目结构

```
src/
├── app/
│   ├── api/ask/route.ts    # 主 API：三步链式生成 + SSE流式
│   ├── layout.tsx           # 页面布局
│   └── page.tsx             # 主页面
├── lib/
│   ├── deepseek.ts          # DeepSeek API 封装
│   ├── supabase.ts          # Supabase 客户端
│   ├── prompts.ts           # 六个场景的系统提示词
│   └── rag/
│       └── retrieval.ts     # 向量检索 + 意图分析
scripts/
├── schema.sql               # 数据库 Schema
└── embed-classics.ts        # 典籍向量化脚本
```

## 技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| 前端 | Next.js 16 | React 应用外壳 + 静态交互页 |
| 后端 | Next.js API Routes | 无服务器函数 |
| AI | DeepSeek Chat | 内容生成 |
| 向量 | 智谱 embedding-3 | 语义向量化（2048维） |
| 数据库 | Supabase (PostgreSQL) | 典籍存储 + 向量检索 |
| 向量索引 | pgvector HNSW | 毫秒级语义检索 |
| 部署 | Vercel | 全球 CDN + Edge |

## 扩展典籍库

在 `scripts/embed-classics.ts` 的 `CLASSICS_DATA` 数组里添加条目：

```typescript
{
  source: '典籍名称',      // 如：黄帝内经
  chapter: '篇章',         // 如：素问·四气调神大论
  content: '原文内容',     // 原文文本
  scene: 'B',              // 场景：A命理/B养生/C时事/D易经/E节气/F道家/ALL全局
  keywords: ['关键词'],    // 辅助检索的关键词
}
```

添加后重新运行 `npm run embed`。

## 已部署数据库的安全迁移

如果数据库曾执行过旧版 `schema.sql`，请在 Supabase SQL Editor 中额外执行：

```text
scripts/secure-conversations.sql
```

这会移除对话表的匿名读写策略。应用后端仍可通过 service role key 保存对话。
