export function metricIdentity(record) {
  return [record.data.metricName || '未命名指标',record.data.unit || '单位未记录',record.data.methodText || '方法未记录',record.data.laboratoryText || '实验室未记录'].join(' · ')
}
export function validMetricDay(date) {
  if(!['day','exact'].includes(date?.precision))return null
  const value=String(date.value||'').slice(0,10)
  const time=Date.parse(value+'T00:00:00Z')
  return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(time)&&new Date(time).toISOString().slice(0,10)===value?value:null
}
export function numericMetric(record) {
  const raw=record.data?.rawValue
  return raw!==null&&raw!==undefined&&String(raw).trim()!==''&&Number.isFinite(Number(raw))&&Boolean(validMetricDay(record.date))
}
export function metricGroups(records,selection) {
  const groups=new Map()
  for(const r of records) {const key=metricIdentity(r);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r)}
  const resolved=[]
  for(const selected of selection) {
    const key=groups.has(selected)?selected:[...groups].find(([,rows])=>rows[0].data.metricName===selected)?.[0]
    if(key&&!resolved.includes(key))resolved.push(key)
  }
  return resolved.slice(0,4).map(key=>({key,rows:[...groups.get(key)].filter(numericMetric).sort((a,b)=>validMetricDay(a.date).localeCompare(validMetricDay(b.date)))}))
}
// Monotone cubic segments: every control value stays within its two measured endpoints.
export function smoothMetricPath(points) {
  if(!points.length)return ''
  let path=`M${points[0].x},${points[0].y}`
  const slope=(a,b)=>b.x>a.x?(b.y-a.y)/(b.x-a.x):0
  const tangent=i=>{
    if(i===0)return slope(points[0],points[1]||points[0])*.65
    if(i===points.length-1)return slope(points[i-1],points[i])*.65
    const a=slope(points[i-1],points[i]),b=slope(points[i],points[i+1])
    return a*b<=0?0:(2*a*b/(a+b))*.65
  }
  for(let i=1;i<points.length;i++) {
    const a=points[i-1],b=points[i],dx=b.x-a.x
    if(dx<=0){path+=` M${b.x},${b.y}`;continue}
    const lo=Math.min(a.y,b.y),hi=Math.max(a.y,b.y),clamp=y=>Math.max(lo,Math.min(hi,y))
    path+=` C${a.x+dx/3},${clamp(a.y+tangent(i-1)*dx/3)} ${b.x-dx/3},${clamp(b.y-tangent(i)*dx/3)} ${b.x},${b.y}`
  }
  return path
}

export function dateAxisX(day,start,end,left=64,right=944) {
  const t=Date.parse(String(day).slice(0,10)+'T00:00:00Z'),a=Date.parse(start+'T00:00:00Z'),b=Date.parse(end+'T00:00:00Z')
  return b===a?(left+right)/2:left+(t-a)/(b-a)*(right-left)
}
export function placeEventLanes(events,start,end) {
  const occupied=[]
  return events.map(event=>{
    const label=`${String(event.title).slice(0,14)} · ${event.status?.label||''}`
    const x=dateAxisX(event.day,start,end),labelWidth=12+Array.from(label).reduce((width,ch)=>width+(/[\u3000-\u9fff]/.test(ch)?13:8),0)
    const before=x>800?labelWidth:22,after=x>800?22:labelWidth
    let lane=occupied.findIndex(row=>row.every(([a,b])=>x+after+12<a||x-before-12>b))
    if(lane<0){lane=occupied.length;occupied.push([])}
    occupied[lane].push([x-before,x+after])
    return {...event,x,lane}
  })
}
export function timelineEventState(record) {
  if(['candidate','needs_review'].includes(record.review?.state))return {label:'待核对',kind:'pending'}
  const states={proposed:['讨论中','discussion'],ordered:['计划','planned'],scheduled:['计划','planned'],administered_or_performed:['已发生','actual'],completed:['已发生','actual'],held:['暂停','unknown'],changed:['已调整','discussion'],cancelled:['已取消','unknown'],unknown:['状态未知','unknown']}
  if(record.data?.status&&states[record.data.status]){const [label,kind]=states[record.data.status];return{label,kind}}
  if(['patient_reported','caregiver_reported'].includes(record.source?.kind))return{label:'本人 / 照护者自述',kind:'reported'}
  return {label:'报告记录',kind:'reported'}
}

// Visual clustering only: original dates, records and statuses remain on every member.
// Six category rows never gain height as more records arrive.
export function clusterTimelineEvents(events,start,end,gap=38) {
  const rows=new Map()
  for(const event of events){const category=event.category||'other';if(!rows.has(category))rows.set(category,[]);rows.get(category).push({...event,x:dateAxisX(event.day,start,end)})}
  const clusters=[]
  for(const [category,items] of rows){
    items.sort((a,b)=>a.x-b.x||String(a.id).localeCompare(String(b.id)))
    let cluster=null
    for(const event of items){
      if(!cluster||event.x-cluster.leftX>=gap){cluster={id:`cluster-${category}-${event.id}`,category,leftX:event.x,rightX:event.x,members:[]};clusters.push(cluster)}
      cluster.members.push(event);cluster.rightX=event.x;cluster.x=(cluster.leftX+cluster.rightX)/2
      cluster.start=cluster.members[0].day;cluster.end=event.day
    }
  }
  return clusters
}

// Compact display labels never replace the full comparison identity.
export function metricShortName(name) {
  return ({'白细胞':'WBC','中性粒细胞绝对值':'ANC','血红蛋白':'Hb','血小板':'PLT','白蛋白':'ALB','肌酐':'Cr','血钾':'K'})[name]||name
}
