/* ============================================================
 * RC19 · 临床试验：匹配 / 检索 / 收藏与跟踪
 *
 * 这一屏的规矩（与三层信息边界一致）：
 *   ① 病理类型、分期、分子结果、系统治疗记录都是**档案里的字段**，每项写清「记录里是什么」；
 *   ② 登记条目来自本机快照（ClinicalTrials.gov 定向发现），逐条只对照**登记字段**，
 *      三态：符合 / 不符合 / 待确认；
 *   ③「符合度」是登记字段的粗筛比例，不是入排标准，更不是入组资格，也不预示效果。
 *      待确认按 0 计，所以只会偏低。
 *
 * 三个刻意的不做：
 *   · 本机快照**不收入排标准原文**，所以不假装逐条判过；浮窗里直接写「请到官方登记页核对」；
 *   · 药物靶点（DLL3 / B7-H3 / PD-1 / VEGF …）不是检测条件，**不参与打分**，只在浮窗单列；
 *   · 可对照项不足 2 条时**不给百分数**——一条病理对上就是 100%，那更像结论。
 * ============================================================ */

const TRIAL_STATUS_ZH = {
  RECRUITING: '正在招募', NOT_YET_RECRUITING: '尚未招募', ENROLLING_BY_INVITATION: '邀请入组',
  ACTIVE_NOT_RECRUITING: '进行中，不招募', COMPLETED: '已完成', SUSPENDED: '暂停',
  TERMINATED: '终止', WITHDRAWN: '撤回', AVAILABLE: '可获取', NO_LONGER_AVAILABLE: '不再可获取',
}
const TRIAL_PHASE_ZH = { EARLY_PHASE1: '早期 I 期', PHASE1: 'I 期', PHASE2: 'II 期', PHASE3: 'III 期', PHASE4: 'IV 期', NA: '不适用' }
const TRIAL_BAND = {
  high: ['字段都对得上', 'ok'], partial: ['部分对得上', 'warn'],
  needs_info: ['需补充信息', 'gray'], ineligible: ['硬性条件不满足', 'no'], thin: ['可对照项不足', 'gray'],
}
const TRIAL_TRACK_LABEL = { watching: '在跟', asking: '准备问', archived: '已归档' }
/* 只有这些位点算「报告里的检测条件」；其余是药物靶点，不参与打分。 */
const TRIAL_GENETIC_TARGETS = ['EGFR', 'ALK', 'ROS1', 'RET', 'MET', 'KRAS G12C', 'BRAF', 'HER2', 'NTRK', 'PD-L1']
const TRIAL_DRUG_TARGETS = ['DLL3', 'B7-H3', 'TROP2', 'HER3', 'VEGF', 'PD-1', 'CTLA-4', 'LAG-3', 'TIGIT', 'c-MET', 'SEZ6', 'CEACAM5', 'IMP3', 'Nectin-4']
const TRIAL_TARGET_PATTERN = {
  'EGFR': /\bEGFR\b/i, 'ALK': /\bALK\b/i, 'ROS1': /\bROS1\b/i, 'RET': /\bRET\b/i, 'MET': /\bMET\b/i,
  'KRAS G12C': /\bKRAS\b[^。；;\n]{0,24}G12C|\bG12C\b/i, 'BRAF': /\bBRAF\b/i,
  'HER2': /\bHER2\b|\bERBB2\b/i, 'NTRK': /\bNTRK\b/i, 'PD-L1': /PD-?L1/i,
}
/* 登记标题里的治疗场景：快照没有结构化字段，只能按标题关键词归类。
 * 从具体到笼统；一条都命中不了就写「未归类」，且**不生成**范围判据。 */
const TRIAL_SCENES = [
  [/limited[- ]stage/i, '局限期', null],
  [/extensive[- ]stage/i, '广泛期', null],
  [/neoadjuvant|pre-?operative|perioperative|before surgery/i, '早期可切除', 0],
  [/adjuvant|post-?operative|after (?:complete )?resection|after surgery/i, '早期可切除', 0],
  [/consolidation/i, '局部晚期', null],
  [/maintenance/i, '维持治疗', 1],
  [/screening|early detection|detection of|diagnostic (?:accuracy|study)/i, '筛查/诊断', null],
  [/first[- ]line|\b1L\b|treatment[- ]naive|previously untreated|untreated/i, '晚期/转移', 0],
  [/second[- ]line|third[- ]line|\b[23]L\b|relapsed|refractory|recurrent|previously treated|after progression|progressed on|after .{0,40}(?:failure|resistance|progression)|(?:TKI|chemotherapy|immunotherapy)[- ](?:failure|resistance)|salvage/i, '晚期/转移', 1],
  [/unresectable|locally advanced|stage III/i, '局部晚期', null],
  [/metastatic|advanced/i, '晚期/转移', null],
]

const trialToday = () => new Date().toLocaleDateString('sv-SE')
const trialNum = value => (value === null || value === undefined || value === '' ? '未捕获' : String(value))

/* ---------- 档案侧：把记录变成可对照的字段 ---------- */

const trialRecordText = record => [record.data?.histologyText, record.data?.resultText, record.data?.titleText,
  record.data?.testTypeText, record.data?.markerText, record.data?.originalText, record.data?.detailText]
  .filter(Boolean).join('。')

/* 分子结果按「。；」切句再逐句判断：整段扫描会把「检测项目清单」当成结果。 */
const trialGeneClauses = () => {
  const clauses = []
  for (const record of records) {
    if (!['molecular_test', 'biomarker', 'pathology'].includes(record.kind)) continue
    if (record.review?.state === 'rejected') continue
    const text = trialRecordText(record)
    if (!text) continue
    for (const part of text.split(/[。；;\n]/)) {
      const clause = part.trim()
      if (clause) clauses.push({ clause, status: record.data?.status || '', date: record.date?.value || '' })
    }
  }
  return clauses
}

const trialGeneState = clause => {
  if (/未开展|未检测|未列入|不常规|not tested/i.test(clause)) return '未开展'
  if (/待出|待报|结果未回|未见报告|待回示/.test(clause)) return '待出'
  if (/未检出|阴性|野生型|无突变|未见突变|不伴突变/.test(clause)) return '未检出'
  return '已报告'
}
const trialVariantOf = clause => {
  const named = clause.match(/[A-Z]\d{1,4}[A-Z](?:\s*(?:del|ins|dup))?/)
  if (named) return named[0]
  const other = clause.match(/TPS\s*\d+%|\d+(?:\.\d+)?%|扩增|融合|重排|缺失|插入|\bexon\s*\d+[a-z]?\b/)
  return other ? other[0] : ''
}

const trialGeneMap = () => {
  const clauses = trialGeneClauses()
  const genes = {}
  for (const target of TRIAL_GENETIC_TARGETS) {
    const hits = clauses.filter(item => TRIAL_TARGET_PATTERN[target].test(item.clause))
    if (!hits.length) continue
    const last = hits[hits.length - 1]
    const stated = trialGeneState(last.clause)
    genes[target] = {
      status: last.status === 'not_tested' && stated === '已报告' ? '未开展' : stated,
      change: trialVariantOf(last.clause),
      date: last.date,
      clause: last.clause,
    }
  }
  return genes
}

const trialHistOf = (typeText, clinicalType) => {
  if (/小细胞/.test(typeText) || clinicalType === 'sclc') return 'SCLC'
  if (/腺癌|鳞癌|大细胞|非小细胞|NSCLC|类癌/.test(typeText) || clinicalType === 'nsclc') return 'NSCLC'
  if (clinicalType === 'combined') return 'Mixed'
  return '待确认'
}
const trialScopeOf = text => {
  if (/广泛期/.test(text)) return '广泛期'
  if (/局限期/.test(text)) return '局限期'
  if (/术后|切除|根治|\bp?T[1-4][a-c]?[NM]/.test(text)) return '早期可切除'
  if (/M1[abc]?|Ⅳ|IV[ABC]?\s*期/.test(text)) return '晚期/转移'
  return '未定'
}

const trialFacts = () => {
  const diagnosis = latestOf(['diagnosis'])
  const pathology = latestOf(['pathology'])
  const staging = latestOf(['staging'])
  const typeText = [diagnosis?.data?.titleText, diagnosis?.data?.detailText,
    pathology?.data?.histologyText, pathology?.data?.titleText, pathology?.data?.originalText]
    .filter(Boolean).join('。')
  const hist = trialHistOf(typeText, diagnosis?.data?.clinicalType || '')
  const stageText = [staging?.data?.stageText, staging?.data?.tnmText, staging?.data?.prefixText].filter(Boolean).join(' · ')
  const scopeText = [stageText, diagnosis?.data?.detailText, pathology?.data?.originalText, pathology?.data?.titleText]
    .filter(Boolean).join('。')
  const therapies = records.filter(record => record.kind === 'systemic_therapy' && record.review?.state !== 'rejected')
  const taken = therapies.filter(record => !['proposed', 'cancelled'].includes(record.data?.status))
  const unstated = taken.filter(record => !record.data?.status || record.data?.status === 'unknown')
  return {
    hist, histText: pathology?.data?.histologyText || pathology?.data?.titleText || diagnosis?.data?.titleText || '',
    stage: stageText || '分期未记录', scope: trialScopeOf(scopeText),
    genes: trialGeneMap(),
    therapyCount: taken.length, unstatedCount: unstated.length,
    therapyText: taken.length ? taken.map(record => dataTitle(record)).slice(0, 4).join(' · ') : '没有药物治疗记录',
    hasCase: Boolean(caseFile),
  }
}

/* ---------- 登记侧：从快照字段派生 ---------- */

const trialSceneOf = title => {
  const text = String(title || '')
  for (const [pattern, scene, lines] of TRIAL_SCENES) {
    if (pattern.test(text)) return { scene, lines }
  }
  return { scene: '未归类', lines: null }
}
const trialTargetsOf = study => {
  const text = [study.title, ...(study.interventions || []), ...(study.conditions || [])].join(' ')
  /* 「EGFR Wildtype」这类登记要求的是该位点阴性/野生型，方向与「要求突变」相反，必须单独标出来，
     否则会把「要求野生型」的登记判成「位点对得上」。 */
  const negatedOf = target => {
    const pattern = new RegExp(TRIAL_TARGET_PATTERN[target].source, 'gi')
    let hit
    while ((hit = pattern.exec(text))) {
      const window = text.slice(hit.index, hit.index + 36)
      if (/wild[- ]?type|野生型|negative|未突变|没有突变|不伴突变/i.test(window)) return true
    }
    return false
  }
  return {
    genetic: TRIAL_GENETIC_TARGETS.filter(target => TRIAL_TARGET_PATTERN[target].test(text)),
    negated: TRIAL_GENETIC_TARGETS.filter(target => negatedOf(target)),
    drugs: TRIAL_DRUG_TARGETS.filter(target => new RegExp(`(^|[^A-Za-z0-9-])${target.replace(/-/g, '[- ]?')}([^A-Za-z0-9-]|$)`, 'i').test(text)),
  }
}
const trialCountriesOf = study => [...new Set((study.locations || [])
  .map(item => (item && typeof item === 'object' ? item.country : '')).filter(Boolean))]
const trialLocationsOf = study => (study.locations || [])
  .map(item => (typeof item === 'string' ? item : [item.facility, item.city, item.country].filter(Boolean).join(' · ')))
  .filter(Boolean).join('、') || '登记页未列出研究中心'
const trialStatusTextOf = study => TRIAL_STATUS_ZH[study.status] || study.status || '状态未报告'

/* ---------- 判据与打分 ---------- */

const trialHistCriterion = (study, facts) => {
  const need = `登记组织学：${study.histology || '未报告'}`
  const actual = `${facts.hist}（${facts.histText || '病理原文未记'}）`
  if (facts.hist === '待确认') {
    return { key: 'hist', cat: '病理类型', hard: true, state: 'unknown', need, actual: `病理类型还没确认（${facts.histText || '报告未归档'}）` }
  }
  if (!study.histology || study.histology === 'Lung cancer / other') {
    return { key: 'hist', cat: '病理类型', hard: true, state: 'unknown', actual, need: `登记组织学写得笼统：${study.histology || '未报告'}` }
  }
  return {
    key: 'hist', cat: '病理类型', hard: true,
    state: study.histology === facts.hist ? 'met' : 'unmet', need, actual,
    note: study.histology === 'Mixed' && facts.hist === 'NSCLC' ? '登记同时收混合分型，是否包含单纯腺癌要看方案原文' : '',
  }
}

const trialScopeCriterion = (study, facts) => {
  const scene = trialSceneOf(study.title)
  const actual = `记录里：${facts.stage} → ${facts.scope}（按记录文字推断）`
  /* 读不出场景也记一条待确认：不生成判据会让「只有病理一条」的登记拿到 100%。 */
  if (scene.scene === '未归类') {
    return {
      key: 'scope', cat: '疾病范围', hard: true, state: 'unknown',
      need: '登记标题没有写清疾病范围（未归入辅助 / 一线 / 后线 / 局限期等场景）', actual,
      note: '按标题读不出来，要看方案原文的入排条件',
    }
  }
  const base = { key: 'scope', cat: '疾病范围', hard: true, need: `登记场景：${scene.scene}（按登记标题推断，需核方案原文）` }
  if (scene.scene === '筛查/诊断') return { ...base, state: 'unknown', actual, note: '登记是筛查或诊断研究，不是治疗研究' }
  if (facts.scope === '未定') return { ...base, state: 'unknown', actual, note: '记录里没有能判断疾病范围的文字' }
  if (scene.scene === facts.scope) return { ...base, state: 'met', actual }
  const earlier = ['早期可切除', '局限期', '广泛期', '局部晚期']
  if (earlier.includes(scene.scene) && facts.scope === '晚期/转移') {
    return { ...base, state: 'unmet', actual, note: '登记收的是局限期或可切除人群，记录里是转移性疾病' }
  }
  if (['晚期/转移', '维持治疗'].includes(scene.scene) && facts.scope === '早期可切除') {
    return { ...base, state: 'unmet', actual, note: '登记收的是晚期或转移人群，记录里没有转移证据' }
  }
  return { ...base, state: 'unknown', actual, note: '两边的疾病范围说法不同，先核对是不是同一批人' }
}

const trialLineCriterion = (study, facts) => {
  const scene = trialSceneOf(study.title)
  if (scene.lines === null) return null
  const base = {
    key: 'lines', cat: '系统治疗记录', hard: true,
    need: scene.lines === 0 ? '登记要求：未接受过系统治疗（初治）' : '登记要求：至少 1 次既往系统治疗',
  }
  const actual = facts.therapyCount
    ? `记录里：${facts.therapyCount} 次药物治疗记录（${facts.therapyText}）`
    : '记录里：没有药物治疗记录'
  const support = '含骨转移用药等支持治疗记录，需逐条核对是否属于方案要求的既往系统治疗'
  if (scene.lines === 0) {
    return facts.therapyCount === 0
      ? { ...base, state: 'met', actual, note: '记录里没有系统治疗；如果实际做过但没记，这条要改' }
      : { ...base, state: 'unmet', actual, note: '已经有药物治疗记录，初治研究通常不收' }
  }
  return facts.therapyCount >= 1
    ? { ...base, state: 'met', actual, note: facts.unstatedCount ? `其中 ${facts.unstatedCount} 次状态未记录，是否实际执行要核对；${support}` : support }
    : { ...base, state: 'unmet', actual, note: '没有药物治疗记录，后线研究通常要求既往治疗' }
}

const trialGeneCriterion = (target, facts, negated) => {
  const gene = facts.genes[target]
  const base = {
    key: `gene:${target}`, cat: `标志物 ${target}`, hard: true,
    need: negated ? `登记要求 ${target} 为野生型 / 未突变` : `登记把 ${target} 写进入组条件`,
  }
  if (!gene) return { ...base, state: 'unknown', actual: `报告里没有 ${target} 这一项` }
  const actual = `${target} ${gene.status === '已报告' ? (gene.change || '已报告') : gene.status}（${gene.date || '日期未记'}）`
  if (negated) {
    if (gene.status === '已报告') {
      return { ...base, state: 'unmet', actual, note: '登记要求该位点为野生型，记录里报告了改变' }
    }
    if (gene.status === '未检出') return { ...base, state: 'met', actual }
    return { ...base, state: 'unknown', actual: `${target} ${gene.status}` }
  }
  if (gene.status === '已报告') return { ...base, state: 'met', actual, note: '只按位点名称对照，具体突变型是否匹配要看方案原文' }
  if (gene.status === '未检出') return { ...base, state: 'unmet', actual }
  if (gene.status === '未开展') return { ...base, state: 'unknown', actual }
  return { ...base, state: 'unknown', actual }
}

const trialCriteria = (study, facts) => {
  const list = [trialHistCriterion(study, facts)]
  const scope = trialScopeCriterion(study, facts)
  if (scope) list.push(scope)
  const line = trialLineCriterion(study, facts)
  if (line) list.push(line)
  const targets = trialTargetsOf(study)
  for (const target of targets.genetic) list.push(trialGeneCriterion(target, facts, targets.negated.includes(target)))
  return list
}

const trialScore = (study, facts) => {
  const crit = trialCriteria(study, facts)
  const countOf = status => crit.filter(item => item.state === status).length
  const met = countOf('met'), unmet = countOf('unmet'), unknown = countOf('unknown')
  const hardUnmet = crit.filter(item => item.state === 'unmet' && item.hard)
  const pct = Math.round((met / Math.max(1, crit.length)) * 100)
  /* 只有 1 条可对照项时不给百分数：病理对上就是 100%，看着像「最合适」。 */
  const band = crit.length < 2 ? 'thin'
    : hardUnmet.length ? 'ineligible'
      : pct >= 80 && unknown <= 1 ? 'high' : pct >= 55 ? 'partial' : 'needs_info'
  return { study, crit, met, unmet, unknown, pct, band, hardUnmet, scene: trialSceneOf(study.title), targets: trialTargetsOf(study) }
}

/* ---------- 收藏：本地三态，不写档案库 ---------- */

const trialSavedEntry = nctId => trialSaved.find(item => item.nctId === nctId)
const persistTrialSaved = list => { try { globalThis.localStorage?.setItem('xiaofeibao.trial-saved', JSON.stringify(list)) } catch {} }
const trialToggleSave = study => setTrialSaved(list => {
  const next = list.some(item => item.nctId === study.nctId)
    ? list.filter(item => item.nctId !== study.nctId)
    : [...list, { nctId: study.nctId, savedOn: trialToday(), state: 'watching', study }]
  persistTrialSaved(next)
  return next
})
const trialTrack = (nctId, trackState) => setTrialSaved(list => {
  const next = list.map(item => (item.nctId === nctId ? { ...item, state: trackState } : item))
  persistTrialSaved(next)
  return next
})

/* 候选池：匹配页只需要「按病理类型取回的一批」，不是全库扫描。 */
const loadTrialPool = async (histology, page) => {
  setTrialPool(previous => ({ ...previous, loading: true, error: '', histology }))
  try {
    const data = await api(`/trials/search?histology=${encodeURIComponent(histology)}&pageSize=50&page=${page}&sort=posted`)
    setTrialPool(previous => ({
      loading: false, error: '', histology, page,
      data: page > 1 && previous.data
        ? { ...data, studies: [...(previous.data.studies || []), ...(data.studies || [])] }
        : data,
    }))
  } catch (failure) {
    setTrialPool(previous => ({ ...previous, loading: false, error: failure.message }))
  }
}

const trialSheetOpener = { element: null }
const openTrialSheet = id => {
  try { trialSheetOpener.element = globalThis.document?.activeElement || null } catch {}
  setTrialSheetId(id)
}
const closeTrialSheet = () => {
  setTrialSheetId('')
  const opener = trialSheetOpener.element
  trialSheetOpener.element = null
  try { if (opener && globalThis.document?.contains?.(opener)) opener.focus() } catch {}
}

const trialAsk = score => {
  const pending = score.crit.filter(item => item.state === 'unknown')
  const text = pending.length
    ? `临床试验 ${score.study.nctId}：${pending.map(item => item.cat).join('、')} 这几项还没对上，需要逐条核对。`
    : `临床试验 ${score.study.nctId}：登记字段都能对上，仍要向研究中心确认是否适用。`
  addQuestion(text, `临床试验 ${score.study.nctId} · 字段对照`)
}

/* ---------- 渲染 ---------- */

const trialCritNode = criterion => h('div', { className: `wb-crit ${criterion.state}`, key: criterion.key },
  h('div', { className: 'wb-crit-line' },
    h('span', { className: 'wb-crit-mark', 'aria-hidden': true }, criterion.state === 'met' ? '✓' : criterion.state === 'unmet' ? '✕' : '?'),
    h('b', null, criterion.cat),
    h('span', { className: 'wb-muted' }, criterion.hard ? '硬性' : '非硬性')),
  h('p', null, criterion.need || ''),
  h('small', null, h('b', null, criterion.state === 'met' ? '符合' : criterion.state === 'unmet' ? '不符合' : '待确认'),
    ` · ${criterion.actual}${criterion.note ? ` · ${criterion.note}` : ''}`))

const trialCritBlock = (score, limit) => {
  const order = { unmet: 0, unknown: 1, met: 2 }
  const sorted = score.crit.slice().sort((a, b) => order[a.state] - order[b.state])
  const top = limit ? sorted.slice(0, limit) : sorted
  const rest = limit ? sorted.slice(limit) : []
  return h(React.Fragment, null,
    h('div', { className: 'wb-crit-list' }, top.map(trialCritNode)),
    rest.length
      ? h('details', { className: 'wb-crit-more' },
        h('summary', null, `其余 ${rest.length} 条对照项`),
        h('div', { className: 'wb-crit-list' }, rest.map(trialCritNode)))
      : null)
}

const trialFitNode = (score, className = 'wb-trial-fit') => {
  const [label, tone] = TRIAL_BAND[score.band]
  return h('div', { className: `${className} ${tone}` },
    score.band === 'thin' ? h('b', null, '—') : h('b', null, score.pct, h('small', null, '%')),
    h('span', null, score.band === 'thin' ? '可对照的字段' : '登记字段符合度'),
    h('em', null, label))
}

const trialCard = score => {
  const study = score.study
  const saved = trialSavedEntry(study.nctId)
  return h('section', { className: `wb-trial-card${score.band === 'ineligible' ? ' is-bad' : ''}`, key: study.nctId },
    h('div', { className: 'wb-trial-top' },
      h('div', { className: 'wb-trial-main' },
        h('div', { className: 'wb-trial-tags' },
          pill(trialStatusTextOf(study), /RECRUITING|ENROLLING/.test(study.status || '') ? 'green' : ''),
          pill(TRIAL_PHASE_ZH[study.phase] || study.phase || '阶段未报告', ''),
          pill(score.scene.scene === '未归类' ? '场景未归类' : score.scene.scene, ''),
          trialCountriesOf(study).includes('China') ? pill('登记含中国中心', 'blue') : null),
        h('h3', { className: 'wb-trial-title' }, study.title || '登记标题未报告'),
        h('p', { className: 'wb-trial-reg' }, [study.nctId, study.sponsor || '申办方未报告',
          trialCountriesOf(study).slice(0, 3).join(' / ') || '地区未报告'].join(' · '))),
      trialFitNode(score)),
    h('div', { className: 'wb-trial-counts' },
      pill(`符合 ${score.met}`, 'green'),
      score.unmet ? pill(`不符合 ${score.unmet}`, 'orange') : null,
      score.unknown ? pill(`待确认 ${score.unknown}`, '') : null),
    trialCritBlock(score, 4),
    h('div', { className: 'wb-trial-actions' },
      h('button', { type: 'button', className: `wb-button${saved ? ' soft' : ' primary'}`, onClick: () => trialToggleSave(study) },
        saved ? `已收藏（${TRIAL_TRACK_LABEL[saved.state] || '在跟'}）` : '收藏并跟踪'),
      h('button', { type: 'button', className: 'wb-button', onClick: () => trialAsk(score) }, '把待确认项加进问题清单'),
      h('button', { type: 'button', className: 'wb-button', onClick: () => openTrialSheet(study.nctId) }, '看登记详情')),
    h('p', { className: 'wb-trial-foot' },
      '符合度 = 符合项 ÷ 对照项（含待确认）。待确认按 0 计，所以只会偏低、不会偏高。只对照登记的结构化字段：',
      h('b', null, '入排标准原文、体能状态、器官功能、洗脱期、中心名额都不在其中'),
      '，所以这不是入组资格，也不代表效果。'))
}

const trialSheetNode = score => {
  const study = score.study
  const [label, tone] = TRIAL_BAND[score.band]
  const saved = trialSavedEntry(study.nctId)
  const facts = [
    ['申办方', study.sponsor || '未报告', '登记页字段'],
    ['计划入组', study.enrollment ? `${study.enrollment} 人` : '未捕获', '人数为登记值'],
    ['开始日期', trialNum(study.startDate), study.startDateType ? `精度：${study.startDateType}` : '精度可能为年 / 月'],
    ['研究地区', trialCountriesOf(study).join(' / ') || '未报告', '按登记的研究中心归类'],
    ['干预', (study.interventions || []).slice(0, 4).join(' · ') || '未报告', '含对照与支持治疗'],
    ['登记提到的标志物', score.targets.genetic.join(' · ') || '未提到',
      score.targets.negated.length ? `其中 ${score.targets.negated.join('、')} 要求野生型 / 未突变` : '标志物是入组条件，参与逐条对照'],
    ['登记提到的药物靶点', score.targets.drugs.join(' · ') || '未提到', '药物打哪里，不等于你的检测条件，不参与打分'],
  ]
  return h('div', { className: 'wb-sheet-wrap is-open' },
    h('div', { className: 'wb-sheet-backdrop', onClick: closeTrialSheet, 'aria-hidden': true }),
    h('aside', { className: 'wb-sheet', role: 'dialog', 'aria-modal': true, 'aria-label': '临床试验登记详情' },
      h('header', { className: 'wb-sheet-head' },
        h('div', null,
          h('span', { className: 'wb-eyebrow' }, `ClinicalTrials.gov · 本机快照 ${study.retrievedAt || ''}`.trim()),
          h('h2', null, study.title || '登记标题未报告')),
        h('button', { type: 'button', className: 'wb-sheet-close', 'aria-label': '关闭详情', onClick: closeTrialSheet }, '×')),
      h('div', { className: 'wb-sheet-body' },
        h('div', { className: 'wb-trial-tags' },
          pill(study.nctId, 'blue'), pill(study.histology || '组织学未报告', ''),
          pill(TRIAL_PHASE_ZH[study.phase] || study.phase || '阶段未报告', ''),
          pill(score.scene.scene === '未归类' ? '场景未归类' : score.scene.scene, ''),
          pill(trialStatusTextOf(study), /RECRUITING|ENROLLING/.test(study.status || '') ? 'green' : '')),
        h('div', { className: `wb-sheet-fit ${tone}` },
          score.band === 'thin' ? h('b', null, '—') : h('b', null, score.pct, h('small', null, '%')),
          h('span', null, score.band === 'thin' ? '可对照的字段不足 2 条，不打分' : '登记字段符合度'),
          h('em', null, label)),
        h('div', { className: 'wb-trial-counts' },
          pill(`符合 ${score.met}`, 'green'), score.unmet ? pill(`不符合 ${score.unmet}`, 'orange') : null,
          score.unknown ? pill(`待确认 ${score.unknown}`, '') : null),
        h('h3', null, '登记信息（原文要点）'),
        h('div', { className: 'wb-fact-grid' },
          facts.map(([key, value, source]) => h('dl', { key },
            h('dt', null, key), h('dd', null, h('b', null, value), h('span', null, source))))),
        h('h3', null, '与我的档案逐条对照'),
        trialCritBlock(score, 0),
        h('h3', null, '入组 / 排除条件原文'),
        infoBox('本机快照只存登记的结构化字段，没有收入排标准原文。体能状态、器官功能、既往病史、洗脱期、中心名额都不在这里判断——请打开官方登记页核对，或由研究中心当面评估。'),
        h('p', { className: 'wb-muted wb-small' }, '这份对照只描述「档案里记了什么」与「登记写了什么」，不判断能否入组，也不预测效果。'),
        h('p', { className: 'wb-muted wb-small' }, `研究中心：${trialLocationsOf(study)}`)),
      h('footer', { className: 'wb-sheet-foot' },
        h('button', { type: 'button', className: `wb-button${saved ? ' soft' : ' primary'}`, onClick: () => trialToggleSave(study) },
          saved ? '取消收藏' : '收藏并跟踪'),
        h('button', { type: 'button', className: 'wb-button', onClick: () => trialAsk(score) }, '待确认项加进问题清单'),
        h('a', { className: 'wb-button', href: `https://clinicaltrials.gov/study/${study.nctId}`, target: '_blank', rel: 'noreferrer' }, '打开官方登记页 ↗'),
        h('button', { type: 'button', className: 'wb-button', onClick: closeTrialSheet }, '关闭'))))
}

/* ---------- 三个子页 ---------- */

const trialFactGrid = facts => h('div', { className: 'wb-fact-grid' },
  [['病理类型', facts.hist === '待确认' ? '待确认' : facts.hist, facts.histText || '病理原文未记'],
    ['分期', facts.stage, '来自分期或诊断记录原文'],
    ['疾病范围', facts.scope, '按记录文字推断，未定就写未定'],
    ['系统治疗记录', `${facts.therapyCount} 次`, facts.therapyText],
    ['分子结果', `${Object.keys(facts.genes).length} 个位点`,
      Object.keys(facts.genes).length
        ? Object.entries(facts.genes).map(([gene, item]) => `${gene} ${item.status === '已报告' ? (item.change || '阳性') : item.status}`).join(' · ')
        : '报告里没有治疗相关位点'],
    ['可及地区（偏好）', trialPrefRegion === 'all' ? '不限' : '中国大陆', '偏好只影响排序与冲突提示，不进分数']]
    .map(([key, value, source]) => h('dl', { key },
      h('dt', null, key), h('dd', null, h('b', null, value), h('span', null, source)))))

const trialMatchPage = () => {
  const facts = trialFacts()
  if (!facts.hasCase) {
    return card('还没有建立本机资料档案', h('div', { className: 'wb-stack' },
      h('p', null, '匹配是「登记字段 ↔ 记录里的字段」逐条对照出来的。没有档案就没有可对照的东西，这里不生成占位分数。'),
      h('div', { className: 'wb-actions' },
        button('＋ 建立本机资料档案', () => setShowNewCase(true), 'wb-button primary'),
        button('先去检索看有哪些登记', () => setSub('trials', '检索')))))
  }
  /* 病理类型还没确认时不排名：这时的分数只会把「没记录」算成待确认，
     0% 附近看不出东西，反而容易被当成结论。 */
  if (facts.hist === '待确认') {
    return h(React.Fragment, null,
      infoBox(h('span', null, h('b', null, '病理类型还没确认，这里先不排名。'),
        '匹配分数逐条对照「登记字段 ↔ 记录里已有的字段」。病理没定、分期没写的时候，分数只会贴在 0 附近，看不出任何东西，反而像结论。')),
      card('现在档案里有什么', trialFactGrid(facts)),
      card('补齐之后才能对照的三件事', h('div', { className: 'wb-stack' },
        bulletList(['病理报告：组织学类型（NSCLC / SCLC）与亚型，来自病理报告原文。',
          '分期：TNM 与分期字母（I–IV），来自分期记录或出院小结。',
          '分子检测：EGFR / ALK / ROS1 / RET / MET / KRAS / PD-L1 的结果与检测日期。']),
        h('div', { className: 'wb-actions' },
          button('去病情整理补资料', () => setPage('records'), 'wb-button primary'),
          button('先去检索看有哪些登记', () => setSub('trials', '检索'))))))
  }

  const hist = facts.hist
  const matches = (trialPool.data?.studies || []).map(study => trialScore(study, facts))
  const visible = matches.filter(item => trialPrefRegion === 'all' || trialCountriesOf(item.study).includes('China'))
  const fit = visible.filter(item => item.band !== 'ineligible' && item.band !== 'thin')
    .sort((a, b) => b.pct - a.pct || a.unknown - b.unknown || String(b.study.startDate || '').localeCompare(String(a.study.startDate || '')))
  const thin = visible.filter(item => item.band === 'thin')
  const bad = visible.filter(item => item.band === 'ineligible')
  const loaded = trialPool.data?.studies?.length || 0
  const total = trialPool.data?.total ?? 0
  const canMore = Boolean(trialPool.data) && loaded < total && !trialPool.loading

  return h(React.Fragment, null,
    infoBox(h('span', null, h('b', null, '这里的条目是本机快照的登记字段，不是入排标准原文。'),
      '按「病理类型 / 疾病范围 / 系统治疗记录 / 标志物」逐条对照成三态；入排标准原文、体能状态、器官功能、中心名额都不在快照里，必须到官方登记页或研究中心核对。')),
    card('用来对照的档案字段', h('div', { className: 'wb-stack' },
      trialFactGrid(facts),
      h('div', { className: 'wb-trial-pref' },
        h('span', null, '可及地区偏好'),
        segment([['all', '不限'], ['China', '中国大陆']], trialPrefRegion, value => setTrialPrefRegion(value), '可及地区'),
        h('span', { className: 'wb-muted wb-small' }, '只改变排序与冲突提示，不改变任何一条「符合 / 不符合」。')))),
    h('div', { className: 'wb-trial-round' },
      h('div', null, h('b', null, String(fit.length)), h('span', null, '条字段能对上')),
      h('div', null, h('b', null, String(bad.length)), h('span', null, '条硬性条件不满足')),
      h('div', null, h('b', null, String(fit.reduce((sum, item) => sum + item.unknown, 0))), h('span', null, '项待确认 · 在卡片里逐条列出'))),
    h('div', { className: 'wb-trial-poolbar' },
      h('span', { className: 'wb-muted wb-small' },
        `候选池：最近发布的 ${loaded} / ${total || '若干'} 条 ${hist} 登记（按首次登记日期）。匹配不是全库扫描，想找特定条件用「检索」。`),
      trialPool.error ? h('div', { className: 'wb-alert', role: 'alert' }, trialPool.error) : null,
      trialPool.loading ? h('span', { role: 'status', className: 'wb-muted wb-small' }, '正在读取本机快照…') : null,
      canMore ? button(`再载入 50 条（已载 ${loaded} / ${total}）`, () => loadTrialPool(hist, (trialPool.page || 1) + 1), 'wb-button soft') : null),
    fit.length
      ? h('div', null, fit.map(trialCard))
      : infoBox('当前条件下没有可对照的条目。放宽地区偏好，或到「检索」里按条件找。'),
    thin.length
      ? h('details', { className: 'wb-crit-more' },
        h('summary', null, `可对照项不足的 ${thin.length} 条（登记标题没写清疾病范围或治疗线数，只有病理一条能对）`),
        h('div', { style: { marginTop: 10 } }, thin.map(trialCard)))
      : null,
    bad.length
      ? h('details', { className: 'wb-crit-more' },
        h('summary', null, `硬性条件不满足的 ${bad.length} 条（点开看是哪一条挡住了）`),
        h('div', { style: { marginTop: 10 } }, bad.map(trialCard)))
      : null)
}

const trialChannels = [['snapshot', '内置登记库', '本机 SQLite · 可离线检索'], ['live', 'ClinicalTrials.gov', '用户触发 · 在线登记'],
  ['veeva', 'Veeva CTV', '外部发现入口'], ['chictr', 'ChiCTR / 中国登记', '尚未接通'], ['ictrp', 'WHO ICTRP', '尚未接通']]

const trialSearchPage = () => {
  const facts = trialFacts()
  const online = trialChannel === 'live'
  const studies = trialResult?.studies || []
  const total = trialResult?.total ?? studies.length
  const pageSize = trialResult?.pageSize || 20
  const clear = () => {
    setTrialQuery(''); setTrialHistology(''); setTrialStatus(''); setTrialPhase(''); setTrialCountry('')
    setTrialTarget(''); setTrialSort('start'); setTrialResult(null); setTrialError('')
  }
  return h(React.Fragment, null,
    infoBox(h('span', null, h('b', null, '检索是「按条件找」，不是「替你挑」。'),
      '检索只按条目本身的字段筛选，排序按你选的条件，不按匹配分数重排。「与我相关」的判断在「匹配」里，用的是当前档案。两者分开，是为了让你能看见「与我无关但存在」的选项。')),
    card('多通道', h('div', { className: 'wb-stack' },
      h('div', { className: 'wb-channel-bar' }, trialChannels.map(([id, title, desc]) => h('button', {
        className: 'wb-channel', key: id, type: 'button', 'aria-pressed': trialChannel === id,
        onClick: () => {
          if (['snapshot', 'live'].includes(id)) { setTrialChannel(id); setTrialResult(null); setTrialError('') }
          else if (id === 'veeva') setTrialError('Veeva 是外部发现入口，尚未接入本站结果；请使用本页的 Veeva 链接。')
          else setTrialError(`${title} 尚未授权接入，可使用内置登记库。`)
        },
      }, h('b', null, title), h('small', null, desc),
        pill(id === 'snapshot' ? (trialResult?.snapshot ? `${total} 条匹配` : '本机可用')
          : id === 'live' ? '按需检索' : id === 'veeva' ? '外部入口' : '待配置', '')))),
      h('p', { className: 'wb-muted wb-small' }, '各通道如实标记来源；外部链接只接收检索词，不发送任何档案内容。'))),
    card('检索条件', h('form', { className: 'wb-form', onSubmit: event => { event.preventDefault(); searchTrials(1) } },
      h('label', { className: 'wb-field full' }, h('span', null, '关键词 / 靶点 / 药物 / NCT 编号'),
        h('input', { value: trialQuery, onChange: event => setTrialQuery(event.target.value), placeholder: '例如 EGFR、DLL3、CAR-T、NCT 编号', 'aria-label': '临床试验搜索关键词' })),
      select(trialHistology, setTrialHistology, [['', '全部类型'], ['NSCLC', 'NSCLC'], ['SCLC', 'SCLC'], ['Mixed', '混合分型'], ['Lung cancer / other', '肺癌 / 其他']], '病理类型'),
      select(trialPhase, setTrialPhase, [['', '全部阶段'], ['PHASE1', 'I 期'], ['PHASE2', 'II 期'], ['PHASE3', 'III 期'], ['PHASE4', 'IV 期']], '研究阶段'),
      select(trialStatus, setTrialStatus, [['', '全部状态'], ...Object.entries(TRIAL_STATUS_ZH).map(([key, label]) => [key, label])], '招募状态'),
      select(trialTarget, setTrialTarget, [['', '全部靶点'], ...TRIAL_GENETIC_TARGETS.map(item => [item, item])], '标志物 / 靶点'),
      h('label', { className: 'wb-field' }, h('span', null, '研究地区'),
        h('input', { value: trialCountry, onChange: event => setTrialCountry(event.target.value), placeholder: '例如 China', 'aria-label': '招募地区筛选', disabled: online })),
      select(trialSort, setTrialSort, [['start', '开始日期（新→旧）'], ['posted', '首次登记日期（新→旧）'], ['id', '登记编号'], ['phase', '研究阶段']], '排序'),
      h('div', { className: 'wb-actions wb-field full' },
        h('button', { className: 'wb-button primary', type: 'submit', disabled: trialLoading }, trialLoading ? '检索中…' : '开始检索'),
        button('清空', clear)),
      online ? h('p', { className: 'wb-muted wb-small wb-field full' }, '在线通道使用关键词、病理与靶点；地区、状态、阶段与排序请在官方登记页核对。') : null)),
    card('登记结果', h('div', { className: 'wb-stack' },
      trialError ? h('div', { className: 'wb-alert', role: 'alert' }, trialError) : null,
      trialLoading ? h('p', { role: 'status' }, '正在检索…') : null,
      trialResult
        ? h('p', { className: 'wb-muted wb-small' },
          `${online ? 'ClinicalTrials.gov 在线' : '本机登记快照'} · ${total} 条匹配 · ${trialResult.snapshot?.retrievedDate || trialResult.retrievedAt || ''}`)
        : h('p', { className: 'wb-muted' }, '设置检索条件后开始搜索；未检索不伪造结果。'),
      studies.length
        ? h('div', null, studies.map(study => trialCard(trialScore(study, facts))))
        : trialResult && !trialLoading
          ? h('div', { className: 'wb-empty' }, '没有匹配登记。可换关键词或调整筛选；也可能是快照未覆盖，不代表登记库里没有。')
          : null,
      !online && trialResult && total > pageSize
        ? h('div', { className: 'wb-actions' },
          h('button', { className: 'wb-button', disabled: trialPage <= 1, onClick: () => searchTrials(trialPage - 1) }, '上一页'),
          h('span', null, `第 ${trialPage} 页 · 每页 ${pageSize} 条`),
          h('button', { className: 'wb-button', disabled: trialPage * pageSize >= total, onClick: () => searchTrials(trialPage + 1) }, '下一页'))
        : null)))
}

const trialSavedPage = () => {
  const facts = trialFacts()
  const list = trialSaved.map(item => item.study).filter(Boolean).map(study => trialScore(study, facts))
  const active = list.filter(item => (trialSavedEntry(item.study.nctId) || {}).state !== 'archived')
  const archived = list.filter(item => (trialSavedEntry(item.study.nctId) || {}).state === 'archived')
  const savedCard = score => {
    const study = score.study
    const entry = trialSavedEntry(study.nctId) || { savedOn: '日期未记', state: 'watching' }
    const pending = score.crit.filter(item => item.state === 'unknown').slice(0, 3)
    return h('section', { className: 'wb-trial-card', key: study.nctId },
      h('div', { className: 'wb-trial-top' },
        h('div', { className: 'wb-trial-main' },
          h('div', { className: 'wb-trial-tags' },
            pill(`收藏于 ${entry.savedOn}`, ''),
            pill(TRIAL_TRACK_LABEL[entry.state] || entry.state, entry.state === 'asking' ? 'orange' : ''),
            pill(trialStatusTextOf(study), '')),
          h('h3', { className: 'wb-trial-title' }, study.title || '登记标题未报告'),
          h('p', { className: 'wb-trial-reg' }, [study.nctId, score.scene.scene,
            trialCountriesOf(study).join(' / ') || '地区未报告'].join(' · '))),
        trialFitNode(score)),
      h('div', { className: 'wb-crit-list' },
        pending.length
          ? pending.map(item => h('div', { className: 'wb-crit unknown', key: item.key },
            h('div', { className: 'wb-crit-line' },
              h('span', { className: 'wb-crit-mark', 'aria-hidden': true }, '?'), h('b', null, item.cat)),
            h('small', null, item.actual)))
          : h('p', { className: 'wb-muted wb-small' }, '没有待确认项。')),
      h('div', { className: 'wb-trial-actions' },
        h('button', { type: 'button', className: 'wb-button', onClick: () => trialTrack(study.nctId, 'asking') }, '标为准备问'),
        h('button', { type: 'button', className: 'wb-button', onClick: () => trialAsk(score) }, '加进问题清单'),
        h('button', { type: 'button', className: 'wb-button', onClick: () => openTrialSheet(study.nctId) }, '看登记详情'),
        h('button', { type: 'button', className: 'wb-button', onClick: () => trialTrack(study.nctId, 'archived') }, '归档'),
        h('button', { type: 'button', className: 'wb-button', onClick: () => trialToggleSave(study) }, '取消收藏')))
  }
  return h(React.Fragment, null,
    infoBox(h('span', null, h('b', null, '这里跟的是「这条登记的现状」，不是「我该不该去」。'),
      '收藏只是把它放在一起看；状态、中心、截止日期的变化以官方登记页为准，本机快照不自动更新。三态（在跟 / 准备问 / 已归档）是手工标记，没有登记状态变化时间线。')),
    active.length
      ? h('div', null, active.map(savedCard))
      : h('div', { className: 'wb-empty' }, '还没有收藏的试验。在「匹配」或「检索」里点「收藏并跟踪」，条目会出现在这里。'),
    archived.length
      ? h('details', { className: 'wb-crit-more' },
        h('summary', null, `已归档 ${archived.length} 条`),
        h('div', { style: { marginTop: 10 } }, archived.map(savedCard)))
      : null)
}

const trialsPage = () => {
  const sub = subOf('trials') || '匹配'
  const actions = sub === '收藏与跟踪'
    ? h('div', { className: 'wb-actions' }, button('去检索', () => setSub('trials', '检索'), 'wb-button'))
    : h('div', { className: 'wb-actions' },
      button('检查更新', () => setShowSettings(true), 'wb-button'),
      button('清空条件', () => { setTrialQuery(''); setTrialResult(null); setTrialError('') }, 'wb-button'))
  const body = sub === '检索' ? trialSearchPage() : sub === '收藏与跟踪' ? trialSavedPage() : trialMatchPage()
  const study = trialSheetId
    ? [...(trialPool.data?.studies || []), ...(trialResult?.studies || []), ...trialSaved.map(item => item.study)]
      .filter(Boolean).find(item => item.nctId === trialSheetId)
    : null
  return h('div', { className: 'wb-page wb-trial-page' },
    head('临床试验登记', SUBTITLES.trials, actions),
    subnavFor('trials'),
    body,
    study ? trialSheetNode(trialScore(study, trialFacts())) : null)
}
