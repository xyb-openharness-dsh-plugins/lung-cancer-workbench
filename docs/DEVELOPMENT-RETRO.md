# 小肺宝首版开发阶段记录

日期：2026-10-18。状态：开发中；不是最终复盘、发布报告或医学/患者验收结论。

## 已验证的做法

- 按用户确认保留 v4.1.0 HTML 原型及冻结 hash；运行时代码和 npm 文件 allowlist 不包含冻结原型。原型与产品版本分别管理。
- 使用可复现构建脚本把用户提供的 Logo 嵌入 DSH 单文件客户端，避免运行时引用开发者本机路径；`VERSION` 是界面/包版本标识的构建来源。
- 领域层把病例、来源、日期精度、标本、检测状态、诊断/组织学、治疗状态和用户核对作为来源可追溯记录；NSCLC/SCLC 是独立诊断断言，不从缺失结果推断阴性。SQLite 仓储提供事务、revision 冲突和迁移测试。
- 试验搜索拆为随包 SQLite 快照与用户主动触发的 ClinicalTrials.gov 在线通道，避免把快照伪装为实时结果。快照经官方 API 重新按 9 个月首次发布日期完整分页并筛选去重为 805 条候选，详见 [`reference/trials/README.md`](../reference/trials/README.md)，不是肺癌临床试验全量库。
- 当前本机自动化检查原有 22 项；近期加入数据窗口、筛选及设置界面断言，最新测试结果以本轮完整运行记录为准；静态包检查通过；npm dry-run 确认客户端、服务端、版本号和临床快照入包，冻结原型未入包。

## 发现的问题与修复

| 问题 | 发现方式 | 当前处理 | 后续固化 |
| --- | --- | --- | --- |
| DSH Desktop 没有可访问窗口，无法做宿主 UI 验收 | CUA 连续返回 `cgWindowNotFound`；`open -a '/Applications/DSH Desktop.app'` 返回 `-10827`；`codesign --verify --deep --strict` 显示 `invalid signature (code or signature have been modified)`，未指出具体资源 | 仅记录现象；未修改或重签 app bundle，也不把该宿主问题归因于工作台。小肺宝 RC.2 已安装到 app profile 并核对 profile/bundle/state，但加载和 UI 未验证 | 当 app 不可见时先区分工作台包与宿主启动问题；核验 app 可执行文件、Launch Services 结果和签名。签名失败时停止改宿主，交由 app 维护方恢复，再重试目标工作台验收。 |
| 只看工作台版本标签，容易误认为已核实 DSH Desktop/Harness 版本 | 运行中 app 的辅助信息显示工作台版本 `0.1.26`；只读读取 `/Applications/DSH Desktop.app/Contents/Info.plist` 和 app.asar manifest 得到 Desktop `0.12.0`、Harness peers `0.2.0-rc.2`；这仍不能证明活动 profile/generation 和 Node runtime | Desktop app 身份、bundle 与 peer 版本已核实；安装入口/runtime 未核实；不安装到 `dsh web`，不重启 app | 发布前核对活动插件管理/受支持诊断、安装版本、Node/SQLite 能力和 profile/generation |
| peer 下限允许较早 RC，可能误接不具备目标接口的版本 | 只读核查目标 `/Applications/DSH Desktop.app` bundle 与 app.asar manifest：Desktop `0.12.0`，client-connection/webserver `0.2.0-rc.2`，Cordis `4.0.4`，Schemastery `3.18.4`；不能把 ovarian-workbench 的 `0.1.0-rc.8` lock 当目标运行时版本 | 将两个 DSH peer 下限调整为目标 Harness `0.2.0-rc.2`，保留 `<0.3.0-0` 上界 | 仍需在 DSH Desktop 插件安装路径验证解析/加载，测试实际 API 签名与 Electron Node/SQLite 能力 |
| Node SQLite 会发 ExperimentalWarning，宿主运行时未知 | 本机 `node -v` 为 v23.6.1，测试运行时有 warning | 明确标记 runtime 未实机验证；不把本机测试当 Desktop 兼容证明 | Desktop 实机验证 `node:sqlite`、文件权限、迁移和重启恢复 |
| 实现推进后 TASKS/PARITY/ACCEPTANCE 仍残留“未实现/全部未执行”等旧口径 | 文档审查发现状态与当前代码不匹配 | 已同步开发状态、首版能力和实现证据；parity 明确保留 Desktop 实测差距 | 每完成一个切片更新唯一任务表、parity、AC 状态；补回归门禁 |
| 本机 npm 默认日志路径超出可写范围 | `npm pack` 首次尝试出现权限错误 | 仅在临时缓存目录执行 dry-run，未触碰 web profile | 将 pack/check 命令 cache/log 显式落在允许的临时目录 |
| 把通用 CLI profile 安装误当成 DSH Desktop app 安装；随后第一次安装命令又把 `TARGET_DSH_HOME` 写成 CLI 不识别的变量 | 重启后切换器无小肺宝；逐个检查发现 `~/.dsh/profiles/web` 被误装，而 app Harness `profiles/web` 未变化 | 撤销误装；用显式 `DSH_HOME` 指向 `/Users/.../Library/Application Support/dsh-desktop/harness`，将 app 自带 `.desktop-bin/pnpm` 放在 PATH 前，再通过 app CLI profile 安装。已核实 pnpm 10.34.5、依赖 tarball、bundle 注册、node_modules 版本和 app workbench state 注册一致。运行中 UI 尚未重启加载 | 命令里的变量名须与 CLI 真正读取的 `DSH_HOME` 完全一致；写入后同时核验目标路径与非目标路径，禁止只看 pnpm `Done`。Desktop app 内 profile 即使名为 `web`，也须以 DSH_HOME 的真实 app Support 目录判定目标；不要运行 `dsh web` 或写入 `~/.dsh`。 |

## 尚未完成的闭环

- 工作台 `0.1.2-rc.2` 已安装到 DSH Desktop app 的 `/Users/.../Library/Application Support/dsh-desktop/harness/profiles/web`，依赖使用项目内 release tarball；目标 bundle 与 app workbench 注册状态均已核实。当前进程尚未重启加载这一更新；活动 generation、Electron Node/SQLite runtime 和真实 UI/业务流程仍待核实。
- 尚未在真实 DSH Desktop 走通创建病例、保存/重开、候选复核、临床快照/在线检索和导出流程。
- 尚未完成 HTML v4 与生产 UI/UX/行为 >98% parity 核算；现有客户端树测试不是浏览器视觉验收。
- parity 仍需按全部冻结 HTML 的控件/状态/动作逐项核算 >98% 并由开发者确认偏差；患者任务走查与临床内容审查也未完成。

## 下一轮经验更新规则

每次修复都记录原症状、复现版本/命令、失败阶段、根因证据、最终修改、测试/人工验收和可能回归面。仅当经验能跨项目复用时，才把规则/脚本/测试回写到 xyb-workbench-starter；项目专属癌种字段、数据统计和临床口径留在本项目。不得把未核实的猜测写成“解决方案”。

## DSH Desktop app 目标混淆（2026-10-18）

此前用 `dsh plugin --profile desktop add` 将 tarball 装入通用 `$HOME/.dsh`，并错误地报告成 Desktop profile。进一步按当前 app 开发指南检查后，确认 UI 无本地 tgz 入口，但 app 随附 CLI 和 `.desktop-bin/pnpm` runner 可使用 `DSH_HOME` 指定 app 自己的 Harness profile。第一次调用把路径写进 `TARGET_DSH_HOME`，又误装到通用 `~/.dsh/profiles/web`；随后立即通过 CLI remove 撤销，并分别检查两个 profile。正确调用显式设定 `DSH_HOME='/Users/.../Library/Application Support/dsh-desktop/harness'`，并把 app `.desktop-bin` 加入 PATH；pnpm 10.34.5 成功安装 RC.2。当前 app 内 profile 的依赖、bundle 列表（22 项）、安装包版本及 `desktop-workbenches/state.json` 注册已一致；`dsh --dump-config` 由通用 CLI 运行时解析 app profile 失败，因为 app bundle 不在通用 CLI 安装内，不用作 UI/加载证据。仍需用户重启 app 后检查切换器、入口和业务面板。

## 2026-10-18 临床数据核验补记

按 ClinicalTrials.gov 官方 API v2 的 `StudyFirstPostDate` 字段，查询 2026-01-18 至 2026-10-18 共 913 条。按标题/疾病字段作肺癌相关筛选并按 NCT 去重，805 条入库（NSCLC 469、SCLC 81、混合 19、其他肺癌相关 236），108 条不相关候选排除。SQLite `integrity_check=ok`，NCT 唯一。Veeva CTV 是 CT.gov 数据的发现界面，未作为独立注册库相加；中国药物试验、ChiCTR、ICTRP 本轮未获得可核验完整结果，产品里也未接通。此为登记候选检索，不等于人工临床审核、全球全量或当前招募人数。

本轮发布候选验证：`npm run build`、`npm run check`、`npm test`（23/23）通过；npm pack 首次因默认日志目录权限失败，显式设置 `npm_config_cache=/private/tmp/lung-workbench-npm-cache` 后打包成功。确认 tarball 含 VERSION、服务端模块及 2.4MB SQLite。随后安装到通用 CLI `desktop` profile；Corepack 将 packageManager 字段写进项目根 package.json，已立即移除该非项目变更。该 CLI profile 与 DSH Desktop app 分属不同安装上下文，不能作为 app 安装证据。

RC.2 加入大字/深色偏好本机持久化，只保留 `xiaofeibao.display-preferences` 两个布尔值，不存档案数据。增补客户端测试后总数为 24/24。`0.1.2-rc.2` 的依赖 tarball、app 内 profile bundle、安装副本和 workbench 注册状态一致；需用户重启 app 后验证菜单、UI 和业务链路。此前对通用 CLI profile 做过的误装已撤销。

RC 升级时曾因构建脚本只允许当前精确版本或占位字符串、而客户端已被上次构建替换为旧版本字面量，导致 `npm run build` 中止。脚本现在接受 semver 版本字面量或占位符，并统一写入 `VERSION`；从 `0.1.2` 升到 `0.1.2-rc.2` 后重新构建、检查、测试、打包并安装。下次若改版本格式/标记，需验证重复构建和递增版本都能成功。


### 背景反复变黑：系统主题与显式主题分开验证

根因：共享CSS带有未受data-theme约束的prefers-color-scheme:dark规则，页面设light后外层根背景仍黑。只核对卡片、主内容或手动主题不足以验证整页。解决：移除残留自动覆盖，显式light根容器覆盖完整变量与背景。回归需同时覆盖OS浅/深色、产品手动主题、主内容/根容器/留白、默认及展开AI面板状态；使用elementFromPoint核验用户箭头位置并保存完整截图，不再只凭局部样式宣称无黑底。


## RC8严重偏差的闭环修复（2026-10-20）

重复问题：原型更新而产品仍是简化组件；演示数据不一致使截图无法比较；发布到猜测的desktop profile导致真实Desktop仍加载旧包。解决方式：冻结原型哈希；提取同一原型病例进行SQLite往返和视觉对照；共享组件/图标/几何算法同步；每次从实际app读取Harness目录和profile依赖，包版本+VERSION+client哈希三重核验。后续脚手架流程必须保存这些证据，安装成功不等于人工UI验收通过，不能凭主观判断宣称98%。

2026-10-20补充：小病例22条视觉通过不覆盖108条密集病程。事件不应无限推高趋势图，应固定图高、按类别聚合且可回看原始事件。指标卡不按数据插入顺序平铺，使用同源分类目录和固定高度3D卡；复用规范已同步starter 24号文档/提示词/模板，并加入init生成检查。
