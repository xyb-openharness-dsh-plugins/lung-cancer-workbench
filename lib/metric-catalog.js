import { metricIdentity, numericMetric, validMetricDay } from './chart-geometry.js'

// Display categories and aliases only; no clinical ranges, grading or recommendations.
export const METRIC_CATEGORIES = [
  {id:'tumor',label:'肿瘤标志物'}, {id:'cbc',label:'血常规'}, {id:'liver',label:'肝功能'},
  {id:'kidney',label:'肾功能与电解质'}, {id:'coagulation',label:'凝血'},
  {id:'infection',label:'感染与炎症相关'}, {id:'nutrition',label:'营养相关'},
  {id:'body',label:'身体测量'}, {id:'vitals',label:'心电与生命体征'}, {id:'other',label:'其他已记录指标'},
]
export const METRIC_DEFINITIONS = [
  ['cea','CEA','CEA','tumor','ng/mL',['癌胚抗原']],
  ['cyfra','CYFRA21-1','CYFRA21-1','tumor','ng/mL',['CYFRA 21-1','细胞角蛋白19片段']],
  ['nse','NSE','NSE','tumor','ng/mL',['神经元特异性烯醇化酶']],
  ['scc','SCC','SCC','tumor','ng/mL',['鳞状细胞癌抗原','SCC-Ag']],
  ['progrp','ProGRP','ProGRP','tumor','pg/mL',['胃泌素释放肽前体']],
  ['ca199','CA19-9','CA19-9','tumor','U/mL',['CA199','糖类抗原19-9']],
  ['wbc','白细胞','WBC','cbc','10^9/L',['WBC','白细胞计数']],
  ['anc','中性粒细胞绝对值','ANC','cbc','10^9/L',['ANC','NEUT#','中性粒细胞计数']],
  ['hb','血红蛋白','Hb','cbc','g/L',['Hb','HGB']],
  ['plt','血小板','PLT','cbc','10^9/L',['PLT','血小板计数']],
  ['alt','ALT','ALT','liver','U/L',['谷丙转氨酶','丙氨酸氨基转移酶']],
  ['ast','AST','AST','liver','U/L',['谷草转氨酶','天门冬氨酸氨基转移酶']],
  ['bilirubin','总胆红素','TBIL','liver','μmol/L',['TBIL']],
  ['creatinine','肌酐','Cr','kidney','μmol/L',['Cr','CREA','血肌酐']],
  ['urea','尿素','UREA','kidney','mmol/L',['UREA']],
  ['potassium','血钾','K','kidney','mmol/L',['K','钾']],
  ['sodium','血钠','Na','kidney','mmol/L',['Na','钠']],
  ['pt','凝血酶原时间','PT','coagulation','s',['PT']],
  ['aptt','活化部分凝血活酶时间','APTT','coagulation','s',['APTT']],
  ['inr','国际标准化比值','INR','coagulation','',['INR']],
  ['fibrinogen','纤维蛋白原','FIB','coagulation','g/L',['FIB']],
  ['ddimer','D-二聚体','D-Dimer','coagulation','',['D-Dimer','D二聚体']],
  ['crp','CRP','CRP','infection','mg/L',['C反应蛋白','C-反应蛋白']],
  ['hscrp','超敏C反应蛋白','hs-CRP','infection','mg/L',['hsCRP','超敏C-反应蛋白']],
  // Bare PCT is ambiguous (plateletcrit vs procalcitonin); preserve it under other.
  ['procalcitonin','降钙素原','PCT','infection','ng/mL',[]],
  ['albumin','白蛋白','ALB','nutrition','g/L',['ALB','血清白蛋白']],
  ['weight','体重','体重','body','kg',[]],
  ['qtc','QTc','QTc','vitals','ms',['QTc间期']],
  ['spo2','血氧饱和度','SpO₂','vitals','%',['SpO2','SpO₂']],
].map(([id,name,shortName,category,unitHint,aliases])=>({id,name,shortName,category,unitHint,aliases}))

export function metricDefinition(name) {
  const normalize=value=>String(value||'').normalize('NFKC').replace(/[\s._‐‑–—-]/g,'').toUpperCase()
  const key=normalize(name)
  return METRIC_DEFINITIONS.find(d=>[d.name,...d.aliases].some(alias=>normalize(alias)===key))||null
}

export function categorizedMetricSeries(records) {
  const groups=new Map()
  for(const row of records){
    if(row.kind!=='metric'||row.review?.state!=='accepted'||row.data?.private===true||row.data?.sharingScope==='private'||row.data?.domain==='mind'||row.data?.supportType==='mind')continue
    const key=metricIdentity(row)
    if(!groups.has(key))groups.set(key,[])
    groups.get(key).push(row)
  }
  const series=[...groups].map(([key,rows])=>{
    const first=rows[0],definition=metricDefinition(first.data.metricName),dated=rows.filter(r=>validMetricDay(r.date)).sort((a,b)=>validMetricDay(a.date).localeCompare(validMetricDay(b.date))||String(a.id).localeCompare(String(b.id)))
    const latestDay=dated.length?validMetricDay(dated.at(-1).date):null,latestRows=dated.filter(r=>validMetricDay(r.date)===latestDay)
    const latest=latestRows.length===1?latestRows[0]:null,previousDay=dated.filter(r=>validMetricDay(r.date)<latestDay).at(-1),previousRows=previousDay?dated.filter(r=>validMetricDay(r.date)===validMetricDay(previousDay.date)):[]
    const previous=previousRows.length===1?previousRows[0]:null,numericRows=dated.filter(numericMetric),ambiguousDays=new Set(numericRows.map(r=>validMetricDay(r.date))).size!==numericRows.length
    const comparable=Boolean(first.data.unit&&first.data.methodText&&first.data.laboratoryText),connectable=comparable&&!ambiguousDays
    const delta=connectable&&latest&&previous&&numericMetric(latest)&&numericMetric(previous)?Number((Number(latest.data.rawValue)-Number(previous.data.rawValue)).toPrecision(6)):null
    return {key,definition,name:definition?.name||first.data.metricName||'未命名指标',shortName:definition?.shortName||first.data.metricName||'未命名指标',category:definition?.category||'other',rows,dated,numericRows,undated:rows.filter(r=>!validMetricDay(r.date)),latestDay,latestRows,latest,previous,delta,comparable,connectable,ambiguousDays,unit:first.data.unit||'',method:first.data.methodText||'',laboratory:first.data.laboratoryText||''}
  })
  return METRIC_CATEGORIES.map(category=>({...category,series:series.filter(s=>s.category===category.id).sort((a,b)=>{
    const ai=METRIC_DEFINITIONS.indexOf(a.definition),bi=METRIC_DEFINITIONS.indexOf(b.definition)
    return ai-bi||a.key.localeCompare(b.key)
  })}))
}

// Preserve legacy name selections while resolving only eligible, full-identity series.
export function selectedMetricSeries(records, selection) {
  const series=categorizedMetricSeries(records).flatMap(category=>category.series),selected=[]
  for(const key of selection){
    const match=series.find(s=>s.key===key)||series.filter(s=>s.rows[0].data.metricName===key).sort((a,b)=>records.indexOf(a.rows[0])-records.indexOf(b.rows[0]))[0]
    if(match&&!selected.includes(match))selected.push(match)
  }
  return selected.slice(0,4)
}
