# 肺癌患者与照护者工作台

## Git开发快照 · 2026-10-20

保存RC2–RC15阶段累计的单文件客户端、SQLite病例与来源文档服务、临床检索、指标趋势模块、v4.2系列HTML原型及修复记录。最终快照已包含指标目录补全，56项测试通过；继续保留开发分支，实机/原型确认仍待完成。 包版本保持`0.1.2-rc.15`；这是开发快照，正式发布状态另行记录。核验结果、已知问题及同步范围见 [本次Git记录](docs/GIT-SYNC-2026-10-20.md)。


面向肺癌患者与照护者的本机资料、就诊准备与综合照护工作台（v0.1.2-rc.15 开发中，未发布）

首版正在实现小肺宝工作台 UI、本机 SQLite 病例记录、用户核对与 JSON 导出、内置临床试验快照搜索及用户主动触发的 ClinicalTrials.gov 在线检索。临床知识、病历解析、AI、上传附件及 DSH 实机验收仍未完成。需求见 [BRIEF](docs/BRIEF.md)，规格见 [SPEC](docs/SPEC.md)，任务见 [TASKS](docs/TASKS.md)。

## 疾病概要

> 四段固定、整体属解释层（第 ② 层）：只整理公开信息，不判断你的病情。
> 看板「?」入口待原型期补（本项目尚未迁移到 `prototypes/` 目录）。
> 原件状态照实写：卫健委 2022 / 2024 两份、CSCO 2026 正文、AJCC 手册**均未取得原件**，页码一律待核。

### 定义

肺癌是起源于支气管黏膜或腺体上皮的恶性肿瘤。按病理与治疗路径分成两大类，**这两类不能合并叙述**：

- **非小细胞肺癌（NSCLC）**：包含腺癌、鳞状细胞癌、大细胞癌等亚型。治疗分层看三件事：分期、驱动基因检测结果、PD-L1 表达状态。
- **小细胞肺癌（SCLC）**：病理与治疗路径都与 NSCLC 不同。SCLC 另用「局限期 / 广泛期」这套二分法描述范围。

分期用 TNM 体系，由 AJCC / IASLC 维护。本项目 `docs/SOURCES.md` 记录：卫健委 2024 年筛查与早诊方案引用了 TNM 第 8 版作背景；`docs/GUIDELINE-SCOPE.md` 同时记录 IASLC 分期项目页面已说明第 9 版的更新背景，因此本台把「分期版本」当成一个必须保留的字段，**不把第 8 版硬编码成唯一版本**。

两个体系不互推：TNM 分期与 SCLC 的局限 / 广泛期是两套描述，TNM 也不能替代可切除性、手术耐受、治疗目的或患者意愿（`GUIDELINE-SCOPE.md` §内容路由第 3 条）。

**来源**：国家卫生健康委 · 《原发性肺癌诊疗指南（2022年版）》· 2022 年版 · 未取得原件（PDF 直取失败），据官方发布索引 · 页码待核 ｜ 国家卫生健康委 · 《肺癌筛查与早诊早治方案（2024年版）》· 2024 · 未取得原件，据检索摘要 · 页码待核 ｜ IASLC · Staging Project（肺癌分期项目页）· 第 9 版更新背景 · 网页可访问，未取得手册

### 医学资料规范和指南情况

| 机构 | 文件 | 版本 / 年份 | 原件 | 本台的用途 |
|---|---|---|---|---|
| 国家卫生健康委 | 《原发性肺癌诊疗指南》 | 2022 年版 | 未取得原件（PDF 直取失败） | 国内全流程框架；版本较旧，不称「最新」 |
| 国家卫生健康委 | 《肺癌筛查与早诊早治方案》 | 2024 年版 | 未取得原件（据检索摘要） | 只覆盖筛查 / 早诊，不替代治疗指南 |
| CSCO | CSCO 小细胞肺癌诊疗指南 | 2026 年版（官方活动页确认发布与巡讲） | 未取得正文 | SCLC 国内路径参考；不引条目、不引推荐等级 |
| CSCO | CSCO 非小细胞肺癌诊疗指南 | 2026 年版（仅二手索引，未经官方页确认） | 未取得正文 | 待官方核对后才启用 |
| AJCC / IASLC | TNM 分期（肺癌） | 第 8 版在用；第 9 版更新背景已公布（生效时间待核） | 未取得手册 | 分期版本字段；不做版本间换算 |
| NCI | PDQ 非小细胞肺癌 / 小细胞肺癌（患者版、专业版） | 持续更新（逐页更新日未核） | 网页可访问 | 美国来源摘要，单独标地区，不当中国适应证依据 |

未取得原件的文件，本台只记「存在」与「大致讲什么」。药品的「国外有证据 / 中国已批准 / 医保可支付 / 某医院有药」四项在本台分别标记，未知保持未知（`GUIDELINE-SCOPE.md` §内容路由第 6 条）；也不写「已按照 2026 全部最新指南推荐」。

**来源**：见上表逐行。

### 目前治疗全景概要

按病理类型与病期分组。只列指南里出现过的**手段类别**，不含剂量、疗程、适用条件与先后取舍。

**非小细胞肺癌（NSCLC）**

- 早期、可手术：手术（切除范围按医生判断）／围手术期治疗（辅助化疗、辅助或新辅助靶向治疗、围手术期免疫治疗类别）。
- 局部晚期、不可手术：同步放化疗，之后有巩固治疗这一类别。
- 晚期 / 转移 / 复发：化疗／按驱动基因结果划分的靶向治疗类别（检测目录含 EGFR、ALK、ROS1、BRAF、NTRK、RET、MET、KRAS、HER2、NRG1 等，据 IASLC 分子检测图谱目录）／免疫治疗（单药与联合两类）／抗血管生成类／寡转移灶的局部放疗或手术。
- 驱动基因未明或检测未完成时，本台只提供术语与检查目的说明，**不匹配具体药物卡片**（同上第 4 条）。

**小细胞肺癌（SCLC）**

- 局限期：放化疗（同步或序贯），少数情形下讨论手术；之后有巩固 / 维持这一类别。
- 广泛期：化疗联合免疫治疗类别；后线治疗的化疗与临床研究。
- 局限 / 广泛期之外的 TNM 信息照原文保留，两套描述并列存放，不互相换算。

**贯穿全程**

- 支持治疗：症状与不良反应的记录、营养、心理与照护者支持。
- 复查与戒烟等长期管理：只把「约在哪天、做了没有」整理成时间线。

以上是文献与指南里列出的手段，按病期与线序排列，**不代表任何一项适合你**。选哪一个，这一句需要问你的医生。

**来源**：国家卫生健康委 · 《原发性肺癌诊疗指南（2022年版）》· 未取得原件 · 页码待核 ｜ CSCO · 2026 年 SCLC 指南（官方活动页确认发布，正文未取得）｜ IASLC · 2023 分子检测图谱（目录可读，全文未读）

### 发展趋势

只写已发生的事实，每条带日期或版本号。批准日期只到年份，具体批准日与批件号未逐条核。

- 2023 年：FDA 批准 repotrectinib 用于 ROS1 阳性 NSCLC（据 FDA 批准通知，批准日待核）。
- 2024 年：FDA 批准阿来替尼用于 ALK 阳性 NSCLC 的术后辅助治疗；批准奥希替尼用于不可切除 III 期 NSCLC 放化疗后；批准 zenocutuzumab 用于 NRG1 融合阳性 NSCLC；批准 durvalumab 用于局限期 SCLC（均据 FDA 批准通知摘要，批准日待核）。
- 2025 年：FDA 加速批准舒沃替尼用于 EGFR 外显子 20 插入突变的转移性 NSCLC；传统批准 tarlatamab 用于广泛期 SCLC（同上）。
- 2026 年：FDA 扩展 zongertinib 的加速批准适用条件（同上，适用条件原文待核）。
- 2026 年：CSCO 官方活动页确认 2026 年 SCLC 指南发布与巡讲（活动信息日期为 2026 年，指南出版日期未核）。
- 分期体系：IASLC 分期项目页面已说明 TNM 第 9 版的更新背景（生效时间未核）。
- 在研登记：本项目随包临床试验快照 28 条（2026 快照 14 条 + 历史登记 14 条，据 `docs/PROTOTYPE-REVIEW.md`）；这是随包样本，不是登记平台的全量检索结果，阶段分布未统计。

**来源**：FDA · 药品批准通知（`docs/SOURCES.md` S14–S16、S19，核对日 2026-10-17）｜ CSCO 官网 · 2026 SCLC 指南活动页（`SOURCES.md` S03）｜ IASLC · Staging Project 页面（`SOURCES.md` S05）｜ 本项目 `docs/PROTOTYPE-REVIEW.md`（随包快照条数）

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
