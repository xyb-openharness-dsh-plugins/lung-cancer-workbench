# 肺癌临床试验 SQLite 快照

快照采集日：2026-10-18。数据库：`assets/data/lung-cancer-trials.sqlite`。窗口按首次发布日期计算最近 9 个日历月：2026-01-18 至 2026-10-18。当前 API 结果中最早符合记录为 2026-01-20。

## 核验统计

使用 ClinicalTrials.gov 官方 API v2，以 `query.cond=lung cancer` 和 `AREA[StudyFirstPostDate]RANGE[2026-01-18,2026-10-18]` 查询，`countTotal=true`、每页 1000 条：

| 指标 | 数量 | 说明 |
| --- | ---: | --- |
| API 总命中 / 返回 | 913 / 913 | 完整分页结果；当前只有一页 |
| 肺癌相关候选 | 805 | 按登记标题和疾病条件字段筛选，NCT 去重后 805 条 |
| 筛掉的非肺癌相关记录 | 108 | API 检索匹配但标题/疾病字段不满足肺癌相关筛选 |
| SQLite 唯一记录 | 805 | NCT 重复数为 0；`PRAGMA integrity_check` 为 `ok` |
| 癌种分类 | NSCLC 469；SCLC 81；混合 19；其他肺癌相关 236 | 分类互斥合计 805；“其他”保留未明确组织学或肺癌相关研究 |
| 研究类型 | 介入性 631；观察性 171；扩大使用 3 | 不是全部都是治疗试验 |
| 招募状态 | 招募中 390；尚未招募 340；进行中不招募 24；邀请招募 10；其余状态 41 | 截至查询快照；不能视为个人可入组名额 |

805 是系统化登记字段筛选出的肺癌相关候选集合，不代表人工逐条复核、疗效证据等级、当前可入组数量或全球肺癌试验全量。结果含观察性、诊断/筛查、术后研究以及其他癌种中明确含肺癌队列的研究；按来源状态和癌种字段保留，供检索与讨论准备。

## 来源与多通道口径

- 主数据来源是 [ClinicalTrials.gov API v2](https://clinicaltrials.gov/data-api/about-api)，每条记录保存 NCT 官方登记 URL、首次发布日期、最近更新、状态、阶段、申办方、干预、条件、地点及抓取时间。
- Veeva ClinicalTrials.Veeva（CTV）已查验，用作患者友好的发现/浏览入口；[CTV 记录页说明其数据来源为 ClinicalTrials.gov](https://ctv.veeva.com/study/risk-adapted-proteomic-guided-systemic-therapy-for-previously-untreated-advanced-non-small-cell-lung-cancer)。因此 CTV 不是独立注册库，不能与 NCT 记录重复相加。
- `unified_search_trials` 多源服务状态已核验：本地成功归档仅为胰腺癌快照（139 条、截止 2026-09-29）；肺癌相关的 chinadrugtrials 远端搜索为网络失败、ChiCTR/ICTRP/CTV 请求失败或未知错误、另一 ChiCTR 归档缺少本地路径。失败表示未获得数据，不能按 0 条记录统计。其他来源未形成可核验的肺癌计数，本数据库不混入臆测数据。
- 官方 API 查询、拉取字段和数据库生成过程可由 [`scripts/build-trial-snapshot.py`](../../scripts/build-trial-snapshot.py) 复现。原始 API 响应采用最小必要公开字段，不抓取患者个人信息或公开联系人详细信息。

## 解释边界

筛选规则以标题/疾病条件中是否出现 NSCLC、non-small cell、SCLC、small-cell lung、lung cancer/carcinoma/neoplasm/adenocarcinoma 或 pulmonary cancer/carcinoma/neoplasm 为基础。该筛选用于召回，不等同研究者判读；“混合”表示记录同时包含小细胞和非小细胞相关词项。未纳入本快照不代表官方平台不存在该研究。当前招募状态与地点会变化，应打开官方记录复核。

工作台只用于患者和照护者整理资料、准备就诊讨论，不提供诊断、治疗推荐、疗效比较或入组资格结论。
