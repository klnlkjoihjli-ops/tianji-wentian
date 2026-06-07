# 神枢·问天 功能扩展实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为神枢·问天网站添加对话上下文记忆、场景联动示例问题和三部新典籍（黄帝内经扩充、伤寒论、本草纲目）。

**Architecture:** 后端在 `retrieval.ts` 新增 `getRecentHistory()` 读取历史对话，`route.ts` 在生成前注入摘要；前端在 landing 页新增场景选择器+示例按钮；典籍数据存为独立 JSON 文件，embed 脚本导入后入库。

**Tech Stack:** Next.js 16, TypeScript, Supabase (PostgreSQL), DeepSeek API, Vanilla JS (shenshu.html)

---

## 文件变更清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 新建 | `scripts/data/neijing-full.json` | 黄帝内经扩充数据（约100条） |
| 新建 | `scripts/data/shanghan.json` | 伤寒论数据（约60条） |
| 新建 | `scripts/data/bencao.json` | 本草纲目精选数据（约80条） |
| 修改 | `scripts/embed-classics.ts` | 导入三个JSON文件并推入ALL_CLASSICS |
| 修改 | `src/lib/rag/retrieval.ts` | 新增 `getRecentHistory()` 函数 |
| 修改 | `src/app/api/ask/route.ts` | 调用 `getRecentHistory()`，注入历史摘要 |
| 修改 | `public/shenshu.html` | 新增场景选择器、示例按钮和交互逻辑 |

---

## Task 1: 创建黄帝内经扩充数据文件

**Files:**
- Create: `scripts/data/neijing-full.json`

- [ ] **Step 1: 创建 scripts/data 目录并写入文件**

```bash
mkdir -p scripts/data
```

创建 `scripts/data/neijing-full.json`，格式如下（每条有 `pian` 篇章、`text` 原文、`key` 关键词数组）：

```json
[
  {
    "pian": "素问·上古天真论",
    "text": "上古之人，其知道者，法于阴阳，和于术数，食饮有节，起居有常，不妄作劳，故能形与神俱，而尽终其天年，度百岁乃去。",
    "key": ["养生之道", "法于阴阳", "起居有常", "天年"]
  },
  {
    "pian": "素问·上古天真论",
    "text": "今时之人不然也，以酒为浆，以妄为常，醉以入房，以欲竭其精，以耗散其真，不知持满，不时御神，务快其心，逆于生乐，起居无节，故半百而衰也。",
    "key": ["过劳伤身", "欲竭其精", "起居无节", "早衰"]
  },
  {
    "pian": "素问·四气调神大论",
    "text": "春三月，此谓发陈，天地俱生，万物以荣，夜卧早起，广步于庭，被发缓形，以使志生，生而勿杀，予而勿夺，赏而勿罚，此春气之应，养生之道也。",
    "key": ["春季养生", "发陈", "夜卧早起", "养生之道"]
  },
  {
    "pian": "素问·四气调神大论",
    "text": "夏三月，此谓蕃秀，天地气交，万物华实，夜卧早起，无厌于日，使志无怒，使华英成秀，使气得泄，若所爱在外，此夏气之应，养长之道也。",
    "key": ["夏季养生", "蕃秀", "养长之道", "夜卧早起"]
  },
  {
    "pian": "素问·四气调神大论",
    "text": "秋三月，此谓容平，天气以急，地气以明，早卧早起，与鸡俱兴，使志安宁，以缓秋刑，收敛神气，使秋气平，无外其志，使肺气清，此秋气之应，养收之道也。",
    "key": ["秋季养生", "容平", "养收之道", "早卧早起"]
  },
  {
    "pian": "素问·四气调神大论",
    "text": "冬三月，此谓闭藏，水冰地坼，无扰乎阳，早卧晚起，必待日光，使志若伏若匿，若有私意，若已有得，去寒就温，无泄皮肤，使气亟夺，此冬气之应，养藏之道也。",
    "key": ["冬季养生", "闭藏", "养藏之道", "早卧晚起"]
  },
  {
    "pian": "素问·生气通天论",
    "text": "阳气者，若天与日，失其所则折寿而不彰，故天运当以日光明。是故阳因而上，卫外者也。",
    "key": ["阳气", "卫外", "折寿", "天人合一"]
  },
  {
    "pian": "素问·生气通天论",
    "text": "阴者，藏精而起亟也；阳者，卫外而为固也。阴不胜其阳，则脉流薄疾，并乃狂；阳不胜其阴，则五脏气争，九窍不通。",
    "key": ["阴阳平衡", "藏精", "卫外", "五脏"]
  },
  {
    "pian": "素问·金匮真言论",
    "text": "东风生于春，病在肝，俞在颈项；南风生于夏，病在心，俞在胸胁；西风生于秋，病在肺，俞在肩背；北风生于冬，病在肾，俞在腰股；中央为土，病在脾，俞在脊。",
    "key": ["五脏", "四时", "风邪", "经络俞穴"]
  },
  {
    "pian": "素问·阴阳应象大论",
    "text": "阴阳者，天地之道也，万物之纲纪，变化之父母，生杀之本始，神明之府也，治病必求于本。",
    "key": ["阴阳", "天地之道", "治病求本", "万物纲纪"]
  },
  {
    "pian": "素问·阴阳应象大论",
    "text": "水火者，阴阳之征兆也；阴阳者，万物之能始也。故曰：阴在内，阳之守也；阳在外，阴之使也。",
    "key": ["水火", "阴阳", "阴阳互根", "守护"]
  },
  {
    "pian": "素问·阴阳应象大论",
    "text": "喜伤心，恐胜喜；思伤脾，怒胜思；忧伤肺，喜胜忧；恐伤肾，思胜恐；怒伤肝，悲胜怒。",
    "key": ["七情", "情志致病", "五脏情志", "相胜"]
  },
  {
    "pian": "素问·脏气法时论",
    "text": "肝病者，愈在丙丁，丙丁不愈，加于庚辛，庚辛不死，持于壬癸，起于甲乙。肝病者，平旦慧，下晡甚，夜半静。",
    "key": ["肝病", "五行时辰", "愈期", "病机"]
  },
  {
    "pian": "素问·脏气法时论",
    "text": "肝色青，宜食甘，粳米、牛肉、枣、葵皆甘。心色赤，宜食酸，小豆、犬肉、李、韭皆酸。肺色白，宜食苦，麦、羊肉、杏、薤皆苦。脾色黄，宜食咸，大豆、豕肉、栗、藿皆咸。肾色黑，宜食辛，黄黍、鸡肉、桃、葱皆辛。",
    "key": ["五脏饮食", "五色五味", "食疗", "养生"]
  },
  {
    "pian": "素问·举痛论",
    "text": "余知百病生于气也。怒则气上，喜则气缓，悲则气消，恐则气下，寒则气收，炅则气泄，惊则气乱，劳则气耗，思则气结。",
    "key": ["百病生于气", "情志", "气机", "七情致病"]
  },
  {
    "pian": "素问·痹论",
    "text": "风寒湿三气杂至，合而为痹也。其风气胜者为行痹，寒气胜者为痛痹，湿气胜者为着痹也。",
    "key": ["痹证", "风寒湿", "行痹", "痛痹", "着痹"]
  },
  {
    "pian": "素问·痿论",
    "text": "肺热叶焦，则皮毛虚弱急薄，著则生痿躄也。心气热，则下脉厥而上，上则下脉虚，虚则生脉痿，枢折挈，胫纵而不任地也。",
    "key": ["痿证", "肺热", "心气热", "筋脉"]
  },
  {
    "pian": "素问·调经论",
    "text": "血气不和，百病乃变化而生，是故守经隧焉。",
    "key": ["血气", "经隧", "百病", "调和"]
  },
  {
    "pian": "素问·至真要大论",
    "text": "谨察阴阳所在而调之，以平为期，正者正治，反者反治。",
    "key": ["阴阳调和", "治则", "正治反治", "以平为期"]
  },
  {
    "pian": "素问·至真要大论",
    "text": "寒者热之，热者寒之，微者逆之，甚者从之，坚者削之，客者除之，劳者温之，结者散之，留者攻之，燥者濡之，急者缓之，散者收之，损者温之，逸者行之，惊者平之，上之下之，摩之浴之，薄之劫之，开之发之，适事为故。",
    "key": ["治则治法", "寒热", "补泻", "辨证论治"]
  },
  {
    "pian": "灵枢·本神",
    "text": "故生之来谓之精，两精相搏谓之神，随神往来者谓之魂，并精而出入者谓之魄，所以任物者谓之心，心有所忆谓之意，意之所存谓之志，因志而存变谓之思，因思而远慕谓之虑，因虑而处物谓之智。",
    "key": ["精神魂魄", "心神", "意志思虑", "情志"]
  },
  {
    "pian": "灵枢·本神",
    "text": "肝藏血，血舍魂，肝气虚则恐，实则怒。脾藏营，营舍意，脾气虚则四肢不用，五脏不安，实则腹胀，经溲不利。心藏脉，脉舍神，心气虚则悲，实则笑不休。",
    "key": ["五脏藏神", "肝藏魂", "脾藏意", "心藏神"]
  },
  {
    "pian": "灵枢·营卫生会",
    "text": "人受气于谷，谷入于胃，以传与肺，五脏六腑，皆以受气，其清者为营，浊者为卫，营在脉中，卫在脉外，营周不休，五十而复大会，阴阳相贯，如环无端。",
    "key": ["营卫", "气血生成", "脾胃", "阴阳相贯"]
  },
  {
    "pian": "灵枢·天年",
    "text": "人生十岁，五脏始定，血气已通，其气在下，故好走；二十岁，血气始盛，肌肉方长，故好趋；三十岁，五脏大定，肌肉坚固，血脉盛满，故好步；四十岁，五脏六腑，十二经脉，皆大盛以平定，腠理始疏，荣华颓落，发颇斑白，平盛不摇，故好坐。",
    "key": ["生命周期", "五脏", "血气", "年龄养生"]
  },
  {
    "pian": "灵枢·天年",
    "text": "五十岁，肝气始衰，肝叶始薄，胆汁始减，目始不明；六十岁，心气始衰，苦忧悲，血气懈惰，故好卧；七十岁，脾气虚，皮肤枯；八十岁，肺气衰，魄离，故言善误；九十岁，肾气焦，四脏经脉空虚；百岁，五脏皆虚，神气皆去，形骸独居而终矣。",
    "key": ["衰老", "五脏衰退", "肝气衰", "生命周期"]
  },
  {
    "pian": "灵枢·百病始生",
    "text": "夫百病之始生也，皆生于风雨寒暑，清湿喜怒。喜怒不节则伤脏，风雨则伤上，清湿则伤下。三部之气所伤异类，愿闻其会。",
    "key": ["百病始生", "六淫", "七情", "病因"]
  },
  {
    "pian": "素问·宝命全形论",
    "text": "天覆地载，万物悉备，莫贵于人。人以天地之气生，四时之法成。",
    "key": ["天人合一", "四时", "人与天地", "生命"]
  },
  {
    "pian": "素问·疏五过论",
    "text": "圣人之治病也，必知天地阴阳，四时经纪，五脏六腑，雌雄表里，刺灸砭石，毒药所主，从容人事，以明经道，贵贱贫富，各异品理，问年少长，勇怯之理，审于分部，知病本始，八正九候，诊必副矣。",
    "key": ["诊断", "天地四时", "五脏六腑", "治病原则"]
  },
  {
    "pian": "素问·汤液醪醴论",
    "text": "精神不进，志意不治，故病不可愈。今精坏神去，营卫不可复收。何者？嗜欲无穷，而忧患不止，精气驰坏，营泣卫除，故神去之而病不愈也。",
    "key": ["精神", "志意", "嗜欲", "病不可愈"]
  },
  {
    "pian": "素问·移精变气论",
    "text": "往古人居禽兽之间，动作以避寒，阴居以避暑，内无眷慕之累，外无伸官之形，此恬淡之世，邪不能深入也。",
    "key": ["恬淡", "精神内守", "邪气", "养生"]
  },
  {
    "pian": "素问·上古天真论",
    "text": "恬淡虚无，真气从之，精神内守，病安从来。是以志闲而少欲，心安而不惧，形劳而不倦，气从以顺，各从其欲，皆得所愿。",
    "key": ["恬淡虚无", "真气", "精神内守", "养生心法"]
  },
  {
    "pian": "素问·上古天真论",
    "text": "女子七岁，肾气盛，齿更发长；二七而天癸至，任脉通，太冲脉盛，月事以时下，故有子；三七，肾气平均，故真牙生而长极；四七，筋骨坚，发长极，身体盛壮；五七，阳明脉衰，面始焦，发始堕；六七，三阳脉衰于上，面皆焦，发始白；七七，任脉虚，太冲脉衰少，天癸竭，地道不通，故形坏而无子也。",
    "key": ["女子生命周期", "天癸", "肾气", "任脉太冲脉"]
  },
  {
    "pian": "素问·上古天真论",
    "text": "丈夫八岁，肾气实，发长齿更；二八，肾气盛，天癸至，精气溢泻，阴阳和，故能有子；三八，肾气平均，筋骨劲强，故真牙生而长极；四八，筋骨隆盛，肌肉满壮；五八，肾气衰，发堕齿槁；六八，阳气衰竭于上，面焦，发鬓颁白；七八，肝气衰，筋不能动；八八，天癸竭，精少，肾脏衰，形体皆极，则齿发去。",
    "key": ["男子生命周期", "肾气", "天癸", "衰老"]
  },
  {
    "pian": "素问·经脉别论",
    "text": "食气入胃，散精于肝，淫气于筋。食气入胃，浊气归心，淫精于脉，脉气流经，经气归于肺，肺朝百脉，输精于皮毛。",
    "key": ["脾胃运化", "水谷精微", "肺朝百脉", "气血"]
  },
  {
    "pian": "素问·咳论",
    "text": "五脏六腑皆令人咳，非独肺也。皮毛者，肺之合也，皮毛先受邪气，邪气以从其合也，其寒饮食入胃，从肺脉上至于肺则肺寒，肺寒则外内合邪，因而客之，则为肺咳。",
    "key": ["咳嗽", "五脏", "肺", "外邪内饮"]
  },
  {
    "pian": "素问·逆调论",
    "text": "胃不和则卧不安。",
    "key": ["胃不和", "失眠", "脾胃", "卧不安"]
  },
  {
    "pian": "素问·宣明五气篇",
    "text": "五味所入：酸入肝，辛入肺，苦入心，咸入肾，甘入脾，是谓五入。五气所病：心为噫，肺为咳，肝为语，脾为吞，肾为欠为嚏，胃为气逆，为哕，为恐，大肠小肠为泄，下焦溢为水，膀胱不利为癃，不约为遗溺，胆为怒，是谓五病。",
    "key": ["五味", "五脏", "五气所病", "饮食"]
  },
  {
    "pian": "素问·热论",
    "text": "今夫热病者，皆伤寒之类也，或愈或死，其死皆以六七日之间，其愈皆以十日以上者何也？不知其解，愿闻其故。",
    "key": ["热病", "伤寒", "六经", "病程"]
  },
  {
    "pian": "素问·奇病论",
    "text": "此人者，数食甘美而多肥也，肥者令人内热，甘者令人中满，故其气上溢，转为消渴。",
    "key": ["消渴", "饮食", "甘肥", "内热中满"]
  },
  {
    "pian": "灵枢·经脉",
    "text": "经脉者，所以能决死生，处百病，调虚实，不可不通。",
    "key": ["经脉", "决死生", "百病", "虚实"]
  },
  {
    "pian": "灵枢·五味",
    "text": "谷始入于胃，其精微者，先出于胃之两焦，以溉五脏，别出两行，营卫之道，其大气之抟而不行者，积于胸中，命曰气海，出于肺，循喉咽，故呼则出，吸则入。",
    "key": ["水谷精微", "营卫", "气海", "呼吸"]
  },
  {
    "pian": "灵枢·邪客",
    "text": "心者，五脏六腑之大主也，精神之所舍也，其脏坚固，邪弗能容也，容之则心伤，心伤则神去，神去则死矣。",
    "key": ["心", "精神", "五脏六腑大主", "心神"]
  },
  {
    "pian": "灵枢·大惑论",
    "text": "卫气不得入于阴，常留于阳，留于阳则阳气满，阳气满则阳跷盛，不得入于阴则阴气虚，故目不瞑矣。",
    "key": ["失眠", "卫气", "阴阳", "阳跷"]
  },
  {
    "pian": "灵枢·师传",
    "text": "入国问俗，入家问讳，上堂问礼，临病人问所便。",
    "key": ["问诊", "因人制宜", "临证", "便宜"]
  },
  {
    "pian": "素问·刺法论",
    "text": "正气存内，邪不可干。",
    "key": ["正气", "邪气", "扶正祛邪", "防病"]
  },
  {
    "pian": "素问·评热病论",
    "text": "邪之所凑，其气必虚。阴虚者，阳必凑之，故少气时热而汗出也。",
    "key": ["正气虚", "邪气", "阴虚", "汗出"]
  },
  {
    "pian": "灵枢·本输",
    "text": "凡刺之道，必通十二经络之所终始，络脉之所别处，五输之所留，六腑之所与合，四时之所出入，五脏之所溜处，阔数之度，浅深之状，高下所至。",
    "key": ["十二经络", "五输穴", "针刺", "经脉"]
  },
  {
    "pian": "素问·阴阳别论",
    "text": "凡持真脉之脏脉者，肝至悬绝急，十八日死；心至悬绝，九日死；肺至悬绝，十二日死；肾至悬绝，七日死；脾至悬绝，四日死。",
    "key": ["脉诊", "脏脉", "预后", "五脏"]
  },
  {
    "pian": "素问·五脏生成篇",
    "text": "心之合脉也，其荣色也，其主肾也。肺之合皮也，其荣毛也，其主心也。肝之合筋也，其荣爪也，其主肺也。脾之合肉也，其荣唇也，其主肝也。肾之合骨也，其荣发也，其主脾也。",
    "key": ["五脏合", "五华", "相克", "脏腑关系"]
  },
  {
    "pian": "灵枢·九针十二原",
    "text": "所言节者，神气之所游行出入也，非皮肉筋骨也。",
    "key": ["腧穴", "神气", "针刺原理", "经络"]
  },
  {
    "pian": "素问·平人气象论",
    "text": "人一呼脉再动，一吸脉亦再动，呼吸定息，脉五动，闰以太息，命曰平人。平人者，不病也。",
    "key": ["脉诊", "平人", "正常脉象", "呼吸"]
  }
]
```

- [ ] **Step 2: 验证 JSON 格式有效**

```bash
node -e "const d=require('./scripts/data/neijing-full.json'); console.log('条数:', d.length)"
```

Expected output: `条数: 50`（或实际条数）

---

## Task 2: 创建伤寒论数据文件

**Files:**
- Create: `scripts/data/shanghan.json`

- [ ] **Step 1: 写入伤寒论数据**

创建 `scripts/data/shanghan.json`：

```json
[
  {
    "pian": "辨太阳病脉证并治上",
    "text": "太阳之为病，脉浮，头项强痛而恶寒。",
    "key": ["太阳病", "脉浮", "头项强痛", "恶寒"]
  },
  {
    "pian": "辨太阳病脉证并治上",
    "text": "太阳病，发热，汗出，恶风，脉缓者，名为中风。",
    "key": ["太阳中风", "发热汗出", "恶风", "脉缓"]
  },
  {
    "pian": "辨太阳病脉证并治上",
    "text": "太阳病，或已发热，或未发热，必恶寒，体痛，呕逆，脉阴阳俱紧者，名为伤寒。",
    "key": ["太阳伤寒", "恶寒体痛", "脉紧", "六经辨证"]
  },
  {
    "pian": "辨太阳病脉证并治上",
    "text": "太阳病，头痛发热，汗出恶风，桂枝汤主之。",
    "key": ["桂枝汤", "太阳中风", "头痛发热", "汗出恶风"]
  },
  {
    "pian": "辨太阳病脉证并治中",
    "text": "太阳病，头痛，发热，身疼，腰痛，骨节疼痛，恶风，无汗而喘者，麻黄汤主之。",
    "key": ["麻黄汤", "太阳伤寒", "无汗而喘", "身疼"]
  },
  {
    "pian": "辨太阳病脉证并治中",
    "text": "发汗后，不可更行桂枝汤，汗出而喘，无大热者，可与麻黄杏仁甘草石膏汤。",
    "key": ["麻杏石甘汤", "汗后喘", "治疗变化", "辨证"]
  },
  {
    "pian": "辨太阳病脉证并治中",
    "text": "伤寒五六日，中风，往来寒热，胸胁苦满，嘿嘿不欲饮食，心烦喜呕，或胸中烦而不呕，或渴，或腹中痛，或胁下痞硬，或心下悸，小便不利，或不渴，身有微热，或咳者，小柴胡汤主之。",
    "key": ["小柴胡汤", "少阳病", "往来寒热", "胸胁苦满"]
  },
  {
    "pian": "辨阳明病脉证并治",
    "text": "阳明之为病，胃家实是也。",
    "key": ["阳明病", "胃家实", "六经", "里证"]
  },
  {
    "pian": "辨阳明病脉证并治",
    "text": "阳明病，汗出多而渴者，不可与猪苓汤，以汗多胃中燥，猪苓汤复利其小便故也。",
    "key": ["阳明病", "津液", "汗出多渴", "辨证禁忌"]
  },
  {
    "pian": "辨少阳病脉证并治",
    "text": "少阳之为病，口苦，咽干，目眩也。",
    "key": ["少阳病", "口苦咽干", "目眩", "六经"]
  },
  {
    "pian": "辨太阴病脉证并治",
    "text": "太阴之为病，腹满而吐，食不下，自利益甚，时腹自痛，若下之，必胸下结硬。",
    "key": ["太阴病", "腹满", "自利", "脾虚"]
  },
  {
    "pian": "辨太阴病脉证并治",
    "text": "自利不渴者，属太阴，以其脏有寒故也，当温之，宜服四逆辈。",
    "key": ["太阴病", "自利不渴", "脏寒", "四逆汤"]
  },
  {
    "pian": "辨少阴病脉证并治",
    "text": "少阴之为病，脉微细，但欲寐也。",
    "key": ["少阴病", "脉微细", "但欲寐", "阳虚"]
  },
  {
    "pian": "辨少阴病脉证并治",
    "text": "少阴病，得之一二日，口中和，其背恶寒者，当灸之，附子汤主之。",
    "key": ["少阴病", "背恶寒", "附子汤", "温阳"]
  },
  {
    "pian": "辨厥阴病脉证并治",
    "text": "厥阴之为病，消渴，气上撞心，心中疼热，饥而不欲食，食则吐蛔，下之利不止。",
    "key": ["厥阴病", "消渴", "寒热错杂", "乌梅丸证"]
  },
  {
    "pian": "辨霍乱病脉证并治",
    "text": "问曰：病有霍乱者何？答曰：呕吐而利，此名霍乱。",
    "key": ["霍乱", "呕吐下利", "急证", "辨证"]
  },
  {
    "pian": "辨太阳病脉证并治中",
    "text": "伤寒，胸中有热，胃中有邪气，腹中痛，欲呕吐者，黄连汤主之。",
    "key": ["黄连汤", "寒热错杂", "腹痛欲呕", "治则"]
  },
  {
    "pian": "辨太阳病脉证并治下",
    "text": "病如桂枝证，头不痛，项不强，寸脉微浮，胸中痞硬，气上冲喉咽，不得息者，此为胸有寒也，当吐之，宜瓜蒂散。",
    "key": ["瓜蒂散", "胸中寒", "痞硬", "吐法"]
  },
  {
    "pian": "辨太阳病脉证并治中",
    "text": "太阳病三日，发汗不解，蒸蒸发热者，属胃也，调胃承气汤主之。",
    "key": ["调胃承气汤", "阳明", "蒸蒸发热", "下法"]
  },
  {
    "pian": "辨阳明病脉证并治",
    "text": "阳明病，谵语，发潮热，脉滑而疾者，小承气汤主之。",
    "key": ["小承气汤", "谵语", "潮热", "阳明腑实"]
  },
  {
    "pian": "辨阳明病脉证并治",
    "text": "阳明病，下之，心中懊憹而烦，胃中有燥屎者，可攻，腹微满，初头硬，后必溏，不可攻之。",
    "key": ["阳明病", "燥屎", "心中懊憹", "攻下禁忌"]
  },
  {
    "pian": "辨少阴病脉证并治",
    "text": "少阴病，二三日不已，至四五日，腹痛，小便不利，四肢沉重疼痛，自下利者，此为有水气，其人或咳，或小便利，或下利，或呕者，真武汤主之。",
    "key": ["真武汤", "阳虚水泛", "少阴病", "水气"]
  },
  {
    "pian": "辨少阴病脉证并治",
    "text": "少阴病，脉沉者，急温之，宜四逆汤。",
    "key": ["四逆汤", "少阴病", "脉沉", "急温"]
  },
  {
    "pian": "辨厥阴病脉证并治",
    "text": "手足厥寒，脉细欲绝者，当归四逆汤主之。若其人内有久寒者，宜当归四逆加吴茱萸生姜汤。",
    "key": ["当归四逆汤", "手足厥寒", "脉细欲绝", "血虚寒凝"]
  },
  {
    "pian": "辨阴阳易差后劳复病脉证并治",
    "text": "大病差后，劳复者，枳实栀子汤主之。",
    "key": ["劳复", "病后调养", "枳实栀子汤", "康复"]
  },
  {
    "pian": "辨太阳病脉证并治上",
    "text": "病人身大热，反欲得近衣者，热在皮肤，寒在骨髓也；身大寒，反不欲近衣者，寒在皮肤，热在骨髓也。",
    "key": ["真寒假热", "真热假寒", "辨证", "寒热"]
  },
  {
    "pian": "辨太阳病脉证并治中",
    "text": "发汗过多，其人叉手自冒心，心下悸，欲得按者，桂枝甘草汤主之。",
    "key": ["桂枝甘草汤", "汗后心悸", "心阳虚", "自冒心"]
  },
  {
    "pian": "辨太阳病脉证并治中",
    "text": "太阳病，发汗，汗出不解，其人仍发热，心下悸，头眩，身瞤动，振振欲擗地者，真武汤主之。",
    "key": ["真武汤", "汗后变证", "心悸头眩", "阳虚"]
  },
  {
    "pian": "辨太阳病脉证并治下",
    "text": "伤寒发热，汗出不解，心中痞硬，呕吐而下利者，大柴胡汤主之。",
    "key": ["大柴胡汤", "心中痞硬", "呕吐下利", "少阳阳明"]
  },
  {
    "pian": "辨太阳病脉证并治下",
    "text": "伤寒五六日，呕而发热者，柴胡汤证具，而以他药下之，柴胡证仍在者，复与柴胡汤，此虽已下之，不为逆，必蒸蒸而振，却发热汗出而解。",
    "key": ["小柴胡汤", "误下后治法", "战汗", "蒸蒸而振"]
  },
  {
    "pian": "辨阳明病脉证并治",
    "text": "阳明病，脉迟，虽汗出不恶寒者，其身必重，短气，腹满而喘，有潮热者，此外欲解，可攻里也，手足濈然汗出者，此大便已硬也，大承气汤主之。",
    "key": ["大承气汤", "阳明腑实", "潮热", "大便硬"]
  },
  {
    "pian": "辨太阳病脉证并治中",
    "text": "伤寒，医下之，续得下利，清谷不止，身疼痛者，急当救里；后身疼痛，清便自调者，急当救表，救里宜四逆汤，救表宜桂枝汤。",
    "key": ["四逆汤", "桂枝汤", "先里后表", "救急"]
  }
]
```

- [ ] **Step 2: 验证文件**

```bash
node -e "const d=require('./scripts/data/shanghan.json'); console.log('条数:', d.length)"
```

Expected output: `条数: 32`（或实际条数）

---

## Task 3: 创建本草纲目精选数据文件

**Files:**
- Create: `scripts/data/bencao.json`

- [ ] **Step 1: 写入本草纲目数据**

创建 `scripts/data/bencao.json`（每条有 `ming` 药名、`lei` 类别、`text` 功效原文、`key` 关键词）：

```json
[
  {
    "ming": "人参",
    "lei": "草部",
    "text": "人参，气味甘，微寒，无毒。主补五脏，安精神，定魂魄，止惊悸，除邪气，明目，开心益智。久服，轻身延年。",
    "key": ["人参", "补五脏", "安精神", "益智"]
  },
  {
    "ming": "黄芪",
    "lei": "草部",
    "text": "黄芪，气味甘，微温，无毒。主痈疽久败疮，排脓止痛，大风癞疾，五痔鼠瘘，补虚，小儿百病。",
    "key": ["黄芪", "补虚", "固表止汗", "益气"]
  },
  {
    "ming": "当归",
    "lei": "草部",
    "text": "当归，气味苦，温，无毒。主咳逆上气，温疟，寒热，洗在皮肤中，妇人漏下绝子，诸恶疮疡，金疮，煮饮之。",
    "key": ["当归", "补血", "妇科", "活血"]
  },
  {
    "ming": "甘草",
    "lei": "草部",
    "text": "甘草，气味甘，平，无毒。主五脏六腑寒热邪气，坚筋骨，长肌肉，倍力，金疮，解毒。久服，轻身延年。",
    "key": ["甘草", "调和诸药", "解毒", "补中"]
  },
  {
    "ming": "茯苓",
    "lei": "木部",
    "text": "茯苓，气味甘，平，无毒。主胸胁逆气，忧恚，惊邪恐悸，心下结痛，寒热烦满，咳逆，口焦舌干，利小便。久服，安魂养神，不饥延年。",
    "key": ["茯苓", "安神", "利湿", "健脾"]
  },
  {
    "ming": "枸杞子",
    "lei": "木部",
    "text": "枸杞子，气味苦，寒，无毒。主五内邪气，热中，消渴，周痹。久服，坚筋骨，轻身不老，耐寒暑。",
    "key": ["枸杞", "滋肾", "明目", "抗老"]
  },
  {
    "ming": "生姜",
    "lei": "菜部",
    "text": "生姜，气味辛，微温，无毒。主伤寒头痛，鼻塞，咳逆上气，止呕吐，去痰下气。",
    "key": ["生姜", "发散风寒", "止呕", "温胃"]
  },
  {
    "ming": "大枣",
    "lei": "果部",
    "text": "大枣，气味甘，平，无毒。主心腹邪气，安中，养脾气，平胃气，通九窍，助十二经，补少气，少津液，身中不足，大惊，四肢重，和百药。久服，轻身长年。",
    "key": ["大枣", "健脾", "补血", "安神"]
  },
  {
    "ming": "黄连",
    "lei": "草部",
    "text": "黄连，气味苦，寒，无毒。主热气，目痛，眦伤，泣出，明目，肠澼，腹痛，下利，妇人阴中肿痛。久服，令人不忘。",
    "key": ["黄连", "清热燥湿", "止痢", "明目"]
  },
  {
    "ming": "薏苡仁",
    "lei": "谷部",
    "text": "薏苡仁，气味甘，微寒，无毒。主筋急拘挛，不可屈伸，风湿痹，下气，久服，轻身益气。",
    "key": ["薏苡仁", "祛湿", "健脾", "利水"]
  },
  {
    "ming": "山药",
    "lei": "菜部",
    "text": "山药，气味甘，温，平，无毒。主伤中，补虚羸，除寒热邪气，补中益气力，长肌肉。久服，耳目聪明，轻身，不饥延年。",
    "key": ["山药", "补脾肺肾", "益精固肾", "健脾"]
  },
  {
    "ming": "陈皮",
    "lei": "果部",
    "text": "橘皮，气味苦、辛，温，无毒。主胸中瘕热，逆气，利水谷，久服去臭，下气，通神。",
    "key": ["陈皮", "理气化痰", "健脾", "燥湿"]
  },
  {
    "ming": "菊花",
    "lei": "草部",
    "text": "菊花，气味苦，平，无毒。主诸风头眩，肿痛，目欲脱，泪出，皮肤死肌，恶风湿痹。久服，利血气，轻身，耐老延年。",
    "key": ["菊花", "清热明目", "平肝", "头眩目痛"]
  },
  {
    "ming": "桂枝",
    "lei": "木部",
    "text": "桂枝，气味辛，温，无毒。主上气咳逆，结气，喉痹，吐吸，利关节，补中益气。久服，通神，轻身不老。",
    "key": ["桂枝", "温经通脉", "发汗解肌", "助阳"]
  },
  {
    "ming": "附子",
    "lei": "草部",
    "text": "附子，气味辛，温，大热，有大毒。主风寒咳逆邪气，温中，金疮，破症坚积聚，血瘕，寒湿踒躄，拘挛膝痛，不能行步。",
    "key": ["附子", "回阳救逆", "温阳", "散寒止痛"]
  },
  {
    "ming": "半夏",
    "lei": "草部",
    "text": "半夏，气味辛，平，有毒。主伤寒，寒热，心下坚，下气，喉咽肿痛，头眩胸胀，咳逆肠鸣，止汗。",
    "key": ["半夏", "化痰止呕", "燥湿", "降逆"]
  },
  {
    "ming": "川芎",
    "lei": "草部",
    "text": "川芎，气味辛，温，无毒。主中风入脑，头痛，寒痹，筋挛缓急，金疮，妇人血闭，无子。",
    "key": ["川芎", "活血行气", "祛风止痛", "头痛"]
  },
  {
    "ming": "白术",
    "lei": "草部",
    "text": "白术，气味苦，温，无毒。主风寒湿痹，死肌，痉，疸，止汗，除热消食，主大风在身面，风眩头痛，目泪出，消痰水，逐皮间风水结肿，除心下急满。",
    "key": ["白术", "健脾燥湿", "止汗", "固表"]
  },
  {
    "ming": "熟地黄",
    "lei": "草部",
    "text": "熟地黄，气味甘，微温，无毒。填骨髓，长肌肉，生精血，补五脏内伤不足，通血脉，利耳目，黑须发，男子五劳七伤，女子伤中，胞漏下血，破恶血溺血，利大小肠。",
    "key": ["熟地黄", "补血滋阴", "填精益髓", "肾虚"]
  },
  {
    "ming": "黄芩",
    "lei": "草部",
    "text": "黄芩，气味苦，平，无毒。主诸热，黄疸，肠澼，泄利，逐水，下血闭，恶疮疽蚀，火疡。",
    "key": ["黄芩", "清热燥湿", "止血安胎", "肺热"]
  },
  {
    "ming": "柴胡",
    "lei": "草部",
    "text": "柴胡，气味苦，平，无毒。主心腹肠胃中结气，饮食积聚，寒热邪气，推陈致新。久服，轻身明目益精。",
    "key": ["柴胡", "疏肝解郁", "和解少阳", "退热"]
  },
  {
    "ming": "丹参",
    "lei": "草部",
    "text": "丹参，气味苦，微寒，无毒。主心腹邪气，肠鸣幽幽如走水，寒热积聚，破症除瘕，止烦满，益气。",
    "key": ["丹参", "活血化瘀", "清心安神", "心腹痛"]
  },
  {
    "ming": "麦冬",
    "lei": "草部",
    "text": "麦冬，气味甘，平，无毒。主心腹结气，伤中伤饱，胃络脉绝，羸瘦，短气，久服，轻身不老不饥。",
    "key": ["麦冬", "养阴润肺", "益胃生津", "心烦失眠"]
  },
  {
    "ming": "五味子",
    "lei": "草部",
    "text": "五味子，气味酸，温，无毒。主益气，咳逆上气，劳伤羸瘦，补不足，强阴，益男子精。",
    "key": ["五味子", "收敛固涩", "益气生津", "咳嗽"]
  },
  {
    "ming": "红花",
    "lei": "草部",
    "text": "红花，气味辛，温，无毒。主产后血晕口噤，腹内恶血不尽，绞痛，胎死腹中，并酒煮服，亦主蛊毒。",
    "key": ["红花", "活血通经", "化瘀止痛", "妇科"]
  },
  {
    "ming": "杏仁",
    "lei": "果部",
    "text": "杏仁，气味甘、苦，温，冷利，有小毒。主咳逆上气，雷鸣，喉痹，下气，产乳金疮，寒心奔豚。",
    "key": ["杏仁", "止咳平喘", "润肠通便", "降气"]
  },
  {
    "ming": "葛根",
    "lei": "草部",
    "text": "葛根，气味甘，平，无毒。主消渴，身大热，呕吐，诸痹，起阴气，解诸毒。",
    "key": ["葛根", "解肌退热", "生津止渴", "升阳"]
  },
  {
    "ming": "莲子",
    "lei": "果部",
    "text": "莲子，气味甘，平、涩，无毒。主补中，养神，益气力，除百疾，久服，轻身耐老，不饥延年。",
    "key": ["莲子", "健脾止泻", "益肾固精", "养心安神"]
  },
  {
    "ming": "芡实",
    "lei": "果部",
    "text": "芡实，气味甘，平，无毒。主湿痹，腰脊膝痛，补中，除暴疾，益精气，强志，令耳目聪明。久服，轻身不饥，耐老神仙。",
    "key": ["芡实", "益肾固精", "补脾止泻", "祛湿"]
  },
  {
    "ming": "桑叶",
    "lei": "木部",
    "text": "桑叶，气味苦、甘，寒，有小毒。主除寒热，出汗。",
    "key": ["桑叶", "疏散风热", "清肺润燥", "明目"]
  },
  {
    "ming": "桃仁",
    "lei": "果部",
    "text": "桃仁，气味苦，平，无毒。主瘀血，血闭，症瘕，邪气，杀小虫。",
    "key": ["桃仁", "活血化瘀", "润肠通便", "血瘀"]
  },
  {
    "ming": "冬虫夏草",
    "lei": "虫部",
    "text": "冬虫夏草，气味甘，平，无毒。保肺益肾，止血化痰，已劳嗽。",
    "key": ["冬虫夏草", "补肺益肾", "止血化痰", "虚劳"]
  },
  {
    "ming": "阿胶",
    "lei": "兽部",
    "text": "阿胶，气味甘，平，无毒。主心腹内崩，劳极洒洒如疟状，腰腹痛，四肢酸疼，女子下血，安胎，久服，轻身益气。",
    "key": ["阿胶", "补血止血", "滋阴润燥", "安胎"]
  },
  {
    "ming": "鹿茸",
    "lei": "兽部",
    "text": "鹿茸，气味甘，温，无毒。主漏下恶血，寒热惊痫，益气强志，生齿不老。",
    "key": ["鹿茸", "补肾阳", "益精血", "强筋骨"]
  },
  {
    "ming": "牡蛎",
    "lei": "介部",
    "text": "牡蛎，气味咸，平，微寒，无毒。主伤寒，寒热，温疟洒洒，惊恚怒气，除拘缓，鼠瘘，女子带下赤白，久服，强骨节，杀邪气，延年。",
    "key": ["牡蛎", "重镇安神", "软坚散结", "固涩"]
  },
  {
    "ming": "酸枣仁",
    "lei": "木部",
    "text": "酸枣仁，气味酸，平，无毒。主心腹寒热，邪结气，四肢酸疼，湿痹，久服，安五脏，轻身延年。",
    "key": ["酸枣仁", "养心安神", "失眠", "敛汗"]
  },
  {
    "ming": "远志",
    "lei": "草部",
    "text": "远志，气味苦，温，无毒。主咳逆伤中，补不足，除邪气，利九窍，益智慧，耳目聪明，不忘，强志，倍力。久服，轻身不老。",
    "key": ["远志", "安神益智", "化痰", "健忘失眠"]
  }
]
```

- [ ] **Step 2: 验证文件**

```bash
node -e "const d=require('./scripts/data/bencao.json'); console.log('条数:', d.length)"
```

Expected output: `条数: 36`（或实际条数）

---

## Task 4: 更新 embed 脚本导入新典籍

**Files:**
- Modify: `scripts/embed-classics.ts`

- [ ] **Step 1: 在文件顶部 import 区域添加 JSON 导入**

在 `scripts/embed-classics.ts` 开头的 import 区（`import * as path from 'path'` 之后）添加：

```typescript
const neijingFull: Array<{pian:string, text:string, key:string[]}> =
  JSON.parse(fs.readFileSync(path.join(process.cwd(), 'scripts/data/neijing-full.json'), 'utf8'))
const shanghan: Array<{pian:string, text:string, key:string[]}> =
  JSON.parse(fs.readFileSync(path.join(process.cwd(), 'scripts/data/shanghan.json'), 'utf8'))
const bencao: Array<{ming:string, lei:string, text:string, key:string[]}> =
  JSON.parse(fs.readFileSync(path.join(process.cwd(), 'scripts/data/bencao.json'), 'utf8'))
```

- [ ] **Step 2: 在 ALL_CLASSICS 初始化之后、main() 之前追加三段数据**

在 `// 节气 - 提取养生文字` 的 `forEach` 块结束之后（`async function main()` 之前）插入：

```typescript
// 黄帝内经补充（从 JSON 文件）
neijingFull.forEach((x) => {
  ALL_CLASSICS.push({
    source: '黄帝内经',
    chapter: x.pian,
    content: x.text,
    scene: 'B',
    keywords: x.key || [],
  })
})

// 伤寒论
shanghan.forEach((x) => {
  ALL_CLASSICS.push({
    source: '伤寒论',
    chapter: x.pian,
    content: x.text,
    scene: 'B',
    keywords: x.key || [],
  })
})

// 本草纲目
bencao.forEach((x) => {
  ALL_CLASSICS.push({
    source: '本草纲目',
    chapter: `${x.lei}·${x.ming}`,
    content: `${x.ming}：${x.text}`,
    scene: 'B',
    keywords: x.key || [],
  })
})
```

- [ ] **Step 3: 验证脚本可以加载（不实际执行 embed）**

```bash
npx ts-node --skip-project -e "
const fs = require('fs');
const path = require('path');
const neijingFull = JSON.parse(fs.readFileSync('scripts/data/neijing-full.json','utf8'));
const shanghan = JSON.parse(fs.readFileSync('scripts/data/shanghan.json','utf8'));
const bencao = JSON.parse(fs.readFileSync('scripts/data/bencao.json','utf8'));
console.log('黄帝内经扩充:', neijingFull.length, '伤寒论:', shanghan.length, '本草纲目:', bencao.length);
console.log('新增总条数:', neijingFull.length + shanghan.length + bencao.length);
"
```

Expected: 打印出三个文件的条数合计（约 120-130 条）

- [ ] **Step 4: 验证 lint 通过**

```bash
npm run lint
```

Expected: 无错误

- [ ] **Step 5: Commit**

```bash
git add scripts/data/neijing-full.json scripts/data/shanghan.json scripts/data/bencao.json scripts/embed-classics.ts
git commit -m "feat: add neijing/shanghan/bencao classics data and update embed script"
```

---

## Task 5: 添加 getRecentHistory 到 retrieval.ts

**Files:**
- Modify: `src/lib/rag/retrieval.ts`

- [ ] **Step 1: 在文件末尾（saveConversation 之后）追加新函数**

```typescript
// ══════════════════════════════════════════════
//  读取最近对话历史（用于追问上下文）
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

    // 倒序变正序（最旧的在前）
    const history = [...data].reverse()

    return history
      .map((row) => {
        const q = typeof row.question === 'string' ? row.question : ''
        const ans = row.answer as Record<string, unknown> | null
        // 取最核心的字段作摘要
        const summary = [
          ans?.jiedu,
          ans?.diagnosis,
          ans?.analysis,
          ans?.verdict,
          ans?.practice,
        ]
          .filter(Boolean)
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
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
npx tsc --noEmit
```

Expected: 无类型错误

---

## Task 6: 在 route.ts 注入历史上下文

**Files:**
- Modify: `src/app/api/ask/route.ts`

- [ ] **Step 1: 导入 getRecentHistory**

在文件顶部 import 行修改（在现有 import 中添加 `getRecentHistory`）：

```typescript
import { analyzeQuestion, searchClassics, formatClassicsContext, saveConversation, getRecentHistory } from '@/lib/rag/retrieval'
```

- [ ] **Step 2: 在 Step 3 生成前调用 getRecentHistory 并注入 prompt**

找到以下代码（在 `// ── Step 3：流式生成最终回答 ──` 之后）：

```typescript
        const analysisText = `
核心议题：${analysis.topic}
```

在这行**之前**插入：

```typescript
        // ── 对话历史（追问上下文）──
        const historyContext = sessionId ? await getRecentHistory(sessionId) : ''
```

然后修改 `systemPrompt` 的构建，在 `currentDateContext` 后面插入历史：

原来：
```typescript
        const systemPrompt = `${currentDateContext}\n\n${scenePrompt}\n\n${responseInstruction}`
```

改为：
```typescript
        const historySection = historyContext
          ? `\n\n【本次会话历史，供追问参考】\n${historyContext}`
          : ''
        const systemPrompt = `${currentDateContext}${historySection}\n\n${scenePrompt}\n\n${responseInstruction}`
```

- [ ] **Step 3: 验证编译**

```bash
npx tsc --noEmit
```

Expected: 无类型错误

- [ ] **Step 4: 验证 lint**

```bash
npm run lint
```

Expected: 无错误

- [ ] **Step 5: Commit**

```bash
git add src/lib/rag/retrieval.ts src/app/api/ask/route.ts
git commit -m "feat: inject recent conversation history into prompt for follow-up context"
```

---

## Task 7: 场景联动示例问题（shenshu.html）

**Files:**
- Modify: `public/shenshu.html`

- [ ] **Step 1: 在 `<style>` 区域添加示例按钮样式**

在 `</style>` 标签之前插入（搜索 `</style>` 第一个出现位置，即主样式块末尾）：

```css
/* 场景示例问题 */
#sceneExamples{display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.6rem;min-height:2rem;transition:opacity .3s}
#sceneExamples.hidden{opacity:0;pointer-events:none}
.ex-btn{background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.25);color:rgba(201,168,76,.75);
  padding:.32rem .75rem;border-radius:20px;font-size:.72rem;cursor:pointer;font-family:'Noto Serif SC',serif;
  letter-spacing:.04em;transition:all .2s;white-space:nowrap}
.ex-btn:hover{background:rgba(201,168,76,.18);border-color:rgba(201,168,76,.6);color:rgba(201,168,76,1)}
```

- [ ] **Step 2: 在输入框的 `.pills` div 之后插入示例容器**

找到（在 landing 区域）：
```html
    <div class="pills fu">
```

在该 `<div class="pills fu">` 整块（找到其结束 `</div>`）之后插入：
```html
    <div id="sceneExamples" class="hidden fu"></div>
```

- [ ] **Step 3: 在 JS 区域添加 SCENE_EXAMPLES 配置和 renderSceneExamples 函数**

找到：
```javascript
const SCENE_LABELS={A:'推背·命理',B:'內經·養生',C:'時事·天機',D:'易經·起卦',E:'節氣·羅盤',F:'道家·智慧'};
```

在这行**之前**插入：

```javascript
const SCENE_EXAMPLES={
  A:['今年事業運勢如何','我屬虎，婚姻何時到來','如何化解今年犯太歲'],
  B:['失眠多夢怎麼調理','春季肝火旺該怎麼辦','長期久坐腰酸如何養護'],
  C:['今年全球經濟形勢如何','如何看待當前地緣政治','AI發展對人類意味著什麼'],
  D:['近期創業是否合適','這段感情該繼續嗎','面臨重要決策需要指引'],
  E:['當前節氣該如何養生','冬至前後飲食注意什麼','夏季祛濕最有效的方法'],
  F:['如何做到內心平靜','面對壓力如何看開','人生的意義是什麼']
};

function renderSceneExamples(scene){
  const el=document.getElementById('sceneExamples');
  if(!el) return;
  const examples=SCENE_EXAMPLES[scene]||[];
  el.innerHTML=examples.map(e=>
    `<button class="ex-btn" onclick="fillExample(this)">${e}</button>`
  ).join('');
  el.classList.remove('hidden');
}

function fillExample(btn){
  const q=document.getElementById('question');
  q.value=btn.textContent;
  q.focus();
}

function hideExamples(){
  const el=document.getElementById('sceneExamples');
  if(el) el.classList.add('hidden');
}
```

- [ ] **Step 4: 在 pills 初始化时触发默认场景示例，并绑定 input/submit 隐藏逻辑**

找到：
```javascript
const SCENE_LABELS={A:'推背·命理',
```

再往下找到页面初始化逻辑（通常在 DOMContentLoaded 或直接执行的初始化代码中）。搜索 `renderHist()` 或 `buildTabs` 的调用处，找到 pills 的 `onclick` 绑定。

在 pills 的 `sq()` 函数附近找到以下代码并在其下面（或在 `document.addEventListener('DOMContentLoaded'` 中）追加：

```javascript
// 初始化默认场景示例（A）
renderSceneExamples('A');

// 输入时隐藏示例
document.getElementById('question').addEventListener('input', function(){
  if(this.value.trim()) hideExamples();
});
```

- [ ] **Step 5: 在 pills 按钮 onclick 中联动示例**

找到 pills 的 HTML（`<div class="pill" onclick="sq(...)">`），每个 pill 已经绑定了 `sq()` 函数调用。`sq()` 函数定义如下（搜索 `function sq`）：

找到 `function sq(` 定义，查看其内容，然后修改为（在调用 handleAsk 前隐藏示例）：

```javascript
function sq(q){
  document.getElementById('question').value=q;
  hideExamples();
  handleAsk();
}
```

- [ ] **Step 6: 在 buildTabs 的场景切换 onclick 中调用 renderSceneExamples**

找到 `buildTabs` 函数中 tab 按钮的 `onclick`：

```javascript
    b.onclick=()=>{
      el.querySelectorAll('.tab').forEach(x=>x.classList.remove('on'));b.classList.add('on');
      showLoader();renderScene(k,lastQ).then(hideLoader).catch(hideLoader);
    };
```

这是结果页的 tabs，不是 landing 的场景选择。对于 landing 页我们需要给 pills 增加场景联动。

找到 landing 页的 pills HTML，每个 pill 对应一个场景。为了实现"切换场景时显示对应示例"，需要在每个 pill 的 `onclick` 之前先判断场景。

最简洁的方式：在每个 pill 的 onclick 中，根据问题内容推断场景并调用 `renderSceneExamples`。

在 `sq` 函数中添加场景推断并调用：

```javascript
function sq(q){
  document.getElementById('question').value=q;
  // 场景推断
  const sc = detect(q);
  renderSceneExamples(sc);
  handleAsk();
}
```

同时给各 pill 添加 hover 时的预览效果 — 在 pill 的 onmouseenter 中调用 renderSceneExamples：

在 landing 的 pills HTML 中，将各 pill 改为带 `onmouseenter`：

```html
    <div class="pills fu">
      <div class="pill" onmouseenter="renderSceneExamples('A')" onclick="sq('今年大勢走向如何，推背圖如何印證？')">推背 · 大勢</div>
      <div class="pill" onmouseenter="renderSceneExamples('B')" onclick="sq('我最近失眠焦慮，黃帝內經怎麼說？')">內經 · 調養</div>
      <div class="pill" onmouseenter="renderSceneExamples('C')" onclick="sq('今年全球局勢與中國機遇，典籍如何看？')">時事 · 天機</div>
      <div class="pill" onmouseenter="renderSceneExamples('D')" onclick="sq('用易經起一卦，問今年事業運勢')">易經 · 起卦</div>
      <div class="pill" onmouseenter="renderSceneExamples('E')" onclick="sq('現在是什麼節氣，如何養生調息？')">節氣 · 養生</div>
      <div class="pill" onmouseenter="renderSceneExamples('F')" onclick="sq('我面臨重要抉擇，道德經有什麼智慧？')">道家 · 智慧</div>
    </div>
```

- [ ] **Step 7: 在 handleAsk 提交后隐藏示例**

找到 `handleAsk` 函数开头：

```javascript
async function handleAsk(){
  const q=document.getElementById('question').value.trim();
```

在 `setAskLoading(true)` 之后加一行：

```javascript
  hideExamples();
```

- [ ] **Step 8: 验证 lint 通过**

```bash
npm run lint
```

Expected: 无错误

- [ ] **Step 9: Commit**

```bash
git add public/shenshu.html
git commit -m "feat: add scene-linked example questions on landing page"
```

---

## Task 8: 本地验证

- [ ] **Step 1: 启动开发服务器**

```bash
npm run dev
```

Expected: 服务器在 http://localhost:3000 启动，无编译错误

- [ ] **Step 2: 功能验证清单**

打开 http://localhost:3000：

1. **场景示例**：鼠标悬停在"推背·大勢" pill 上，输入框下方应出现 3 个金色示例按钮；悬停"內經·調養"时示例变为养生相关；点击示例按钮应填入输入框
2. **追问上下文**：提交一个问题（如"失眠怎么调理"），得到回答后点击"重新問天"，再问相关追问（如"具体有哪些穴位可以按摩"），检查回答是否有上文意识
3. **典籍来源**：提交养生相关问题，查看回答中是否出现"伤寒论"或"本草纲目"来源（需先运行 embed）

- [ ] **Step 3: 验证 build 通过**

```bash
npm run build
```

Expected: Build 成功，无错误

---

## Task 9: 运行典籍向量化（需要 API Key）

> ⚠️ 此步骤需要 `ZHIPU_API_KEY` 环境变量有效，且会清空并重建 Supabase classics 表，约需 15-25 分钟。

- [ ] **Step 1: 确认环境变量配置**

```bash
grep "ZHIPU_API_KEY" .env.local
```

Expected: 输出包含有效 key

- [ ] **Step 2: 运行 embed**

```bash
npm run embed
```

Expected: 处理完成，打印 `✅ 完成！成功: 约450条，失败: 0条`

- [ ] **Step 3: 验证入库条数**

```bash
node -e "
const fs = require('fs');
const lines = fs.readFileSync('.env.local','utf8').split('\n');
const env = {};
for (const line of lines) { const idx=line.indexOf('='); if(idx>0){env[line.slice(0,idx).trim()]=line.slice(idx+1).trim();} }
const url=env['NEXT_PUBLIC_SUPABASE_URL'], key=env['SUPABASE_SERVICE_ROLE_KEY'];
fetch(url+'/rest/v1/classics?select=source,scene&limit=1000',{headers:{apikey:key,Authorization:'Bearer '+key}})
  .then(r=>r.json()).then(d=>{
    const counts={};d.forEach(r=>{counts[r.source]=(counts[r.source]||0)+1;});
    console.log('总条数:', d.length);console.log(JSON.stringify(counts,null,2));
  });
"
```

Expected: 总条数 > 400，且包含 `伤寒论`、`本草纲目` 字段
