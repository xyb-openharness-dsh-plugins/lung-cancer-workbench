# 应用命令与读模型合同草案 v0.2

只定义业务边界，不猜测DSH未核验的服务名或路由。静态原型用MockAdapter；mock不得标真实完成。各命令Schema后续用运行时validator实现。

## 写命令

| 命令 | 输入要点 | 输出/幂等/失败恢复 |
| --- | --- | --- |
| `importDocuments` | 主体、用户目录中的选中文件、云/本地解析选择及当次授权 | document/parse IDs；重复hash提示；路径不可越界 |
| `recordSpecimenEvent` | specimen/version、事件种类、时间精度、机构/原文 | 新事件版本；样本不足不覆盖既有标本 |
| `createTestRun` | specimen、方法/平台/检测范围/来源 | test-run ID、明确pending等状态 |
| `reviewClaims` | claim ID/revision、字段级accept/edit/reject/defer、actor | decision+新记录引用；单事务、可幂等重试 |
| `recordTreatmentEvent` | therapy/course、计划/实际/暂停状态、药物/剂量或放疗部位原文 | event ID；计划不能转实际，保持完整历史 |
| `recordLesionEvent` | 来源、部位原文、证据状态、比较对象、团队评估原文 | event ID；不自动映射转移诊断 |
| `recordSupportEntry` | subject/actor、一个或多个可选字段、隐私选择 | entry ID；空字段不补0，不强迫长问卷 |
| `createBrief` | 所选接受记录、可选草稿、问题/日期窗/分享对象 | versioned draft；候选前提明确标记 |
| `prepareAgentTask` | 用户问题、记录/文档/知识资源ID及版本、用途/接收方 | 可预览快照；发给原生会话的动作单独确认 |
| `exportSnapshot` | artifact版本、真实格式、字段/隐私选择 | artifact ID+MIME/path/hash；取消不留假文件 |

## 读模型

`overview.v1`：任务入口/计划安排/待回顾；`document-batch.v1`：原件、任务状态和疑点；`diagnosis.v1`：病理/分期断言历史；`specimen-chain.v1`：取材→标本流转→病理/检测状态；`biomarker-profile.v1`：分子与PD-L1批次/版本；`treatment.v1`：实际/计划疗程与方案；`metastasis.v1`：按部位事件和证据；`metric-series.v1`：同方法/单位分组；`one-page.v1`：多轨共同时间窗及记录引用；`knowledge-match.v1`：只列条件和知识来源、不作适合度；`brief.v1`：摘要/缺项/分享选择/过时状态。

每个返回schema显式版本、主体/工作区ID、基准revision和分页/排序。无数据是空集合；未知值不改写成false或零。错误包括`INVALID_INPUT`、`REVISION_CONFLICT`、`SOURCE_MISSING`、`SPECIMEN_INSUFFICIENT`、`DIRECTORY_UNAVAILABLE`、`CAPABILITY_UNAVAILABLE`、`CANCELLED`、`RESOURCE_STALE`；用户文案给可恢复操作，不暴露栈/密钥。

## Agent/外部知识边界

只给用户本次选中且有权读取的记录，展示文本/图像、版本、用途、服务接收方。患者数据与公开知识资源分区，候选/隐私标签传递。切换主体使旧快照失效；只保存草稿与明确发送/执行操作分离。云解析/Agent能力不可用时保留本机整理和问题草稿。

## 待核合同

DSH目标版本、connection/session API、文件目录owner、SQLite runtime/迁移锁、异步任务取消、允许上传的文件类型、目标profile及支持的真实导出环境。在本机验证前，规格不能写“接口已接通”。
