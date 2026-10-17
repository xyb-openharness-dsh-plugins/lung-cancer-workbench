# 肺癌工作台设计会话记录

当前阶段：小肺宝HTML原型 v4.1.0 已由用户确认冻结；当前进行开发就绪性审查。冻结记录与SHA-256见 [PROTOTYPE-FREEZE](PROTOTYPE-FREEZE.md)。患者任务测试、临床审核和宿主验收仍未完成。低负担草稿交互仍属提案。日期2026-10-17。

## 用户决定

- D01：患者/照护者，DSH Desktop配套，使用指定社区starter。
- D02：全病程覆盖，治疗期与复诊准备优先（用户回答“1+2”）。
- D03：ovarian-workbench是最新产品设计参考；xyb-workbench作为原有实现参照。
- D04：用户Logo保存assets，作为色系基准，结合taste设计UI/UX。
- D05：SPEC需详细；明确覆盖SCLC、NSCLC、确诊、穿刺、转移治疗、指南和靶向药，梳理患者信息差。

- D06：用户确认按 v4 版本锁定原型；后续设计调整另存版本，不覆盖 v4。

## 本轮新增文档

新增并冻结“小肺宝”交互原型 `prototype/lung-workbench-v4.html`（v4.1.0），按 ovarian-workbench v3 和 breast-cancer-workbench `prototypes/v0.3` 的信息架构组织，页面细节和 hash 见冻结记录。v4 页面有 28 条临床试验演示条目，其中仅 14 条来自本地 SQLite；其他 14 条是历史登记展示样例，需逐条复核。在线渠道均未实际接入；其它病例和化验数据为模拟，不读患者本机文件、不接入 DSH/AI。

原型v4继承并扩展前版：涵盖10个一级模块、27个二级页、配置六分区和临床试验多通道布局；可见 28 条列表中，只有 14 条属于 SQLite 快照。原型 v1 按 HVT 补丁增加术后活动、胸水操作、免疫症状与咯血联系场景。静态交互审核见 [PROTOTYPE-REVIEW](PROTOTYPE-REVIEW.md)。当前 v4 尚未完成真实浏览器视觉、读屏/触控和 Desktop 宿主验收。

GAP-ANALYSIS.md对照xyb与本项目规格并提出肺癌患者可用性要求；prototype/lung-workbench-v1.html提供肺癌场景模拟切换、一图秀指标/事件筛选和左右翻面指标卡。验收基线已扩展至AC01–AC43。当前 v4 尚未完成真实浏览器视觉/读屏/触控验收，且未在 Desktop 宿主验证。

见SPEC、CORE-MODULES、SCENARIOS、GUIDELINE-SCOPE、TARGETED-THERAPY、TREATMENT-PATHWAYS、METASTASIS-AND-REASSESSMENT、USER-RESEARCH、SOURCES、SCHEMA、API-CONTRACT、AI-ASSISTANCE、FEATURE-INVENTORY、ACCEPTANCE、REQUIREMENTS-TRACE、PHASE-PLAN、REVIEW-DISCUSSION。

## 未确认为用户决定的草案

- 先有来源整理草稿且可以跳过核对；此建议来自参考设计与低负担假设。
- 有来源个人解释和可讨论选项的AI价值；尚未在本项目单独确认。
- business-first布局、SQLite和成人/中国大陆假设均为当前建议/技术默认。
- 低负担草稿与可跳过核对仍待用户确认。
- 原型已有，但视觉/宿主实机与可用性评审未完成。中国现行完整指南、逐药NMPA标签/医保未核清。
- ClinicalTrials.gov 肺癌试验登记有限样本已存为 SQLite；检索范围、已知源覆盖限制和非穷尽声明见 `reference/trials/README.md`。

## 下一步

完成 [开发就绪性审查](DEVELOPMENT-READINESS-REVIEW.md) 中的工程闸门后，选定并实现首个垂直切片。低负担草稿交互仍是待验证假设。
