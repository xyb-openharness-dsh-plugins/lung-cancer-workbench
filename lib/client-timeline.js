      const timelinePage = () => {
        const publicRecords=records.filter(r=>r.data?.private!==true&&r.data?.sharingScope!=='private'&&r.data?.supportType!=='mind')
        const acceptedRecords=publicRecords.filter(r=>r.review.state==='accepted')
        const metrics=acceptedRecords.filter(r=>r.kind==='metric'),names=[...new Set(metrics.map(metricIdentity))]
        const groups=metricGroups(metrics,selectedMetrics),selectedKeys=groups.map(g=>g.key)
        const pending=publicRecords.filter(r=>['candidate','needs_review'].includes(r.review.state))
        const days=acceptedRecords.map(r=>validMetricDay(r.date)).filter(Boolean).sort()
        const end=days.at(-1)||new Date().toISOString().slice(0,10),endTime=Date.parse(end+'T00:00:00Z'),base=new Date(endTime)
        base.setUTCMonth(base.getUTCMonth()-Number(timelineRange==='all'?1200:timelineRange))
        const baseStart=timelineRange==='all'?(days[0]||end):base.toISOString().slice(0,10),baseTime=Date.parse(baseStart+'T00:00:00Z')
        const start=new Date(endTime-(endTime-baseTime)/timelineZoom).toISOString().slice(0,10),startTime=Date.parse(start+'T00:00:00Z'),span=Math.max(1,endTime-startTime)
        const inWindow=r=>{const d=validMetricDay(r.date);return d&&d>=start&&d<=end}
        const category=r=>['surgery','systemic_therapy','radiotherapy'].includes(r.kind)?'treatment':['pathology','diagnosis','staging','molecular_test','biomarker'].includes(r.kind)?'pathology':['specimen','pleural_procedure'].includes(r.kind)?'procedure':['lesion','imaging'].includes(r.kind)?'imaging':r.kind==='symptom'?'symptom':r.kind==='care_task'?'visit':null
        const eventTypes=[['treatment','治疗'],['imaging','影像/检验'],['pathology','病理/分子'],['procedure','取材/操作'],['symptom','症状/自述'],['visit','就诊/预约']]
        const visible=acceptedRecords.filter(r=>category(r)&&eventFilters.includes(category(r))&&inWindow(r)).sort((a,b)=>a.date.value.localeCompare(b.date.value))
        const events=visible.map(record=>({id:record.id,day:validMetricDay(record.date),title:dataTitle(record),record,status:timelineEventState(record),category:category(record)}))
        const clusters=clusterTimelineEvents(events,start,end)
        const selectedCluster=clusters.find(c=>c.id===activeEventId)
        const plotTop=24,plotBottom=244,svgHeight=292
        const colorFor=name=>({'CEA':'#2786AD','CYFRA21-1':'#DF7930','NSE':'#7484B0','SCC':'#456B7E'}[name]||['#2786AD','#DF7930','#7484B0','#456B7E'][Array.from(name).reduce((sum,ch)=>sum+ch.charCodeAt(0),0)%4])
        const toggleMetric=key=>setSelectedMetrics(old=>{const current=metricGroups(metrics,old).map(g=>g.key);return current.includes(key)?current.filter(x=>x!==key):current.length<4?[...current,key]:current})
        const showEvent=record=>{setActiveEventId(record.id);setPointDetail(record)}
        const selector=h('div',{className:'wb-metric-options wb-metric-selector',tabIndex:0,'aria-label':'按类型分类的可选指标，可独立滚动'},categorizedMetricSeries(metrics).filter(c=>c.series.length).map(category=>h('details',{key:category.id,open:true},h('summary',null,`${category.label} · ${new Set(category.series.map(s=>s.definition?.id||s.name)).size}项`),category.series.map(series=>h('label',{className:'wb-check-pill',key:series.key,title:series.key},h('input',{type:'checkbox','aria-label':series.key,checked:selectedKeys.includes(series.key),disabled:!selectedKeys.includes(series.key)&&selectedKeys.length>=4,onChange:()=>toggleMetric(series.key)}),h('span',null,series.shortName))))))
        const labelYs=[]
        const plotted=groups.map(group=>{
          const rows=group.rows.filter(inWindow),first=group.rows[0],values=group.rows.map(r=>Number(r.data.rawValue))
          const lo=values.length?Math.min(...values):0,hi=values.length?Math.max(...values):0,range=hi-lo||Math.max(Math.abs(hi)*.1,1),floor=hi===lo?lo-range/2:lo
          const points=rows.map(row=>({x:dateAxisX(validMetricDay(row.date),start,end),y:plotBottom-((Number(row.data.rawValue)-floor)/range)*220,row}))
          const last=points.at(-1);let labelY=last?last.y:plotTop
          labelY=Math.max(plotTop+14,Math.min(plotBottom-8,labelY))
          while(labelYs.some(y=>Math.abs(y-labelY)<19))labelY=labelY+19<=plotBottom-8?labelY+19:plotTop+14
          labelYs.push(labelY)
          return {...group,rows,points,last,labelY,lo,hi,color:colorFor(first?.data.metricName||group.key),connect:Boolean(first?.data.methodText&&first?.data.laboratoryText&&first?.data.unit)}
        })
        const hover=clusters.find(c=>c.id===hoverEventId)
        const clusterLabel=c=>`${c.start}${c.end!==c.start?' 至 '+c.end:''} · ${c.members.length}条${eventTypes.find(([key])=>key===c.category)?.[1]||'病程'}记录`
        const selectCluster=c=>{setActiveEventId(c.id);if(c.members.length===1)setPointDetail(c.members[0].record)}
        const eventRail=timelineShowEvents&&clusters.length?h('div',{className:'wb-event-rail-scroll'},h('svg',{className:'wb-event-rail',viewBox:'0 0 1000 210',role:'group','aria-label':'同一日期轴的病程分类，数字为聚合记录数'},
          eventTypes.map(([key,label],row)=>h('g',{key},h('text',{x:0,y:28+row*30,fontSize:11,fill:'currentColor'},label),h('line',{x1:64,x2:944,y1:24+row*30,y2:24+row*30,stroke:'#e2ebf0'}))),
          clusters.map(c=>{const row=eventTypes.findIndex(([key])=>key===c.category),y=24+row*30,only=c.members[0],active=activeEventId===c.id||hoverEventId===c.id;return h('g',{key:c.id,role:'button',tabIndex:0,'aria-label':clusterLabel(c),className:`wb-event-cluster ${active?'is-active':''}`,onClick:()=>selectCluster(c),onKeyDown:e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectCluster(c)}},onMouseEnter:()=>setHoverEventId(c.id),onMouseLeave:()=>setHoverEventId(null),onFocus:()=>setHoverEventId(c.id),onBlur:()=>setHoverEventId(null)},
            h('title',null,clusterLabel(c)+'\n'+c.members.map(e=>`${e.day} · ${e.title} · ${e.status.label}`).join('\n')),
            h('rect',{x:c.x-18,y:y-14,width:36,height:28,fill:'transparent'}),
            c.members.length>1?h('g',null,h('line',{x1:c.leftX,x2:c.rightX,y1:y,y2:y,stroke:'#17638c',strokeWidth:3}),h('rect',{x:c.x-13,y:y-10,width:26,height:20,rx:10,fill:active?'#17638c':'#e5f3f9',stroke:'#17638c'}),h('text',{x:c.x,y:y+4,textAnchor:'middle',fontSize:11,fill:active?'#fff':'#17638c'},String(c.members.length))):only.status.kind==='planned'?h('path',{d:`M${c.x},${y-6} l6,6 -6,6 -6,-6 Z`,fill:'#fff1e5',stroke:'#df7930',strokeWidth:2}):h('circle',{cx:c.x,cy:y,r:5,fill:only.status.kind==='actual'?'#17638c':'#fff',stroke:'#6a8596',strokeWidth:2}))}))) : null
        const detailEvents=selectedCluster?selectedCluster.members:events
        const dateGroups=new Map()
        for(const event of detailEvents){if(!dateGroups.has(event.day))dateGroups.set(event.day,[]);dateGroups.get(event.day).push(event)}
        const eventList=h('div',{className:'wb-event-date-list',tabIndex:0,role:'region','aria-label':'病程原始记录，按日期分组，可独立滚动'},[...dateGroups].map(([day,items])=>h('details',{key:day,className:'wb-event-date',open:selectedCluster?true:undefined},h('summary',null,day,h('small',null,`${items.length}条记录`)),h('div',{className:'wb-event-date-items'},items.map(event=>h('button',{key:event.id,className:'wb-event-record',onClick:()=>showEvent(event.record)},h('span',null,event.title),h('small',{className:`wb-event-status ${event.status.kind}`},event.status.label)))))))
        const svg=h('div',{className:'wb-plot-scroll'},h('svg',{className:'wb-linechart wb-combined-chart',viewBox:`0 0 1000 ${svgHeight}`,role:'img','aria-label':'多指标同窗趋势与事件；各指标按自身全期范围缩放'},
          h('text',{x:64,y:plotTop-8,fontSize:11,fill:'currentColor'},'每条线按自身全期范围缩放，不代表不同指标数值可比'),
          [0,1,2,3,4,5].map(i=>{const day=new Date(startTime+span*i/5).toISOString().slice(0,10),x=dateAxisX(day,start,end);return h('g',{key:i},h('line',{x1:x,x2:x,y1:plotTop+6,y2:plotBottom,stroke:'#d4e3eb',strokeWidth:1}),h('text',{x,y:plotBottom+28,textAnchor:i===5?'end':i===0?'start':'middle',fontSize:11,fill:'currentColor'},day.slice(2)))}),
          h('g',{key:`plot-${animationRunId}`},plotted.map((group,index)=>h('g',{key:group.key},group.connect&&group.points.length>1?h('path',{className:'wb-animated-curve',pathLength:1,d:smoothMetricPath(group.points),fill:'none',stroke:group.color,strokeWidth:3,strokeLinecap:'round',strokeLinejoin:'round',style:{animationDelay:`${index*.09}s`}}):null,
            group.points.map((point,i)=>h('g',{key:point.row.id},h('circle',{cx:point.x,cy:point.y,r:4.7,className:'wb-measurement-dot',fill:group.color,stroke:'#fff',strokeWidth:2,style:{animationDelay:`${index*.09+i*.045}s`,transformOrigin:`${point.x}px ${point.y}px`}}),h('circle',{cx:point.x,cy:point.y,r:14,fill:'transparent',tabIndex:0,role:'button','aria-label':`${point.row.data.metricName} ${validMetricDay(point.row.date)} ${point.row.data.rawValue} ${point.row.data.unit}，查看来源`,onClick:()=>setPointDetail(point.row),onKeyDown:e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setPointDetail(point.row)}}}))),
            group.last?h('text',{x:group.last.x+(group.last.x>800?-8:8),y:group.labelY,textAnchor:group.last.x>800?'end':'start',fontSize:12,fill:group.color},`${group.last.row.data.rawValue} ${group.last.row.data.unit||''}`):null)),
            null)))
        const treatments=acceptedRecords.filter(r=>['surgery','systemic_therapy','radiotherapy','pleural_procedure'].includes(r.kind)&&inWindow(r))
        const lanes=h('div',{className:'wb-treatment-lanes'},treatments.map(r=>{const x=Math.min(99,dateAxisX(validMetricDay(r.date),start,end,0,100)),finish=r.data.endDate&&Date.parse(r.data.endDate+'T00:00:00Z'),width=finish?Math.max(.8,Math.min(100-x,(finish-Date.parse(validMetricDay(r.date)+'T00:00:00Z'))/span*100)):.8,status=timelineEventState(r)
          return h('div',{className:'wb-lane',key:r.id},h('div',null,h('b',null,dataTitle(r)),h('small',{className:'wb-muted'},`${validMetricDay(r.date)} · ${status.label}${r.data.endDate?' 至 '+r.data.endDate:' · 单次事件'}`)),h('div',{className:'wb-lane-track'},h('button',{className:`wb-lane-bar ${status.kind==='planned'?'planned':''}`,style:{left:`${x}%`,width:`${width}%`},'aria-label':dataTitle(r),onClick:()=>showEvent(r)}))) }))
        const cards=names.slice(0,4).map((key,cardIndex)=>{
          const all=metrics.filter(r=>metricIdentity(r)===key).filter(numericMetric).sort((a,b)=>validMetricDay(a.date).localeCompare(validMetricDay(b.date))),latest=all.at(-1),name=key.split(' · ')[0],unit=latest?.data.unit||'单位未记录',isFlipped=!!flipped[key]
          const values=all.map(r=>Number(r.data.rawValue)),lo=values.length?Math.min(...values):0,hi=values.length?Math.max(...values):0,pad=hi===lo?Math.max(Math.abs(lo)*.1,1):0,floor=lo-pad/2,ceiling=hi+pad/2,range=ceiling-floor||1
          const rows=all.filter(inWindow),points=rows.map(row=>({x:dateAxisX(validMetricDay(row.date),start,end,46,280),y:142-(Number(row.data.rawValue)-floor)/range*112,row})),comparable=Boolean(latest?.data.methodText&&latest?.data.laboratoryText&&latest?.data.unit),color=colorFor(name)
          const flip=value=>setFlipped(old=>({...old,[key]:value}))
          const trend=rows.length?h('svg',{className:'wb-card-trend',viewBox:'0 0 300 184',role:'img','aria-label':`${name}折线图，单位${unit}，${start}至${end}，${rows.length}个原始测量点`},
            [0,.5,1].map((ratio,i)=>{const y=142-ratio*112,value=floor+ratio*range;return h('g',{key:i},h('line',{x1:46,x2:280,y1:y,y2:y,stroke:'#d4e3eb',strokeWidth:1}),h('text',{x:38,y:y+4,textAnchor:'end',fontSize:13,fill:'#587383'},Number(value.toPrecision(4)).toString()))}),
            comparable&&points.length>1?h('path',{d:smoothMetricPath(points),fill:'none',stroke:color,strokeWidth:2.5,strokeLinecap:'round',strokeLinejoin:'round'}):null,
            points.map(point=>h('g',{key:point.row.id},h('title',null,`${validMetricDay(point.row.date)} · ${point.row.data.rawValue} ${unit}`),h('circle',{cx:point.x,cy:point.y,r:4,fill:color,stroke:'#fff',strokeWidth:1.5}),h('circle',{cx:point.x,cy:point.y,r:18,fill:'transparent',tabIndex:isFlipped?0:-1,role:'button','aria-label':`${name} ${validMetricDay(point.row.date)} ${point.row.data.rawValue} ${unit}，查看来源`,onClick:event=>{event.stopPropagation?.();setPointDetail(point.row)},onKeyDown:e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation?.();setPointDetail(point.row)}}}))),
            h('text',{x:46,y:166,fontSize:13,fill:'#587383'},start.slice(2)),h('text',{x:280,y:166,textAnchor:'end',fontSize:13,fill:'#587383'},end.slice(2)))
            :h('div',{className:'wb-empty wb-card-trend-empty'},'当前时间窗没有有效数据，可扩大时间范围。')
          return h('article',{className:'wb-flip',key,'data-flipped':isFlipped,tabIndex:0,role:'group','aria-roledescription':'可翻转指标卡','aria-label':`${name}指标卡，当前${isFlipped?'折线图':'数值'}，点击或按回车切换`,onClick:event=>{if(event.target?.closest?.('button,a,input,[role=button]'))return;flip(!isFlipped)},onKeyDown:event=>{if(event.target===event.currentTarget&&(event.key==='Enter'||event.key===' ')){event.preventDefault();flip(!isFlipped)}}},h('div',{className:'wb-flip-inner'},
            h('div',{className:'wb-flip-face','aria-hidden':isFlipped,inert:isFlipped?true:undefined},
              h('div',{className:'wb-flip-summary'},h('b',null,name),h('strong',{className:'wb-metric'},latest?latest.data.rawValue:'—'),h('span',{className:'wb-muted wb-small'},latest?`${unit} · ${dateText(latest.date)}`:'缺少有效日期或数值'),h('span',{className:'wb-muted wb-small'},'点击卡片查看趋势'))),
            h('div',{id:`wb-metric-trend-${cardIndex}`,className:'wb-flip-face wb-flip-back',role:'group','aria-label':`${name}指标趋势`,'aria-hidden':!isFlipped,inert:isFlipped?undefined:true},
              h('div',{className:'wb-row'},h('b',null,`${name} · 趋势`),h('small',{className:'wb-muted'},unit)),trend,
              h('p',{className:'wb-muted wb-trend-caption'},`${rows.length}个测量点 · ${points.length===1?'单点不连线':!comparable?'方法/实验室未齐，仅显示点':'轻度平滑，不预测疗效'}。点选数据点查看来源；再次点击卡片返回数值。`))))
        })
        return h('div',{className:'wb-page wb-timeline-page'},head('病情一图秀','在同一日期轴回顾指标与事件；不同指标按自身全期范围缩放。',h('div',{className:'wb-actions'},button('重播趋势动画',()=>setAnimationRunId(n=>n+1)),button(timelineFavorite?'已收藏此入口':'收藏此入口',()=>setTimelineFavorite(v=>!v)),button('＋ 记录一次结果',()=>{setForm(f=>({...f,kind:'metric'}));setShowComposer(true)},'wb-button primary'))),
          showComposer?renderComposer():null,
          h('div',{className:'wb-timeline-workspace'},h('aside',{className:'wb-card wb-timeline-controls'},h('h2',null,'回顾范围'),button(caseFile?'切换档案 / 选择演示病例':'选择演示病例以查看曲线',()=>setShowCasePicker(true)),h('h3',null,'指标（最多4项）'),selector,h('h3',null,'时间范围'),h('div',{className:'wb-actions'},[['3','近3月'],['6','近6月'],['12','近12月'],['all','全期']].map(([v,t])=>h('button',{className:`wb-button ${timelineRange===v?'soft':''}`,key:v,'aria-pressed':timelineRange===v,onClick:()=>setTimelineRange(v)},t))),
            h('label',{className:'wb-field'},h('span',null,`时间轴缩放 ${timelineZoom}×（固定右端）`),h('input',{type:'range',min:1,max:4,step:.5,value:timelineZoom,onChange:e=>setTimelineZoom(Number(e.target.value))})),
            h('label',{className:'wb-check-pill'},h('input',{type:'checkbox',checked:timelineShowEvents,onChange:e=>setTimelineShowEvents(e.target.checked)}),'显示事件节点与标签'),h('div',{className:'wb-metric-options'},eventTypes.map(([key,label])=>h('label',{className:'wb-check-pill',key},h('input',{type:'checkbox',checked:eventFilters.includes(key),onChange:e=>setEventFilters(old=>e.target.checked?[...old,key]:old.filter(x=>x!==key))}),label))),
            button(`候选预览（${pending.length}条，不进入正式曲线）`,()=>setCandidatePreview(v=>!v)),candidatePreview?h('div',{className:'wb-stack'},pending.map(r=>button(dataTitle(r),()=>setPointDetail(r)))):null,h('p',{className:'wb-muted wb-small'},'指标、单位、方法与实验室分别分组。缺失值不补0；方法或实验室未知时仅显示点。'),h('p',{className:'wb-muted wb-small'},`${publicRecords.filter(r=>!validMetricDay(r.date)).length}条日期未知记录未定位到日期轴。`)),
            h('div',{className:'wb-stack wb-timeline-main'},card('多指标同窗回顾',h(React.Fragment,null,h('p',{className:'wb-muted wb-small'},`${start} 至 ${end} · 平滑线仅连接原始点，不代表连续观测、预测或疗效。`),plotted.some(g=>g.points.length)?svg:h('div',{className:'wb-empty'},'选择病例及指标后查看曲线；此时间窗内没有有效日期和数值的记录。'),
              h('div',{className:'wb-plot-legend'},plotted.map(g=>h('div',{key:g.key},h('span',{className:'wb-color-dot',style:{background:g.color}}),h('b',null,g.key.split(' · ')[0]),` · ${g.lo}–${g.hi} ${g.rows[0]?.data.unit||g.key.split(' · ')[1]} · 全期范围${g.connect?'':' · 方法/实验室未齐，仅显示点'}`))),
              h('hr',{className:'wb-divider'}),h('h3',null,`同窗病程 · ${events.length}条`),h('p',{className:'wb-muted wb-small'},'相邻日期按类别聚合，数字表示记录数；点击节点查看原始日期与来源，曲线区域不随病程条数增高。'),
              eventRail,
              hover?h('p',{role:'status',className:'wb-event-hover'},clusterLabel(hover)):null,
              selectedCluster?h('div',{className:'wb-row wb-cluster-selection'},h('span',null,clusterLabel(selectedCluster)),button('显示全部病程',()=>setActiveEventId(null))):null,
              !timelineShowEvents?h('p',{className:'wb-muted'},'事件显示已关闭，记录仍保留。'):events.length?eventList:h('p',{className:'wb-muted'},'此时间窗与筛选下没有事件，可扩大时间范围。'))),
              card('治疗轨（计划 / 实际分开）',h(React.Fragment,null,treatments.length?lanes:h('div',{className:'wb-empty'},'此时间窗没有带日期的已确认治疗记录。'),h('div',{className:'wb-row wb-muted wb-small'},h('span',null,start),h('span',null,end)),h('p',{className:'wb-muted wb-small'},'只有明确起止日期才绘制区间；单次事件不虚构终点。'))),card('指标卡片 · 点击查看折线图',h('div',{className:'wb-cardgrid wb-metric-cards'},cards.length?cards:h('div',{className:'wb-empty'},'尚无已确认指标。'))),
              card('读图提示与病例概况',h('div',{className:'wb-stack'},h('p',null,'每条线按自身全期范围缩放，不代表不同指标数值可比；日期相邻不意味着治疗因果。'),h('p',null,'手术、靶向/免疫、放疗和取材/胸腔操作分别保留来源及计划/实际状态。'),h('p',{className:'wb-muted'},`${acceptedRecords.length}条已确认可见记录 · ${names.length}组指标 · ${treatments.length}条当前窗治疗记录`),button('去档案管理查看原件',()=>setPage('archives')))))))
      }
