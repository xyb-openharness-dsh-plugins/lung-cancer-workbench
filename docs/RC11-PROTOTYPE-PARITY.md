# RC11 · v4.2.6 原型对照与 Desktop 安装修复

日期：2026-10-20。用户报告 RC8 严重偏离设计，本轮直接修复产品实现。冻结原型不重生成，SHA256 见 `reviews/prototype-v4.2.6-baseline.json`。

## 根因与发布对象

实际应用为 `/Applications/DSH Desktop.app`（io.dsh.desktop，0.12.0）。检查发现 Desktop Harness `profiles/web` 仍引用 RC8；RC9/RC10 写入 `~/.dsh/profiles/desktop`，该位置不是本次 Desktop 的实际加载配置。不能用那两次安装证明应用已升级。

正确 DSH_HOME：`~/Library/Application Support/dsh-desktop/harness`；profile：`web`；使用 `.desktop-bin` 中的运行时工具。`web` 是 Desktop 内部 Harness profile 名称，发布对象仍然是原生 Desktop app。

## 修复和验证

| 项目 | 本轮实现 | 已核验范围 |
| --- | --- | --- |
| 框架 | 216px 导航、原型 SVG 图标、60px 顶栏、字号/按钮/下划线子导航与双栏卡片 | 浏览器实际渲染，11 主页面、29 子页无白页 |
| 一图秀 | 固定浅色外层和正文，16px 横向留白，全宽；事件标签、治疗轨、统一日期轴、独立归一化及轻度单调平滑 | 同一林女士病例与原型比较：背景 RGB(243,249,252)、导航216px、图 viewBox 0 0 1000 598、留白16px一致 |
| 指标卡 | 点击卡片翻面，再次点击返回数值；来源点独立点击 | 浏览器 data-flipped false→true→false；单点/未知方法不连线测试 |
| 演示病例 | 四套原型对照病例＋两套连续病程，共六套，均明确只读合成 | SQLite 全部病例 round-trip；不写真实病历库 |
| 复诊 | 三组摘要、编辑/勾选问题、时间范围、包预览与真实档案导出入口 | 自动渲染＋浏览器检查 |
| 收藏回顾 | 我的收藏/已保留结果/问题清单/报告与任务 | 四个子页实际渲染；临时保留结果明确本次会话，不冒充SQLite持久化 |
| 临床检索 | 五通道状态、内置SQLite、在线CT.gov、Veeva外部入口、七项条件、分页、详情和收藏 | 本机真实数据库检索805条、每页10条；靶点联合筛选和排序API测试；地区对象已格式化 |
| 右侧原生AI | 默认35%，25–45%分界线；保持宿主节点挂载；窄屏抽屉阻止背景操作、Escape关闭与焦点处理 | 原生节点/延迟创建/并发去重/缩放/隐藏保留/窄屏隔离自动测试；真实宿主交互待人工重启后验收 |
| 文件 | 保留原件、解析候选、人工确认、SQLite、导入/输出档案 | 既有文件API测试通过，包括HEIC预览、失败重试、事务和跨病例隔离 |
| 导出 | 排除私密与心理内容；仅导出已纳入记录引用的原件索引 | 服务端过滤已落实，文件与API回归通过 |

浏览器在独立临时合成资料目录执行，不是 DSH 宿主。1280×720、1600×1000 和700×900检查完成；700px保留文字导航且无整页横向溢出。截图：[实际一图秀](reviews/rc11-timeline-1600.png)。

`npm run build`、`npm run check`、`npm test`：49/49通过。测试不能替代实际Desktop视觉、文件选择器、AI会话及拖拽的人工验收。本轮不承诺量化98%一致性，患者可用性与临床审核尚未完成。Veeva为外部入口，ChiCTR/ICTRP未接通，未伪造多渠道结果。

## 安装证据

打包及正确 Desktop profile 的安装结果另记录于 `reviews/rc11-desktop-install.json`。保持应用运行，由用户手动重启。仅包版本、VERSION和client SHA256一致才算安装校验完成。

安装结果：已将RC11写入上述实际Desktop profile，依赖指向RC11本地tgz；package.json、VERSION、client和SQLite字节一致。Desktop内置Node v24.17.0成功导入插件入口。安装时pnpm提示peer依赖，Desktop runner已恢复10组generation投影；实际入口导入通过。未启动或重启Desktop，重启后的实机视觉与AI交互仍待验收。
