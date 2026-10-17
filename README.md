# 肺癌患者与照护者工作台

面向肺癌患者与照护者的本机资料、就诊准备与综合照护工作台（需求共创中）

这是接入骨架，尚未实现真实业务。初始化后先将 [项目设计提示词](docs/DESIGN-PROMPT.md) 交给当前Agent；它应展示实际路径并以已有用户/场景/流程素材对齐设计者、研究与取舍原则。癌种项目另有 [完整专用提示词](prompts/NEW-CANCER-WORKBENCH.md)。需求见 [BRIEF](docs/BRIEF.md)，规格见 [SPEC](docs/SPEC.md)，任务见 [TASKS](docs/TASKS.md)；先读 [AGENTS](AGENTS.md)。CLI输出交接与首问，实际对话由Agent接续。

## 当前能力

- 一个 DSH 工作台注册、认证的健康接口、版本展示与标准/大字切换。
- 初始化暂用布局：business-first，尚待场景讨论确认。business-first 使用 customFrame；模板不创建会话或复制聊天。需要 AI 协助时按官方合同接入原生 conversation 和会话管理。
- 无业务数据库、无演示患者、无真实密钥；所有业务页按确认 spec 逐项实现。

## 开发与本地验收

需要 Node.js 22+、Git、包管理器和可用 DSH Desktop；采用 SQLite 时另核验 node:sqlite 版本条件。宿主 peers 的范围仅是模板基线，请与目标 Desktop 实际依赖核对。

```bash
npm install
npm run check
npm run pack:check
npm pack
```

`npm install` 可能按 npm 策略解析 peer；勿为消警告重复打包宿主 runtime。客户端本身是单文件；引入 TS/组件库后需添加构建步骤并保留单文件导出。

本地安装入口以当前 Desktop/CLI 帮助为准。安装后按 [docs/06-VALIDATION-AND-RELEASE.md](docs/06-VALIDATION-AND-RELEASE.md) 与官方自测完成真实 UI 验收，并填写 [docs/ACCEPTANCE.md](docs/ACCEPTANCE.md)。静态检查不代表已加载。

Logo 来源与使用限制见 assets/README.md。许可证、作者、仓库/发布策略由本项目维护者确认后填写；模板默认为 private/UNLICENSED。

感谢小x宝社区、DataElement 社区，以及 sam / hhx / 繁华的 ❤️ 贡献。

初始化来源记录见 `.dsh-wb-starter.json`。更新社区脚手架不会覆盖本项目；需要升级时先用相同确认配置在临时目录生成，再审阅差异。CLI 用法见 [docs/CLI-GIT.md](docs/CLI-GIT.md)。

项目身份说明：名称、slug、npm包名与GitHub地址为本机初始化临时值；未创建或核验远端仓库，不代表已发布。需求研究见 [USER-RESEARCH](docs/USER-RESEARCH.md)。

## 肺癌设计资料

- [开发就绪性审查](docs/DEVELOPMENT-READINESS-REVIEW.md) 与 [v4.1.0 原型冻结记录](docs/PROTOTYPE-FREEZE.md)
- [小肺宝 HTML 交互原型 v4](docs/prototype/lung-workbench-v4.html)（当前样稿 v4.1.0：10 个一级模块、27 个二级页；补营养支持/心理支持、临床多通道检索、六分区设置、收藏与回顾；[v3](docs/prototype/lung-workbench-v3.html) 保留作历史版本；全部为模拟资料）
- [详细SPEC v0.3](docs/SPEC.md)与[肺癌场景](docs/SCENARIOS.md)
- [HVT 需求审核](docs/HVT-REVIEW.md)：癌种特有高价值场景的五层覆盖与处置（LU-05/08/09 为阻塞项；发布可见性 P1–P5 未过）
- [SCLC/NSCLC治疗情境](docs/TREATMENT-PATHWAYS.md)、[靶向药/分子检测](docs/TARGETED-THERAPY.md)、[转移与再评估](docs/METASTASIS-AND-REASSESSMENT.md)
- [患者需求研究](docs/USER-RESEARCH.md)、[指南范围和来源状态](docs/GUIDELINE-SCOPE.md)、[来源台账](docs/SOURCES.md)
- [四核心模块](docs/CORE-MODULES.md)、[领域模型](docs/SCHEMA.md)、[API合同](docs/API-CONTRACT.md)、[验收](docs/ACCEPTANCE.md)

SPEC v0.3为详细设计草案，不代表临床审核、指南全文核验或业务功能已完成。
