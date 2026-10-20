// Build-only fixtures: exact synthetic timeline data from the developer's frozen v4.2.6.
import { readFileSync, writeFileSync } from 'node:fs'
import vm from 'node:vm'
const prototype=readFileSync(new URL('../docs/prototype/lung-workbench-v4.2.6.html',import.meta.url),'utf8')
const metricsStart=prototype.indexOf('const METRICS ='),profilesStart=prototype.indexOf('const PROFILES ='),profilesEnd=prototype.indexOf('\n];',profilesStart)+3
const sandbox={};vm.runInNewContext(prototype.slice(metricsStart,profilesEnd)+';globalThis.result={METRICS,PROFILES}',sandbox,{timeout:1000})
const {METRICS,PROFILES}=sandbox.result
const path=new URL('../lib/demo-cases.json',import.meta.url),existing=JSON.parse(readFileSync(path,'utf8')).filter(c=>!c.prototypeReference)
const cases=PROFILES.map(p=>{
 const id='prototype-'+p.id,records=[]
 const add=(rid,kind,day,data,sourceKind,documentId)=>records.push({id:rid,kind,subjectId:id,date:{precision:day?'day':'unknown',value:day||null},data:kind==='specimen'?{...data,specimenId:rid}:data,review:{state:'accepted',revision:1},source:{kind:sourceKind,documentId},createdBy:id,createdAt:(day||'2026-10-20')+'T09:00:00.000Z'})
 for(const [key,series] of Object.entries(p.series)){const metric=METRICS[key];if(metric)series.forEach(([day,value],i)=>add(`${id}-${key}-${i}`,'metric',day,{metricName:metric.name,unit:metric.unit,rawValue:String(value),methodText:'模拟同一检测方法',laboratoryText:'模拟同一实验室'},'report','模拟报告-'+day))}
 p.events.forEach((e,i)=>add(`${id}-event-${i}`,({treatment:'systemic_therapy',imaging:'imaging',pathology:'pathology',procedure:'specimen',symptom:'symptom',visit:'care_task'})[e.kind]||'imaging',e.d,{titleText:e.title,originalText:e.note,status:/预约|已安排/.test(e.title)?'scheduled':/讨论|沟通/.test(e.title)?'proposed':'unknown'},e.kind==='symptom'?'patient_reported':'report','模拟来源-'+i))
 p.treatments.forEach((t,i)=>add(`${id}-treatment-${i}`,t.cat==='手术'?'surgery':t.cat==='放疗'?'radiotherapy':'systemic_therapy',t.start,{eventTypeText:t.name,detailText:t.note,endDate:t.end||null,status:t.status==='已完成'?'completed':t.status==='进行中'?'administered_or_performed':t.status==='计划中'?'scheduled':'unknown'},'clinician_document','模拟治疗来源-'+i))
 return {schemaVersion:1,id,workspaceId:id,subjectId:id,subjectRole:'patient',displayName:p.name,revision:1,demo:true,prototypeReference:true,referenceProfile:p,demoScenario:p.meta,demoSummary:'原型 v4.2.6 对照 · '+p.meta+' · 全部为合成资料',records,decisions:[],createdAt:'2026-10-20T09:00:00.000Z'}
})
writeFileSync(path,JSON.stringify([...existing,...cases],null,2)+'\n')
