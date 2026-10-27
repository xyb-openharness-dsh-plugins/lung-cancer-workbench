# 项目任务与状态

状态快照：2026-10-18。项目已实现首个可构建的软件切片；本地开发分支为 `codex/records-slice`，设计/规格初始基线已提交。领域、API、SQLite 仓储和客户端代码已落地。`0.1.2-rc.8` 包含两套只读合成 NSCLC 病例、病程/指标展示、AI 空状态指引和 DSH 原生 Agent 右侧面板。构建与静态检查通过，34/34 Node 测试通过；RC.8 已安装到 DSH Desktop `web` profile，版本及客户端哈希一致，待用户手动重启后验收。UI parity >98%、人工患者走查和临床审核均未完成。

## 已完成

- 使用指定社区 starter 初始化独立项目；参考关系、Logo 与色彩基准已记录。
- 建立肺癌产品 brief、详细 SPEC v0.2、SCLC/NSCLC场景、穿刺/标本/分子检测、手术、靶向、放疗、转移再评估和照护流程设计。
- 建立数据模型、API合同、指南/药物来源范围、Agent边界、功能清单和需求追踪。
- 建立并冻结 HTML 可交互原型 v4.1.0（SHA-256见 `PROTOTYPE-FREEZE.md`）；HVT补充了术后活动、胸水操作、免疫治疗症状与咯血联系场景。
- 验收基线现为 AC01–AC43；均为设计验收条件，尚未作为实际产品功能执行。
- `0.1.2-rc.8` 通过 `npm run build`、`npm run check` 与 34/34 Node 测试；新增两套演示病例、独立指标趋势、只读切换，以及 SQLite 对肺癌样例记录的完整往返测试。RC.8 增加一图秀空状态直达入口和 AI 资料选择空状态引导；工作台文件导入仍未实现。已安装到 DSH Desktop `web` profile，待手动重启验收。
- `lib/domain/clinical-records.js` 实现病例容器、来源/日期精度校验、取材/诊断/分子检测/治疗事件追加、候选记录复核、审计决策与 revision 冲突；`lib/server/sqlite-case-repository.js` 实现本机 SQLite 创建/迁移/事务/重开验证；`lib/server/api.js` 暴露鉴权 API。
- `lib/client.js` 已有 DSH `customFrame` 客户端，提供病例切换、记录创建/核对、记录/治疗/时间线/营养心理照护/复诊/试验/设置页面、JSON 导出、指标筛选卡和本地/在线试验通道。当前测试验证渲染结构与 API/领域行为，不代表浏览器视觉、无障碍或完整用户任务通过。
- DSH Desktop app bundle 版本由 Info.plist 核实为 `0.12.0`；只读 app.asar manifest 显示 `dsh-client-connection`/`dsh-host-webserver` 为 `0.2.0-rc.2`、Cordis `4.0.4`、Schemastery `3.18.4`。包 peer 最低版本已更新到该 RC；活动 profile/generation、安装入口、Node/SQLite runtime 和真实加载仍未验证。
- 肺癌试验 SQLite 快照为 805 条唯一候选（NSCLC 469、SCLC 81、混合 19、其他 236），9 个月 CT.gov 首次发布日期查询返回 913 条，108 条非肺癌候选筛除。原型演示列表仍含历史示例，不是数据库数量。统计与限制见 `reference/trials/README.md`。

## 尚未完成的工程闸门

- 核实 DSH Desktop `0.12.0` 内部 Harness RC、peer、Node runtime 和活动 generation；RC.8 已安装，待手动重启，核对一图秀演示病例入口、AI 空状态说明及原生附件入口。
- 完成首页和 Agent Pane 实机截图对照；核对 owner 会话复用、拖动/键盘、620–760px 换行、窄屏、大字、深色、草稿冲突与隐藏重开。
- 完成 v4 全部页面/状态/动作→组件/API→领域实体→AC parity 核算，达成 >98%；逐项记录已测和未测，关键任务偏差为零。
- 完成 SQLite 备份/恢复、目标目录权限、运行时兼容与跨档案隔离测试；当前迁移、事务和重开测试已覆盖，不等于 app 环境验收。
- 患者/照护者人工任务走查、窄窗口/大字/键盘/减少动效走查；临床指南/危急症状/药物说明内容经专业审核后才开放。
- 规范化 AC01–AC43 的实现与验收状态；测试覆盖底层函数，不把单测标成业务 AC 通过。

## 待共创与验证

- 验证“有来源的未核对短草稿，可跳过疑点，确认后才进入正式档案”的交互假设。
- 通过患者/照护者任务反馈确认主要操作者、治疗/复诊排序、信息关注点和记录负担。
- 完成 v4.1.0 的真实浏览器视觉、读屏/触控与窄窗/大字走查；原型内自测不能代替该验证。

## 医学内容与实施依赖

- 获取并逐章节核验适用的中国 CSCO NSCLC/SCLC 现行完整指南和 NHC 原文。
- 逐药核验 NMPA 说明书、伴随诊断、医保/可及性；由专业人员审核后才形成正式患者内容。
- 核验目标 DSH Desktop 版本、原生会话 API、数据目录和 SQLite runtime 条件。
- 按确认设计开发真实业务，并逐条执行 AC01–AC43；完成打包、备份/恢复和宿主实机验收。

## 状态口径

本机代码/包检查与 48 项自动测试通过；43 条 AC 尚无端到端 Desktop 验收签字。患者访谈、独立设计审查、临床审查和 Desktop UI 验收均未完成。临床试验登记数据仅供研究与就诊讨论准备，不用于推断患者适合入组或治疗。

- SQLite 当前可存储所有肺癌演示病例字段并通过完整往返测试；字段级约束仍主要在领域层/应用层，参见 [schema 核对](SQLITE-SCHEMA-AUDIT.md)。

## 0.1.2-rc.9（2026-10-20）：原生 AI 对话栏首轮开发完成并装机

- 面板补齐三处：右缘竖排把手（收起态随时调起）、`− 缩窄 / ＋ 加宽`（每次 2%，到达 25%/45% 自动禁用）、左缘连按两次回 35%（Shift+方向键 6%，普通 2%）。
- 修掉一个真实缺陷：面板此前用条件渲染，收起时会把宿主传进来的 `conversation` 节点卸载，原生输入框草稿随之丢失。现改为**恒定挂载、只切 `display`**，并用 `aria-hidden` 同步语义；实测收起→重开，会话节点与草稿标记均保留。
- 顶栏「打开 AI 助手」与面板「隐藏 ×」保持双按钮（不做成单开关），避免与宿主「AI 助手已展开」的状态文案冲突。
- 验证：`npm run check` 通过；本地 UI 验收环境（存根宿主：isActive/ownsSession/currentSession/ensureSession/pickDirectory/sessions.scope）实测 35%→拖到 29%→写 `display-preferences`；End=45%、连按两次=35%；1440/1180/1024/900 四档展开态页面级横向溢出 0，控制台无报错。
- 已打 `release/xyb-openharness-dsh-plugins-lung-cancer-workbench-0.1.2-rc.9.tgz` 并装入 `~/.dsh/profiles/desktop`（依赖改指 rc.9，`VERSION` 与包内 `lib/client.js` 校验一致，插件入口可 import），需用户手动重启 Desktop 后验收。
- **未通过项**：`node --test` 45 项中 8 项红（client-render），原因是 `test/client-render.test.js` 用假 React 按 hook 下标注入 state，客户端新增 hook 后下标错位；属陈旧测试，不是本轮回归，但**在修好前不得声称测试全绿**。

## 0.1.2-rc.10（2026-10-20）：五个页面补齐，测试恢复全绿

- 修掉阻塞级回归：`records` / `clinical` / `nutrition` / `mind` / `care` 五个页面函数在客户端里**没有定义**（只留了 `*Legacy` 占位），点导航即白屏 `recordsPage is not defined`。现按 `SUBPAGES` 补齐 5 页共 23 个子页，默认落到各自第一页。
- 把 `lib/client-ui.js` 接进构建：`scripts/embed-client-logo.mjs` 新增 `__UI_KIT_START__` 注入。此前该文件从未写进客户端，`subnavFor`/`simpleTable`/`weightSvg`/`keyRow`/`statGrid` 等 30 余个共用组件是死代码。
- 补齐缺失样式（`assets/workspace-detail.css`）：表格、要点列表、chip 行、体重折线、栅格列（`.wb-rail`/`.wb-maincol`）、日期列与状态标签不折行、统计卡 auto-fit。
- 口径不变：新页只做呈现与整理，不写分级/疗效/处置判断；`待核对草稿` 的「确认这条记录」接既有 `review()`，「确认 ≠ 医学审核」文案保留；肿瘤标志物明确写「不做分级」。
- 测试：重写 `test/client-render.test.js` 的状态注入（`HOOK` 名称映射 + 槽位数量守卫，避免再按 hook 下标错位），`node --test` **48/48 全绿**（此前 8 项红）。
- 验收：存根宿主 + 合成演示档案 A（110 条记录）逐页 24 个视图；面板 35% 下 `over`/`mainOver` 全 false、无 `undefined`/`NaN`、无控制台报错；收起态复测 4 页 `pane display:none`。截图 `docs/reviews/rc10-*.png`。
- 已打 `release/…-0.1.2-rc.10.tgz` 并重装 `~/.dsh/profiles/desktop`，需手动重启 Desktop 后验收。
- **未通过/未做**：43 条 AC 的 Desktop 端到端签认、患者访谈、独立设计审查、临床审查仍未做；空档案下 `复诊准备`/`收藏与回顾` 文案偏短（属如实空态，未优化）。


## 0.1.2-rc.11（2026-10-20）：纠正 Desktop 加载路径与原型偏差

**更正 RC9/RC10 装机结论：**两包安装在 `~/.dsh/profiles/desktop`；本次 Desktop 实际加载的是 `~/Library/Application Support/dsh-desktop/harness/profiles/web`，检查时仍为RC8。前文“需重启后验收”不能证明装入了本次应用。

RC11 按冻结 v4.2.6 修复整体框架、一图秀、复诊、收藏与多通道检索；六套合成病例，49/49测试通过。浏览器对照已完成，真实宿主人工验收未完成。参见 [对照审核](RC11-PROTOTYPE-PARITY.md)，安装证据在 `reviews/rc11-desktop-install.json`。

RC11已安装到上述正确Harness `web` profile，源文件/包内/安装文件的client及SQLite一致，Desktop内置Node入口导入通过；安装证据已落盘。用户手动重启后检查版本 `0.1.2-rc.11`。


## 2026-10-20 · RC12 用户确认的顶栏修订

按乳腺癌工作台 DSH-WORKBENCH-TOP-BAR 规范，原生AI的打开/收起统一置于根级固定顶栏右上角；左侧品牌+VERSION，中间一句状态。移除面板自建工具栏（资料预览、宽度滑块、百分比、加宽/缩窄）及侧缘悬浮入口。默认35%、分界线拖拽和会话隐藏保留不变；资料选择预览移至病情整理「整理资料给 AI」。显示与大字留在设置，去掉业务重复顶栏。窄屏保留小型抽屉关闭和键盘退出。此次用户反馈优先于旧v4.2.6/RC11的工具栏说明，冻结HTML未改。49/49测试通过，浏览器布局和测试草稿验证通过，真实宿主待手动重启验收。详见 [RC12审核](RC12-TOP-BAR-REVIEW.md)。

RC12已安装至实际Desktop Harness `web` profile；包版本、VERSION、源/安装client和SQLite校验一致，Desktop内置Node入口导入通过。用户手动重启后验证 `0.1.2-rc.12`，本次没有自动重启。


2026-10-20 · RC13密集病程修复：趋势先显示且高度独立于事件数量；病程改为六类聚合轨道＋按日期折叠的独立滚动原始记录列表。51/51测试通过，108条SCLC病例在1280×720首屏显示完整曲线。详见[修复审核](RC13-DENSE-TIMELINE-REVIEW.md)。真实Desktop重启后验收待完成。


2026-10-20 · 指标趋势Tab设计新增：按乳腺癌病情整理五Tab＋淋巴瘤分类卡片结构编制，包含按类别分组、最近值/差值/次数/来源、最近报告表、固定高度3D翻面。项目口径见[指标趋势SPEC](METRIC-TREND-SPEC.md)，通用规范见[24号设计文档](24-METRIC-TREND-TAB-DESIGN.md)。v4.2.7 HTML待开发者确认，生产实现状态单列；不把规范或模拟流程当作SQLite已接通。

RC13已安装到实际Desktop Harness web profile，版本/VERSION/包内及安装client/SQLite一致；见`reviews/rc13-desktop-install.json`。v4.2.7分类3D指标卡已自检并形成[原型审核](PROTOTYPE-v4.2.7-REVIEW.md)，待开发者确认对应模块再实施生产。

2026-10-20 · RC14：一图秀指标菜单只显示简称、紧凑两列；完整单位/方法/机构留在title/可访问名称，选择与可比组身份不变。原型v4.2.7同步。安装证据见`reviews/rc14-desktop-install.json`，真实Desktop仍由用户手动重启验收。


2026-10-20 · RC15分类指标卡：开发者已明确要求落地应用“指标检测”。原汇总表与时间堆叠列表改为按肿瘤标志物/血常规/肝肾/凝血/感染等自动分类的固定高度3D卡片；正面最近值，背面时间趋势与来源记录。分类与一图秀菜单共用`lib/metric-catalog.js`；完整身份仍分组，未修改SQLite schema。56/56测试和实际客户端浏览器检查通过，Desktop重启后验收待完成。详见[RC15审核](RC15-GROUPED-METRIC-CARDS-REVIEW.md)。其他Tab导航未作为本轮完成项。

安装完成：RC15已写入实际Desktop Harness web profile；包版本、VERSION、客户端/分类模块/卡片模块及SQLite字节校验一致。未自动重启，等待开发者手动重启后实机验收。


## RC16：指标卡片与一图秀一致性补充（2026-10-20）

- 分类卡片与一图秀共用 `categorizedMetricSeries` / `selectedMetricSeries`；同日多条不猜先后、仅显示点，单位 / 方法 / 实验室分别分组，私密记录过滤一致。
- 一图秀底部3D卡片跟随当前选择（最多4项），不再固定展示资料中的前4组；简称只影响显示，不改变记录身份。
- 58项自动测试通过；实际客户端浏览器验收：110条合成病例产生11张276px卡片，独立点击 / 回车翻面；800px窗口单列、无页面横向溢出。1280px一图秀曲线位于可视区域。
- 浏览器环境是独立合成资料预览，不能代替DSH Desktop原生宿主验收。窄窗口一图秀控制区上下堆叠，需向下滚动查看曲线；未宣称全尺寸首屏可见。
- SQLite结构与临床数据库不变。安装证据见 `docs/reviews/rc16-desktop-install.json`；Desktop须开发者手动重启后验收。
