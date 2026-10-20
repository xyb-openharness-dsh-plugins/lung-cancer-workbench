import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { SqliteCaseRepository } from '../lib/server/sqlite-case-repository.js'
import { RevisionConflictError } from '../lib/domain/clinical-records.js'

const createTempRepository = () => {
  const root = mkdtempSync(join(tmpdir(), 'lung-workbench-'))
  return { root, repository: new SqliteCaseRepository(root) }
}

const caseInput = { id: 'case-1', workspaceId: 'workspace-1', subjectId: 'subject-1', createdAt: '2026-10-17T10:00:00+08:00' }
const record = { id: 'pathology-1', kind: 'diagnosis', date: { precision: 'day', value: '2026-10-01' },
  source: { kind: 'pathology', documentId: 'document-1', excerpt: '演示病理记录' },
  data: { clinicalType: 'nsclc', histologyText: '肺腺癌（演示）' }, createdBy: 'user-1', createdAt: '2026-10-17T10:02:00+08:00' }

test('creates case, appends source-backed record, reviews it, and survives reopen', () => {
  const { root, repository } = createTempRepository()
  try {
    repository.create(caseInput)
    const added = repository.append('case-1', record, { expectedRevision: 0 })
    assert.equal(added.revision, 1)
    const reviewed = repository.review('case-1', 'pathology-1', 'accept', {
      expectedRevision: 1, expectedRecordRevision: 1, actorId: 'user-1', at: '2026-10-17T10:03:00+08:00',
    })
    assert.equal(reviewed.revision, 2)
    assert.equal(reviewed.records[0].review.state, 'accepted')
    assert.equal(reviewed.decisions.length, 1)
    assert.deepEqual(repository.integrityCheck(), ['ok'])
    repository.close()
    const reopened = new SqliteCaseRepository(root)
    try {
      const restored = reopened.get('case-1')
      assert.equal(restored.records[0].source.documentId, 'document-1')
      assert.equal(restored.records[0].data.clinicalType, 'nsclc')
      assert.equal(restored.decisions[0].decision, 'accept')
      assert.equal(reopened.list()[0].recordCount, 1)
    } finally { reopened.close() }
  } finally { try { repository.close() } catch {}; rmSync(root, { recursive: true, force: true }) }
})

test('uses transactions to reject stale revisions without partial writes', () => {
  const { root, repository } = createTempRepository()
  try {
    repository.create(caseInput)
    assert.throws(() => repository.append('case-1', record, { expectedRevision: 8 }), RevisionConflictError)
    const after = repository.get('case-1')
    assert.equal(after.revision, 0)
    assert.equal(after.records.length, 0)
    assert.deepEqual(repository.integrityCheck(), ['ok'])
  } finally { repository.close(); rmSync(root, { recursive: true, force: true }) }
})

test('schema migration is idempotent when reopening an existing database', () => {
  const { root, repository } = createTempRepository()
  try {
    repository.create(caseInput)
    repository.close()
    const reopened = new SqliteCaseRepository(root)
    try {
      assert.equal(reopened.get('case-1').id, 'case-1')
      assert.deepEqual(reopened.integrityCheck(), ['ok'])
    } finally { reopened.close() }
  } finally { try { repository.close() } catch {}; rmSync(root, { recursive: true, force: true }) }
})

test('SQLite schema round-trips the lung-specific fields used by both synthetic cases', () => {
  const demos = JSON.parse(readFileSync(new URL('../lib/demo-cases.json', import.meta.url), 'utf8'))
  const { root, repository } = createTempRepository()
  try {
    for (const demo of demos) {
      repository.create({ id: demo.id, workspaceId: demo.workspaceId, subjectId: demo.subjectId, displayName: demo.displayName, subjectRole: demo.subjectRole, createdAt: demo.createdAt })
      let revision = 0
      const normalized = []
      for (const record of demo.records) {
        const result = repository.append(demo.id, { ...record, reviewState: record.review.state }, { expectedRevision: revision })
        revision = result.revision
        normalized.push(result.records.at(-1))
      }
      const restored = repository.get(demo.id)
      assert.equal(restored.records.length, demo.records.length)
      assert.deepEqual(restored.records.map(record => record.kind).sort(), demo.records.map(record => record.kind).sort())
      for (const record of normalized) assert.deepEqual(restored.records.find(item => item.id === record.id), record)
    }
    assert.deepEqual(repository.integrityCheck(), ['ok'])
  } finally { repository.close(); rmSync(root, { recursive: true, force: true }) }
})
