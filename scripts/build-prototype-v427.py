"""Build an additive revision from the frozen v4.2.6; never rewrite the baseline."""
from pathlib import Path
import hashlib,json
root=Path(__file__).resolve().parents[1]
base=root/'docs/prototype/lung-workbench-v4.2.6.html'
assert hashlib.sha256(base.read_bytes()).hexdigest()==json.loads((root/'docs/reviews/prototype-v4.2.6-baseline.json').read_text())['sha256']
s=base.read_text().replace('v4.2.6','v4.2.7')
a=s.index('function metricIdentity(record)');b=s.index('/* ============================================================',a)
s=s[:a]+(root/'lib/chart-geometry.js').read_text().replace('export function ','function ')+'\n'+s[b:]
a=s.index('        const renderTimeline = () => {');b=s.index('  const wrapper=document.createElement',a)
runtime=(root/'lib/client-timeline.js').read_text().replace('const timelinePage =','const renderTimeline =',1)
# The prototype selector uses the same category catalog as the metrics tab, including empty entries.
a2=runtime.index('        const selector=');b2=runtime.index('        const labelYs=',a2)
runtime=runtime[:a2]+'''        const selector=h('div',{className:'wb-metric-options wb-metric-selector'},MT_GROUPS.map(([category,title])=>{const entries=Object.entries(MT_CATALOG).filter(([,m])=>m.category===category);return h('details',{open:entries.some(([,m])=>metrics.some(r=>r.data.metricName===m.name))||undefined},h('summary',null,title+' · '+entries.length+'项'),entries.map(([id,m])=>{const key=names.find(key=>key.split(' · ')[0]===m.name);return h('label',{className:'wb-check-pill',key:id,title:key||(m.name+' · '+m.unit+' · 未记录')},h('input',{type:'checkbox','aria-label':key||(m.name+' · 未记录'),checked:!!key&&selectedKeys.includes(key),disabled:!key||(!selectedKeys.includes(key)&&selectedKeys.length>=4),onChange:()=>key&&toggleMetric(key)}),h('span',null,m.shortName||metricShortName(m.name)))}))}))
'''+runtime[b2:]
s=s[:a]+runtime+'\n'+s[b:]
# Confirmed prototype observations feed both metrics and one-chart views.
a=s.index('  for(const [key,series] of Object.entries(p.series))',s.index('function timelinePage(){'))
b=s.index('  p.events.forEach',a)
s=s[:a]+"  for(const row of mtObservations().filter(r=>r.state==='accepted'))records.push({id:row.id,kind:'metric',date:{precision:'day',value:row.date},data:{metricName:MT_CATALOG[row.key].name,unit:row.unit,rawValue:String(row.value),methodText:row.method,laboratoryText:row.laboratory},review:{state:'accepted'},source:{kind:'report',documentId:row.source}});\n"+s[b:]
s=s.replace("if(key==='hover'||key==='active'){timelinePrototypeHighlight();return}","if(key==='hover'){timelinePrototypeHighlight();return}")
s=s.replace(".wb-graph-event,.wb-event-tag'", ".wb-graph-event,.wb-event-tag,.wb-event-cluster'")
s=s.replace("records: ['资料库', '待核对草稿', '诊断与分期', '取材与检测', '指标检测'],", "records: ['资料库', '整理草稿 / 核对', '病情档案', '指标检测', '病情汇总'],")
a=s.index('function recordsPage() {');b=s.index('function docRowsHtml()',a)
s=s[:a]+'''function recordsPage() {
 const aliases={'待核对草稿':'整理草稿 / 核对','诊断与分期':'病情档案','取材与检测':'病情档案'};
 const sub=aliases[state.sub.records]||state.sub.records||'资料库';state.sub.records=sub;
 const body=sub==='资料库'?recordsLibrary():sub==='整理草稿 / 核对'?mtPending()+recordsCandidates():sub==='病情档案'?`<div class="stack"><details class="card" open><summary>诊断与分期</summary>${recordsStaging()}</details><details class="card" open><summary>肺癌取材、病理与分子检测</summary>${recordsSpecimen()}</details></div>`:sub==='指标检测'?recordsMetrics():mtSummary();
 return '<div class="mt-record-kicker">小肺宝 / 陪你一起理清肺癌旅程</div>'+head('病情整理',SUBTITLES.records,btn('准备问题清单','go','btn primary','data-page="review"'))+subnav('records')+body;
}

'''+s[b:]
a=s.index('function recordsMetrics() {');b=s.index('/* ============================================================\n   8.',a)
s=s[:a]+s[b:]
extra=(root/'docs/prototype/metric-trends-v427.js').read_text()
s=s.replace('const VIEWS = {',extra+'\nconst VIEWS = {',1)
css=(root/'docs/prototype/metric-trends-v427.css').read_text()
# Dense timeline classes only; avoid replacing the full original shell.
parity=(root/'assets/prototype-parity.css').read_text();css+='\n'+parity[parity.index('/* Dense histories'):]
s=s.replace('</head>','<style>\n'+css+'\n</style></head>',1)
s=s.replace("if(location.hash.slice(1) in VIEWS)state.page=location.hash.slice(1);", "const profileQuery=new URLSearchParams(location.search).get('profile');if(PROFILES.some(p=>p.id===profileQuery)){state.profile=profileQuery;state.metrics=Object.keys(current().series).filter(k=>METRICS[k]).slice(0,2)};\nif(location.hash==='#metrics'){state.page='records';state.sub.records='指标检测'}else if(location.hash.slice(1) in VIEWS)state.page=location.hash.slice(1);")
# Carry forward the developer-approved RC12 top bar, without reintroducing removed tools.
import re
toggle=re.search(r'<button class="prototype-ai-toggle"[\s\S]*?</button>',s).group(0)
s=s.replace(toggle,'',1)
header='<header class="prototype-host-header"><span class="prototype-host-brand">小肺宝 <span class="prototype-host-version">v4.2.7</span></span><span class="prototype-host-hint">HTML交互示意；右侧为原生会话位置，收起不清除草稿。</span><div class="prototype-host-actions"><button class="top-btn" data-action="settings" aria-label="打开设置">设置</button>'+toggle+'</div></header>'
s=s.replace('<div class="prototype-ai-frame">',header+'<div class="prototype-ai-frame">',1)
s=re.sub(r'<button class="prototype-ai-edge"[\s\S]*?</button>','',s,count=1)
s=re.sub(r'<header class="prototype-ai-toolbar">[\s\S]*?</header>','',s,count=1)
s=re.sub(r'<span><b>宽度</b><output id="prototype-ai-meta-width">.*?</output></span>','',s,count=1)
s=s.replace("agentEl('prototype-ai-width').addEventListener", "agentEl('prototype-ai-width')?.addEventListener")
s=s.replace("label.textContent=open?'隐藏 AI 对话':'AI 对话'", "label.textContent=open?'收起 AI 对话':'打开 AI 对话'")
(root/'docs/prototype/lung-workbench-v4.2.7.html').write_text(s)
print('Built docs/prototype/lung-workbench-v4.2.7.html; frozen v4.2.6 unchanged.')
