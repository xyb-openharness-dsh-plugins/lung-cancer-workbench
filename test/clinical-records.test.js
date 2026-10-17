import test from 'node:test'
import assert from 'node:assert/strict'
import {
  appendRecord, createCaseFile, reviewRecord, RevisionConflictError,
  RecordValidationError, DuplicateRecordError,
} from '../lib/domain/clinical-records.js'

const base = () => createCaseFile({
  id: 'case-demo', workspaceId: 'workspace-demo', subjectId: 'subject-demo', createdAt: '2026-10-17T10:00:00+08:00',
})
const source = { kind: 'report', documentId: 'doc-1', excerpt: '演示资料摘录' }
const recordInput = (overrides = {}) => ({
  id: 'record-1', kind: 'molecular_test', createdBy: 'user-demo', createdAt: '2026-10-17T10:01:00+08:00',
  date: { precision: 'month', value: '2026-09' }, source,
  data: { specimenId: 'specimen-blood-1', testTypeText: '血浆基因检测', status: 'pending', scopeText: '演示范围' },
  ...overrides,
})

test('creates an explicit case file without patient-derived defaults', () => {
  const file = base()
  assert.equal(file.revision, 0)
  assert.deepEqual(file.records, [])
  assert.equal(file.subjectId, 'subject-demo')
})

test('records specimen and molecular test as separate, source-linked facts', () => {
  let file = base()
  file = appendRecord(file, recordInput({ kind: 'specimen', data: {
    specimenId: 'specimen-blood-1', collectionMethodText: '外周血', materialType: 'plasma',
  } }), { expectedRevision: 0 })
  file = appendRecord(file, recordInput({ id: 'test-1' }), { expectedRevision: 1 })
  assert.equal(file.revision, 2)
  assert.equal(file.records[1].data.status, 'pending')
  assert.equal(file.records[1].source.documentId, 'doc-1')
  assert.equal(file.records[1].date.precision, 'month')
})

test('supports SCLC and NSCLC as distinct source-backed diagnosis assertions', () => {
  let file = base()
  for (const [id, clinicalType, year] of [['d1', 'nsclc', '2025'], ['d2', 'sclc', '2026']]) {
    file = appendRecord(file, recordInput({ id, kind: 'diagnosis', date: { precision: 'year', value: year }, data: { clinicalType, histologyText: clinicalType.toUpperCase() } }), { expectedRevision: file.revision })
  }
  assert.deepEqual(file.records.map(row => row.data.clinicalType), ['nsclc', 'sclc'])
})

test('unknown date is explicit and molecular outcomes never default to negative', () => {
  const file = appendRecord(base(), recordInput({ date: { precision: 'unknown' }, data: {
    specimenId: 'specimen-1', testTypeText: 'NGS', status: 'insufficient',
  } }), { expectedRevision: 0 })
  assert.deepEqual(file.records[0].date, { precision: 'unknown', value: null, timezone: null })
  assert.equal(file.records[0].data.status, 'insufficient')
})

test('planned treatment remains planned and performed treatment is explicit', () => {
  let file = base()
  file = appendRecord(file, recordInput({ kind: 'radiotherapy', data: { status: 'scheduled', fractionText: '计划分次（演示）' } }), { expectedRevision: 0 })
  file = appendRecord(file, recordInput({ id: 'rt-done', kind: 'radiotherapy', data: { status: 'administered_or_performed' } }), { expectedRevision: 1 })
  assert.equal(file.records[0].data.status, 'scheduled')
  assert.equal(file.records[1].data.status, 'administered_or_performed')
})

test('candidate records become accepted only through an explicit review decision', () => {
  let file = appendRecord(base(), recordInput(), { expectedRevision: 0 })
  assert.equal(file.records[0].review.state, 'candidate')
  file = reviewRecord(file, 'record-1', 'edit', {
    expectedRevision: 1, expectedRecordRevision: 1, actorId: 'user-demo', at: '2026-10-17T10:05:00+08:00',
    editedData: { specimenId: 'specimen-blood-1', testTypeText: '血浆基因检测（已核对）', status: 'pending' },
  })
  assert.equal(file.records[0].review.state, 'accepted')
  assert.equal(file.records[0].data.testTypeText, '血浆基因检测（已核对）')
  assert.equal(file.decisions[0].decision, 'edit')
  assert.equal(file.decisions[0].recordRevision, 1)
})

test('rejects stale writes and stale per-record reviews', () => {
  const file = appendRecord(base(), recordInput(), { expectedRevision: 0 })
  assert.throws(() => appendRecord(file, recordInput({ id: 'record-2' }), { expectedRevision: 0 }), RevisionConflictError)
  assert.throws(() => reviewRecord(file, 'record-1', 'accept', {
    expectedRevision: 1, expectedRecordRevision: 0, actorId: 'user-demo', at: 'now',
  }), RevisionConflictError)
})

test('rejects records without provenance, unsupported statuses, and duplicate IDs', () => {
  assert.throws(() => appendRecord(base(), recordInput({ source: null }), { expectedRevision: 0 }), RecordValidationError)
  assert.throws(() => appendRecord(base(), recordInput({ data: { specimenId: 's', testTypeText: 'NGS', status: 'negative' } }), { expectedRevision: 0 }), RecordValidationError)
  const file = appendRecord(base(), recordInput(), { expectedRevision: 0 })
  assert.throws(() => appendRecord(file, recordInput(), { expectedRevision: 1 }), DuplicateRecordError)
})

test('does not allow a confirmed record to be reviewed again as a candidate', () => {
  let file = appendRecord(base(), recordInput(), { expectedRevision: 0 })
  file = reviewRecord(file, 'record-1', 'accept', { expectedRevision: 1, expectedRecordRevision: 1, actorId: 'user-demo', at: 'now' })
  assert.throws(() => reviewRecord(file, 'record-1', 'reject', { expectedRevision: 2, expectedRecordRevision: 2, actorId: 'user-demo', at: 'later' }), RecordValidationError)
})
