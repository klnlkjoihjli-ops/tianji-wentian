-- 神枢数据库 Schema
-- 在 Supabase SQL Editor 里执行这个文件

-- 启用向量扩展
create extension if not exists vector;

-- ══════════════════════════════════════════════
--  典籍向量表
--  存储所有典籍段落及其向量
-- ══════════════════════════════════════════════
create table if not exists classics (
  id          bigserial primary key,
  source      text not null,        -- 典籍名称：黄帝内经、道德经、易经...
  chapter     text not null,        -- 篇章：素问·四气调神大论
  content     text not null,        -- 原文内容
  scene       text not null,        -- 适用场景：A/B/C/D/E/F/ALL
  keywords    text[] default '{}',  -- 关键词数组（用于辅助检索）
  embedding   vector(512),          -- 智谱 embedding-3 使用 dimensions:512
  created_at  timestamptz default now()
);

-- 向量索引（HNSW，检索最快）
create index if not exists classics_embedding_idx
  on classics using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- ══════════════════════════════════════════════
--  用户问答历史表
-- ══════════════════════════════════════════════
create table if not exists conversations (
  id          uuid primary key default gen_random_uuid(),
  session_id  text not null,        -- 会话ID（本地生成的UUID）
  question    text not null,        -- 用户问题
  scene       text not null,        -- 触发的场景
  analysis    jsonb,                -- Step1分析结果
  answer      jsonb,                -- 最终回答（JSON）
  classics_used text[],             -- 引用的典籍列表
  created_at  timestamptz default now()
);

create index if not exists conv_session_idx on conversations(session_id);
create index if not exists conv_created_idx on conversations(created_at desc);

-- ══════════════════════════════════════════════
--  语义检索函数
--  输入：query向量、场景过滤、返回数量
--  输出：最相关的典籍段落
-- ══════════════════════════════════════════════
create or replace function search_classics(
  query_embedding vector(512),
  scene_filter    text default 'ALL',
  match_count     int  default 8,
  match_threshold float default 0.5
)
returns table (
  id        bigint,
  source    text,
  chapter   text,
  content   text,
  scene     text,
  keywords  text[],
  similarity float
)
language sql stable
as $$
  select
    c.id, c.source, c.chapter, c.content, c.scene, c.keywords,
    1 - (c.embedding <=> query_embedding) as similarity
  from classics c
  where
    (scene_filter = 'ALL' or c.scene = scene_filter or c.scene = 'ALL')
    and 1 - (c.embedding <=> query_embedding) > match_threshold
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- ══════════════════════════════════════════════
--  用户反馈表
-- ══════════════════════════════════════════════
create table if not exists feedback (
  id            bigint generated always as identity primary key,
  created_at    timestamptz default now(),
  scene         text not null,
  helpful       boolean not null,
  question_hash text,
  session_id    text
);

alter table feedback enable row level security;

-- 任何人都可以插入反馈（匿名写入）
create policy "feedback_insert" on feedback
  for insert with check (true);

-- ══════════════════════════════════════════════
--  RLS 策略（允许匿名读取典籍，写入需要service key）
-- ══════════════════════════════════════════════
alter table classics enable row level security;
alter table conversations enable row level security;

-- 任何人都可以读典籍
create policy "classics_read" on classics
  for select using (true);

-- conversations 不开放匿名策略。后端使用 service role key 写入并绕过 RLS。
