# 神枢·问天 — 审查问题清单

审查时间：2026-06-07
审查范围：完整源码 + 线上部署状态

---

## 🔴 阻塞级（线上出问题）

### 1. `feedback` 表不存在

- **文件**：`src/app/api/feedback/route.ts` — 往 `feedback` 表 insert
- **问题**：`scripts/schema.sql` 只建了 `classics` 和 `conversations` 两张表，未创建 `feedback` 表
- **后果**：用户点击"有帮助/没帮助" → 后端抛 500
- **修法**：在 Supabase SQL Editor 执行：

```sql
create table if not exists feedback (
  id            bigserial primary key,
  scene         text not null,
  helpful       boolean not null,
  question_hash text,
  session_id    text,
  created_at    timestamptz default now()
);
```

### 2. 典籍数据文件未入库

- **文件**：`scripts/embed-classics.ts` L6-25
- **问题**：依赖 `scripts/data/neijing-full.json`、`shanghan.json` 等 10 个 JSON 数据文件，但**这些文件未提交到 git**（目录存在但内容为空）
- **后果**：新环境跑 `npm run embed` 立刻报错，无法向量化典籍
- **修法**：确认本地文件存在后提交：

```bash
git add scripts/data/
git commit -m "chore: add classics data files"
```

---

## 🟠 高风险（安全 / 运维）

### 3. `ACCESS_TOKEN` 兼任密码和签名密钥

- **文件**：`src/lib/auth.ts` L11-13
- **代码**：

```typescript
function getSigningSecret(): string {
  return process.env.AUTH_SECRET || process.env.ACCESS_TOKEN || ''
}
```

- **问题**：`AUTH_SECRET` 未设置时，直接拿登录密码当 HMAC 签名密钥。**知道密码就能伪造任意 token**，拿到永久登录权限
- **修法**：在 Vercel 环境变量中设置独立密钥：

```bash
openssl rand -hex 32   # 用输出结果设到 AUTH_SECRET
```

### 4. `ZHIPU_API_KEY` 可能漏配

- **文件**：`src/lib/deepseek.ts` L8-11（运行时 embedding）、`scripts/embed-classics.ts` L45-48（脚本）
- **问题**：向量 embedding 走智谱 API（`embedding-3` 模型），需要 `ZHIPU_API_KEY`。但 `.env.example` 中未列出此变量，部署时容易忘记
- **后果**：embedding 调用全挂 → 向量检索返回空 → AI 没有典籍可引用
- **修法**：
  1. 确认 Vercel 环境变量中有 `ZHIPU_API_KEY`
  2. 补到 `.env.example` 中

### 5. `NEXT_PUBLIC_APP_URL` 可能是 localhost

- **文件**：`.env.local`
- **问题**：当前值可能是 `http://localhost:3000`，部署后未改成线上域名
- **后果**：应用内某些拼接 URL 的地方指向本机，功能异常
- **修法**：确认 Vercel 环境变量中设为：

```
NEXT_PUBLIC_APP_URL=https://tianji.zhangkengkeng.cn
```

---

## 🟡 架构级（影响扩展性）

### 6. 限流在进程内存，多实例部署下无效

- **文件**：
  - `src/app/api/ask/route.ts` L26-31（问答限流）
  - `src/app/api/auth/route.ts` L10-14（登录限流）
- **问题**：限流计数器挂在 `globalThis` 上。Vercel 多实例部署下，每个实例各自计数。用户刷 6 次请求分散到不同实例，**限流形同虚设**
- **后果**：攻击者可绕过限流刷 API，消耗 AI 调用费
- **修法（后续）**：换用 Upstash Redis / Vercel KV / Supabase 做共享计数
- **备注**：CODEX_HANDOFF.md 已记录此问题

### 7. `embed-classics.ts` 手动解析 `.env.local`

- **文件**：`scripts/embed-classics.ts` L27-38
- **问题**：脚本自己写正则解析 `.env.local` 来加载环境变量，不够稳健（注释行、空行、带引号的值都可能解析出错）
- **修法**：改用 `dotenv` 包，或在运行前要求用户手动 `export` 环境变量

---

## 🔵 建议类（代码质量 / 健壮性）

### 8. Supabase 客户端初始化无保护

- **文件**：`src/lib/supabase.ts` L5-7
- **代码**：

```typescript
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

- **问题**：两个 `!` 非空断言，如果环境变量缺失，运行时报错信息不友好
- **修法**：加运行时判断，环境变量缺失时报清晰的配置错误

---

## ✅ 已做对的部分（无需动）

| 项目 | 状态 |
|------|------|
| 前端无密钥泄露 — 所有 API 调用走后端路由 | ✅ |
| 密码使用 `timingSafeEqual` 比较 — 防时序攻击 | ✅ |
| 登录 5 次 / 15 分钟限流 + 800ms 延迟返回 | ✅ |
| Token 8 小时过期 + HMAC-SHA256 签名 | ✅ |
| 问答限流 6 次 / 分钟 | ✅（虽进程级，聊胜于无） |
| 医疗 / 命理场景有对应安全提示 | ✅ 8 个场景各有免责声明 |
| SSE 流式响应结构清晰（三步进度 + analysis + classics + delta + done） | ✅ |
| `conversations` 表 RLS 策略正确（无匿名策略，仅 service role key 可写） | ✅ |
| 输入校验严格（长度 ≤1200、scene 白名单、sessionId ≤128） | ✅ |
| 后端不暴露原始错误给用户 | ✅ |
| 移动端适配 390px 无溢出 | ✅ |
| Three.js 性能降级（小屏 / 低端设备自动降级） | ✅ |
| 自定义域名 | ✅ `tianji.zhangkengkeng.cn` |

---

## 修复优先级建议

| 优先级 | 编号 | 问题 | 预估耗时 |
|--------|------|------|---------|
| P0 | #3 | 设独立 AUTH_SECRET | 1 分钟 |
| P0 | #1 | 补 feedback 表定义 | 2 分钟 |
| P1 | #4 | 确认 ZHIPU_API_KEY 已配 | 1 分钟 |
| P1 | #5 | 确认 APP_URL 已改 | 1 分钟 |
| P2 | #2 | 提交 data 文件到 git | 2 分钟 |
| P3 | #6 | 共享限流（后续架构改进） | 按需 |
| P3 | #7 | embed 脚本优化 | 可选 |
| P3 | #8 | supabase 客户端空值保护 | 可选 |
