import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile, unlink, access } from 'node:fs/promises'
import { constants } from 'node:fs'
import { resolve, join, extname, sep, delimiter } from 'node:path'
import { homedir } from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)
export const MAX_FILE_BYTES = 20 * 1024 * 1024
export const documentFormats = Object.freeze({
  '.pdf':'application/pdf','.doc':'application/msword','.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls':'application/vnd.ms-excel','.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt':'application/vnd.ms-powerpoint','.pptx':'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.txt':'text/plain','.md':'text/markdown','.csv':'text/csv','.json':'application/json','.html':'text/html','.htm':'text/html','.rtf':'application/rtf',
  '.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.bmp':'image/bmp',
  '.tif':'image/tiff','.tiff':'image/tiff','.heic':'image/heic','.heif':'image/heif',
})
const localFormats = new Set(['.txt','.md','.csv','.json','.html','.htm','.rtf'])
const error = (message, code='INVALID_INPUT') => Object.assign(new Error(message),{code})
const digest = bytes => createHash('sha256').update(bytes).digest('hex')
const now = () => new Date().toISOString()

function validateFile(name, encoded) {
  if (typeof name !== 'string' || !name.trim() || name.length>240) throw error('文件名不能为空且不得超过240字符')
  const extension=extname(name).toLowerCase(), mime=documentFormats[extension]
  if (!mime) throw error('不支持此文件格式；请选择PDF、Office、文本或常见图片/HEIC')
  if (typeof encoded!=='string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) || encoded.length%4) throw error('文件内容编码无效')
  const bytes=Buffer.from(encoded,'base64')
  if (!bytes.length || bytes.length>MAX_FILE_BYTES) throw error('单份文件需大于0且不超过20MB')
  const ascii=bytes.subarray(0,32).toString('latin1'), hex=bytes.subarray(0,8).toString('hex')
  const signatures={ '.pdf':ascii.startsWith('%PDF-'),'.png':hex==='89504e470d0a1a0a', '.jpg':hex.startsWith('ffd8ff'),'.jpeg':hex.startsWith('ffd8ff'),
    '.gif':/^GIF8[79]a/.test(ascii),'.webp':ascii.startsWith('RIFF')&&ascii.slice(8,12)==='WEBP','.bmp':ascii.startsWith('BM'),
    '.tif':/^(49492a00|4d4d002a)/.test(hex),'.tiff':/^(49492a00|4d4d002a)/.test(hex),
    '.heic':ascii.slice(4,8)==='ftyp'&&/(heic|heix|hevc|hevx|mif1|msf1|heif)/.test(ascii),'.heif':ascii.slice(4,8)==='ftyp'&&/(heic|heix|hevc|hevx|mif1|msf1|heif)/.test(ascii),
    '.doc':hex==='d0cf11e0a1b11ae1','.xls':hex==='d0cf11e0a1b11ae1','.ppt':hex==='d0cf11e0a1b11ae1',
    '.docx':hex.startsWith('504b0304'),'.xlsx':hex.startsWith('504b0304'),'.pptx':hex.startsWith('504b0304'),'.rtf':ascii.startsWith('{\\rtf') }
  if (extension in signatures && !signatures[extension]) throw error('文件内容与扩展名不符，请检查原文件')
  if (localFormats.has(extension)&&extension!=='.rtf') { try { new TextDecoder('utf-8',{fatal:true}).decode(bytes) } catch { throw error('文本文件需使用UTF-8编码') } }
  return {bytes,extension,mime,name:name.replace(/[\\/\u0000-\u001f]/g,'_')}
}

export async function mineruCli() {
  const candidates=[process.env.MINERU_OPEN_API_PATH,...String(process.env.PATH||'').split(delimiter).filter(Boolean).map(p=>join(p,'mineru-open-api')),
    join(homedir(),'.local/bin/mineru-open-api'),'/usr/local/bin/mineru-open-api','/opt/homebrew/bin/mineru-open-api'].filter(Boolean)
  for (const candidate of candidates) { try { await access(candidate,constants.X_OK); return candidate } catch {} }
  return null
}

export async function cloudExtract(path, extension) {
  const cli=await mineruCli()
  if (!cli) throw error('未找到 MinerU CLI；原件已保存，可安装配置后重试或手工录入','PARSER_UNAVAILABLE')
  const legacy=['.doc','.xls','.ppt','.html','.htm','.rtf'].includes(extension)
  try {
    const args=legacy?['extract',path,'--format','md','--model','pipeline','--ocr']:['flash-extract',path,'--ocr']
    const {stdout}=await run(cli,args,{timeout:120000,maxBuffer:8*1024*1024,windowsHide:true})
    if (!stdout.trim()) throw error('解析未返回文本','PARSE_FAILED')
    return {text:stdout.trim(),engine:legacy?'mineru-api-pipeline':'mineru-flash'}
  } catch(e) { if(e.code==='PARSER_UNAVAILABLE')throw e; throw error(e.killed?'解析超时，原件仍在本机，可重试':'MinerU 解析失败，请检查服务/凭据或文件大小限制；原件已保留','PARSE_FAILED') }
}

export function extractionCandidates(text) {
  const result=[]
  const add=(kind,data,quote)=>result.push({id:randomUUID(),kind,date:{precision:'unknown',value:null},data,sourceQuote:quote.slice(0,12000)})
  add('pathology',{titleText:'报告转录（待核对类型与内容）',originalText:text.slice(0,12000)},text)
  const diagnosis=text.match(/非小细胞肺癌|小细胞肺癌|肺腺癌|肺鳞(?:状细胞)?癌/)
  if(diagnosis) add('diagnosis',{clinicalType:diagnosis[0]==='小细胞肺癌'?'sclc':'nsclc',histologyText:diagnosis[0],originalText:diagnosis.input.slice(Math.max(0,diagnosis.index-40),diagnosis.index+100)},diagnosis[0])
  const stage=text.match(/(?:分期|TNM)[：:\s]+([^\n。]{1,80})/i)
  if(stage)add('staging',{systemText:'报告原文，体系待核对',stageText:stage[1],originalText:stage[0]},stage[0])
  for(const line of text.split('\n').filter(line=>/\b(EGFR|ALK|ROS1|KRAS|BRAF|MET|RET|NTRK|HER2|PD-L1)\b/i.test(line)).slice(0,6)) add('biomarker',{titleText:'分子 / PD-L1 原文（待核对）',originalText:line.slice(0,1000)},line)
  const re=/(?:^|\n|\|)\s*(CEA|CYFRA\s*21-1|NSE|SCC|ProGRP)\s*[:：|\s]+([0-9]+(?:\.[0-9]+)?)\s*(ng\/mL|ng\/ml|pg\/mL|μg\/L|ug\/L)\b/gi
  for(const match of text.matchAll(re)) { if(result.length>=25)break;add('metric',{metricName:match[1].replace(/\s/g,''),rawValue:match[2],unit:match[3],methodText:null},match[0].trim()) }
  return result
}

export class DocumentService {
  constructor(repository,{extract=cloudExtract,convert=async(source,target)=>run('/usr/bin/sips',['-s','format','png',source,'--out',target],{timeout:30000,maxBuffer:1024*1024})}={}) {
    this.repository=repository;this.db=repository.db;this.root=repository.rootPath;this.extract=extract;this.convert=convert;this.inflight=new Set()
    this.db.prepare("UPDATE documents SET status='failed',parse_error='上次解析被中断，原件已保留，请重试' WHERE status='parsing'").run()
  }
  path(relative) {const p=resolve(this.root,relative);if(!p.startsWith(this.root+sep))throw error('文件路径无效');return p}
  requireCase(id) {if(!this.repository.get(id))throw error('请先选择真实病例档案','NOT_FOUND')}
  document(caseId,id) {const row=this.db.prepare('SELECT * FROM documents WHERE case_id=? AND id=?').get(caseId,id);if(!row)throw error('资料不存在或不属于当前病例','NOT_FOUND');return row}
  summary(row) {const {relative_path,preview_path,parsed_text,consent_at,...safe}=row;return {...safe,hasPreview:Boolean(preview_path)||['.pdf','.png','.jpg','.jpeg','.webp','.gif'].includes(row.extension),localParse:localFormats.has(row.extension)}}
  list(caseId) {this.requireCase(caseId);return {documents:this.db.prepare('SELECT * FROM documents WHERE case_id=? ORDER BY created_at DESC').all(caseId).map(row=>this.summary(row)),exports:this.db.prepare('SELECT id,name,mime,size,sha256,created_at FROM export_artifacts WHERE case_id=? ORDER BY created_at DESC').all(caseId)}}
  detail(caseId,id) {const doc=this.document(caseId,id);return {document:this.summary(doc),text:doc.parsed_text||'',candidates:this.db.prepare('SELECT * FROM document_candidates WHERE case_id=? AND document_id=? AND parse_revision=? ORDER BY rowid').all(caseId,id,doc.parse_revision).map(row=>({id:row.id,kind:row.kind,date:JSON.parse(row.date_json),data:JSON.parse(row.data_json),sourceQuote:row.source_quote,status:row.status,recordId:row.record_id}))}}
  async import({caseId,name,dataBase64}) {
    this.requireCase(caseId);const f=validateFile(name,dataBase64),sha=digest(f.bytes)
    const existing=this.db.prepare('SELECT * FROM documents WHERE case_id=? AND sha256=?').get(caseId,sha)
    if(existing)return {document:this.summary(existing),duplicate:true}
    const id=randomUUID(),relative=join('documents',id+f.extension),source=this.path(relative)
    await mkdir(this.path('documents'),{recursive:true,mode:0o700});await writeFile(source,f.bytes,{flag:'wx',mode:0o600})
    let preview=null,previewError=null
    if(['.heic','.heif','.tif','.tiff','.bmp'].includes(f.extension)) {
      preview=join('documents',id+'-preview.png')
      try{await this.convert(source,this.path(preview))}catch{preview=null;previewError='预览转换失败；原件已保留，可下载或稍后重试解析'}
    }
    try{this.db.prepare('INSERT INTO documents(id,case_id,name,mime,extension,size,sha256,relative_path,preview_path,preview_error,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(id,caseId,f.name,f.mime,f.extension,f.bytes.length,sha,relative,preview,previewError,now())}
    catch(e){await unlink(source).catch(()=>{});if(preview)await unlink(this.path(preview)).catch(()=>{});const prior=this.db.prepare('SELECT * FROM documents WHERE case_id=? AND sha256=?').get(caseId,sha);if(prior)return{document:this.summary(prior),duplicate:true};throw e}
    return {document:this.summary(this.document(caseId,id)),duplicate:false}
  }
  async parse({caseId,documentId,cloudConsent=false}) {
    const doc=this.document(caseId,documentId),local=localFormats.has(doc.extension)
    if(!local&&cloudConsent!==true)throw error('解析此文件会发送至 MinerU，请先明确同意','CONSENT_REQUIRED')
    if(this.inflight.has(documentId))throw error('此文件正在解析，请稍后','PARSE_BUSY')
    this.inflight.add(documentId)
    const revision=doc.parse_revision+1
    this.db.prepare("UPDATE documents SET status='parsing',parse_error=NULL,parse_revision=? WHERE id=?").run(revision,documentId)
    try {
      let text,engine
      if(local){if(doc.extension==='.rtf'){({stdout:text}=await run('/usr/bin/textutil',['-convert','txt','-stdout',this.path(doc.relative_path)],{timeout:30000,maxBuffer:4*1024*1024}));engine='local-textutil'}else{text=await readFile(this.path(doc.relative_path),'utf8');engine='local-utf8'}if(['.html','.htm'].includes(doc.extension))text=text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]*>/g,' ')}
      else {let source=this.path(doc.relative_path),ext=doc.extension;if(['.heic','.heif','.tif','.tiff','.bmp'].includes(ext)){let preview=doc.preview_path||join('documents',documentId+'-preview.png');if(!doc.preview_path)await this.convert(source,this.path(preview));source=this.path(preview);ext='.png';this.db.prepare('UPDATE documents SET preview_path=?,preview_error=NULL WHERE id=?').run(preview,documentId)};({text,engine}=await this.extract(source,ext))}
      text=String(text||'').trim();if(!text||text.length>1_000_000)throw error('解析文本为空或过大，请拆分文件','PARSE_FAILED')
      this.db.exec('BEGIN IMMEDIATE')
      try{const at=now();this.db.prepare("UPDATE documents SET status='parsed',parsed_text=?,parser=?,consent_at=?,parsed_at=? WHERE id=?").run(text,engine,local?null:at,at,documentId)
        const insert=this.db.prepare('INSERT INTO document_candidates(id,document_id,case_id,parse_revision,kind,date_json,data_json,source_quote,created_at) VALUES (?,?,?,?,?,?,?,?,?)')
        for(const c of extractionCandidates(text))insert.run(c.id,documentId,caseId,revision,c.kind,JSON.stringify(c.date),JSON.stringify(c.data),c.sourceQuote,at)
        this.db.exec('COMMIT')
      }catch(e){this.db.exec('ROLLBACK');throw e}
      return this.detail(caseId,documentId)
    }catch(e){this.db.prepare("UPDATE documents SET status='failed',parse_error=? WHERE id=?").run(e.code==='PARSE_FAILED'||e.code==='PARSER_UNAVAILABLE'?e.message:'解析失败，原件已保留，可重试',documentId);throw e.code?e:error('解析失败，原件已保留，可重试','PARSE_FAILED')}
    finally{this.inflight.delete(documentId)}
  }
  async file({caseId,id,kind='source',preview=false}) {
    let row,relative,mime,name
    if(kind==='export'){row=this.db.prepare('SELECT * FROM export_artifacts WHERE case_id=? AND id=?').get(caseId,id);if(!row)throw error('输出文件不存在','NOT_FOUND');relative=row.relative_path;mime=row.mime;name=row.name}
    else{row=this.document(caseId,id);relative=preview&&row.preview_path?row.preview_path:row.relative_path;mime=preview&&row.preview_path?'image/png':row.mime;name=row.name}
    return {bytes:await readFile(this.path(relative)),mime,name,inline:preview&&['application/pdf','image/png','image/jpeg','image/webp','image/gif'].includes(mime)}
  }
  async export({caseId,format='json',expectedRevision}) {
    const file=this.repository.get(caseId);if(!file)throw error('档案不存在','NOT_FOUND')
    if(file.revision!==expectedRevision)throw error('档案已更新，请刷新后导出','REVISION_CONFLICT')
    if(!['json','md'].includes(format))throw error('请选择JSON或Markdown格式')
    const records=file.records.filter(r=>r.review.state==='accepted'&&r.data?.private!==true&&r.data?.sharingScope!=='private'&&r.data?.domain!=='mind'&&r.data?.supportType!=='mind')
    const at=now(),id=randomUUID(),name=`xiaofeibao-${at.slice(0,10)}-${id.slice(0,8)}.${format}`
    const snapshot={exportedAt:at,scope:'已确认且未标记私密的记录；不包含原件',caseFile:{...file,records,decisions:file.decisions.filter(d=>records.some(r=>r.id===d.recordId))},documents:this.list(caseId).documents.filter(d=>records.some(r=>r.source.documentId===d.id)).map(d=>({id:d.id,name:d.name,sha256:d.sha256}))}
    const text=format==='json'?JSON.stringify(snapshot,null,2):`# 小肺宝 · 病程资料\n\n生成时间：${at}\n仅含已确认且未标记私密的记录；原文转录不等于医学核实。\n\n`+records.map(r=>`## ${r.date.value||'日期未知'} · ${r.data.titleText||r.data.histologyText||r.data.metricName||r.data.eventTypeText||r.kind}\n\n${Object.values(r.data).filter(v=>typeof v==='string').join(' · ')}\n\n来源：${r.source.documentId||r.source.kind}\n`).join('\n')
    const bytes=Buffer.from(text),relative=join('exports',id+'.'+format);await mkdir(this.path('exports'),{recursive:true,mode:0o700});await writeFile(this.path(relative),bytes,{flag:'wx',mode:0o600})
    try{this.db.prepare('INSERT INTO export_artifacts(id,case_id,name,mime,size,sha256,relative_path,created_at) VALUES (?,?,?,?,?,?,?,?)').run(id,caseId,name,format==='json'?'application/json':'text/markdown',bytes.length,digest(bytes),relative,at)}catch(e){await unlink(this.path(relative)).catch(()=>{});throw e}
    return {artifact:{id,name,size:bytes.length,created_at:at}}
  }
}
