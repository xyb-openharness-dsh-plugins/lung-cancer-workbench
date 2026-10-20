// 与 v4.2.3 原型对齐的共用版式组件（由 scripts/embed-client-logo.mjs 注入客户端作用域）。
// 只负责呈现结构，不产生医学判断。

const pill = (text, tone = '') => h('span', { className: `wb-tag ${tone}` }, text)
const tagRow = (items) => h('div', { className: 'wb-tags' }, items.map(([t, c]) => pill(t, c)))

const sectionHeading = (title, sub, right) => h('div', { className: 'wb-section-heading' },
  h('h2', null, title),
  sub ? h('p', { className: 'wb-muted wb-small' }, sub) : null,
  right || null)

const priorityList = (items) => h('div', { className: 'wb-priority-list' },
  items.map(([title, desc], i) => h('div', { className: 'wb-priority', key: `${i}-${title}` },
    h('span', { className: 'wb-priority-num', 'aria-hidden': true }, String(i + 1)),
    h('div', null, h('b', null, title), h('p', null, desc)))))

const statBox = (label, value, small, tone = '') => h('div', { className: `wb-dashboard-stat ${tone}`.trim() },
  h('span', null, label), h('strong', null, value), h('small', null, small))

const statGrid = (boxes) => h('div', { className: 'wb-dashboard-stat-grid' }, boxes)

const infoBox = (body, tone = '') => h('div', { className: `wb-info-box ${tone}`.trim() }, body)

const keyRow = (title, desc, right) => h('div', { className: 'wb-key-row' },
  h('div', null, h('b', null, title), h('p', null, desc)),
  right || null)

const plainRow = (title, desc, right) => h('div', { className: 'wb-plain-row' },
  h('div', null, h('b', null, title), desc ? h('p', null, desc) : null),
  right || null)

const bulletList = (items) => h('ul', { className: 'wb-bullets' }, items.map((t, i) => h('li', { key: i }, t)))

const chipRow = (items) => h('div', { className: 'wb-chip-row' }, items)

const checkPill = (label, checked, onChange) => h('label', { className: 'wb-check-pill' },
  h('input', { type: 'checkbox', checked: !!checked, onChange: e => onChange && onChange(e.target.checked) }),
  h('span', null, label))

const actionPill = (label, onClick) => h('button', { type: 'button', className: 'wb-check-pill wb-action-pill', onClick }, label)

const simpleTable = (headers, rows, foot) => h('div', { className: 'wb-card-table' },
  h('table', { className: 'wb-table' },
    h('thead', null, h('tr', null, headers.map((t, i) => h('th', { key: i, scope: 'col' }, t)))),
    h('tbody', null, rows.map((row, r) => h('tr', { key: r },
      row.map((cell, c) => h('td', { key: c }, cell)))))),
  foot ? h('p', { className: 'wb-muted wb-small', style: { marginTop: 8 } }, foot) : null)

const segment = (options, value, onChange, label) => h('div', { className: 'wb-segmented', role: 'group', 'aria-label': label || '选项' },
  options.map(([v, text]) => h('button', { key: v, type: 'button', 'aria-pressed': value === v, onClick: () => onChange(v) }, text)))

const subnavFor = (page) => h('div', { className: 'wb-subnav' },
  (SUBPAGES[page] || []).map(tab => h('button', {
    key: tab, type: 'button', 'aria-pressed': subOf(page) === tab,
    onClick: () => setSub(page, tab),
  }, tab)))

const bodyRow = (title, desc, extra, right) => h('div', { className: 'wb-body-row' },
  h('div', { className: 'wb-body-main' }, h('b', null, title), desc ? h('p', null, desc) : null, extra || null),
  right || null)

// 体重趋势：与原型一致的 440×112 折线，单点不连线，缺失不补零。
const weightSvg = (points) => {
  const pts = (points || []).filter(p => Number.isFinite(Number(p.value)))
  if (!pts.length) return h('div', { className: 'wb-empty' }, '还没有体重记录。可以不填，缺失不会被记成 0。')
  const w = 440, hgt = 112, padL = 40, padR = 12, padT = 14, padB = 22
  const vals = pts.map(p => Number(p.value))
  const min = Math.min(...vals) - 1, max = Math.max(...vals) + 1
  const span = (max - min) || 1
  const x = i => pts.length === 1 ? w / 2 : padL + (i * (w - padL - padR)) / (pts.length - 1)
  const y = v => padT + ((max - v) / span) * (hgt - padT - padB)
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(Number(p.value)).toFixed(1)}`).join(' ')
  return h(React.Fragment, null,
    h('svg', { className: 'wb-weight-svg', viewBox: `0 0 ${w} ${hgt}`, role: 'img', 'aria-label': '体重变化示意' },
      h('line', { className: 'wb-wgrid', x1: padL, x2: w - padR, y1: padT + 6, y2: padT + 6 }),
      h('line', { className: 'wb-wgrid', x1: padL, x2: w - padR, y1: hgt - padB, y2: hgt - padB }),
      h('text', { x: 2, y: padT + 9 }, max.toFixed(1)),
      h('text', { x: 2, y: hgt - padB + 2 }, min.toFixed(1)),
      pts.length > 1 ? h('path', { className: 'wb-wcurve', d }) : null,
      pts.map((p, i) => h('circle', { key: p.day, cx: x(i).toFixed(1), cy: y(Number(p.value)).toFixed(1), r: 4.2 })),
      h('text', { x: padL, y: hgt - 5 }, String(pts[0].day).slice(2)),
      h('text', { x: w - padR, y: hgt - 5, textAnchor: 'end' }, String(pts[pts.length - 1].day).slice(2))),
    pts.length === 1 ? h('p', { className: 'wb-muted wb-small', style: { marginTop: 2 } }, '只有一个记录点，不连线。') : null)
}

// 按来源层级取最近一条正文
const latestOf = (kinds) => [...records].sort((a, b) => String(b.date?.value || '').localeCompare(String(a.date?.value || '')))
  .find(record => kinds.includes(record.kind))

const domainRecords = (domain) => records.filter(record => record.data?.domain === domain)
const sortedByDate = (list, desc = true) => [...list].sort((a, b) => {
  const x = String(a.date?.value || ''), y = String(b.date?.value || '')
  return desc ? y.localeCompare(x) : x.localeCompare(y)
})

const metricSeries = (name) => sortedByDate(records.filter(r => r.kind === 'metric' && r.data?.metricName === name
  && Number.isFinite(Number(r.data?.rawValue)) && r.date?.precision !== 'unknown'), false)
  .map(r => ({ day: r.date.value, value: Number(r.data.rawValue), unit: r.data.unit || '', record: r }))

const questionRecords = () => {const own=sortedByDate(kindRecords(['visit_question']),false);return own.length?own:(caseFile?.referenceProfile?.questionList||[]).map((q,i)=>({id:'reference-question-'+i,kind:'visit_question',data:{questionText:q.text,selected:q.selected},date:{precision:'unknown'},source:{kind:'patient_reported',documentId:q.source||null}}))}
const questionState = (q) => {
  const override = qOverride[q.id]
  return {
    text: override && override.text != null ? override.text : (q.data?.questionText || q.data?.topicText || ''),
    selected: override && override.selected != null ? override.selected : q.data?.selected !== false,
    hidden: Boolean(override && override.hidden),
  }
}
const toggleQuestion = (id, current) => setQOverride(prev => ({ ...prev, [id]: { ...prev[id], selected: !current } }))
const editQuestion = (id, text) => setQOverride(prev => ({ ...prev, [id]: { ...prev[id], text } }))
const dropQuestion = (id) => setQOverride(prev => ({ ...prev, [id]: { ...prev[id], hidden: true } }))
const addQuestion = (text, source = '自己写下') => {
  if (isDemoCase || !caseFile) { notify('演示档案不写入；可以在本机档案里添加问题。'); return }
  setForm(f => ({ ...f, kind: 'visit_question', title: text.slice(0, 60), detail: text, sourceId: source, datePrecision: 'day', date: new Date().toISOString().slice(0, 10) }))
  setShowComposer(true)
}

const pendingRecords = () => records.filter(r => ['candidate', 'needs_review'].includes(r.review?.state))
const acceptedRecords = () => records.filter(r => r.review?.state === 'accepted')
const confirmedDocs = () => acceptedRecords().filter(r => !['symptom', 'care_task'].includes(r.kind))
const gapRows = () => pendingRecords().length?pendingRecords().map(r => ({
  text: dataTitle(r),
  why: dataDetail(r) || `来源：${r.source?.documentId || '未注明'} · ${statusText(r)}`,
  state: statusText(r),
  record: r,
})):(caseFile?.referenceProfile?.gaps||[])

// 各页共用的一次性录入入口：只预填类型与标题，保存仍走 composer 的待核对流程。
const startRecord = (kind, title = '', extra = {}) => {
  if (isDemoCase || !caseFile) { notify('演示档案为只读；请先切换到本机档案再记录。'); return }
  setForm(f => ({ ...f, kind, title, detail: '', site: '', specimenId: '', status: 'unknown', sourceId: '',
    datePrecision: 'day', date: new Date().toISOString().slice(0, 10), ...extra }))
  setShowComposer(true)
}

const parseFractions = (value) => {
  const n = parseInt(String(value ?? '').replace(/[^\d-]/g, ''), 10)
  return Number.isFinite(n) ? n : null
}

const cfgRow = (title, desc, right) => h('div', { className: 'wb-cfg-row' },
  h('div', null, h('b', null, title), h('p', null, desc)),
  h('div', { className: 'wb-nowrap' }, right))

// SVG paths are fixed design assets, never document/model content.
const prototypeIcons={"home": "<path d=\"M4 10.6 12 4l8 6.6V20a1 1 0 0 1-1 1h-4.6v-6H9.6v6H5a1 1 0 0 1-1-1Z\"/>", "folder": "<path d=\"M3.5 7.6a2 2 0 0 1 2-2h3.1l1.6 2h7.7a2 2 0 0 1 2 2v7.8a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2Z\"/>", "chart": "<path d=\"M4 19.5V4.5M4 19.5h16\"/><path d=\"M7.5 15.8 11 11l3 2.4 4.2-5.6\"/>", "cross": "<rect x=\"3.6\" y=\"3.6\" width=\"16.8\" height=\"16.8\" rx=\"4.2\"/><path d=\"M12 8v8M8 12h8\"/>", "apple": "<path d=\"M12 8.2c-2.8-2.4-6.8-.2-6.8 4.1 0 4.2 3.2 8.2 6.8 6.4 3.6 1.8 6.8-2.2 6.8-6.4 0-4.3-4-6.5-6.8-4.1Z\"/><path d=\"M12 8.2V5.4c0-1.4 1-2.1 2.1-2.1\"/>", "heart": "<path d=\"M12 20s-7.2-4.4-7.2-9.2A4.1 4.1 0 0 1 12 8.2a4.1 4.1 0 0 1 7.2 2.6C19.2 15.6 12 20 12 20Z\"/>", "pulse": "<path d=\"M3 12.4h3.2L8.4 6l3.4 11.4 2.4-6.6 1.8 3.2H21\"/>", "calendar": "<rect x=\"3.6\" y=\"5.2\" width=\"16.8\" height=\"15.2\" rx=\"3\"/><path d=\"M8 3v4M16 3v4M3.6 10h16.8\"/><path d=\"M9.2 15.2l2 2 3.8-3.9\"/>", "bookmark": "<path d=\"M6.5 4.2h11a1 1 0 0 1 1 1V21l-6.5-4.2L5.5 21V5.2a1 1 0 0 1 1-1Z\"/><path d=\"M9 9.4h6\"/>", "search": "<circle cx=\"11\" cy=\"11\" r=\"6.4\"/><path d=\"M15.8 15.8 20.5 20.5\"/>", "note": "<path d=\"M6 3.8h8.4L19 8.4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.8a1 1 0 0 1 1-1Z\"/><path d=\"M14 3.8V9h5\"/><path d=\"M8.5 13h7M8.5 16.5h4.5\"/>", "flask": "<path d=\"M9 3.5h6M10 3.5v6L5.4 17a2.2 2.2 0 0 0 1.9 3.3h9.4a2.2 2.2 0 0 0 1.9-3.3L14 9.5v-6\"/><path d=\"M7.4 14h9.2\"/>", "shield": "<path d=\"M12 3.5 19 6v6.2c0 4.2-2.9 7.3-7 8.3-4.1-1-7-4.1-7-8.3V6Z\"/><path d=\"M9.4 12.2l1.9 1.9 3.4-3.5\"/>", "archives": "<path d=\"M3.5 7.6a2 2 0 0 1 2-2h3.1l1.6 2h7.7a2 2 0 0 1 2 2v7.8a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2Z\"/>"}
const navIcon = name => h('svg',{viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.6,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true,dangerouslySetInnerHTML:{__html:prototypeIcons[name]||prototypeIcons.folder}})
