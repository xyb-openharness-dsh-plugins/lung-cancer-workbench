// 36 号 v2 · 疾病概要（整页视图）+ 看板首卡「D+N 状态卡」
// 数据来自 docs/prototype/primer-data.js（构建期注入 PRIMER_DATA），样式来自 docs/prototype/primer.css。
// 三层信息边界：本段只做「解释」——定义、文件、指南列举过的手段、已发生的事实；
// 任何与你有关的判断固定出口为「这一句需要问你的医生」。
const primerSections = Array.isArray(PRIMER_DATA?.sections) ? PRIMER_DATA.sections : []
const primerHref = value => {
  const text = typeof value === 'string' ? value.trim() : ''
  return /^https:\/\//i.test(text) ? text : ''
}
const primerLink = (url, label, extra) => h('a', { className: 'dp-link', href: url, target: '_blank', rel: 'noopener noreferrer', ...extra }, label)
/* §2.5：原件列必须是可点链接；没链接就红标指出违规，不编 URL。 */
const primerSourceLine = (source, key) => {
  if (!source) return null
  const head = [source.org, source.doc].filter(Boolean).join(' · ')
  const tail = []
  if (source.version) tail.push(source.version)
  const url = primerHref(source.url), secondary = primerHref(source.secondaryUrl)
  if (!source.nolink) {
    if (source.original) {
      tail.push(url
        ? primerLink(url, '原件已取得 · 打开/下载 ↗')
        : h('span', { className: 'dp-miss' }, '原件已取得（缺链接，违反 36 号 §2.5）'))
    } else {
      tail.push(secondary
        ? primerLink(secondary, '未取得原件，据二次来源 ↗')
        : h('span', { className: 'dp-miss' }, '未取得原件，据二次来源（缺二次链接，违反 36 号 §2.5）'))
    }
  }
  if (source.page) tail.push('页码 ' + source.page)
  if (source.note) tail.push(source.note)
  return h('span', { key, className: 'dp-src-item' }, head,
    tail.length ? '（' : '',
    ...tail.flatMap((piece, index) => index ? [' · ', piece] : [piece]),
    tail.length ? '）' : '')
}
const primerPoints = (list, key) => Array.isArray(list) && list.length
  ? h('ul', { className: 'dp-points', key }, list.map((text, index) => h('li', { key: index }, text)))
  : null
const primerCell = (cell, key) => {
  if (cell && typeof cell === 'object' && !Array.isArray(cell)) {
    const url = primerHref(cell.url)
    const text = cell.text == null ? '' : String(cell.text)
    if (url) return h('td', { key }, primerLink(url, text + ' ↗'))
    return h('td', { key }, text, cell.url ? h('span', { className: 'dp-miss' }, '（缺 https 链接，违反 36 号 §2.5）') : null)
  }
  return h('td', { key }, cell == null ? '' : String(cell))
}
const primerTable = table => {
  if (!table || !Array.isArray(table.rows) || !table.rows.length) return null
  return h('div', { className: 'dp-table-wrap', key: 'table' },
    h('table', { className: 'dp-table' },
      h('thead', null, h('tr', null, (table.head || []).map((cell, index) => h('th', { key: index }, cell)))),
      h('tbody', null, table.rows.map((row, rowIndex) => h('tr', { key: rowIndex }, row.map((cell, cellIndex) => primerCell(cell, cellIndex)))))))
}
const primerSection = (section, index) => {
  if (!section) return null
  const body = []
  if (section.intro) body.push(h('p', { className: 'dp-lead', key: 'lead' }, section.intro))
  if (Array.isArray(section.groups) && section.groups.length) {
    body.push(h('div', { key: 'groups' }, section.groups.map((group, groupIndex) => h('div', { className: 'dp-group', key: groupIndex },
      h('h4', null, group.label), primerPoints(group.points, 'g' + groupIndex)))))
  }
  const points = primerPoints(section.points, 'points')
  if (points) body.push(points)
  const table = primerTable(section.table)
  if (table) body.push(table)
  if (!body.length) body.push(h('p', { className: 'dp-lead dp-empty', key: 'empty' }, '本台尚未整理这一段。'))
  const sources = Array.isArray(section.sources) && section.sources.length
    ? h('p', { className: 'dp-src' }, h('b', null, '来源'), section.sources.map((source, sourceIndex) => primerSourceLine(source, 'src' + sourceIndex)))
    : h('p', { className: 'dp-src dp-src-missing' }, h('b', null, '来源'), '未标注 —— 这一段还不能用。')
  return h('section', { className: 'dp-section', key: section.id || index, 'data-dp-section': section.id, 'aria-labelledby': 'dp-h-' + index },
    h('h3', { id: 'dp-h-' + index }, section.title || ''), body, sources)
}
/* 整页视图（32 号）：返回与关闭是两个入口，各自只退一层；内容超 1.5 屏，所以不用弹窗。 */
const primerOverlay = (props) => h('div', {
  className: 'dp-overlay', id: 'disease-primer',
  onClick: event => { if (event.target === event.currentTarget) props.onClose() },
},
  h('div', { className: 'dp-panel', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'dp-title', tabIndex: -1, ref: props.panelRef },
    h('div', { className: 'dp-head' },
      h('button', { className: 'dp-btn dp-back', type: 'button', onClick: props.onClose, 'aria-label': '返回工作台（关闭疾病概要）' }, '← ', h('span', null, '返回')),
      h('div', { className: 'dp-head-title' },
        h('span', { className: 'dp-crumb' }, (PRIMER_DATA?.brand || '小肺宝') + ' › 疾病概要'),
        h('h2', { className: 'dp-title', id: 'dp-title' }, PRIMER_DATA?.name || '疾病概要',
          PRIMER_DATA?.en ? h('span', { className: 'dp-en' }, PRIMER_DATA.en) : null)),
      h('button', { className: 'dp-btn dp-close', type: 'button', onClick: props.onClose, 'aria-label': '关闭疾病概要' }, '✕')),
    h('div', { className: 'dp-body', tabIndex: 0 },
      h('div', { className: 'dp-inner' },
        h('p', { className: 'dp-note' }, '这是公开信息的整理，属于', h('b', null, '解释'),
          '：说明这个病是什么、依据哪些文件、指南里列了哪些手段、这些年发生了什么变化。它不是对你个人情况的判断，也不构成任何建议。'),
        primerSections.map(primerSection),
        h('p', { className: 'dp-foot' }, '最后更新 ' + (PRIMER_DATA?.updated || '未标注') +
          ' · 内容只做事实与原文整理 · 任何与你有关的判断，这一句需要问你的医生。')))))
/* 36 号 §2.6 · 看板首卡：卡头 / 大字天数 / 现状行 / 出口按钮排。
 * 天数一律由已确认记录的日期派生（锚点＝病理报告归档日，其次诊断记录），不手填；
 * 没有锚点时整卡显示「待初始化」并指向录入入口，不编占位数字。 */
const primerStatusCard = () => {
  const todayISO = new Date().toLocaleDateString('sv-SE')
  const dayish = record => {
    const raw = record?.date?.value
    const text = raw ? String(raw).slice(0, 10) : ''
    return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : ''
  }
  const dayOf = value => Math.round((Date.parse(todayISO + 'T00:00:00Z') - Date.parse(String(value).slice(0, 10) + 'T00:00:00Z')) / 86400000)
  const dated = records.filter(record => record.review?.state === 'accepted' && dayish(record))
  const anchorRecord = ['pathology', 'diagnosis']
    .map(kind => dated.filter(record => record.kind === kind).sort((a, b) => dayish(a).localeCompare(dayish(b)))[0])
    .find(Boolean) || null
  const anchor = anchorRecord ? dayish(anchorRecord) : ''
  const planned = records
    .filter(record => ['proposed', 'ordered', 'scheduled'].includes(record.data?.status) && dayish(record) && dayish(record) >= todayISO)
    .sort((a, b) => dayish(a).localeCompare(dayish(b)))
  const next = planned[0] || null
  const stageRecord = [...dated].reverse().find(record => ['staging', 'diagnosis'].includes(record.kind)) || null
  const who = caseFile
    ? h('div', { className: 'sc-who' }, caseFile.displayName || '我的资料',
      h('span', { className: 'wb-muted wb-small' }, caseFile.subjectRole === 'caregiver' ? '照护者档案' : '患者档案'),
      h('span', { className: 'wb-tag ' + (isDemoCase ? 'orange' : 'blue') }, isDemoCase ? '合成演示 · 只读' : '本机保存'),
      h('span', { className: 'wb-tag' }, '不上传病历'),
      h('span', { className: 'wb-tag' }, `${records.length} 条${isDemoCase ? '演示' : '个人'}记录`))
    : h('div', { className: 'sc-who' }, '还没有建立本机资料档案',
      h('span', { className: 'wb-tag' }, '建立后这里才会出现天数'))
  const primerButton = h('button', { type: 'button', className: 'wb-button wb-primer-open', onClick: openPrimer }, '疾病概要：肺癌是什么？')
  const hint = h('span', { className: 'sc-hint' }, '天数由你记的日期算出，工作台不推断病程')

  if (!anchor) {
    return h('section', { className: 'sc-card sc-empty', 'aria-label': '病程状态卡' },
      h('div', { className: 'sc-head' }, h('span', { className: 'sc-eyebrow' }, 'D+N 状态卡 · 待初始化')),
      h('div', { className: 'sc-day' }, h('b', null, '待初始化'), h('span', { className: 'sc-muted' }, '还没有可用的病理或诊断日期，天数无法派生')),
      h('div', { className: 'sc-now' }, who,
        stageRecord ? h('div', { className: 'sc-stage' }, h('b', null, dataTitle(stageRecord)), h('span', { className: 'wb-tag' }, statusText(stageRecord))) : null,
        h('div', { className: 'sc-next' }, '记一条已确认的病理或诊断记录后，这张卡会显示「第 N 天」与距下次安排的间隔。当前不推算，也不填占位数字。')),
      h('div', { className: 'sc-actions' },
        caseFile
          ? button('去病情整理 →', () => setPage('records'), 'wb-button primary')
          : [button('＋ 建立本机资料档案', () => setShowNewCase(true), 'wb-button primary'),
            h('button', { key: 'demo', type: 'button', className: 'wb-button soft', onClick: () => setShowCasePicker(true) }, '浏览演示病例')],
        primerButton, hint))
  }

  const day = dayOf(anchor) + 1
  /* dayOf() 算的是「今天 − 日期」；下次安排在未来，所以取反才是「还有几天」。
   * 之前直接用了 dayOf()，未来的安排会被说成「已过 N 天，待更新」。 */
  const nextGap = next ? -dayOf(dayish(next)) : null
  /* 原型 v4.2.8 的 eyebrow 是「距下次<事项> N 天」；事项名太长会挤坏卡头，超长时退回通用说法。 */
  const nextName = next ? dataTitle(next) : ''
  const shortName = nextName && nextName.length <= 14 ? nextName : ''
  const gapText = nextGap === null ? '暂无已记的安排'
    : nextGap > 0 ? (shortName ? `距下次「${shortName}」${nextGap} 天` : `距下次安排 ${nextGap} 天`)
      : nextGap === 0 ? (shortName ? `今天有安排：${shortName}` : '今天有安排') : `已过 ${-nextGap} 天，待更新`
  const core = next ? ['timeline', '查看病程安排 →']
    : dated.some(record => ['systemic_therapy', 'surgery', 'radiotherapy'].includes(record.kind)) ? ['clinical', '查看治疗历程 →']
      : ['records', '查看资料库 →']

  return h('section', { className: 'sc-card', 'aria-label': '病程状态卡' },
    h('div', { className: 'sc-head' },
      h('span', { className: 'sc-eyebrow' }, 'D+' + day + ' 状态卡 · ' + gapText),
      h('span', { className: 'sc-anchor' }, '锚点：' + anchor + ' ' + (anchorRecord.kind === 'pathology' ? '病理记录' : '诊断记录'))),
    h('div', { className: 'sc-day' }, h('b', null, '第 ' + day + ' 天'), h('span', { className: 'sc-muted' }, '自 ' + anchor + ' 起算')),
    h('div', { className: 'sc-now' }, who,
      stageRecord
        ? h('div', { className: 'sc-stage' }, h('b', null, dataTitle(stageRecord)), h('span', { className: 'wb-tag' }, statusText(stageRecord)))
        : h('div', { className: 'sc-stage' }, h('b', null, '尚未记录分期'), h('span', { className: 'wb-tag' }, '未记录')),
      h('div', { className: 'sc-next' }, next
        ? ['下次：', h('b', { key: 'd' }, dayish(next)), '（' + dataTitle(next) + ' · ' + statusText(next) + '）']
        : '下次：尚未记录日期与事项')),
    h('div', { className: 'sc-actions' },
      button(core[1], () => setPage(core[0]), 'wb-button primary'),
      primerButton, hint))
}
