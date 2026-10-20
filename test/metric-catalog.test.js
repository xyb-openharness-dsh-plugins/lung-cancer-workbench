import test from 'node:test'
import assert from 'node:assert/strict'
import { categorizedMetricSeries,metricDefinition } from '../lib/metric-catalog.js'
import { readFileSync } from 'node:fs'
const row=(id,name,date,value,extra={})=>({id,kind:'metric',date:{precision:date?'day':'unknown',value:date||null},source:{kind:'report',documentId:'report-'+id},review:{state:'accepted'},data:{metricName:name,rawValue:value,unit:'unit',methodText:'A',laboratoryText:'Lab',...extra}})
const all=records=>categorizedMetricSeries(records).flatMap(c=>c.series)
test('classification covers tumor, CBC, liver, coagulation and infection without guessing unknown terms',()=>{
 for(const [name,category] of [['CEA','tumor'],['WBC','cbc'],['ALT','liver'],['PT','coagulation'],['D二聚体','coagulation'],['C-反应蛋白','infection'],['降钙素原','infection'],['QTc','vitals']])assert.equal(metricDefinition(name)?.category,category)
 assert.equal(metricDefinition('PCT'),null,'ambiguous plateletcrit/procalcitonin is not guessed')
 const unknown=categorizedMetricSeries([row('x','未归类项目','2026-01-01','3')]).find(c=>c.id==='other');assert.equal(unknown.series.length,1)
})
test('all confirmed demo observations survive grouping while candidates, superseded and private are excluded',()=>{
 const demos=JSON.parse(readFileSync(new URL('../lib/demo-cases.json',import.meta.url),'utf8'))
 for(const demo of demos){const metrics=demo.records.filter(r=>r.kind==='metric'&&r.review.state==='accepted');assert.equal(all(demo.records).flatMap(s=>s.rows).length,metrics.length)}
 const r=row('r','CEA','2026-01-01',0)
 assert.equal(all([r,{...r,id:'candidate',review:{state:'candidate'}},{...r,id:'old',review:{state:'superseded'}},{...r,id:'private',data:{...r.data,private:true}}]).flatMap(s=>s.rows).length,1)
})
test('chronological series preserve zero and never bridge units, methods or laboratories',()=>{
 const rows=[row('b','CEA','2026-02-01',0),row('a','CEA','2026-01-01',2),row('unit','CEA','2026-03-01',8,{unit:'different'}),row('method','CEA','2026-03-01',9,{methodText:'B'}),row('lab','CEA','2026-03-01',7,{laboratoryText:'Other'})]
 const series=all(rows);assert.equal(series.length,4);const base=series.find(s=>s.rows.length===2)
 assert.equal(base.latest.data.rawValue,0);assert.equal(base.delta,-2);assert.deepEqual(base.dated.map(r=>r.id),['a','b'])
})
test('unknown dates, nonnumeric text, incomplete comparison metadata and same-day records remain honest',()=>{
 const [unknown]=all([row('u','CEA',null,4)]);assert.equal(unknown.latest,null);assert.equal(unknown.numericRows.length,0);assert.equal(unknown.undated.length,1)
 const [text]=all([row('t','CEA','2026-01-01','<0.1')]);assert.equal(text.latest.data.rawValue,'<0.1');assert.equal(text.numericRows.length,0)
 const [missing]=all([row('a','CEA','2026-01-01',1,{methodText:''}),row('b','CEA','2026-01-02',2,{methodText:''})]);assert.equal(missing.connectable,false);assert.equal(missing.delta,null)
 const [ties]=all([row('a','CEA','2026-01-01',1),row('b','CEA','2026-01-01',2)]);assert.equal(ties.latest,null);assert.equal(ties.latestRows.length,2);assert.equal(ties.connectable,false);assert.equal(ties.delta,null)
})
