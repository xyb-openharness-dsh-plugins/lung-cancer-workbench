# 变更记录

## 2026-10-27 · 36 号疾病概要 v2 落地（包版本 0.1.2-rc.17）

- **顶栏「?」→ 整页概要**：`lib/client.js` 新增 `primerOverlay`（36 号整页视图，`open=pushState`，返回与关闭是两个入口，Esc 与浏览器返回各只退一层）；四段顺序固定，样式复用 starter 的 `disease-primer.css`，数据来自 `docs/prototype/primer-data.js`（构建期注入 `PRIMER_DATA`，单一来源不漂移）。
- **§2.5 指南原件可点**：evidence 表每一行「原件」列渲染为 https 链接；未取得原件的行给二次来源，确实拿不到的如实标注，缺链接时红标指出违规，不编 URL。
- **§2.6 看板首卡 D+N 状态卡**：卡头 eyebrow（`D+N 状态卡 · 距下次安排 N 天`）/ 大字天数 / 现状行（档案主体 + 最新分期原文 + 下次日期与事项）/ 出口按钮排（当前阶段核心页 + 「疾病概要：肺癌是什么？」）。天数由**已确认**的病理或诊断记录日期派生，取系统日期；没有锚点时整卡「待初始化」，不填占位数字。
- **构建**：`scripts/embed-client-logo.mjs` 新增 `PRIMER_DATA` / `PRIMER_CSS` / `PRIMER_PAGE` 三处注入，并校验数据文件必须是单个字面量赋值、CSS 不含模板串字符。
- **测试**：`test/client-render.test.js` 补 3 条（状态卡天数按系统日期派生、无锚点待初始化、整页概要四段与只收 https 链接 + 返回/关闭两个入口），test=61 pass=61 fail=0；`npm run check` 通过。
- **原型对应**：`docs/prototype/lung-workbench-v4.2.8.html`（探针 10/10，指南表 9 行全可点）。

## 2026-10-20 · 开发快照（包版本 0.1.2-rc.15）

- 保存RC2–RC15阶段累计的单文件客户端、SQLite病例与来源文档服务、临床检索、指标趋势模块、v4.2系列HTML原型及修复记录。最终快照已包含指标目录补全，56项测试通过；继续保留开发分支，实机/原型确认仍待完成。
- `npm run check`：通过（退出码0）。
- `npm test`：最终快照复核通过（退出码0）；tests=56, pass=56, fail=0。
- 首轮检查曾有4项`categorizedMetricSeries is not defined`失败；保存时最新文件已补齐指标目录与对应测试，最终56项全部通过。Git保存不替代实机及正式发布验收。
- 详细范围见 [Git同步记录](docs/GIT-SYNC-2026-10-20.md)；本次未创建正式发布tag。
