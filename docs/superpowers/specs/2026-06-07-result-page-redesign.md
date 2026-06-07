# 结果页减法 + 反馈按钮 设计文档

更新时间：2026-06-07

## 目标

将结果页从「信息堆叠」改为「英雄区 + 折叠详情」布局，同时加入用户反馈按钮，数据存 Supabase。

## 问题现状

当前结果页渲染两套内容：
1. **advisor 四层网格**（一句结论 / 典籍依据 / 现代解释 / 今日行动）
2. **场景字段**（各场景 JSON 字段逐一展示）

两套内容叠加导致首屏信息量过载，用户不知道先看哪里。

---

## 新布局：英雄区 + 折叠详情

### 首屏（始终可见）

```
[ 场景标签 ]  谋略 · 兵法
[ 用户问题 ]  「面对职场竞争，孙子兵法有何谋略？」
[ 典籍引用 ]  左金线竖线 + 原文引用（来自场景字段 quote）
[ 引用来源 ]  《孙子兵法 · 始计篇》（来自场景字段 source/pian）
[ 结论 ]      一句话（advisor.conclusion，≤160字）
[ 行动列表 ]  3条纵向排列（advisor.actions）
[ 底部栏 ]   来源 chips（典籍名） + 「▾ 查看详细解读」按钮
[ 反馈行 ]   「这个回答对你有帮助吗？」  👍 有帮助  👎 没帮助   仅供参考
```

### 折叠区（点击展开）

展示场景专属字段，按场景不同：

| 场景 | 展示字段 |
|------|---------|
| A（推背） | jiedu → advice |
| B（内经） | diagnosis → remedy → practice |
| C（时事） | analysis → verdict |
| D（易经） | guaDesc → yao → advice |
| E（节气） | yangsheng → shichen → advice |
| F（道家） | interp → analysis → answer → practice |
| G（儒家） | interp → cultivation → practice |
| H（兵法） | decode → situation → warning |

**不再单独展示 `modernExplanation`**（其内容已融入 `advisor.conclusion`）。

---

## 反馈功能

### 前端行为
- 点击 👍 或 👎 后按钮变色（gold / muted red），不再可点
- 静默发送 POST `/api/feedback`，不阻塞页面
- 失败时静默忽略（不弹错误）

### 后端 `/api/feedback`
- 请求体：`{ question, scene, helpful: true|false, sessionId? }`
- 写入 Supabase 表 `feedback`：`id, created_at, scene, helpful, question_hash（sha256前64字）, session_id`
- 无需鉴权（只接受 POST，无敏感数据）
- 不返回用户数据

### Supabase 建表 SQL
```sql
create table if not exists feedback (
  id          bigint generated always as identity primary key,
  created_at  timestamptz default now(),
  scene       text not null,
  helpful     boolean not null,
  question_hash text,
  session_id  text
);
```

---

## 文件变更范围

| 文件 | 变更 |
|------|------|
| `public/shenshu.html` | 重写 `renderAdvisor()` 函数；各 `sceneX()` 函数保留但字段渲染移入折叠区 |
| `src/app/api/feedback/route.ts` | 新建，处理反馈 POST |
| Supabase | 手动执行建表 SQL（不在代码里迁移） |

---

## 不在本次范围内

- 响应提速（单独 spec）
- 限流持久化（单独 spec）
- 追问 / 会话继续
- PWA / 分享图

---

## 验收标准

1. 手机（390px）首屏无横向溢出，可见引用 + 结论 + 行动
2. 点「查看详细解读」展开场景字段，再点收起
3. 点 👍 / 👎 后按钮状态变化，Supabase feedback 表出现一条记录
4. 页面无 JS 报错，`npm run build` 通过
