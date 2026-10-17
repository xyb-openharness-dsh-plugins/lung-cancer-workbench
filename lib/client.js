window.__ModuleLoader__.load({
  id: "@xyb-openharness-dsh-plugins/lung-cancer-workbench",
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const metadata = {"title":"肺癌患者与照护者工作台","description":"面向肺癌患者与照护者的本机资料、就诊准备与综合照护工作台（需求共创中）"}
    const theme = "/* Scope to business content; never style host navigation globally. */\n.wb-lung-cancer-workbench {\n  --wb-paper: #F3F9FC; --wb-surface: #ffffff; --wb-ink: #203D50;\n  --wb-muted: #496777; --wb-line: #CDDFE9; --wb-mint: #E5F3F9;\n  --wb-mint-ink: #17638C; --wb-action: #17638C; --wb-action-ink: #ffffff;\n  --wb-pink: #FFF1E5; --wb-blue: #E5F3F9; --wb-yellow: #FFF1E5;\n  --wb-brand: #83C4DF; --wb-accent: #E8873D; --wb-accent-ink: #9B4613;\n  --wb-radius: 16px; --wb-gap: 16px; --wb-group-gap: 24px;\n  color: var(--wb-ink); background: var(--wb-paper); font: 16px/1.65 -apple-system,BlinkMacSystemFont,\"PingFang SC\",\"Microsoft YaHei\",sans-serif;\n  font-variant-numeric: tabular-nums; min-width: 0; min-height: 0; container-type: inline-size;\n}\n.wb-lung-cancer-workbench[data-font=large] { font-size: 19px; }\n.wb-lung-cancer-workbench * { box-sizing: border-box; }\n.wb-lung-cancer-workbench button,.wb-lung-cancer-workbench input,.wb-lung-cancer-workbench select { font: inherit; }\n.wb-lung-cancer-workbench button { min-height: 44px; cursor: pointer; }\n.wb-lung-cancer-workbench :focus-visible { outline: 3px solid var(--wb-mint-ink); outline-offset: 3px; }\n.wb-lung-cancer-workbench .wb-primary { background: var(--wb-action); color: var(--wb-action-ink); border: 0; border-radius: 999px; padding: 9px 20px; }\n.wb-lung-cancer-workbench .wb-flower { display: inline-block; width: 24px; height: 24px; flex: 0 0 auto; margin-inline-end: 10px; animation: wb-flower-turn 12s linear infinite; }\n@keyframes wb-flower-turn { to { transform: rotate(360deg); } }\n@media (prefers-color-scheme: dark) {\n  .wb-lung-cancer-workbench { --wb-paper:#142630; --wb-surface:#1C3442; --wb-ink:#EAF5FA; --wb-muted:#B9D1DE; --wb-line:#476474; --wb-mint:#244B60; --wb-mint-ink:#9FD5ED; --wb-action:#9FD5ED; --wb-action-ink:#142630; --wb-pink:#49352A; --wb-blue:#244B60; --wb-yellow:#49352A; }\n}\n@media (prefers-reduced-motion: reduce) {\n  .wb-lung-cancer-workbench .wb-flower { animation:none; }\n}\n"
    function Panel() {
      const [health, setHealth] = React.useState(null)
      const [error, setError] = React.useState('')
      const [large, setLarge] = React.useState(false)
      const [attempt, setAttempt] = React.useState(0)
      React.useEffect(() => {
        const controller = new AbortController()
        setHealth(null); setError('')
        fetch('/api/lung-cancer-workbench/health', { signal: controller.signal, credentials: 'same-origin' })
          .then(async (response) => {
            if (!response.ok) throw new Error(`服务连接失败 (${response.status})`)
            const result = await response.json()
            if (!controller.signal.aborted) setHealth(result)
          })
          .catch((failure) => { if (!controller.signal.aborted) setError(failure.message) })
        return () => controller.abort()
      }, [attempt])
      return h('main', { className: 'wb-lung-cancer-workbench', 'data-font': large ? 'large' : 'standard', style: { flex: 1, display: 'flex', flexDirection: 'column', gap: 16, padding: 20, overflow: 'auto' } },
        h('header', { style: { display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', paddingInlineStart: 'var(--dsh-frame-leading-clearance, 0px)' } },
          h('strong', null, metadata.title),
          h('span', { 'aria-live': 'polite' }, health ? `v${health.version}` : '版本待连接'),
          h('button', { type: 'button', 'aria-pressed': large, onClick: () => setLarge(!large) }, large ? '标准字' : '大字')),
        h('style', null, theme),
        h('section', { style: { background: 'var(--wb-surface)', border: '1px solid var(--wb-line)', borderRadius: 'var(--wb-radius)', padding: 20 } },
          h('h1', { style: { fontSize: '1.6em', margin: '0 0 12px' } }, metadata.title),
          h('p', null, metadata.description),
          h('p', { role: 'status' }, error || (health ? '接入骨架：服务已连接，业务功能待按 spec 实现。' : '正在连接本机服务…')),
          h('button', { type: 'button', className: 'wb-primary', onClick: () => setAttempt((value) => value + 1) }, '重新检查连接')))
    }
    function apply(ctx) {
      ctx.effect(() => ctx.desktopWorkbenches.register({"title":"肺癌患者与照护者工作台","repository":"https://github.com/xyb-openharness-dsh-plugins/lung-cancer-workbench","description":"面向肺癌患者与照护者的本机资料、就诊准备与综合照护工作台（需求共创中）","customFrame":true}, Panel))
    }
    return { apply, inject: ['desktopWorkbenches'] }
  }
})
