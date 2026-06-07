# 结果页减法 + 反馈按钮 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将结果页从「4层网格+场景卡片叠加」改为「英雄区首屏+折叠详情」，同时加入👍/👎反馈按钮存 Supabase。

**Architecture:** 替换 `renderAdvisorFrame()` 为新的 `renderHeroFrame(box, meta)`，所有场景函数简化为只调用 `chainGenerate` 再调用 `renderHeroFrame`；新增 `/api/feedback` Next.js Route Handler 写 Supabase。

**Tech Stack:** 原生 JS (shenshu.html)、Next.js App Router、Supabase JS client (已配置)

---

## 文件清单

| 文件 | 操作 |
|------|------|
| `public/shenshu.html` | 修改：替换 advisor CSS → 英雄 CSS；替换 `renderAdvisorFrame` → `renderHeroFrame`；简化 8 个 sceneX 函数；在 `renderScene` 中移除旧调用 |
| `src/app/api/feedback/route.ts` | 新建：接收 👍/👎 POST，写 Supabase |

Supabase 建表 SQL 在 Task 5，需手动在 Supabase Dashboard 执行一次。

---

## Task 1：替换 advisor CSS → 英雄布局 CSS

**Files:**
- Modify: `public/shenshu.html:969-1001` (advisor CSS block) 和 `1021-1024` (mobile advisor overrides)

- [ ] **Step 1：定位旧 CSS 块**

  在 shenshu.html 中找到如下块（约第 969-1001 行）：

  ```css
  .advisor-frame{ ... }
  .advisor-grid{...}
  .advisor-layer{...}
  /* ... 到 */
  .safety-notice{ ... }
  ```

  注意：`.source-chip` 和 `.confidence` 保留不动，只删 advisor-* 类。

- [ ] **Step 2：删除旧 advisor CSS，插入新英雄 CSS**

  删除以下这些类（完整删除，不留残余）：
  - `.advisor-frame` `.advisor-grid` `.advisor-layer` `.advisor-layer.action-layer`
  - `.advisor-label` `.advisor-text` `.advisor-conclusion` `.advisor-sources`
  - `.advisor-actions` `.advisor-action`
  - mobile overrides: `.advisor-grid{grid-template-columns:1fr}` `.advisor-layer.action-layer{grid-column:auto}` `.advisor-actions{grid-template-columns:1fr}` `.advisor-text{font-size:1rem}`

  在 `.safety-notice` 之后（约原第 998 行位置），插入：

  ```css
  /* ══ 英雄结果层 ══ */
  .hero-frame{
    margin:.25rem 0 .85rem;padding:1.1rem 1.2rem;
    border:1px solid rgba(201,168,76,.25);border-radius:10px;
    background:linear-gradient(135deg,rgba(22,15,7,.92),rgba(4,3,2,.9));
    box-shadow:0 12px 40px rgba(0,0,0,.28);
  }
  .hero-scene-tag{
    display:inline-block;background:rgba(201,168,76,.12);
    border:1px solid rgba(201,168,76,.35);color:#c9a84c;
    padding:.15rem .55rem;border-radius:2rem;
    font-size:.7rem;letter-spacing:.1em;margin-bottom:.6rem;
  }
  .hero-quote{
    font-size:1.08rem;color:#f3dfaa;line-height:1.8;
    border-left:2px solid #c9a84c;padding-left:.85rem;
    margin-bottom:.35rem;font-family:'Ma Shan Zheng',cursive;
  }
  .hero-source{font-size:.72rem;color:#777;margin-bottom:.9rem;padding-left:.9rem}
  .hero-conclusion{
    font-size:.95rem;color:rgba(255,248,230,.88);
    line-height:1.85;margin-bottom:.85rem;
    font-family:'Noto Serif SC',serif;
  }
  .hero-actions{display:flex;flex-direction:column;gap:.38rem;margin-bottom:.85rem}
  .hero-action{
    background:rgba(255,255,255,.035);
    border-left:2px solid rgba(201,168,76,.45);
    padding:.45rem .7rem;font-size:.83rem;
    line-height:1.7;color:rgba(255,255,255,.78);
    font-family:'Noto Serif SC',serif;
  }
  .hero-bottom-bar{display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;margin-bottom:.5rem}
  .hero-expand-btn{
    margin-left:auto;background:transparent;border:1px solid #2a2a2a;
    color:#555;font-size:.74rem;padding:.2rem .65rem;border-radius:2rem;
    cursor:pointer;letter-spacing:.04em;font-family:'Noto Serif SC',serif;
    transition:color .2s,border-color .2s;
  }
  .hero-expand-btn:hover{color:#c9a84c;border-color:rgba(201,168,76,.5)}
  .hero-expand-section{display:none;border-top:1px solid #1a1a1a;margin-top:.75rem;padding-top:.75rem}
  .hero-expand-section.open{display:block}
  .hero-field{margin-bottom:.7rem}
  .hero-field-label{
    font-size:.67rem;color:#555;letter-spacing:.12em;
    text-transform:uppercase;margin-bottom:.22rem;
  }
  .hero-field-text{font-size:.85rem;color:#aaa;line-height:1.7;font-family:'Noto Serif SC',serif}
  .hero-field-divider{border:none;border-top:1px solid #181818;margin:.55rem 0}
  .feedback-row{
    display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;
    padding-top:.6rem;border-top:1px solid rgba(255,255,255,.05);margin-top:.5rem;
  }
  .fb-label{font-size:.7rem;color:#444}
  .fb-btn{
    background:transparent;border:1px solid #2a2a2a;color:#555;
    font-size:.74rem;padding:.18rem .55rem;border-radius:2rem;cursor:pointer;
    transition:color .2s,border-color .2s;
  }
  .fb-btn:hover{color:#c9a84c;border-color:rgba(201,168,76,.5)}
  .fb-btn.helpful{color:#7de8a8;border-color:rgba(125,232,168,.4);pointer-events:none}
  .fb-btn.unhelpful{color:#e07070;border-color:rgba(224,112,96,.4);pointer-events:none}
  .fb-safety{font-size:.7rem;color:#444;font-style:italic;margin-left:auto}
  @media(max-width:640px){
    .hero-quote{font-size:1rem}
    .hero-conclusion{font-size:.92rem}
    .hero-action{font-size:.82rem}
    .hero-expand-btn{margin-left:0}
  }
  ```

- [ ] **Step 3：验证 CSS 未破坏页面**

  ```bash
  cd /Users/can/Downloads/shenshu-nextjs && npm run build 2>&1 | tail -5
  ```

  Expected: `✓ Compiled` 或 `Route (app)` 列表，无 error。

- [ ] **Step 4：commit**

  ```bash
  git add public/shenshu.html
  git commit -m "style: replace advisor grid CSS with hero layout CSS"
  ```

---

## Task 2：新增 `renderHeroFrame`，删除 `renderAdvisorFrame`

**Files:**
- Modify: `public/shenshu.html:2767-2836` (renderAdvisorFrame 函数)

- [ ] **Step 1：在 `renderAdvisorFrame` 函数位置（约第 2767 行），整体替换为以下代码**

  删除整个 `function renderAdvisorFrame(box,meta){ ... }` 块（约第 2767-2836 行），插入：

  ```javascript
  // 场景字段映射：折叠区展示哪些字段
  const SCENE_EXPAND_FIELDS = {
    A: [{key:'jiedu',label:'現代解讀'},{key:'advice',label:'給你的建議'}],
    B: [{key:'diagnosis',label:'辨證分析'},{key:'remedy',label:'調養建議'},{key:'practice',label:'日常實踐'}],
    C: [{key:'analysis',label:'深度分析'},{key:'verdict',label:'具體建議'}],
    D: [{key:'guaDesc',label:'卦象解讀'},{key:'yao',label:'爻辭'},{key:'advice',label:'行動指引'}],
    E: [{key:'yangsheng',label:'節氣養生'},{key:'shichen',label:'時辰調息'},{key:'advice',label:'今日行動'}],
    F: [{key:'interp',label:'典故深意'},{key:'analysis',label:'針對你的問題'},{key:'answer',label:'古人的答案'},{key:'practice',label:'實踐之道'}],
    G: [{key:'interp',label:'典故深意'},{key:'cultivation',label:'修身之路'},{key:'practice',label:'實踐三階'}],
    H: [{key:'decode',label:'兵法解碼'},{key:'situation',label:'局勢研判'},{key:'warning',label:'兵家大忌'}],
  };

  // 从 parsed 中取出引用和来源
  function getHeroQuoteSource(scene, d) {
    if (!d) return {quote:'', source:''};
    const map = {
      A: {quote: d.chen||d.song||'', source:'推背圖 · '+(d.xiang||'')},
      B: {quote: d.classic||'', source:'《黃帝內經》'},
      C: {quote: d.prophecy||'', source:'推背圖 · '+(d.xiang||'')},
      D: {quote: d.guaName||'', source:'《易經》'},
      E: {quote: d.classic||'', source:'《黃帝內經》'},
      F: {quote: d.quote||'', source: d.source||'《道德經》'},
      G: {quote: d.quote||'', source: d.source||'《論語》'},
      H: {quote: d.quote||'', source:'《孫子兵法》· '+(d.pian||'')},
    };
    return map[scene] || {quote:'', source:''};
  }

  const SCENE_LABELS_MAP = {A:'推背·命理',B:'內經·養生',C:'時事·天機',D:'易經·起卦',E:'節氣·養生',F:'道家·智慧',G:'儒家·修身',H:'謀略·兵法'};

  function renderHeroFrame(box, meta) {
    if (!box || !meta) return;
    const advisor = meta.advisor || {};
    const sources = Array.isArray(meta.sources) ? meta.sources : [];
    const scene = meta.scene || 'A';
    const parsed = meta.parsed || {};
    const {quote, source} = getHeroQuoteSource(scene, parsed);

    const frame = document.createElement('section');
    frame.className = 'hero-frame';

    // 场景标签
    const tag = document.createElement('div');
    tag.className = 'hero-scene-tag';
    tag.textContent = SCENE_LABELS_MAP[scene] || scene;
    frame.appendChild(tag);

    // 典籍引用
    if (quote) {
      const q = document.createElement('div');
      q.className = 'hero-quote';
      q.textContent = '「' + quote + '」';
      frame.appendChild(q);
      const s = document.createElement('div');
      s.className = 'hero-source';
      s.textContent = source;
      frame.appendChild(s);
    }

    // 一句结论
    const conclusion = advisor.conclusion || '';
    if (conclusion) {
      const c = document.createElement('div');
      c.className = 'hero-conclusion';
      c.textContent = conclusion;
      frame.appendChild(c);
    }

    // 行动列表
    const actions = Array.isArray(advisor.actions) ? advisor.actions : [];
    if (actions.length) {
      const al = document.createElement('div');
      al.className = 'hero-actions';
      actions.forEach(function(item, i) {
        const a = document.createElement('div');
        a.className = 'hero-action';
        a.textContent = (i+1) + '. ' + item;
        al.appendChild(a);
      });
      frame.appendChild(al);
    }

    // 底部栏：来源 chips + 展开按钮
    const bar = document.createElement('div');
    bar.className = 'hero-bottom-bar';
    sources.forEach(function(src) {
      const chip = document.createElement('span');
      chip.className = 'source-chip';
      chip.textContent = src.source + (src.chapter ? ' · ' + src.chapter : '');
      chip.title = src.excerpt || '';
      bar.appendChild(chip);
    });
    if (!sources.length) {
      const chip = document.createElement('span');
      chip.className = 'source-chip';
      chip.textContent = '本次未檢索到可核驗原文';
      bar.appendChild(chip);
    }

    // 展开按钮（有场景字段时才显示）
    const expandFields = (SCENE_EXPAND_FIELDS[scene] || []).filter(function(f){
      const v = parsed[f.key];
      return v && String(v).trim();
    });
    let expandSection = null;
    if (expandFields.length) {
      const expandBtn = document.createElement('button');
      expandBtn.className = 'hero-expand-btn';
      expandBtn.textContent = '▾ 查看詳細解讀';
      expandSection = document.createElement('div');
      expandSection.className = 'hero-expand-section';
      expandFields.forEach(function(f, i) {
        if (i > 0) {
          const hr = document.createElement('hr');
          hr.className = 'hero-field-divider';
          expandSection.appendChild(hr);
        }
        const field = document.createElement('div');
        field.className = 'hero-field';
        const lbl = document.createElement('div');
        lbl.className = 'hero-field-label';
        lbl.textContent = f.label;
        const txt = document.createElement('div');
        txt.className = 'hero-field-text';
        txt.textContent = String(parsed[f.key]).trim();
        field.appendChild(lbl);
        field.appendChild(txt);
        expandSection.appendChild(field);
      });
      expandBtn.onclick = function() {
        const open = expandSection.classList.toggle('open');
        expandBtn.textContent = open ? '▴ 收起' : '▾ 查看詳細解讀';
      };
      bar.appendChild(expandBtn);
    }
    frame.appendChild(bar);
    if (expandSection) frame.appendChild(expandSection);

    // 反馈行
    const fbRow = document.createElement('div');
    fbRow.className = 'feedback-row';
    const fbLabel = document.createElement('span');
    fbLabel.className = 'fb-label';
    fbLabel.textContent = '這個回答對你有幫助嗎？';
    const fbYes = document.createElement('button');
    fbYes.className = 'fb-btn';
    fbYes.textContent = '👍 有幫助';
    const fbNo = document.createElement('button');
    fbNo.className = 'fb-btn';
    fbNo.textContent = '👎 沒幫助';
    function sendFeedback(helpful) {
      fbYes.classList.toggle('helpful', helpful);
      fbNo.classList.toggle('unhelpful', !helpful);
      fbYes.disabled = true; fbNo.disabled = true;
      const sessionId = localStorage.getItem('shenshu_session') || '';
      const token = sessionStorage.getItem('tianji_auth') || '';
      fetch('/api/feedback', {
        method: 'POST',
        headers: {'Content-Type':'application/json','x-access-token':token},
        body: JSON.stringify({scene: scene, helpful: helpful, question: lastQ||'', sessionId: sessionId}),
      }).catch(function(){/* silent */});
    }
    fbYes.onclick = function(){ sendFeedback(true); };
    fbNo.onclick = function(){ sendFeedback(false); };
    const fbSafety = document.createElement('span');
    fbSafety.className = 'fb-safety';
    fbSafety.textContent = meta.safetyNotice || '內容僅供參考';
    fbRow.appendChild(fbLabel);
    fbRow.appendChild(fbYes);
    fbRow.appendChild(fbNo);
    fbRow.appendChild(fbSafety);
    frame.appendChild(fbRow);

    // 插入 box 最顶部（qEcho 之后）
    const target = box.firstElementChild || box;
    const echo = target.querySelector && target.querySelector('.q-echo');
    if (echo && echo.parentNode) echo.parentNode.insertBefore(frame, echo.nextSibling);
    else box.insertBefore(frame, box.firstChild);
  }
  ```

- [ ] **Step 2：验证语法**

  ```bash
  npm run build 2>&1 | tail -5
  ```

  Expected: no error.

- [ ] **Step 3：commit**

  ```bash
  git add public/shenshu.html
  git commit -m "feat: add renderHeroFrame, remove renderAdvisorFrame"
  ```

---

## Task 3：简化 8 个 sceneX 函数

**Files:**
- Modify: `public/shenshu.html` — sceneA~H 函数体，以及 `renderScene` 中对 `renderAdvisorFrame` 的调用

**背景说明（重要）**

当前每个 `sceneX` 函数：
1. 用 `box.innerHTML = ...` 设置场景专属卡片 HTML
2. 调用 `chainGenerate(q, scene)` 获取 SSE 响应
3. 用 `parseJSON(raw)` 解析，再用 `stream()` 逐字符写入各 DOM 元素

新的场景函数只需要：
1. 调用 `chainGenerate(q, scene)` 获取 `lastAnswerMeta`
2. 在 box 中放 `qEcho(q)` 等简单占位
3. 调用 `renderHeroFrame(box, lastAnswerMeta)` 完成渲染

场景专属的精美装饰（五行图、三角SVG等）**删除**，简化为统一英雄布局。

- [ ] **Step 1：替换 sceneA（约第 2906-2942 行）**

  删除整个 `async function sceneA(q,box){ ... }` 块，替换为：

  ```javascript
  async function sceneA(q,box){
    box.innerHTML = qEcho(q);
    await chainGenerate(q,'A');
  }
  ```

- [ ] **Step 2：替换 sceneB（约第 2945-2979 行）**

  ```javascript
  async function sceneB(q,box){
    box.innerHTML = qEcho(q);
    await chainGenerate(q,'B');
  }
  ```

- [ ] **Step 3：替换 sceneC（约第 2981-3022 行）**

  ```javascript
  async function sceneC(q,box){
    box.innerHTML = qEcho(q);
    await chainGenerate(q,'C');
  }
  ```

- [ ] **Step 4：替换 sceneD（约第 3024-3069 行）**

  ```javascript
  async function sceneD(q,box){
    box.innerHTML = qEcho(q);
    await chainGenerate(q,'D');
  }
  ```

- [ ] **Step 5：替换 sceneE（约第 3071-3126 行）**

  注意：sceneE 当前用 `curJQ`（当前节气）和 `curSC`（时辰）增强 query。保留此逻辑：

  ```javascript
  async function sceneE(q,box){
    box.innerHTML = qEcho(q);
    const _qE = `節氣：${curJQ}，時辰：${curSC}，用戶問：${q}`;
    await chainGenerate(_qE,'E');
  }
  ```

- [ ] **Step 6：替换 sceneG（约第 3129-3172 行）**

  ```javascript
  async function sceneG(q,box){
    box.innerHTML = qEcho(q);
    await chainGenerate(q,'G');
  }
  ```

- [ ] **Step 7：替换 sceneH（约第 3175-3218 行）**

  ```javascript
  async function sceneH(q,box){
    box.innerHTML = qEcho(q);
    await chainGenerate(q,'H');
  }
  ```

- [ ] **Step 8：替换 sceneF（约第 3221-3257 行）**

  ```javascript
  async function sceneF(q,box){
    box.innerHTML = qEcho(q);
    await chainGenerate(q,'F');
  }
  ```

- [ ] **Step 9：更新 `renderScene` 中的调用（约第 2871 行）**

  找到：
  ```javascript
  renderAdvisorFrame(box,lastAnswerMeta);
  ```
  替换为：
  ```javascript
  renderHeroFrame(box,lastAnswerMeta);
  ```

  同时删除 `renderScene` 中 `addCopyBtn` / `action-card` 的旧逻辑（约第 2873-2899 行的 `box.querySelectorAll('.card').forEach(...)` 块），因为新布局不再有 `.card` 元素：

  删除：
  ```javascript
  // 复制按钮 + 建议卡片编号（只渲染JSON数组，不拆分）
  box.querySelectorAll('.card').forEach(card=>{
    ...
  });
  ```

- [ ] **Step 10：验证构建**

  ```bash
  npm run build 2>&1 | tail -5
  ```

  Expected: no error.

- [ ] **Step 11：本地烟测**

  ```bash
  npm run dev &
  sleep 3
  echo "Dev server started"
  ```

  在浏览器打开 http://localhost:3000，登录，输入「面对职场竞争，孙子兵法有何谋略？」，确认：
  - 结果页显示英雄布局（引用 + 结论 + 行动）
  - 点「查看详细解读」展开场景字段
  - 👍/👎 按钮可点击

- [ ] **Step 12：commit**

  ```bash
  git add public/shenshu.html
  git commit -m "refactor: simplify sceneA-H to use renderHeroFrame"
  ```

---

## Task 4：新建 `/api/feedback` Route Handler

**Files:**
- Create: `src/app/api/feedback/route.ts`

- [ ] **Step 1：创建文件**

  ```typescript
  // src/app/api/feedback/route.ts
  import { NextRequest } from 'next/server'
  import { createClient } from '@supabase/supabase-js'

  export const runtime = 'nodejs'

  const VALID_SCENES = new Set(['A','B','C','D','E','F','G','H'])

  function getSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) throw new Error('Supabase env vars missing')
    return createClient(url, key)
  }

  function hashQuestion(q: string): string {
    // 取前64字作为可读标识，不做完整哈希（无需加密）
    return q.slice(0, 64).replace(/\s+/g, ' ').trim()
  }

  export async function POST(req: NextRequest) {
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: '请求格式无效' }, { status: 400 })
    }

    const scene = typeof body.scene === 'string' ? body.scene : ''
    const helpful = typeof body.helpful === 'boolean' ? body.helpful : null
    const question = typeof body.question === 'string' ? body.question : ''
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.slice(0, 128) : null

    if (!VALID_SCENES.has(scene) || helpful === null) {
      return Response.json({ error: '参数无效' }, { status: 400 })
    }

    try {
      const supabase = getSupabase()
      await supabase.from('feedback').insert({
        scene,
        helpful,
        question_hash: hashQuestion(question),
        session_id: sessionId,
      })
    } catch (err) {
      console.error('feedback insert error', err)
      // 不向用户暴露存储错误
    }

    return Response.json({ ok: true })
  }
  ```

- [ ] **Step 2：检查 Supabase client 依赖已存在**

  ```bash
  grep -r "supabase" /Users/can/Downloads/shenshu-nextjs/src/lib/rag/retrieval.ts | head -3
  ```

  Expected: 有 supabase client 的 import，确认 `@supabase/supabase-js` 已安装。

- [ ] **Step 3：确认环境变量名称**

  ```bash
  grep "SUPABASE" /Users/can/Downloads/shenshu-nextjs/.env.local
  ```

  记录实际的 key 变量名（`SUPABASE_SERVICE_KEY` 或 `NEXT_PUBLIC_SUPABASE_ANON_KEY`）。如果变量名不同，更新 `getSupabase()` 中的 `process.env.xxx`。

- [ ] **Step 4：验证构建**

  ```bash
  npm run build 2>&1 | tail -10
  ```

  Expected: `/api/feedback` 出现在 Route 列表，无 TypeScript error。

- [ ] **Step 5：commit**

  ```bash
  git add src/app/api/feedback/route.ts
  git commit -m "feat: add /api/feedback route handler"
  ```

---

## Task 5：Supabase 建表

**Files:** 无代码文件，需人工操作

- [ ] **Step 1：在 Supabase Dashboard 执行以下 SQL**

  打开 https://supabase.com → 项目 → SQL Editor，执行：

  ```sql
  create table if not exists feedback (
    id          bigint generated always as identity primary key,
    created_at  timestamptz default now(),
    scene       text not null,
    helpful     boolean not null,
    question_hash text,
    session_id  text
  );

  -- 允许匿名写入（feedback 无敏感数据）
  alter table feedback enable row level security;
  create policy "allow insert" on feedback for insert with check (true);
  ```

- [ ] **Step 2：验证表已创建**

  在 SQL Editor 执行：
  ```sql
  select * from feedback limit 1;
  ```
  Expected: 返回空结果（无错误）。

---

## Task 6：端对端验证

- [ ] **Step 1：本地完整测试**

  启动 dev server，分别测试以下 3 个场景：
  - 「我最近失眠，黄帝内经怎么说？」→ 场景 B，展开区应显示「辨證分析」「調養建議」「日常實踐」
  - 「面对职场竞争，孙子兵法有何谋略？」→ 场景 H，展开区应显示「兵法解碼」「局勢研判」「兵家大忌」
  - 「道德经对人生困惑有何智慧？」→ 场景 F，展开区应显示「典故深意」「針對你的問題」「古人的答案」「實踐之道」

- [ ] **Step 2：验证反馈写入**

  点击任意结果页的 👍，然后在 Supabase Dashboard → Table Editor → feedback 表，确认有一行新记录。

- [ ] **Step 3：手机尺寸测试**

  浏览器开发者工具切换到 390x844，确认：
  - 引用文字不溢出
  - 行动列表纵向排列
  - 展开/收起正常
  - 👍/👎 可点击

- [ ] **Step 4：最终构建**

  ```bash
  npm run lint && npm run build
  ```

  Expected: 无 error，仅允许 warning。

- [ ] **Step 5：commit**

  ```bash
  git add -A
  git commit -m "chore: final cleanup and verification"
  ```
