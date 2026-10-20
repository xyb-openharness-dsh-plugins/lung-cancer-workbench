import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { SqliteCaseRepository } from '../lib/server/sqlite-case-repository.js'
import { DocumentService } from '../lib/server/documents.js'

function setup(options={}) {
  const root=mkdtempSync(join(tmpdir(),'lung-docs-')),repo=new SqliteCaseRepository(root),docs=new DocumentService(repo,options)
  for(const id of ['case-a','case-b'])repo.create({id,workspaceId:'workspace',subjectId:id+'-patient',createdAt:'2026-10-18T00:00:00Z'})
  return {root,repo,docs,close(){this.repo.close();rmSync(root,{recursive:true,force:true})}}
}
const input=(text='病理诊断：肺腺癌\nEGFR L858R 阳性（合成）\nCEA: 3.2 ng/mL\n',name='synthetic.txt')=>({caseId:'case-a',name,dataBase64:Buffer.from(text).toString('base64')})

test('document import, local parse, human-edited confirmation and re-download survive database reopen',async()=>{
  const app=setup()
  try{
    const imported=await app.docs.import(input()),id=imported.document.id
    assert.equal((await app.docs.import(input())).duplicate,true)
    assert.equal(app.repo.get('case-a').records.length,0)
    const parsed=await app.docs.parse({caseId:'case-a',documentId:id})
    assert.equal(app.repo.get('case-a').records.length,0,'parsing does not create clinical facts')
    const metric=parsed.candidates.find(c=>c.kind==='metric')
    const confirmed=app.repo.confirmDocumentCandidates({caseId:'case-a',documentId:id,parseRevision:parsed.document.parse_revision,expectedRevision:0,items:[{...metric,date:{precision:'day',value:'2026-10-17'},data:{...metric.data,rawValue:'3.3'}}]})
    assert.equal(confirmed.records[0].review.state,'accepted');assert.equal(confirmed.records[0].data.rawValue,'3.3')
    assert.equal(confirmed.records[0].source.documentId,id);assert.equal(confirmed.decisions.length,1)
    assert.throws(()=>app.repo.confirmDocumentCandidates({caseId:'case-a',documentId:id,parseRevision:parsed.document.parse_revision,expectedRevision:confirmed.revision,items:[metric]}),{code:'REVISION_CONFLICT'})
    const result=await app.docs.export({caseId:'case-a',format:'json',expectedRevision:confirmed.revision})
    const file=await app.docs.file({caseId:'case-a',id:result.artifact.id,kind:'export'})
    assert.equal(JSON.parse(file.bytes).caseFile.records[0].data.rawValue,'3.3')
    app.repo.close();app.repo=new SqliteCaseRepository(app.root)
    const reopened=new DocumentService(app.repo)
    assert.equal(reopened.list('case-a').documents.length,1);assert.equal(reopened.list('case-a').exports.length,1)
    assert.equal((await reopened.file({caseId:'case-a',id})).bytes.toString(),Buffer.from(input().dataBase64,'base64').toString())
  }finally{app.close()}
})

test('cloud parser requires explicit consent and stale parse/revision cannot confirm',async()=>{
  let called=0;const app=setup({extract:async()=>{called++;return{text:'合成病理：肺腺癌',engine:'test-parser'}}})
  try{
    const id=(await app.docs.import(input('%PDF-1.4\nsynthetic','report.pdf'))).document.id
    await assert.rejects(app.docs.parse({caseId:'case-a',documentId:id}),{code:'CONSENT_REQUIRED'});assert.equal(called,0)
    const first=await app.docs.parse({caseId:'case-a',documentId:id,cloudConsent:true})
    await app.docs.parse({caseId:'case-a',documentId:id,cloudConsent:true})
    assert.throws(()=>app.repo.confirmDocumentCandidates({caseId:'case-a',documentId:id,parseRevision:first.document.parse_revision,expectedRevision:0,items:[first.candidates[0]]}),{code:'REVISION_CONFLICT'})
    assert.equal(app.repo.get('case-a').records.length,0)
  }finally{app.close()}
})

test('cross-case access, forged file types and partial confirmation failure preserve isolation and atomicity',async()=>{
  const app=setup()
  try{
    await assert.rejects(app.docs.import(input('plain text','false.pdf')),{code:'INVALID_INPUT'})
    const id=(await app.docs.import(input())).document.id
    assert.throws(()=>app.docs.detail('case-b',id),{code:'NOT_FOUND'})
    await assert.rejects(app.docs.file({caseId:'case-b',id}),{code:'NOT_FOUND'})
    const parsed=await app.docs.parse({caseId:'case-a',documentId:id})
    assert.throws(()=>app.repo.confirmDocumentCandidates({caseId:'case-a',documentId:id,parseRevision:parsed.document.parse_revision,expectedRevision:0,items:[parsed.candidates[0],{...parsed.candidates[1],kind:'invalid'}]}),{code:'INVALID_INPUT'})
    assert.equal(app.repo.get('case-a').records.length,0);assert.ok(app.docs.detail('case-a',id).candidates.every(c=>c.status==='candidate'))
  }finally{app.close()}
})

test('HEIC retains original and converts a separate preview before parsing; failures remain retryable',async()=>{
  let converted=0;const app=setup({convert:async(source,target)=>{converted++;await writeFile(target,Buffer.from('preview'))},extract:async(path,ext)=>{assert.equal(ext,'.png');assert.equal((await readFile(path)).toString(),'preview');return{text:'合成病理：肺腺癌',engine:'test-parser'}}})
  try{
    const raw=Buffer.concat([Buffer.from([0,0,0,24]),Buffer.from('ftypheic0000mif1')])
    const id=(await app.docs.import({caseId:'case-a',name:'image.heic',dataBase64:raw.toString('base64')})).document.id
    assert.equal(converted,1);assert.deepEqual((await app.docs.file({caseId:'case-a',id})).bytes,raw)
    const parsed=await app.docs.parse({caseId:'case-a',documentId:id,cloudConsent:true});assert.ok(parsed.text)
  }finally{app.close()}
  const failed=setup({extract:async()=>{throw Object.assign(new Error('unavailable'),{code:'PARSE_FAILED'})}})
  try{const id=(await failed.docs.import(input('%PDF-1.4\nsynthetic','report.pdf'))).document.id;await assert.rejects(failed.docs.parse({caseId:'case-a',documentId:id,cloudConsent:true}));assert.equal(failed.docs.detail('case-a',id).document.status,'failed');assert.ok((await failed.docs.file({caseId:'case-a',id})).bytes.length)}finally{failed.close()}
})
