# RC17 · 36 号疾病概要 v2 补齐（HTML demo 待确认）

日期：2026-10-27。基线：`docs/prototype/lung-workbench-v4.2.7.html`（sha256 已冻结在 `prototype-v4.2.7-baseline.json`）。
候选：`docs/prototype/lung-workbench-v4.2.8.html`。生成命令：`python3 scripts/build-prototype-v428.py`。

本文件只记录**原型层**的交付与实测。应用层已在 2026-10-27 demo 确认后落地：`0.1.2-rc.17` 接入整页概要与状态卡，`0.1.2-rc.18` 修掉它与看板原有横幅的冲突，见 [RC18](RC18-DASHBOARD-SINGLE-NEXT.md)。

## 本轮做了什么

| 项 | 落点 | 说明 |
| --- | --- | --- |
| 模式层对齐 | `docs/prototype/primer.js`、`primer.css` | 从 starter `assets/patterns/` 原样取最新版（含 §2.5 链接渲染与 `dp-miss` 红标），文件名按 36 号约定 |
| 品牌令牌映射 | `docs/prototype/primer-tokens.css` | pattern 只读 `--brand/--violet/--accent`，本仓主色叫 `--blue`；补一层别名，避免退回紫色兜底 |
| 数据 | `docs/prototype/primer-data.js` | 四段齐全，9 行指南表，每行带可点链接 |
| 看板状态卡 | `docs/prototype/primer-status-card.js` + `.css` | §2.6 四件：eyebrow / 第 N 天 / 现状行 / 出口按钮排；天数由锚点日派生 |
| 构建 | `scripts/build-prototype-v428.py` | 从 v4.2.7 增量生成，不覆盖基线 |

## 指南链接（§2.5）

全部于 2026-10-27 逐条用 HTTP 请求验证，返回 200：

| 机构 / 文件 | 状态 | 链接 |
| --- | --- | --- |
| 国家卫生健康委 · 原发性肺癌诊疗指南（2022 年版） | 已取得原件 | `nhc.gov.cn/.../1732863054387_68585.pdf` |
| 中华医学会 · 肺癌临床诊疗指南（2025 版） | 未取得原件，据二次来源（官方全文库） | `rs.yiigle.com/cmaid/1553565` |
| CSCO · 非小细胞肺癌诊疗指南（2025 版） | 未取得原件，据二次来源（人卫社书目页） | `pmphmall.com/gdsdetail/654973-333567` |
| CSCO · 小细胞肺癌诊疗指南（2025 版） | 未取得原件，据二次来源（人卫社书目页） | `pmphmall.com/gdsdetail/654952-333546` |
| NCCN · NSCLC Guidelines V9.2026 | 未取得原件（官网需注册），据官方目录页 | `nccn.org/...?id=1450` |
| NCCN · SCLC Guidelines V2.2026 | 未取得原件（官网需注册），据官方目录页 | `nccn.org/...?id=1451` |
| WHO / IARC · Thoracic Tumours 5th ed.（2021） | 未取得原件（需订阅），据官方出版页 | `publications.iarc.who.int/...` |
| AJCC · Cancer Staging Manual 8th ed.（2017） | 未取得原件（需订阅），据出版方条目 | `doi.org/10.1007/978-3-319-40618-3` |
| ESMO · Metastatic NSCLC CPG 2018 | 已取得原件 | `doi.org/10.1093/annonc/mdy275` |

渲染后页面内 `a.dp-link` 共 19 个、`dp-miss`（缺链接红标）**0 个**——没有一行靠纯文字充数。

被否决的候选链接（实测不可达，未写入数据）：

- `jnccn.org/view/journals/jnccn/24/4/article-e260017.xml` → 403（反爬），不能算「点开可达」
- `link.springer.com/book/9783319406176` → 404
- `www.nmpa.gov.cn` → 412（反爬）
- `mp.weixin.qq.com` 的 http 版本 → 改用 https

## 验收

`node <starter>/scripts/probe-disease-primer.mjs --url <本仓 v4.2.8>`：**9/9 通过**

```
PASS P1 顶栏存在可点的「?」，aria-label 说明四段内容
PASS P2 四段标题齐全且顺序正确 — definition › evidence › landscape › trend
PASS P3 面板铺满视口 — 1249×829 / 视口 1280×860
PASS P4 打开压一条 history；history.back() 后面板收起
PASS P5 「返回」与「关闭」是两个独立可见入口
PASS P7 Esc 收起概要且仍在本页
PASS P6 关闭后焦点回触发按钮，滚动位置不变
PASS P8 数据四段齐全、每段有来源、趋势段无禁止词
PASS E0 页面无 JS 报错
```

反向对照 `--self-test`：6/9 通过、3 条 FAIL，闸门确实会报红。

其它实测：

- 状态卡主按钮 4 个病例全部落到预期页与子页：p1→records/指标检测、p2→clinical/治疗历程、p3→care/放疗进度、p4→records/病情档案。
- p4 无锚点日 → 整卡「待初始化」，不填占位数字。
- 卡片副按钮「疾病概要：肺癌是什么？」能打开浮窗。
- 760px 宽：`scrollWidth = clientWidth = 760`，无横向溢出；「?」按钮不与设置/AI 按钮重叠。
- `npm run check` 通过（`staticPass: true`，0 error）；`npm test` 58/58 通过。

截图：`rc17-status-card.png`、`rc17-status-card-{metastatic,sclc,pending,narrow}.png`、
`rc17-primer-{definition,evidence,landscape,trend,narrow}.png`。

## 已知偏离与待确认

1. **「?」挂载位置**：36 号 §3.2 写「`.top-actions` 内、版本号 chip 左侧」。本仓 `.topbar` 已被 RC12 的
   `prototype-host-header` 取代并 `display:none`，挂进去量到 0×0（探针 P1/P6 会红）。现挂在**实际可见**的
   `.prototype-host-actions` 首位，视觉位置仍是顶栏右侧、设置按钮左侧。若要求严格贴合字面，需要同时把
   `.topbar` 复活，会改动已确认的 RC12 顶栏——请裁决。
2. **趋势段第 8 条**写「本台尚未统计在研登记条数」，属于 §2.3 白名单第 3 类的占位说明；拿到真实统计口径后再补数字。
3. 原 `hero()` 里的问候语被状态卡取代；姓名与「模拟资料 · 不是真实病历」标识已移入状态卡现状行，未丢安全标识。
4. 尚未做：README `## 疾病概要` 四段、`lib/client.js` 内的 React 版浮窗与状态卡、包版本升版与 CHANGELOG、装机刷新。

---

## 2026-10-27 复核（本轮修正，demo 仍待确认）

自查发现上一版 demo 有两处不达标，已修在 `lung-workbench-v4.2.8.html`（重新生成，v4.2.7 基线未动）：

| 问题 | 证据 | 处理 |
| --- | --- | --- |
| `primer.css` 是 starter 旧版，缺 36 号 §4.3 的 P9 修法（`.dp-points` 缩进写在 `ul`、正文 `max-width:68ch`、表格未设 `min-width`） | 与 starter `assets/patterns/disease-primer.css` diff：少 3 处 | 原样覆盖为 starter 最新版；`primer.js` 复核后本来就一致 |
| 三条「据二次来源」用的是公众号 / 医院站 / 医学界转载 | 规范第 2 条要求「中文指南优先官方出版方页」 | 逐条换官方来源，见下表 |

链接升级（旧 → 新，全部 HTTP 200 实测）：

| 行 | 旧链接 | 新链接 | 依据 |
| --- | --- | --- | --- |
| 中华医学会《肺癌临床诊疗指南》2025 版 | `mp.weixin.qq.com/…`（杂志社公众号全文） | `rs.yiigle.com/cmaid/1553565` | 中华医学期刊全文数据库（官方），正文需登录、摘要与参考文献公开 |
| CSCO《非小细胞肺癌诊疗指南》2025 版 | `hnysfww.com/article.php?id=4272` | `pmphmall.com/gdsdetail/654973-333567` | 人民卫生出版社官方书目页（ISBN 9787117377959，2025-04） |
| CSCO《小细胞肺癌诊疗指南》2025 版 | `liangyihui.net/doc/152195` | `pmphmall.com/gdsdetail/654952-333546` | 人民卫生出版社官方书目页（ISBN 9787117377737，2025-04） |

`sources`（来源行）也由 2 条补到 9 条，与表体逐行对应——此前只有国家卫健委与 CSCO NSCLC 两条，表里其余 7 行在来源行是缺位的。

### 复验结果

- 探针（starter 最新，含 **P9 排版对齐**）：**10/10 通过**。P9 修正前为红（正文右边界比表格窄 ~200px）。
- 反向对照 `--self-test`：7/10 通过、3 条 FAIL → 闸门会报红。
- 指南表：9 行全部可点，`.dp-miss` 红标 **0**；数据内 8 个唯一 https 链接逐条 curl **200**。
- 状态卡四病例：
  - p1 `D+263 状态卡 · 距下次胸部 CT 复查 5 天` / 第 263 天（锚点 2026-01-28）/ `术后随访期 · 随访中` / 下次 2026.10.22
  - p2 `D+230` / 锚点 2026-03-02 / `治疗进行中` / 下次 2026.10.20 肿瘤内科复诊
  - p3 `D+153` / 锚点 2026-05-18 / `放化疗进行中` / 下次 2026.10.21 放疗科沟通
  - p4 无锚点 → `D+N 状态卡 · 待初始化`，主按钮改「查看取材与检测 →」，不填占位数字
- 页宽 1440 / 1024 / 900 / 768 / 390：`body.scrollWidth == clientWidth`，无横向溢出；390px 下表格走自身横向滚动，不挤压成竖排。
- `npm run check`：exit 0，`errors: []`。

### 仍待裁决（与上一版相同，未改口径）

1. **「?」挂载位置**：36 号 §3.2 字面是 `.top-actions` 版本号 chip 左侧；本仓 `.topbar` 已被 RC12 的 `prototype-host-header` 取代并 `display:none`，故挂在可见的 `.prototype-host-actions` 首位。
2. **原型里的「今天」是常量** `const today = '2026-10-17'`（第 1906 行）。状态卡的天数与「距下次 N 天」都按它算，所以现在看仍是「5 天后复查」；真机（React 版）必须取系统日期，否则每天都显示同一个 N。
3. **趋势段第 8 条**写「本台尚未统计在研登记条数」，属占位说明，等真实统计口径。
