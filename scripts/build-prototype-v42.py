from pathlib import Path
import base64
root=Path(__file__).resolve().parents[1]
source=(root/'docs/prototype/lung-workbench-v4.html').read_text()
source=source.replace('v4.1.0','v4.2.6').replace('构建 2026-10-17','构建 2026-10-20')
source=source.replace('assets/brand/lung-care-logo.png','data:image/png;base64,'+base64.b64encode((root/'assets/brand/lung-care-logo.png').read_bytes()).decode())
geometry=(root/'lib/chart-geometry.js').read_text().replace('export function ','function ')
source=source.replace("'use strict';","'use strict';\n"+geometry,1)
source=source.replace("  ['trials', '临床试验', 'search']","  ['archives', '档案管理', 'folder'],\n  ['trials', '临床试验', 'search']",1)
source=source.replace("const SUBTITLES = {","const SUBTITLES = {\n  archives: '原件、解析、确认与输出文件分别管理。',",1)
old="const path = coords.map((c, i) => `${i ? 'L' : 'M'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');"
assert old in source
source=source.replace(old,'const path = smoothMetricPath(coords);',1)
needle='          <span class="field-help">仅保存在当前页面内存中，刷新后清除。不会上传，也不会写入本机文件。</span></div>'
assert needle in source, 'Record upload insertion point missing'
source=source.replace(needle,needle+'\n        ${recordUploadBlock()}',1)
extra=(root/'docs/prototype/archive-flow-v42.js').read_text()
runtime=(root/'docs/prototype/timeline-runtime-v42.js').read_text().replace('/*__RUNTIME_TIMELINE__*/',(root/'lib/client-timeline.js').read_text().replace('const timelinePage =','const renderTimeline =',1))
extra+='\n'+runtime+'\n'+(root/'docs/prototype/agent-pane-v42.js').read_text()
import re
client=(root/'lib/client.js').read_text()
css=re.search(r'const CSS = `([\s\S]*?)`',client).group(1)+(root/'assets/workspace-detail.css').read_text()
css+=re.search(r"const DARK_CSS = '([^']+)'",client).group(1)
css+='\n.reduce-motion .wb-animated-curve{animation:none;stroke-dasharray:none;stroke-dashoffset:0}.reduce-motion .wb-measurement-dot,.reduce-motion .wb-event-entrance{animation:none;opacity:1;transform:none}.reduce-motion .wb-flip-inner{transition:none}\n'
css+='\n.wb-lung-cancer-workbench{display:block!important;height:auto!important;overflow:visible!important}.wb-lung-cancer-workbench .wb-page{padding:0}.wb-lung-cancer-workbench button{min-height:44px}\n'
css+='\n.archive-upload-box{padding:16px;border:1px dashed var(--blue);border-radius:12px;background:var(--sky);margin-top:4px}.archive-upload-box p{margin:6px 0}.archive-steps{display:flex;flex-wrap:wrap;gap:10px;list-style:none;padding:0;margin:0 0 16px}.archive-steps li{padding:8px 12px;border:1px solid var(--line);border-radius:20px}.archive-steps [aria-current=step]{background:var(--sky);color:var(--blue);border-color:var(--blue)}.archive-file-tabs{display:flex;gap:8px;overflow:auto;margin-bottom:16px}.archive-file-tabs button{flex-shrink:0}.archive-file-preview{width:100%;max-height:300px;object-fit:contain;border:1px solid var(--line);border-radius:10px}.archive-flow-error{color:#a44740;min-height:1em}.archive-upload-box .row{flex-wrap:wrap}.archive-upload-box button{min-height:44px}\n'
css+='\n'+(root/'docs/prototype/agent-pane-v42.css').read_text()
source=source.replace('<div class="workspace">','<div class="prototype-ai-frame"><div class="workspace">',1)
source=source.replace('<dialog class="dialog"', (root/'docs/prototype/agent-pane-v42.fragment.html').read_text()+'\n</div>\n<dialog class="dialog"',1)
agentToggle = ('<button class="prototype-ai-toggle" id="prototype-ai-open" data-action="prototype-ai-toggle" aria-expanded="false" aria-controls="prototype-ai-pane" title="打开右侧 DSH 原生 AI 对话；拖动左缘调宽，双击分割条回到 35%">'
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M12 3.6l1.85 4.55L18.4 10l-4.55 1.85L12 16.4l-1.85-4.55L5.6 10l4.55-1.85z"/><path d="M18.2 15.4l.85 2.05 2.05.85-2.05.85-.85 2.05-.85-2.05-2.05-.85 2.05-.85z"/></svg>'
  '<span id="prototype-ai-open-label">AI 对话</span></button>')
source=source.replace('<button class="top-btn" data-action="settings"', agentToggle+'<button class="top-btn" data-action="settings"',1)
source=source.replace("      btn('今日身体变化'", "      '<button class=\"btn soft\" data-action=\"prototype-ai-open\" aria-controls=\"prototype-ai-pane\">打开 AI 对话</button>' +\n      btn('今日身体变化'",1)
source=source.replace('</head>','<link rel="icon" href="data:,"><style>'+css+'</style></head>',1)
source=source.replace('''$('#main').innerHTML = `<div class="page-enter">${view()}</div>`;''','''const result=view();if(result instanceof Node){const host=document.createElement('div');host.className='page-enter';host.append(result);$('#main').replaceChildren(host)}else $('#main').innerHTML = `<div class="page-enter">${result}</div>`;''')
source=source.replace('const VIEWS = {',extra+'\nconst VIEWS = {\n  archives: archivePage,',1)
source=source.replace('function applyDisplay() {',"function applyDisplay() {\n  document.querySelectorAll('.wb-lung-cancer-workbench').forEach(el=>{el.dataset.theme=state.page==='timeline'?'light':state.cfg.theme;el.dataset.font=state.cfg.font});",1)
source=source.replace('\nrender();\n</script>',"\nif(location.hash.slice(1) in VIEWS)state.page=location.hash.slice(1);\nrender();\nprototypeAgentInit();\n</script>")
source=source.replace("document.documentElement.dataset.theme = state.cfg.theme;", "document.documentElement.dataset.theme = state.page === 'timeline' ? 'light' : state.cfg.theme;")
source=source.replace("renderMain();\n  $('#status-store')", "renderMain();\n  applyDisplay();\n  $('#status-store')",1)
source=source.replace("const tt = $('#theme-toggle');", "const tt = $('#theme-toggle');tt.disabled=state.page==='timeline';tt.title=state.page==='timeline'?'一图秀固定为浅色界面':'切换页面主题';")
source=source.replace("tt.textContent = state.cfg.theme === 'dark' ? '浅色' : '深色';", "tt.textContent = state.page==='timeline'?'浅色界面':state.cfg.theme === 'dark' ? '浅色' : '深色';")
(root/'docs/prototype/lung-workbench-v4.2.6.html').write_text(source)
print('Updated prototype v4.2.6; v4.2~v4.2.5 and frozen v4.1 retained.')
