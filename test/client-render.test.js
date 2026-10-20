import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const clientSource = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
const demos = JSON.parse(readFileSync(new URL('../lib/demo-cases.json', import.meta.url), 'utf8'))

// 状态槽位按组件里 React.useState 的声明顺序编号。新增状态时同步改这里，
// 并把下方 hookCount 改成新的总数，避免测试悄悄错位到别的状态。
const HOOK = {
  page: 0, large: 1, dark: 2, health: 3, cases: 4, caseFile: 5, loading: 6, busy: 7, error: 8, toast: 9,
  newName: 10, newRole: 11, showNewCase: 12, showCasePicker: 13, showComposer: 14, subPage: 15, subs: 16,
  kept: 17, pack: 18, reviewRange: 19, favTrials: 20, docFilter: 21, docType: 22, qOverride: 23, form: 24,
  trialQuery: 25, trialHistology: 26, trialChannel: 27, trialResult: 28, trialLoading: 29, trialError: 30,
  trialPage: 31, flipped: 32, selectedMetrics: 33, showSettings: 34, settingsTab: 35, trialStatus: 36,
  trialPhase: 37, trialCountry: 38, showNativeConversation: 39, nativePaneWidth: 40, showAgentContext: 41,
  agentQuestion: 42, agentSelectedIds: 43, agentDraft: 44, agentDraftRevision: 45, agentDraftCaseId: 46,
  agentShareConsent: 47,
}
const hookCount = 70

const sampleCase = {
  schemaVersion: 1, id: 'case-1', workspaceId: 'workspace-1', subjectId: 'subject-1', displayName: '演示病例',
  subjectRole: 'patient', revision: 1, createdAt: '2026-01-01T00:00:00.000Z', decisions: [],
  records: [{ id: 'r1', kind: 'metric', subjectId: 'subject-1', date: { precision: 'day', value: '2026-01-01' },
    source: { kind: 'report', documentId: 'demo-lab-report' }, data: { metricName: 'CEA', rawValue: '3.2', unit: 'ng/mL' },
    review: { state: 'accepted', revision: 2 }, createdBy: 'subject-1', createdAt: '2026-01-01T00:00:00.000Z' }],
}

function loadPanel(host = {}) {
  const definition = {}
  const stored = new Map()
  const effects = []
  const hookState = new Map()
  const refs = []
  const localStorage = {
    getItem(key) { return stored.get(key) ?? null },
    setItem(key, value) { stored.set(key, String(value)) },
  }
  const window = { __ModuleLoader__: { load(input) { Object.assign(definition, input) } } }
  vm.runInNewContext(clientSource, { window, localStorage, setTimeout: () => 0 })
  const React = {
    Fragment: Symbol('Fragment'),
    createElement(type, props, ...children) { return { type, props: props || {}, children } },
    useCallback(fn) { return fn }, useEffect(fn) { effects.push(fn) }, useRef(initial) { const index = refIndex++; return refs[index] || (refs[index] = { current: initial }) },
    useState(initial) {
      const index = hookIndex++
      if (overrides.has(index)) hookState.set(index, overrides.get(index))
      if (!hookState.has(index)) hookState.set(index, typeof initial === 'function' ? initial() : initial)
      return [hookState.get(index), value => hookState.set(index, typeof value === 'function' ? value(hookState.get(index)) : value)]
    },
  }
  let Panel
  const services = { effect(fn) { fn() }, ...host,
    desktopWorkbenches: { register(_config, component) { Panel = component }, ...(host.desktopWorkbenches || {}) },
  }
  definition.factory(() => React).apply(services)
  let hookIndex = 0
  let refIndex = 0
  let overrides = new Map()
  const render = (state = {}, props = {}) => {
    hookIndex = 0
    refIndex = 0
    overrides = new Map(Object.entries(state).map(([index, value]) => [Number(index), value]))
    effects.length = 0
    return Panel(props)
  }
  render.flushEffects = () => effects[1]?.()
  render.storage = stored
  render.services = services
  return render
}

function flatten(node, result = []) {
  if (Array.isArray(node)) { for (const child of node) flatten(child, result); return result }
  if (!node || typeof node !== 'object' || !('type' in node)) return result
  result.push(node)
  for (const child of node.children || []) flatten(child, result)
  return result
}

const textOf = node => typeof node === 'string' ? node : Array.isArray(node) ? node.map(textOf).join(' ') : node?.children?.map(textOf).join(' ') || ''
const textOfTree = tree => textOf(tree)

const base = (page, caseFile, extra = {}) => ({ [HOOK.page]: page, [HOOK.health]: { version: 'test' }, [HOOK.cases]: [], [HOOK.caseFile]: caseFile, [HOOK.loading]: false, ...extra })

test('hook slot map still matches the component state order', () => {
  const declared = clientSource.match(/const \[(\w+), *set\w+\] *= *React\.useState/g) || []
  assert.equal(declared.length, hookCount, '更新 HOOK 与本行期望值后再继续')
  const render = loadPanel()
  const tree = render(base('records', sampleCase))
  assert.match(textOfTree(tree), /病情整理/, 'HOOK.page must point at the page state')
  const demoTree = render(base('dashboard', demos[0]))
  assert.match(textOfTree(demoTree), /合成演示/, 'HOOK.caseFile must point at the case state')
})

test('two synthetic cases activate dashboard, lung-specific sections, and independent metric trends', () => {
  assert.equal(demos.length, 6)
  const demo = demos[0]
  const render = loadPanel()
  const dashboard = render(base('dashboard', demo))
  const dashboardText = textOfTree(dashboard)
  assert.match(dashboardText, /合成演示/)
  assert.match(dashboardText, new RegExp(`${demo.records.length}条记录`))
  const timeline = render(base('timeline', demo))
  const nodes = flatten(timeline)
  assert.ok(nodes.filter(node => node.type === 'svg' && String(node.props?.className || '').includes('wb-linechart')).length >= 1)
  assert.ok(nodes.some(node => node.type === 'circle'), 'metrics have clickable plotted values')
  const clinical = render(base('clinical', demo))
  const clinicalText = textOfTree(clinical)
  assert.match(clinicalText, /治疗历程/)
  const firstTherapy = demo.records.find(record => record.kind === 'systemic_therapy')
  assert.ok(clinicalText.includes(firstTherapy.data.titleText), 'treatment records reach the clinical page')
  assert.equal(demos[0].records.filter(record => record.kind === 'lesion').length, 2)
})

test('timeline cards flip back with the same identity and keyboard data points open a source dialog', () => {
  const render = loadPanel(), demo = demos[0]
  let tree = render(base('timeline', demo))
  flatten(tree).find(n => n.props?.className === 'wb-flip').props.onClick({ target: { closest: () => null } })
  tree = render()
  assert.ok(flatten(tree).some(n => n.props?.className === 'wb-flip' && n.props['data-flipped'] === true))
  assert.ok(flatten(tree).some(n => n.type === 'svg' && n.props.className === 'wb-card-trend'), 'card reverse contains a real metric chart')
  const card = flatten(tree).find(n => n.props?.className === 'wb-flip')
  assert.ok(!flatten(card).some(n => n.type === 'button'), 'card flips without action buttons')
  const point = flatten(card).find(n => n.type === 'circle' && n.props.role === 'button'); let stopped = false
  point.props.onClick({ stopPropagation() { stopped = true } })
  assert.equal(stopped, true, 'source point does not bubble into card flip')
  flatten(tree).find(n => n.type === 'button' && n.children.includes('重播趋势动画')).props.onClick()
  tree = render()
  assert.ok(flatten(tree).some(n => n.props?.className === 'wb-flip' && n.props['data-flipped'] === true), 'replay preserves flip state')
  flatten(tree).find(n => n.props?.className === 'wb-flip').props.onClick({ target: { closest: () => null } })
  tree = render()
  assert.ok(flatten(tree).every(n => n.props?.className !== 'wb-flip' || !n.props['data-flipped']))
  flatten(tree).find(n => n.type === 'circle' && n.props.role === 'button').props.onKeyDown({ key: 'Enter', preventDefault() {} })
  tree = render()
  assert.ok(flatten(tree).some(n => n.props?.role === 'dialog' && n.props['aria-label'] === '病程记录与来源详情'))
})

test('archive view offers real file intake including HEIC and a separate output-file list', () => {
  const render = loadPanel(), tree = render(base('archives', sampleCase))
  const input = flatten(tree).find(n => n.type === 'input' && n.props.type === 'file')
  assert.ok(input); assert.match(input.props.accept, /\.heic/); assert.match(input.props.accept, /\.docx/)
  assert.equal(input.props.disabled, false)
  assert.ok(flatten(tree).some(n => n.type === 'button' && n.children.includes('导出文件')))
})

test('case switcher exposes both demo profiles and opens the selected demo without storage writes', () => {
  const render = loadPanel()
  const tree = render(base('dashboard', null, { [HOOK.showCasePicker]: true }))
  const choices = flatten(tree).filter(node => node.type === 'button' && node.props?.onClick && demos.some(demo => demo.id === node.props.key))
  assert.equal(choices.length, 6)
  choices[1].props.onClick()
  const opened = render()
  const text = textOfTree(opened)
  assert.match(text, /合成演示资料 · 只读/)
  assert.ok(text.includes(demos[1].displayName), 'the opened demo name is rendered')
  assert.equal(render.storage.has('xiaofeibao.patient-data'), false)
})

test('empty timeline provides a direct demo-case entry point', () => {
  const render = loadPanel()
  const tree = render(base('timeline', null))
  const button = flatten(tree).find(node => node.type === 'button' && node.children.includes('选择演示病例以查看曲线'))
  assert.ok(button)
  button.props.onClick()
  const picker = flatten(render()).find(node => node.props?.className === 'wb-card' && node.props?.style?.position === 'absolute')
  assert.ok(picker, 'opens the case picker directly over the empty timeline')
})

test('single-file client includes the supplied brand image and renders every page and sub-page', () => {
  const render = loadPanel()
  const pages = ['dashboard', 'records', 'timeline', 'clinical', 'nutrition', 'mind', 'care', 'review', 'saved', 'trials', 'settings', 'archives']
  for (const page of pages) {
    const tree = render(base(page, sampleCase))
    const nodes = flatten(tree)
    assert.ok(nodes.length > 20, `${page} renders a substantive view`)
    assert.ok(nodes.some(node => node.type === 'img' && String(node.props.src).startsWith('data:image/png;base64,')), 'uses the approved brand logo')
    assert.ok(nodes.some(node => node.props?.className === 'wb-main'), `${page} renders in the workbench shell`)
  }
  const subPages = {
    records: ['资料库', '待核对草稿', '诊断与分期', '取材与检测', '指标检测'],
    clinical: ['治疗历程', '分子与 PD-L1', '靶向药与知识', '转移与再评估'],
    nutrition: ['当下困扰', '进食与体重', '建议与回顾'],
    mind: ['当下感受', '我的记录', '支持资源', '私密话题', '照护者自己'],
    care: ['症状与日常', '免疫治疗相关变化', '咯血与联系', '胸腔穿刺与引流', '术后活动', '放疗进度'],
  }
  for (const [page, tabs] of Object.entries(subPages)) {
    for (const tab of tabs) {
      const tree = render(base(page, demos[0], { [HOOK.subs]: { [page]: tab } }))
      const nodes = flatten(tree)
      const nav = nodes.filter(node => node.type === 'button' && tabs.includes(node.children?.[0]))
      assert.ok(nav.length >= tabs.length, `${page} exposes all sub-tabs`)
      assert.ok(nodes.length > 20, `${page} · ${tab} renders a substantive view`)
      assert.ok(!textOfTree(tree).includes('undefined undefined'), `${page} · ${tab} has no undefined text`)
    }
  }
})

test('records page keeps the review queue, staging table and metric groups working', () => {
  const render = loadPanel()
  const candidateCase = { ...sampleCase, records: sampleCase.records.map(record => ({ ...record, review: { state: 'candidate', revision: 1 } })) }
  const queue = render(base('records', candidateCase, { [HOOK.subs]: { records: '待核对草稿' } }))
  assert.ok(flatten(queue).some(node => node.type === 'button' && node.children.includes('确认这条记录')), 'review queue offers an explicit accept action')
  assert.match(textOfTree(queue), /不代表医学上正确/)
  const staging = render(base('records', demos[0], { [HOOK.subs]: { records: '诊断与分期' } }))
  assert.match(textOfTree(staging), /病理与分期原文/)
  const metricsTab = render(base('records', demos[0], { [HOOK.subs]: { records: '指标检测' } }))
  assert.ok(flatten(metricsTab).some(node => node.props?.className === 'wb-flip wb-record-metric-card'), 'metric groups render as 3D cards')
  assert.match(textOfTree(metricsTab), /按指标类型自动分类/)
  assert.doesNotMatch(textOfTree(metricsTab), /按时间排列的指标记录/)
})

test('nutrition weight sub-page draws the recorded weight series instead of a placeholder', () => {
  const render = loadPanel()
  const tree = render(base('nutrition', demos[0], { [HOOK.subs]: { nutrition: '进食与体重' } }))
  const chart = flatten(tree).find(node => node.type === 'svg' && String(node.props?.className || '').includes('wb-weight-svg'))
  assert.ok(chart, 'weight chart renders when the case has weight records')
  assert.ok(flatten(chart).some(node => node.type === 'circle'), 'weight points are plotted')
  const empty = render(base('nutrition', sampleCase, { [HOOK.subs]: { nutrition: '进食与体重' } }))
  assert.match(textOfTree(empty), /还没有体重记录/)
})

test('dashboard exposes lung-cancer tasks and honest empty states without a case file', () => {
  const render = loadPanel()
  const tree = render(base('dashboard', null))
  const nodes = flatten(tree)
  const text = textOfTree(tree)
  for (const label of ['穿刺 / 病理 / 基因检测', '手术、药物与放疗', '搜索临床试验', '尚未记录', '未记录不等于阴性']) assert.ok(text.includes(label), `dashboard includes ${label}`)
  assert.equal(nodes.filter(node => node.props?.className === 'wb-task-entry').length, 8)
  assert.ok(nodes.some(node => node.props?.className === 'wb-dashboard-grid'))
})

test('native DSH conversation is rendered at the right with an accessible 25–45% splitter', () => {
  const render = loadPanel()
  const nativeConversation = { type: 'native-conversation', props: {}, children: [] }
  const tree = render(base('dashboard', null, { [HOOK.showNativeConversation]: true, [HOOK.nativePaneWidth]: 35 }), { conversation: nativeConversation })
  const frame = flatten(tree).find(node => node.props?.className === 'wb-frame')
  assert.ok(frame)
  assert.equal(frame.children[0].props.className, 'wb-shell', 'business workbench stays before the right pane')
  const splitter = frame.children.find(child => child?.props?.role === 'separator')
  const pane = frame.children.find(child => child?.props?.id === 'wb-ai-pane')
  assert.ok(splitter && pane, 'splitter and pane are both mounted')
  assert.ok(frame.children.indexOf(splitter) < frame.children.indexOf(pane), 'pane sits to the right of the splitter')
  assert.equal(splitter.props['aria-valuemin'], 25)
  assert.equal(splitter.props['aria-valuemax'], 45)
  assert.equal(pane.children.at(-1).children[0], nativeConversation, 'uses the host conversation node')
  const styles = flatten(tree).find(node => node.type === 'style').children[0]
  assert.match(styles, /min-width:620px\) and \(max-width:760px\)/)
  assert.match(styles, /\.wb-top-actions\{width:100%/)
  const hide = flatten(tree).find(node => node.type === 'button' && node.props?.id === 'wb-ai-open')
  assert.ok(hide, 'header offers a hide control outside the pane')
  splitter.props.onKeyDown({ key: 'End', preventDefault() {} })
  const resized = flatten(render({}, { conversation: nativeConversation })).find(node => node.props?.id === 'wb-ai-pane')
  assert.equal(resized.props.style.flexBasis, '45%')
  hide.props.onClick()
  const collapsed = flatten(render({}, { conversation: nativeConversation }))
  const collapsedPane = collapsed.find(node => node.props?.id === 'wb-ai-pane')
  assert.ok(collapsedPane, 'collapsing keeps the pane mounted so the host draft survives')
  assert.equal(collapsedPane.props.style.display, 'none', 'collapsed pane is hidden with display, not unmounted')
  assert.ok(collapsed.some(node => node.props?.id === 'wb-ai-open'), 'collapsed state reopens from the top-right header')
  assert.ok(!collapsed.some(node => node.props?.className === 'wb-ai-edge'), 'no floating edge launcher')
  assert.ok(!collapsed.some(node => node.props?.className === 'wb-ai-stepper' || node.props?.className === 'wb-ai-toolbar'), 'native pane has no custom toolbar or width controls')
  assert.equal(tree.children[0].type,'header')
  assert.equal(tree.children[0].props.className,'wb-host-topbar')
})

test('native session is lazy, deduplicated on concurrent open, and uses the host conversation node', async () => {
  let currentSession = null
  let createCount = 0
  const input = { setDraft: async () => {}, state: { getSnapshot: () => ({ phase: 'plain', draft: '' }) } }
  const render = loadPanel({
    desktopWorkbenches: {
      isActive: () => true,
      currentSession: () => currentSession,
      ownsSession: id => id === 'session-for-lung-workbench',
      async ensureSession() { createCount += 1; await Promise.resolve(); currentSession = 'session-for-lung-workbench'; return currentSession },
    },
    uiWorkspace: { pickDirectory: async () => '/user-selected-workspace' },
    sessions: { scope: () => ({ get: () => ({ input: { for: () => input } }) }) },
  })
  const initial = render(base('dashboard', null))
  assert.equal(createCount, 0, 'rendering does not create an AI session')
  const open = flatten(initial).find(node => node.type === 'button' && node.children.includes('打开 AI 助手'))
  const first = open.props.onClick()
  const second = open.props.onClick()
  assert.equal(flatten(render()).find(n=>n.props?.id==='wb-ai-open').children[0],'正在连接…')
  await Promise.all([first, second])
  assert.equal(createCount, 1, 'concurrent explicit opens share one session creation')
  const nativeConversation = { type: 'native-conversation', props: {}, children: [] }
  const updated = render({}, { conversation: nativeConversation })
  assert.ok(flatten(updated).some(node => node.props?.id === 'wb-ai-pane'))
  assert.ok(flatten(updated).includes(nativeConversation), 'the pane renders the host node, not an app-made chat')
})

test('AI context preview includes only selected confirmed records and excludes symptom/private and candidate rows', () => {
  const render = loadPanel()
  const symptom = { ...sampleCase.records[0], id: 'private-symptom', kind: 'symptom', data: { topicText: 'private note', patientWords: 'private' } }
  const candidate = { ...sampleCase.records[0], id: 'candidate-test', kind: 'molecular_test', data: { testTypeText: 'EGFR', status: 'completed' }, review: { state: 'candidate', revision: 1 } }
  const caseFile = { ...sampleCase, records: [...sampleCase.records, symptom, candidate] }
  const tree = render(base('dashboard', caseFile, { [HOOK.showAgentContext]: true, [HOOK.agentQuestion]: '这项指标可以如何理解？', [HOOK.agentSelectedIds]: ['r1'] }))
  const nodes = flatten(tree)
  assert.equal(nodes.filter(node => node.props?.className === 'wb-agent-record').length, 1)
  const previewButton = nodes.find(node => node.type === 'button' && node.children.includes('生成并预览本次内容'))
  assert.ok(previewButton)
  assert.ok(!nodes.some(node => node.type === 'button' && node.children.includes('确认后发送到原生 AI')), 'send action appears only after preview')
  previewButton.props.onClick()
  const preview = flatten(render()).find(node => node.type === 'pre' && node.props?.className === 'wb-agent-preview')
  assert.ok(preview)
  const previewText = preview.children.join(' ')
  assert.match(previewText, /CEA/)
  assert.doesNotMatch(previewText, /private note|EGFR/)
})

test('AI context dialog explains missing case records and native-host file attachment path', () => {
  const render = loadPanel()
  let tree = render(base('dashboard', null, { [HOOK.showAgentContext]: true }))
  let text = textOfTree(tree)
  assert.match(text, /还没有选择病例档案/)
  assert.match(text, /报告原件可在档案管理导入/)
  assert.match(text, /DSH 原生对话/)
  tree = render(base('dashboard', demos[0], { [HOOK.showAgentContext]: true }))
  text = textOfTree(tree)
  assert.match(text, /只读演示档案/)
  assert.match(text, /不会出现在 AI 可选列表/)
})

test('AI share refuses to overwrite an existing native draft', async () => {
  let setDraftCount = 0
  const input = { setDraft: async () => { setDraftCount += 1 }, state: { getSnapshot: () => ({ phase: 'plain', draft: '已有输入' }) } }
  const render = loadPanel({
    desktopWorkbenches: { isActive: () => true, currentSession: () => 'owned-session', ownsSession: id => id === 'owned-session' },
    sessions: { scope: () => ({ get: () => ({ input: { for: () => input } }) }) },
  })
  const tree = render(base('dashboard', null, {
    [HOOK.showAgentContext]: true, [HOOK.agentDraft]: '已预览的问题草稿', [HOOK.agentDraftRevision]: null,
    [HOOK.agentDraftCaseId]: null, [HOOK.agentShareConsent]: true,
  }))
  const send = flatten(tree).find(node => node.type === 'button' && node.children.includes('确认后发送到原生 AI'))
  assert.ok(send)
  await send.props.onClick()
  assert.equal(setDraftCount, 0, 'existing text remains untouched')
})

test('record composition renders the composer form from state without a patient-data mock', () => {
  const render = loadPanel()
  const tree = render(base('records', sampleCase, { [HOOK.showComposer]: true, [HOOK.subs]: { records: '待核对草稿' } }))
  assert.ok(flatten(tree).some(node => node.type === 'form' && node.props.onSubmit))
  assert.ok(flatten(tree).some(node => node.type === 'button' && node.children.includes('保存为待核对记录')))
})

test('configuration dialog exposes six prototype-aligned sections with honest integration states', () => {
  const render = loadPanel()
  const tree = render(base('dashboard', sampleCase, { [HOOK.showSettings]: true, [HOOK.settingsTab]: 'clinic' }))
  const nodes = flatten(tree)
  assert.ok(nodes.some(node => node.props?.role === 'dialog' && node.props['aria-modal'] === true))
  assert.equal(nodes.filter(node => node.props?.role === 'tab').length, 6)
  const rendered = textOfTree(tree)
  assert.match(rendered, /内置肺癌快照/)
  assert.match(rendered, /805 条近 9 个月肺癌相关候选/)
  assert.match(rendered, /采集日 2026-10-18/)
  assert.match(rendered, /未接通/)
})

test('display preferences persist locally without saving patient data', () => {
  const render = loadPanel()
  render({ [HOOK.large]: true, [HOOK.dark]: true })
  render.flushEffects()
  assert.equal(render.storage.get('xiaofeibao.display-preferences'), JSON.stringify({ large: true, dark: true, agentPaneWidth: 35 }))
  assert.equal(render.storage.size, 1)
})


test('narrow native pane isolates the background and Escape hides without unmounting the host', () => {
  const render = loadPanel()
  const nativeConversation = { type:'native-conversation',props:{},children:[] }
  const tree=render(base('dashboard',null,{[HOOK.showNativeConversation]:true,69:700}),{conversation:nativeConversation})
  const nodes=flatten(tree),pane=nodes.find(n=>n.props?.id==='wb-ai-pane')
  assert.equal(pane.props.role,'dialog')
  assert.equal(pane.props['aria-modal'],true)
  assert.equal(nodes.find(n=>n.props?.className==='wb-shell').props.inert,true)
  assert.equal(nodes.find(n=>n.props?.role==='separator').props.tabIndex,-1)
  pane.props.onKeyDown({key:'Escape',stopPropagation(){}})
  const hidden=flatten(render({}, {conversation:nativeConversation}))
  assert.equal(hidden.find(n=>n.props?.id==='wb-ai-pane').props.style.display,'none')
  assert.ok(hidden.includes(nativeConversation))
})


test('108-record SCLC timeline keeps the trend above dense history and preserves source records',()=>{
  const demo=demos.find(d=>d.id==='demo-sclc-chemo-rt-6m'),render=loadPanel()
  const tree=render(base('timeline',demo,{[HOOK.selectedMetrics]:['NSE']})),nodes=flatten(tree)
  const plot=nodes.find(n=>n.props?.className==='wb-linechart wb-combined-chart')
  assert.ok(plot)
  assert.equal(plot.props.viewBox,'0 0 1000 292','plot height is independent of event count')
  assert.ok(nodes.some(n=>n.props?.className==='wb-event-rail'))
  const list=nodes.find(n=>n.props?.className==='wb-event-date-list')
  assert.ok(list)
  const sourceButtons=flatten(list).filter(n=>n.props?.className==='wb-event-record')
  assert.ok(sourceButtons.length>20,'all dense history remains available below the plot')
  sourceButtons[0].props.onClick()
  assert.ok(flatten(render()).some(n=>n.props?.role==='dialog'&&n.props['aria-label']==='病程记录与来源详情'))
})


test('record metrics group automatically, flip independently and open original sources without changing face',()=>{
 const render=loadPanel(),demo=demos[0]
 let tree=render(base('records',demo,{[HOOK.subs]:{records:'指标检测'}})),nodes=flatten(tree)
 const sections=nodes.filter(n=>n.props?.className==='wb-metric-category-section')
 assert.ok(sections.some(n=>n.props['data-category']==='coagulation'))
 assert.ok(sections.some(n=>n.props['data-category']==='infection'))
 const cards=nodes.filter(n=>n.props?.className==='wb-flip wb-record-metric-card');assert.ok(cards.length>5)
 cards[0].props.onClick({target:{closest:()=>null}})
 tree=render();let updated=flatten(tree).filter(n=>n.props?.className==='wb-flip wb-record-metric-card')
 assert.equal(updated.filter(c=>c.props['data-flipped']).length,1)
 const point=flatten(updated[0]).find(n=>n.type==='circle'&&n.props.role==='button');assert.ok(point)
 let stopped=false;point.props.onClick({stopPropagation(){stopped=true}});assert.equal(stopped,true)
 tree=render();assert.ok(flatten(tree).some(n=>n.props?.role==='dialog'&&n.props['aria-label']==='病程记录与来源详情'))
 assert.equal(flatten(tree).filter(n=>n.props?.className==='wb-flip wb-record-metric-card'&&n.props['data-flipped']).length,1)
 updated=flatten(tree).filter(n=>n.props?.className==='wb-flip wb-record-metric-card')
 updated[0].props.onKeyDown({key:'Enter',target:'card',currentTarget:'card',preventDefault(){}})
 assert.equal(flatten(render()).filter(n=>n.props?.className==='wb-flip wb-record-metric-card'&&n.props['data-flipped']).length,0)
})
