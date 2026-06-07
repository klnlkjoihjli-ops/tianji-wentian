-- 修复已部署数据库中的对话隐私策略。
-- 在 Supabase SQL Editor 中执行一次。

alter table conversations enable row level security;

drop policy if exists "conv_insert" on conversations;
drop policy if exists "conv_read" on conversations;

-- 不创建匿名读写策略。
-- 应用后端使用 SUPABASE_SERVICE_ROLE_KEY 写入，service role 会绕过 RLS。
