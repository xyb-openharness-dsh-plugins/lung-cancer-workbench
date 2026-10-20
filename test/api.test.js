import test from 'node:test'
import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SqliteCaseRepository } from '../lib/server/sqlite-case-repository.js'
import { createWorkbenchHandlers } from '../lib/server/api.js'
import { TrialSnapshotRepository } from '../lib/server/trial-snapshot.js'

function setup({ reject = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'lung-api-'))
  const repository = new SqliteCaseRepository(root)
  const trials = new TrialSnapshotRepository(fileURLToPath(new URL('../assets/data/lung-cancer-trials.sqlite', import.meta.url)))
  const routes = createWorkbenchHandlers({
    repository, trials,
    liveTrials: { async search({ q, histology }) { return { source: 'test', q, histology, studies: [] } } },
    authenticate: () => reject ? 401 : undefined,
    version: 'test-version', now: () => '2026-10-17T00:00:00.000Z', createId: (() => { let n = 0; return () => `generated-${++n}` })(),
  })
  const request = async (path, method = 'GET', body, url = path) => {
    const req = Object.assign(Readable.from(body === undefined ? [] : [Buffer.from(typeof body === 'string' ? body : JSON.stringify(body))]), { method, url })
    let status
    let payload
    const res = { writeHead(code) { status = code }, end(text) { payload = text } }
    const handler = routes.get(path)
    assert.ok(handler, `route ${path} should exist`)
    await handler(req, res)
    return { status, body: JSON.parse(payload) }
  }
  return { root, repository, trials, request, routes }
}

test('HTTP API authenticates every route and exposes health capabilities', async () => {
  const app = setup()
  const denied = setup({ reject: true })
  try {
    assert.deepEqual((await app.request('/api/lung-cancer-workbench/health')).body.capabilities,
      ['health', 'case-records', 'sqlite-local'])
    const rejection = await denied.request('/api/lung-cancer-workbench/cases')
    assert.equal(rejection.status, 401)
    assert.equal(rejection.body.error, 'AUTHENTICATION_REQUIRED')
    for(const path of denied.routes.keys())assert.equal((await denied.request(path)).status,401,`${path} requires host authentication`)
  } finally {
    app.repository.close(); app.trials.close(); denied.repository.close(); denied.trials.close()
    rmSync(app.root, { recursive: true, force: true }); rmSync(denied.root, { recursive: true, force: true })
  }
})

test('archive API imports a report, parses locally, confirms selected candidates and registers an output artifact',async()=>{
  const app=setup()
  try{
    const {body:{caseFile}}=await app.request('/api/lung-cancer-workbench/cases','POST',{})
    const imported=await app.request('/api/lung-cancer-workbench/documents/import','POST',{caseId:caseFile.id,name:'synthetic.txt',dataBase64:Buffer.from('病理：肺腺癌\nCEA: 3.2 ng/mL').toString('base64')})
    assert.equal(imported.status,201)
    const documentId=imported.body.document.id
    const parsed=await app.request('/api/lung-cancer-workbench/documents/parse','POST',{caseId:caseFile.id,documentId})
    assert.equal(parsed.status,200)
    const confirmed=await app.request('/api/lung-cancer-workbench/documents/confirm','POST',{caseId:caseFile.id,documentId,parseRevision:parsed.body.document.parse_revision,expectedRevision:0,items:[parsed.body.candidates[0]]})
    assert.equal(confirmed.status,200);assert.equal(confirmed.body.caseFile.records[0].review.state,'accepted')
    const exported=await app.request('/api/lung-cancer-workbench/exports/create','POST',{caseId:caseFile.id,expectedRevision:confirmed.body.caseFile.revision,format:'md'})
    assert.equal(exported.status,201)
    const list=await app.request('/api/lung-cancer-workbench/archives','GET',undefined,`/api/lung-cancer-workbench/archives?caseId=${caseFile.id}`)
    assert.equal(list.body.documents.length,1);assert.equal(list.body.exports.length,1)
  }finally{app.repository.close();app.trials.close();rmSync(app.root,{recursive:true,force:true})}
})

test('case API creates, reads and appends records through validated domain commands', async () => {
  const app = setup()
  try {
    const created = await app.request('/api/lung-cancer-workbench/cases', 'POST', {})
    assert.equal(created.status, 201)
    const caseId = created.body.caseFile.id
    const read = await app.request('/api/lung-cancer-workbench/cases/read', 'GET', undefined,
      `/api/lung-cancer-workbench/cases/read?caseId=${caseId}`)
    assert.equal(read.body.caseFile.id, caseId)
    const append = await app.request('/api/lung-cancer-workbench/records/append', 'POST', {
      caseId, expectedRevision: 0,
      record: { id: 'test-api-1', kind: 'molecular_test', date: { precision: 'unknown' },
        source: { kind: 'report', documentId: 'doc-1' },
        data: { specimenId: 'specimen-1', testTypeText: 'NGS', status: 'pending' },
        createdBy: 'patient', createdAt: '2026-10-17T00:00:00Z' },
    })
    assert.equal(append.status, 200)
    assert.equal(append.body.caseFile.records[0].review.state, 'candidate')
    assert.equal(append.body.caseFile.records[0].data.status, 'pending')
    const list = await app.request('/api/lung-cancer-workbench/cases')
    assert.equal(list.body.cases[0].recordCount, 1)
  } finally { app.repository.close(); rmSync(app.root, { recursive: true, force: true }) }
})

test('API maps revision, validation, missing case, malformed JSON and method errors safely', async () => {
  const app = setup()
  try {
    const stale = await app.request('/api/lung-cancer-workbench/records/append', 'POST', { caseId: 'missing', expectedRevision: 0, record: {} })
    assert.equal(stale.status, 404)
    const invalid = await app.request('/api/lung-cancer-workbench/cases', 'POST', '{bad json')
    assert.equal(invalid.status, 400)
    assert.equal(invalid.body.error, 'INVALID_JSON')
    const wrongMethod = await app.request('/api/lung-cancer-workbench/health', 'POST', {})
    assert.equal(wrongMethod.status, 405)
    const created = await app.request('/api/lung-cancer-workbench/cases', 'POST', {})
    const conflict = await app.request('/api/lung-cancer-workbench/records/append', 'POST', {
      caseId: created.body.caseFile.id, expectedRevision: 5, record: {},
    })
    assert.equal(conflict.status, 409)
    assert.equal(conflict.body.error, 'REVISION_CONFLICT')
    assert.equal(conflict.body.message.includes('stack'), false)
  } finally { app.repository.close(); app.trials.close(); rmSync(app.root, { recursive: true, force: true }) }
})

test('trial snapshot search is queryable, filterable, paginated and reports its limited scope', async () => {
  const app = setup()
  try {
    const all = await app.request('/api/lung-cancer-workbench/trials/search', 'GET', undefined,
      '/api/lung-cancer-workbench/trials/search?pageSize=5')
    assert.equal(all.status, 200)
    assert.equal(all.body.studies.length, 5)
    assert.equal(all.body.total, 805)
    assert.equal(all.body.snapshot.retrievedDate, '2026-10-18')
    assert.equal(all.body.snapshot.windowStart, '2026-01-18')
    assert.equal(all.body.snapshot.windowEnd, '2026-10-18')
    assert.equal(all.body.snapshot.apiTotalCount, 913)
    assert.match(all.body.snapshot.completeness, /not a global registry export/)
    assert.ok(all.body.studies[0].firstPostDate >= all.body.snapshot.windowStart)
    const sclc = await app.request('/api/lung-cancer-workbench/trials/search', 'GET', undefined,
      '/api/lung-cancer-workbench/trials/search?histology=SCLC')
    const targeted = await app.request('/api/lung-cancer-workbench/trials/search', 'GET', undefined,
      '/api/lung-cancer-workbench/trials/search?histology=NSCLC&target=EGFR&sort=id&pageSize=50')
    assert.ok(targeted.body.total > 0)
    assert.ok(targeted.body.studies.every(item => /egfr/i.test(JSON.stringify([item.title,item.interventions,item.conditions]))))
    assert.deepEqual(targeted.body.studies.map(item=>item.nctId),targeted.body.studies.map(item=>item.nctId).sort())
    assert.equal(sclc.body.total, 81)
    assert.ok(sclc.body.studies.every(item => item.histology === 'SCLC'))
    const filtered = await app.request('/api/lung-cancer-workbench/trials/search', 'GET', undefined,
      '/api/lung-cancer-workbench/trials/search?histology=NSCLC&status=RECRUITING&phase=PHASE2&country=China&pageSize=5')
    assert.equal(filtered.body.total, 45)
    assert.ok(filtered.body.studies.every(item => item.histology === 'NSCLC' && item.status === 'RECRUITING'
      && item.phase.includes('PHASE2') && item.locations.some(location => location.country === 'China')))
  } finally { app.repository.close(); app.trials.close(); rmSync(app.root, { recursive: true, force: true }) }
})

test('live trial search stays an explicit, separate channel', async () => {
  const app = setup()
  try {
    const live = await app.request('/api/lung-cancer-workbench/trials/live', 'GET', undefined,
      '/api/lung-cancer-workbench/trials/live?q=EGFR&histology=NSCLC')
    assert.equal(live.body.source, 'test')
    assert.equal(live.body.q, 'EGFR')
    assert.equal(live.body.histology, 'NSCLC')
  } finally { app.repository.close(); app.trials.close(); rmSync(app.root, { recursive: true, force: true }) }
})
