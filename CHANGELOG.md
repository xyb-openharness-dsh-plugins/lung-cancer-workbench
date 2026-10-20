# 变更记录

## 2026-10-20 · 开发快照（包版本 0.1.2-rc.15）

- 保存RC2–RC14阶段累计的单文件客户端、SQLite病例与来源文档服务、临床检索、指标趋势模块、v4.2系列HTML原型及修复记录。当前指标页存在categorizedMetricSeries未定义的失败，按现有开发分支保存。
- `npm run check`：通过（退出码0）。
- `npm test`：未通过（退出码1）；tests=51, pass=47, fail=4。
- 4项客户端渲染测试因`categorizedMetricSeries is not defined`失败；本次保存开发现场，未将此状态标作可发布版本。
- 详细范围见 [Git同步记录](docs/GIT-SYNC-2026-10-20.md)；本次未创建正式发布tag。
