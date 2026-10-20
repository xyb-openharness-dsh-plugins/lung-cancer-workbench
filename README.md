# 肺癌患者与照护者工作台

## Git开发快照 · 2026-10-20

保存RC2–RC15阶段累计的单文件客户端、SQLite病例与来源文档服务、临床检索、指标趋势模块、v4.2系列HTML原型及修复记录。最终快照已包含指标目录补全，56项测试通过；继续保留开发分支，实机/原型确认仍待完成。 包版本保持`0.1.2-rc.15`；这是开发快照，正式发布状态另行记录。核验结果、已知问题及同步范围见 [本次Git记录](docs/GIT-SYNC-2026-10-20.md)。


面向肺癌患者与照护者的本机资料、就诊准备与综合照护工作台（v0.1.2-rc.15 开发中，未发布）

首版正在实现小肺宝工作台 UI、本机 SQLite 病例记录、用户核对与 JSON 导出、内置临床试验快照搜索及用户主动触发的 ClinicalTrials.gov 在线检索。临床知识、病历解析、AI、上传附件及 DSH 实机验收仍未完成。需求见 [BRIEF](docs/BRIEF.md)，规格见 [SPEC](docs/SPEC.md)，任务见 [TASKS](docs/TASKS.md)。

## 当前设计稿

本轮冻结设计：[小肺宝 v4.2.6](docs/prototype/lung-workbench-v4.2.6.html)。RC11 按此版本修复应用框架、一图秀及复诊/收藏/临床检索；实际验收范围、截图和限制见 [RC11 对照审核](docs/RC11-PROTOTYPE-PARITY.md)。Desktop 宿主人工验收仍待完成，不声明 >98% 一致性。

最新顶栏修订：[RC12 审核](docs/RC12-TOP-BAR-REVIEW.md)，按乳腺癌顶栏规范统一右上角 AI 开关，移除多余面板控件。

新增待确认原型：[v4.2.7 分类指标卡片](docs/prototype/lung-workbench-v4.2.7.html)，进入病情整理→指标检测。规范与实施状态：[指标趋势SPEC](docs/METRIC-TREND-SPEC.md)。

## 当前能力

- DSH `customFrame` 工作台、宿主连接鉴权的本机 API 和 SQLite 版本迁移。
- 手动记录穿刺/标本、病理、分子检测、治疗、症状、指标和复诊问题；保留来源并由用户核对。
- 病程时间线/指标卡、营养/心理/照护记录、JSON 档案导出；临床试验快照搜索与在线登记检索。
- 暂无文件解析、AI 上传、个体医疗建议、入组判断、加密或云同步；患者走查和专业临床审核尚未完成。

## 开发与本地验收

需要 Node.js 22.13+、Git、包管理器和 DSH Desktop。当前目标 DSH Desktop app 的 bundle 版本为 `0.12.0`；从只读 app.asar 清单核对到 Harness `dsh-client-connection`/`dsh-host-webserver` 为 `0.2.0-rc.2`、Cordis `4.0.4`、Schemastery `3.18.4`。peer 范围已按此 RC 下限设置；客户端/服务端 API 和 Electron 内部 Node runtime 仍须通过真实安装验证。当前使用 `node:sqlite`，本机测试通过，不能据此推定目标 runtime 支持它。[Node.js SQLite 文档](https://nodejs.org/api/sqlite.html)

```bash
npm install
npm run build
npm run check
npm test
npm run pack:check
npm pack
```

`npm install` 可能按 npm 策略解析 peer；勿为消警告重复打包宿主 runtime。`npm run build` 会把品牌 Logo 和 `VERSION` 嵌入宿主加载的单文件客户端。

本地安装入口以当前 Desktop/CLI 帮助为准。安装后按 [docs/06-VALIDATION-AND-RELEASE.md](docs/06-VALIDATION-AND-RELEASE.md) 与官方自测完成真实 UI 验收，并填写 [docs/ACCEPTANCE.md](docs/ACCEPTANCE.md)。静态检查不代表已加载。

Logo 来源与使用限制见 assets/README.md。许可证、作者、仓库/发布策略由本项目维护者确认后填写；模板默认为 private/UNLICENSED。

感谢小x宝社区、DataElement 社区，以及 sam / hhx / 繁华的 ❤️ 贡献。

初始化来源记录见 `.dsh-wb-starter.json`。更新社区脚手架不会覆盖本项目；需要升级时先用相同确认配置在临时目录生成，再审阅差异。CLI 用法见 [docs/CLI-GIT.md](docs/CLI-GIT.md)。

项目身份说明：2026-10-20为版本保存创建组织私有仓库`xyb-openharness-dsh-plugins/lung-cancer-workbench`，保留`codex/records-slice`开发分支；不代表已正式发布。需求研究见 [USER-RESEARCH](docs/USER-RESEARCH.md)。

## 肺癌设计资料

- [首版开发阶段记录与待闭环项](docs/DEVELOPMENT-RETRO.md)
- [开发就绪性审查](docs/DEVELOPMENT-READINESS-REVIEW.md) 与 [v4.1.0 原型冻结记录](docs/PROTOTYPE-FREEZE.md)
- [小肺宝 HTML 交互原型 v4](docs/prototype/lung-workbench-v4.html)（当前样稿 v4.1.0：10 个一级模块、27 个二级页；补营养支持/心理支持、临床多通道检索、六分区设置、收藏与回顾；[v3](docs/prototype/lung-workbench-v3.html) 保留作历史版本；全部为模拟资料）
- [详细SPEC v0.3](docs/SPEC.md)与[肺癌场景](docs/SCENARIOS.md)
- [HVT 需求审核](docs/HVT-REVIEW.md)：癌种特有高价值场景的五层覆盖与处置（LU-05/08/09 为阻塞项；发布可见性 P1–P5 未过）
- [SCLC/NSCLC治疗情境](docs/TREATMENT-PATHWAYS.md)、[靶向药/分子检测](docs/TARGETED-THERAPY.md)、[转移与再评估](docs/METASTASIS-AND-REASSESSMENT.md)
- [患者需求研究](docs/USER-RESEARCH.md)、[指南范围和来源状态](docs/GUIDELINE-SCOPE.md)、[来源台账](docs/SOURCES.md)
- [四核心模块](docs/CORE-MODULES.md)、[领域模型](docs/SCHEMA.md)、[API合同](docs/API-CONTRACT.md)、[验收](docs/ACCEPTANCE.md)

SPEC v0.3为详细设计草案，不代表临床审核、指南全文核验或业务功能已完成。
