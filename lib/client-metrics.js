// Production metric tab: the same confirmed SQLite records feed cards and timeline.
const renderMetricTrendCard = series => {
  const flipKey=`records-metric:${caseFile?.id||'none'}:${series.key}`,isFlipped=!!flipped[flipKey]
  const latest=series.latest,category=METRIC_CATEGORIES.find(c=>c.id===series.category)
  const flip=()=>setFlipped(old=>({...old,[flipKey]:!old[flipKey]}))
  const sourcePoint=(row,event)=>{event?.stopPropagation?.();setPointDetail(row)}
  const rows=series.numericRows,firstDay=rows.length?validMetricDay(rows[0].date):null,lastDay=rows.length?validMetricDay(rows.at(-1).date):null
  const values=rows.map(r=>Number(r.data.rawValue)),lo=values.length?Math.min(...values):0,hi=values.length?Math.max(...values):0,pad=lo===hi?Math.max(Math.abs(lo)*.1,1):0,floor=lo-pad/2,range=hi+pad/2-floor||1
  const points=rows.map(row=>({row,x:dateAxisX(validMetricDay(row.date),firstDay,lastDay,48,396),y:128-(Number(row.data.rawValue)-floor)/range*104}))
  const chart=rows.length?h('svg',{className:'wb-record-metric-chart',viewBox:'0 0 420 160',role:'group','aria-label':`${series.name}时间趋势，${rows.length}个数值记录，${series.unit||'单位未记录'}`},
    [0,.5,1].map(t=>h('g',{key:t},h('line',{x1:48,x2:396,y1:128-t*104,y2:128-t*104,stroke:'#d4e3eb'}),h('text',{x:40,y:132-t*104,textAnchor:'end'},Number((floor+t*range).toPrecision(4))))),
    series.connectable&&points.length>1?h('path',{d:smoothMetricPath(points),fill:'none',stroke:'#387b9e',strokeWidth:2.5,strokeLinecap:'round'}):null,
    points.map(point=>h('g',{key:point.row.id},h('circle',{cx:point.x,cy:point.y,r:4,fill:'#387b9e',stroke:'#fff',strokeWidth:1.5}),h('circle',{cx:point.x,cy:point.y,r:13,fill:'transparent',role:'button',tabIndex:isFlipped?0:-1,'aria-label':`${series.name} ${validMetricDay(point.row.date)} ${point.row.data.rawValue} ${series.unit}，查看来源`,onClick:e=>sourcePoint(point.row,e),onKeyDown:e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();sourcePoint(point.row,e)}}}))),
    h('text',{x:48,y:153},firstDay.slice(2)),h('text',{x:396,y:153,textAnchor:'end'},lastDay.slice(2)))
    :h('div',{className:'wb-metric-no-chart'},'没有可定位到时间轴的数值记录；原始记录仍可在下方查看。')
  const deltaText=series.delta===null?(series.latestRows.length>1?'同日多次，未确定先后':!series.comparable?'方法 / 机构信息未齐，暂不比较':series.ambiguousDays?'同日多次，暂不比较':'暂无可比较的前次记录'):`${series.delta>0?'↑':series.delta<0?'↓':'→'} 较前次 ${series.delta>0?'+':''}${series.delta}`
  const history=[...series.dated,...series.undated]
  return h('article',{className:'wb-flip wb-record-metric-card',key:series.key,'data-flipped':isFlipped,tabIndex:0,role:'group','aria-roledescription':'3D翻转指标卡','aria-label':`${series.name}指标卡，当前${isFlipped?'时间趋势':'最新记录'}，点击或回车翻面`,
    onClick:event=>{if(event.target?.closest?.('button,a,input,select,textarea,summary,[data-no-flip],[role=button]'))return;flip()},
    onKeyDown:event=>{if(event.target===event.currentTarget&&(event.key==='Enter'||event.key===' ')){event.preventDefault();flip()}}},
    h('div',{className:'wb-flip-inner'},
      h('div',{className:'wb-flip-face wb-record-metric-front','aria-hidden':isFlipped,inert:isFlipped?true:undefined},
        h('span',{className:'wb-metric-category'},h('i',{'aria-hidden':true}),category?.label||'其他已记录指标'),h('h3',null,series.name),
        h('div',{className:'wb-record-metric-value'},latest?String(latest.data.rawValue??'—'):series.latestRows.length>1?'同日多次':'日期待核',h('small',null,series.unit||'单位未记录')),
        h('p',{className:'wb-metric-delta',title:series.previous?`对比 ${validMetricDay(series.previous.date)} → ${series.latestDay}`:undefined},deltaText),
        h('div',{className:'wb-record-metric-meta'},h('span',null,`共 ${series.rows.length} 次 · ${series.latestDay||'日期未知'}${series.undated.length?' · 日期待核'+series.undated.length+'条':''}`),
          h('span',{title:series.key},`${series.method||'方法未知'} · ${series.laboratory||'机构未知'}`),h('span',null,latest?`来源：${latest.source?.documentId||latest.source?.reference||latest.source?.kind||'未注明'}`:'保留原始来源，不推定记录先后'),h('span',{className:'wb-metric-flip-hint'},'点击查看时间趋势 ↻'))),
      h('div',{className:'wb-flip-face wb-flip-back wb-record-metric-back','aria-hidden':!isFlipped,inert:isFlipped?undefined:true},
        h('div',{className:'wb-row wb-metric-back-heading'},h('b',null,series.name+' · 趋势'),h('small',null,series.unit||'单位未记录')),
        h('div',{className:'wb-metric-chart-slot'},chart),
        h('details',{className:'wb-metric-history','data-no-flip':''},h('summary',null,`按时间查看 ${history.length} 条原始记录`),h('div',{className:'wb-metric-history-rows'},history.map(row=>h('button',{type:'button',key:row.id,tabIndex:isFlipped?0:-1,onClick:e=>sourcePoint(row,e)},h('span',null,validMetricDay(row.date)||dateText(row.date)),h('b',null,String(row.data.rawValue??'—')+' '+(row.data.unit||'')),h('small',null,'来源 ↗'))))),
        h('p',{className:'wb-metric-chart-note'},series.ambiguousDays?'同日多次，顺序未确定，仅显示点。':!series.comparable?'方法 / 机构信息未齐，仅显示点。':rows.length===1?'单点不连线。':'轻度平滑，不判断疗效。',' 点数据点查看来源；再点卡片返回。'))))
}
const renderMetricTrends = () => {
  const categories=categorizedMetricSeries(records),count=categories.reduce((n,c)=>n+c.series.length,0)
  return h('div',{className:'wb-metric-trends'},
    h('div',{className:'wb-actions'},button('＋ 记录一次结果',()=>startRecord('metric'),'wb-button primary'),button('导入检验单',()=>setPage('archives')),button('去一图秀看趋势',()=>setPage('timeline'),'wb-button soft')),
    h('p',{className:'wb-muted wb-small'},'按指标类型自动分类。点击卡片3D翻面，回顾同一指标的时间趋势；不同单位、方法与机构分别保留。'),
    !count?h('div',{className:'wb-empty'},'还没有已确认的指标记录。导入报告或手工记录并核对后，会自动出现在对应分类。'):null,
    categories.map(category=>h('details',{key:category.id,className:'wb-metric-category-section','data-category':category.id,open:category.series.length?true:undefined},
      h('summary',null,h('h2',null,category.label),h('span',null,`${new Set(category.series.map(s=>s.definition?.id||s.name)).size}项${category.series.length?' · '+category.series.length+'个可比组':' · 暂无记录'}`)),
      category.series.length?h('div',{className:'wb-record-metric-grid'},category.series.map(renderMetricTrendCard)):h('p',{className:'wb-muted wb-small'},'尚无此类已确认记录；不会填入0或自动推断结果。'))),
    h('details',{className:'wb-metric-reading-help'},h('summary',null,'如何比较指标与查看原始记录'),h('p',null,'每个可比组按采样时间排列，缺失日期不加入时间轴；参考范围随原报告保留。方法、单位或机构不同时不跨组连线。所有分类仅用于整理记录，不表示诊断、疗效或检查推荐。')))
}
