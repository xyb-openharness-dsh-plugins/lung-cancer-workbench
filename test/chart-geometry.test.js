import test from 'node:test'
import assert from 'node:assert/strict'
import { metricGroups, numericMetric, smoothMetricPath, dateAxisX, placeEventLanes, timelineEventState, clusterTimelineEvents } from '../lib/chart-geometry.js'

test('smoothing preserves measured points and keeps every cubic control within endpoint bounds',()=>{
  const points=[{x:0,y:9},{x:50,y:1},{x:80,y:7},{x:130,y:7}],path=smoothMetricPath(points)
  assert.match(path,/^M0,9 C/)
  const segments=[...path.matchAll(/C([\d.e+-]+),([\d.e+-]+) ([\d.e+-]+),([\d.e+-]+) ([\d.e+-]+),([\d.e+-]+)/g)]
  assert.equal(segments.length,3)
  segments.forEach((s,i)=>{for(const y of [Number(s[2]),Number(s[4])])assert.ok(y>=Math.min(points[i].y,points[i+1].y)&&y<=Math.max(points[i].y,points[i+1].y));assert.equal(Number(s[6]),points[i+1].y)})
  assert.equal(smoothMetricPath([{x:1,y:2}]),'M1,2')
})
test('events and measured points share a real date axis; nearby events keep their dates and occupy separate lanes',()=>{
  const start='2026-01-01',end='2026-02-01',day='2026-01-02'
  const events=placeEventLanes([{id:'a',day,title:'肺部取材'},{id:'b',day,title:'分子检测'}],start,end)
  assert.equal(events[0].x,dateAxisX(day,start,end));assert.equal(events[0].x,events[1].x);assert.notEqual(events[0].lane,events[1].lane)
  assert.ok(dateAxisX(day,start,end)-64<880/10,'one day is positioned by elapsed date, not item index')
})
test('discussion, planned, occurred and candidate states are independent of event date',()=>{
  const record=status=>({date:{value:'2020-01-01'},review:{state:'accepted'},data:{status}})
  assert.equal(timelineEventState(record('proposed')).kind,'discussion')
  assert.equal(timelineEventState(record('scheduled')).kind,'planned')
  assert.equal(timelineEventState(record('completed')).kind,'actual')
  assert.equal(timelineEventState({...record('completed'),review:{state:'candidate'}}).kind,'pending')
})
test('default name selections never mix units or methods; blank/unknown-date values are excluded and rows sort chronologically',()=>{
  const record=(date,value,unit='ng/mL',method='A')=>({kind:'metric',date:{precision:'day',value:date},data:{metricName:'CEA',rawValue:value,unit,methodText:method}})
  const records=[record('2026-02-01','2'),record('2026-01-01','3'),record('2026-03-01','4','μg/L'),record('2026-04-01','5','ng/mL','B'),record('2026-06-01',' ')]
  const groups=metricGroups(records,['CEA']);assert.equal(groups.length,1);assert.equal(groups[0].rows.length,2);assert.equal(groups[0].rows[0].data.rawValue,'3')
  assert.equal(numericMetric({...records[0],date:{precision:'unknown',value:null}}),false)
  assert.equal(numericMetric(record('2026-02-31','1')),false)
})


test('dense event clusters preserve every source record and keep categories and dates distinct',()=>{
  const events=Array.from({length:500},(_,i)=>({id:'e'+i,day:`2026-01-${String(1+i%28).padStart(2,'0')}`,category:['treatment','imaging','pathology','procedure','symptom','visit'][i%6],status:{kind:i%2?'planned':'actual'},record:{id:'r'+i}}))
  const clusters=clusterTimelineEvents(events,'2026-01-01','2026-12-31')
  assert.equal(clusters.flatMap(c=>c.members).length,events.length)
  assert.equal(new Set(clusters.flatMap(c=>c.members.map(e=>e.id))).size,events.length)
  assert.ok(clusters.length<30,'dense records form a bounded number of visual clusters')
  for(const c of clusters){assert.ok(c.members.every(e=>e.category===c.category));assert.ok(c.rightX-c.leftX<38);for(const e of c.members){assert.equal(e.x,dateAxisX(e.day,'2026-01-01','2026-12-31'));assert.equal(e.record.id,'r'+e.id.slice(1))}}
  assert.deepEqual(clusterTimelineEvents([],'2026-01-01','2026-12-31'),[])
})
