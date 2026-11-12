import { randomUUID } from 'node:crypto'
import { isAbsolute } from 'node:path'
import { DocumentService, MAX_FILE_BYTES } from './documents.js'

const PREFIX = '/api/lung-cancer-workbench'
const MAX_BODY_BYTES = 256 * 1024

function send(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  })
  res.end(JSON.stringify(body))
}

async function readJson(req, limit=MAX_BODY_BYTES) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > limit) throw Object.assign(new Error('Request body is too large'), { code: 'BODY_TOO_LARGE' })
    chunks.push(chunk)
  }
  if (size === 0) return {}
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) }
  catch { throw Object.assign(new Error('Request body must be valid JSON'), { code: 'INVALID_JSON' }) }
}

function statusFor(error) {
  return ({ INVALID_INPUT: 400, INVALID_JSON: 400, BODY_TOO_LARGE: 413, DUPLICATE_RECORD: 409,
    REVISION_CONFLICT: 409, NOT_FOUND: 404, SQLITE_CONSTRAINT_PRIMARYKEY: 409, CONSENT_REQUIRED:400, PARSE_BUSY:409, PARSER_UNAVAILABLE:503, PARSE_FAILED:502 })[error.code] ?? 500
}

export function createWorkbenchHandlers({ repository, trials, liveTrials, documents = new DocumentService(repository), authenticate, version = '0.1.1', now = () => new Date().toISOString(), createId = randomUUID }) {
  const handle = async (req, res, action) => {
    try {
      const rejection = authenticate(req)
      if (rejection !== undefined) return send(res, rejection, { error: 'AUTHENTICATION_REQUIRED' })
      if (['archives','document','importDocument','parseDocument','confirmDocument','file','export'].includes(action)) {
        const get=['archives','document','file'].includes(action)
        if(req.method!==(get?'GET':'POST'))return send(res,405,{error:'METHOD_NOT_ALLOWED'})
        const params=new URL(req.url,'http://localhost').searchParams
        const body=get?Object.fromEntries(params):await readJson(req,action==='importDocument'?Math.ceil(MAX_FILE_BYTES*4/3)+4096:MAX_BODY_BYTES)
        if(action==='archives')return send(res,200,documents.list(body.caseId))
        if(action==='document')return send(res,200,documents.detail(body.caseId,body.documentId))
        if(action==='importDocument')return send(res,201,await documents.import(body))
        if(action==='parseDocument')return send(res,200,await documents.parse(body))
        if(action==='confirmDocument')return send(res,200,{caseFile:repository.confirmDocumentCandidates(body)})
        if(action==='export')return send(res,201,await documents.export(body))
        const file=await documents.file({...body,preview:body.preview==='true'})
        res.writeHead(200,{'content-type':file.mime,'content-length':file.bytes.length,'cache-control':'no-store','x-content-type-options':'nosniff',
          'content-security-policy':"sandbox; default-src 'none'",'content-disposition':`${file.inline?'inline':'attachment'}; filename*=UTF-8''${encodeURIComponent(file.name)}`})
        return res.end(file.bytes)
      }
      if (action === 'health') {
        if (req.method !== 'GET') return send(res, 405, { error: 'METHOD_NOT_ALLOWED' })
        return send(res, 200, { ok: true, version, apiVersion: 'v1', capabilities: ['health', 'case-records', 'sqlite-local'] })
      }
      if (action === 'cases') {
        if (req.method === 'GET') return send(res, 200, { cases: repository.list() })
        if (req.method !== 'POST') return send(res, 405, { error: 'METHOD_NOT_ALLOWED' })
        const body = await readJson(req)
        const result = repository.create({
          id: body.id || createId(), workspaceId: body.workspaceId || createId(),
          subjectId: body.subjectId || createId(), displayName: body.displayName ?? '',
          subjectRole: body.subjectRole ?? 'patient', createdAt: now(),
        })
        return send(res, 201, { caseFile: result })
      }
      if (action === 'case') {
        if (req.method !== 'GET') return send(res, 405, { error: 'METHOD_NOT_ALLOWED' })
        const id = new URL(req.url, 'http://localhost').searchParams.get('caseId')
        const caseFile = id ? repository.get(id) : null
        return caseFile ? send(res, 200, { caseFile }) : send(res, 404, { error: 'NOT_FOUND' })
      }
      if (action === 'trials') {
        if (req.method !== 'GET') return send(res, 405, { error: 'METHOD_NOT_ALLOWED' })
        const query = new URL(req.url, 'http://localhost').searchParams
        return send(res, 200, trials.search({ q: query.get('q') ?? '', histology: query.get('histology') ?? '',
          status: query.get('status') ?? '', phase: query.get('phase') ?? '', country: query.get('country') ?? '', target:query.get('target')??'', sort:query.get('sort')??'posted',
          page: query.get('page') ?? 1, pageSize: query.get('pageSize') ?? 20 }))
      }
      if (action === 'liveTrials') {
        if (req.method !== 'GET') return send(res, 405, { error: 'METHOD_NOT_ALLOWED' })
        const query = new URL(req.url, 'http://localhost').searchParams
        try {
          return send(res, 200, await liveTrials.search({ q: query.get('q') ?? '', histology: query.get('histology') ?? '' }))
        } catch (error) {
          return send(res, 502, { error: error.code ?? 'UPSTREAM_UNAVAILABLE', message: '在线登记库暂不可用；可以继续搜索内置快照。' })
        }
      }
      if (action === 'append') {
        if (req.method !== 'POST') return send(res, 405, { error: 'METHOD_NOT_ALLOWED' })
        const body = await readJson(req)
        const caseFile = repository.append(body.caseId, body.record, { expectedRevision: body.expectedRevision })
        return send(res, 200, { caseFile })
      }
      if (action === 'review') {
        if (req.method !== 'POST') return send(res, 405, { error: 'METHOD_NOT_ALLOWED' })
        const body = await readJson(req)
        const caseFile = repository.review(body.caseId, body.recordId, body.decision, {
          expectedRevision: body.expectedRevision, expectedRecordRevision: body.expectedRecordRevision,
          actorId: body.actorId, at: now(), reason: body.reason, editedData: body.editedData,
        })
        return send(res, 200, { caseFile })
      }
      return send(res, 404, { error: 'NOT_FOUND' })
    } catch (error) {
      const status = statusFor(error)
      if (status >= 500 && !['PARSE_FAILED','PARSER_UNAVAILABLE'].includes(error.code)) return send(res, status, { error: 'INTERNAL_ERROR' })
      return send(res, status, { error: error.code || 'REQUEST_FAILED', message: error.message })
    }
  }
  /* ---------- 资料目录：读取 / 切换（真入口；口径服务端再判一遍） ---------- */
  const checkDataDir = (raw) => {
    const dir = String(raw || '').trim()
    if (!dir) return { ok: false, reason: '目录为空' }
    if (!isAbsolute(dir)) return { ok: false, reason: '请选择绝对路径' }
    if (/^(\/Users\/[^/]+|\/home\/[^/]+|\/root|[A-Za-z]:\\Users\\[^\\]+)$/i.test(dir)) return { ok: false, reason: '主目录本身不作为资料目录，请建一个专用文件夹' }
    if (/(Desktop|桌面)$/i.test(dir)) return { ok: false, reason: '桌面不作为资料目录' }
    if (/(Downloads?|下载(夹)?)$/i.test(dir)) return { ok: false, reason: '下载根目录不作为资料目录' }
    if (/^(\/tmp|\/private\/tmp|\/var\/folders\/|\/private\/var\/folders\/)/i.test(dir)) return { ok: false, reason: 'tmp 不作为资料目录（会被系统清理）' }
    return { ok: true, dir }
  }

  return new Map([
    [`${PREFIX}/archives`, (req,res)=>handle(req,res,'archives')],
    [`${PREFIX}/documents/read`, (req,res)=>handle(req,res,'document')],
    [`${PREFIX}/documents/import`, (req,res)=>handle(req,res,'importDocument')],
    [`${PREFIX}/documents/parse`, (req,res)=>handle(req,res,'parseDocument')],
    [`${PREFIX}/documents/confirm`, (req,res)=>handle(req,res,'confirmDocument')],
    [`${PREFIX}/files/download`, (req,res)=>handle(req,res,'file')],
    [`${PREFIX}/exports/create`, (req,res)=>handle(req,res,'export')],
    [`${PREFIX}/health`, (req, res) => handle(req, res, 'health')],
    [`${PREFIX}/root`, async (req, res) => {
      try {
        if (req.method === 'GET') return send(res, 200, { dir: repository.root })
        if (req.method !== 'POST') return send(res, 405, { error: 'METHOD_NOT_ALLOWED' })
        const body = await readJson(req)
        const verdict = checkDataDir(body && body.dir)
        if (!verdict.ok) return send(res, 400, { error: 'INVALID_DIR', message: verdict.reason, dir: repository.root })
        return send(res, 200, { dir: repository.switchRoot(body.dir) })
      } catch (error) {
        return send(res, 400, { error: 'ROOT_SWITCH_FAILED', message: error.message, dir: repository.root })
      }
    }],
    [`${PREFIX}/cases`, (req, res) => handle(req, res, 'cases')],
    [`${PREFIX}/cases/read`, (req, res) => handle(req, res, 'case')],
    [`${PREFIX}/trials/search`, (req, res) => handle(req, res, 'trials')],
    [`${PREFIX}/trials/live`, (req, res) => handle(req, res, 'liveTrials')],
    [`${PREFIX}/records/append`, (req, res) => handle(req, res, 'append')],
    [`${PREFIX}/records/review`, (req, res) => handle(req, res, 'review')],
  ])
}
