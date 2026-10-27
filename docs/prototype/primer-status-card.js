/* 36 号 §2.6 · 看板首卡「D+N 状态卡」
 *
 * 四件结构：卡头 eyebrow / 大字天数 / 现状行 / 出口按钮排。
 * 天数一律由锚点日派生（锚点 = 病理报告归档日），不手填；无锚点数据整卡显示「待初始化」。
 * 主按钮进入当前阶段核心页；副按钮打开疾病概要浮窗（data-primer-open 由 primer.js 接管）。
 */

/* 锚点日：病理报告归档日。p4 的病理尚未出结果，因此没有锚点。 */
const SC_ANCHOR = { p1: '2026-01-28', p2: '2026-03-02', p3: '2026-05-18', p4: '' };

/* 当前阶段核心页：[页面, 子页, 按钮文案] */
const SC_CORE = {
  p1: ['records', '指标检测', '查看指标与复查记录 →'],
  p2: ['clinical', '治疗历程', '查看治疗历程 →'],
  p3: ['care', '放疗进度', '查看放疗进度 →'],
  p4: ['records', '取材与检测', '查看取材与检测 →']
};

/* 状态词只描述记录状态，不评价病情 */
const SC_STATE = {
  p1: ['随访中', 'green'],
  p2: ['治疗进行中', 'orange'],
  p3: ['放化疗进行中', 'orange'],
  p4: ['结果待出', 'gray']
};

function statusCard() {
  const p = current();
  const anchor = SC_ANCHOR[p.id] || '';
  const core = SC_CORE[p.id] || ['records', '资料库', '查看资料库 →'];
  const state = SC_STATE[p.id] || ['未记录', 'gray'];
  const primerBtn = '<button class="btn soft" data-primer-open>疾病概要：肺癌是什么？</button>';

  if (!anchor) {
    return `<section class="sc-card sc-empty">
      <div class="sc-head"><span class="sc-eyebrow">D+N 状态卡 · 待初始化</span></div>
      <div class="sc-day"><b>待初始化</b><span>还没有可用的确诊日，天数无法派生</span></div>
      <div class="sc-now">
        <div class="sc-who">${esc(p.name)} <span class="muted small">${esc(p.kind)}</span><span class="tag gray">模拟资料 · 不是真实病历</span></div>
        <div class="sc-stage"><b>${esc(p.stage)}</b>${tag(state[0], state[1])}</div>
        <div class="sc-next">补上确诊日或治疗起始日后，这张卡会显示「第 N 天」与距下次安排的间隔。当前不推算，也不填占位数字。</div>
      </div>
      <div class="sc-actions">${btn(core[2], 'go', 'btn primary', `data-page="${core[0]}" data-sub="${core[1]}"`)}${primerBtn}
        <span class="sc-hint">天数由锚点日派生，不手填</span></div>
    </section>`;
  }

  const day = Math.round((ndate(today) - ndate(anchor)) / 86400000) + 1;
  const nextDate = p.nextDate || '';
  const nextLabel = (p.next || '').split(' · ').slice(1).join(' · ') || '待安排';
  const gap = nextDate ? Math.round((ndate(nextDate) - ndate(today)) / 86400000) : null;
  const gapText = gap === null ? '下次安排未记录'
    : gap > 0 ? `距下次${nextLabel} ${gap} 天`
    : gap === 0 ? `今天就是${nextLabel}`
    : `已过 ${-gap} 天，待更新`;

  return `<section class="sc-card">
    <div class="sc-head">
      <span class="sc-eyebrow">D+${day} 状态卡 · ${esc(gapText)}</span>
      <span class="sc-anchor">锚点：${fmtDate(anchor)} 病理报告归档</span>
    </div>
    <div class="sc-day"><b>第 ${day} 天</b><span>自 ${fmtDate(anchor)} 起算</span></div>
    <div class="sc-now">
      <div class="sc-who">${esc(p.name)} <span class="muted small">${esc(p.kind)}</span><span class="tag gray">模拟资料 · 不是真实病历</span></div>
      <div class="sc-stage"><b>${esc(p.stage)}</b>${tag(state[0], state[1])}</div>
      <div class="sc-next">${nextDate
        ? `下次：<b>${fmtDate(nextDate)}</b>（${esc(nextLabel)}）`
        : '下次：尚未记录日期与事项'}</div>
    </div>
    <div class="sc-actions">
      ${btn(core[2], 'go', 'btn primary', `data-page="${core[0]}" data-sub="${core[1]}"`)}
      ${primerBtn}
      <span class="sc-hint">天数由锚点日派生，不手填</span>
    </div>
  </section>`;
}
