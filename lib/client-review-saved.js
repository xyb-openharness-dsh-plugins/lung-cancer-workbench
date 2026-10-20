// Review and saved results retain the prototype's page hierarchy and explicit selections.
const reviewQuestions = () => questionRecords().map(q=>({record:q,...questionState(q)})).filter(q=>!q.hidden)
const reviewFacts = () => {
  const end=records.map(r=>validMetricDay(r.date)).filter(Boolean).sort().at(-1)||new Date().toISOString().slice(0,10),start=new Date(end+'T00:00:00Z')
  start.setUTCMonth(start.getUTCMonth()-parseInt(reviewRange,10))
  return accepted.filter(r=>r.data?.private!==true&&r.data?.sharingScope!=='private'&&r.data?.supportType!=='mind'&&(!validMetricDay(r.date)||r.date.value>=start.toISOString().slice(0,10)))
}
const reviewOutline = () => {
  const facts=reviewFacts(),selected=reviewQuestions().filter(q=>q.selected)
  return ['# 复诊沟通提纲',`档案：${caseFile?.displayName||'未选择'} · ${reviewRange.replace('m','个月')} · ${new Date().toISOString().slice(0,10)}`,'资料转录和个人问题，不构成诊疗结论。',
    pack.docs?'\n## 病理、检测与治疗索引\n'+facts.filter(r=>!['metric','symptom','care_task','visit_question'].includes(r.kind)).map(r=>`- ${dateText(r.date)} ${dataTitle(r)}｜来源：${r.source.documentId||r.source.kind}`).join('\n'):'',
    pack.chart?'\n## 已选指标\n'+metricGroups(facts.filter(r=>r.kind==='metric'),selectedMetrics).map(g=>`${g.key}：${g.rows.map(r=>`${dateText(r.date)} ${r.data.rawValue}`).join('；')}`).join('\n'):'',
    pack.questions?'\n## 我选择的问题\n'+selected.map(q=>'- '+q.text).join('\n'):'',
    pack.symptoms?'\n## 身体感受与营养记录\n'+facts.filter(r=>['symptom','care_task'].includes(r.kind)&&r.data?.domain!=='mind').map(r=>`- ${dateText(r.date)} ${dataTitle(r)}：${dataDetail(r)}`).join('\n'):'',
    '\n心理私密记录和未核对候选默认排除；未知字段不补齐。'].filter(Boolean).join('\n')
}
const previewReview = () => setPointDetail({id:'review-outline',kind:'review_outline',date:{precision:'day',value:new Date().toISOString().slice(0,10)},review:{state:'accepted'},source:{kind:'patient_reported'},data:{titleText:'本次复诊沟通提纲',originalText:reviewOutline()}})
const keepReview = () => {setKept(old=>[{id:'outline-'+Date.now(),caseId:caseFile?.id||null,title:'复诊沟通提纲',createdAt:new Date().toISOString(),text:reviewOutline()},...old]);notify('已保留本次预览，当前工作台会话内可回顾；导出文件请到档案管理。')}
const questionEditor = () => h('div',{className:'wb-stack'},reviewQuestions().length?reviewQuestions().map(q=>h('div',{className:'wb-question',key:q.record.id},h('input',{type:'checkbox',checked:q.selected,'aria-label':'选择问题：'+q.text,onChange:()=>toggleQuestion(q.record.id,q.selected)}),h('div',null,h('textarea',{'aria-label':'编辑问题',value:q.text,onChange:e=>editQuestion(q.record.id,e.target.value)}),h('small',{className:'wb-muted'},q.record.source.documentId||q.record.source.kind)),h('button',{className:'wb-icon-button','aria-label':'删除问题',onClick:()=>dropQuestion(q.record.id)},'×'))):h('div',{className:'wb-empty'},'还没有问题。可先写下一个你关心的事。'),button('＋ 添加自己的问题',()=>startRecord('visit_question'),'wb-button soft'))
const reviewPage = () => h('div',{className:'wb-page'},head('复诊准备',SUBTITLES.review,h('div',{className:'wb-actions'},button('预览沟通提纲',previewReview,'wb-button primary'),button('＋ 添加我的问题',()=>startRecord('visit_question')),button('收藏与回顾',()=>setPage('saved')))),
  h('div',{className:'wb-grid'},card('已经确认的资料',recordList(reviewFacts().filter(r=>!['symptom','care_task','metric','visit_question'].includes(r.kind)).slice(0,4)),'span4'),card('还没核清楚的',gapRows().length?h('div',null,gapRows().slice(0,4).map(g=>plainRow(g.text,g.why,pill(g.state||'待核对','orange')))):h('p',{className:'wb-muted'},'当前没有待核项。'),'span4'),card('想问医生的',h('div',null,h('p',{className:'wb-muted wb-small'},`${reviewQuestions().filter(q=>q.selected).length}条已选`),reviewQuestions().filter(q=>q.selected).slice(0,4).map(q=>plainRow(q.text,q.record.source.kind))),'span4'),
    h('section',{className:'wb-maincol'},card('问题清单',questionEditor())),
    h('aside',{className:'wb-rail'},card('本次讨论带什么',h('div',{className:'wb-stack'},[['docs','病理 / 分子报告索引'],['chart','一图秀（选定指标）'],['questions','已选复诊问题'],['symptoms','症状与营养记录摘要']].map(([key,label])=>h('label',{className:'wb-check-pill',key},h('input',{type:'checkbox',checked:!!pack[key],onChange:e=>setPack(old=>({...old,[key]:e.target.checked}))}),label)),h('p',{className:'wb-muted wb-small'},'心理支持私密记录默认排除。只会带上已选择的内容。'))),card('时间范围',segment([['3m','近3个月'],['6m','近6个月'],['12m','近12个月']],reviewRange,setReviewRange,'摘要时间范围')),card('预览与回顾',h('div',{className:'wb-stack'},button('预览沟通提纲',previewReview,'wb-button primary'),button('保留本次预览',keepReview),button('导出资料文件',()=>setPage('archives')),h('p',{className:'wb-muted wb-small'},'预览与档案导出分开；导出前检查内容和分享范围。'))))),showComposer?renderComposer():null)
const savedPage = () => {
 const sub=subOf('saved'),snapshots=kept.filter(x=>x.caseId===(caseFile?.id||null))
 const snapshotList=snapshots.length?snapshots.map(x=>plainRow(x.title,x.createdAt,button('查看',()=>setPointDetail({id:x.id,kind:'review_outline',date:{value:x.createdAt.slice(0,10)},review:{state:'accepted'},source:{kind:'patient_reported'},data:{titleText:x.title,originalText:x.text}})))):h('div',{className:'wb-empty'},'还没有保留的结果。在复诊准备中先预览，再选择保留。')
 const trialList=favTrials.length?favTrials.map(x=>plainRow(x.title,x.nctId,h('div',{className:'wb-actions'},button('详情',()=>setPointDetail({id:x.nctId,kind:'trial_detail',date:{precision:'unknown'},review:{state:'accepted'},source:{kind:'report'},data:{titleText:x.title,originalText:[x.nctId,x.phase,x.status,...(x.interventions||[])].join('\n')}})),button('取消收藏',()=>setFavTrials(old=>old.filter(y=>y.nctId!==x.nctId)))))):h('div',{className:'wb-empty'},'还没有收藏的试验，在临床试验页点击收藏。')
 const bodies={
 '我的收藏':h('div',{className:'wb-grid'},h('section',{className:'wb-maincol'},card('收藏的临床试验',trialList),card('保留的沟通提纲',snapshotList)),h('aside',{className:'wb-rail'},card('收藏是怎么用的',bulletList(['收藏只是把登记放在一起看。','登记状态会变化，讨论前打开来源核对。','收藏不表示适合入组或建议治疗。'])))),
 '已保留结果':h('div',{className:'wb-grid'},card('已保留结果',snapshotList,'span8'),card('保留意味着什么',bulletList(['保留当时选择的内容。','修改资料不会改写旧预览。','当前会话内回顾；持久文件在档案管理生成。','预览不是医学审核或诊疗结论。']),'span4')),
 '问题清单':h('div',{className:'wb-grid'},card('可编辑的问题清单',questionEditor(),'span8'),card('事实与看法分开',bulletList(['事实类问题带日期与来源。','担忧、偏好和想法保留本人的说法。','未知字段可以直接留空。']),'span4')),
 '报告与任务':h('div',{className:'wb-grid'},card('Markdown 预览',h('pre',{className:'wb-review-text'},reviewOutline()),'span8'),h('aside',{className:'wb-rail'},card('下次复诊带什么',bulletList(['病理 / 分子报告原件索引。','影像报告与比较问题。','处方、实际用药和身体变化。','自己选过的问题清单。'])),card('导出与分享',h('div',{className:'wb-stack'},button('去档案管理导出',()=>setPage('archives'),'wb-button primary'),h('p',{className:'wb-muted wb-small'},'原生AI不会自动发送或写回病历；选择、预览后再明确确认。')))))
 }
 return h('div',{className:'wb-page'},head('收藏与回顾',SUBTITLES.saved,h('div',{className:'wb-actions'},button('预览沟通提纲',previewReview),button('＋ 添加我的问题',()=>startRecord('visit_question'),'wb-button primary'))),subnavFor('saved'),bodies[sub]||bodies['我的收藏'],showComposer?renderComposer():null)
}
