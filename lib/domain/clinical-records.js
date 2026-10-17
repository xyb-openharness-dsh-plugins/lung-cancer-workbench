const RECORD_KINDS = new Set([
  'specimen', 'pathology', 'molecular_test', 'biomarker', 'diagnosis', 'staging',
  'surgery', 'systemic_therapy', 'radiotherapy', 'lesion', 'pleural_procedure',
  'metric', 'symptom', 'care_task', 'visit_question',
])

const DATE_PRECISIONS = new Set(['exact', 'day', 'month', 'year', 'unknown'])
const SOURCE_KINDS = new Set([
  'report', 'pathology', 'clinician_document', 'patient_reported',
  'caregiver_reported', 'knowledge_resource', 'agent_generated',
])
const REVIEW_STATES = new Set(['candidate', 'accepted', 'rejected', 'needs_review', 'superseded'])
const TEST_STATES = new Set([
  'not_tested', 'pending', 'in_progress', 'completed', 'failed', 'insufficient', 'unknown',
])
const EVENT_STATES = new Set([
  'proposed', 'ordered', 'scheduled', 'administered_or_performed', 'held', 'changed', 'completed', 'cancelled', 'unknown',
])

export class RecordValidationError extends Error {
  constructor(message, field) {
    super(message)
    this.name = 'RecordValidationError'
    this.code = 'INVALID_INPUT'
    this.field = field
  }
}

export class RevisionConflictError extends Error {
  constructor(expected, actual) {
    super(`Expected revision ${expected}, current revision is ${actual}`)
    this.name = 'RevisionConflictError'
    this.code = 'REVISION_CONFLICT'
    this.expected = expected
    this.actual = actual
  }
}

export class DuplicateRecordError extends Error {
  constructor(id) {
    super(`Record already exists: ${id}`)
    this.name = 'DuplicateRecordError'
    this.code = 'DUPLICATE_RECORD'
  }
}

function requiredString(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new RecordValidationError(`${field} is required`, field)
  }
  return value.trim()
}

function validateDate(date) {
  if (!date || typeof date !== 'object' || !DATE_PRECISIONS.has(date.precision)) {
    throw new RecordValidationError('date.precision must be a supported precision', 'date')
  }
  if (date.precision === 'unknown') return { precision: 'unknown', value: null, timezone: date.timezone ?? null }
  const value = requiredString(date.value, 'date.value')
  const valid = {
    exact: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/,
    day: /^\d{4}-\d{2}-\d{2}$/,
    month: /^\d{4}-\d{2}$/,
    year: /^\d{4}$/,
  }[date.precision]
  if (!valid.test(value)) throw new RecordValidationError(`date.value does not match ${date.precision} precision`, 'date.value')
  return { precision: date.precision, value, timezone: date.timezone ?? null }
}

function validateSource(source) {
  if (!source || typeof source !== 'object' || !SOURCE_KINDS.has(source.kind)) {
    throw new RecordValidationError('source.kind must identify where this record came from', 'source')
  }
  return {
    kind: source.kind,
    documentId: source.documentId == null ? null : requiredString(source.documentId, 'source.documentId'),
    excerpt: source.excerpt == null ? null : String(source.excerpt),
    reference: source.reference == null ? null : String(source.reference),
  }
}

function validateData(kind, data = {}) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new RecordValidationError('data must be an object', 'data')
  }
  const clean = structuredClone(data)
  if (kind === 'specimen') {
    clean.specimenId = requiredString(clean.specimenId, 'data.specimenId')
    clean.collectionMethodText = clean.collectionMethodText == null ? null : String(clean.collectionMethodText)
    clean.anatomicSiteText = clean.anatomicSiteText == null ? null : String(clean.anatomicSiteText)
    clean.materialType = clean.materialType == null ? 'unknown' : String(clean.materialType)
  }
  if (kind === 'molecular_test') {
    clean.specimenId = requiredString(clean.specimenId, 'data.specimenId')
    clean.testTypeText = requiredString(clean.testTypeText, 'data.testTypeText')
    clean.status = clean.status ?? 'unknown'
    if (!TEST_STATES.has(clean.status)) throw new RecordValidationError('data.status is not a supported test status', 'data.status')
    clean.methodText = clean.methodText == null ? null : String(clean.methodText)
    clean.scopeText = clean.scopeText == null ? null : String(clean.scopeText)
    clean.limitationText = clean.limitationText == null ? null : String(clean.limitationText)
  }
  if (['surgery', 'systemic_therapy', 'radiotherapy', 'pleural_procedure'].includes(kind)) {
    clean.status = clean.status ?? 'unknown'
    if (!EVENT_STATES.has(clean.status)) throw new RecordValidationError('data.status is not a supported event status', 'data.status')
  }
  if (kind === 'diagnosis') {
    clean.clinicalType = clean.clinicalType ?? 'unknown'
    if (!['nsclc', 'sclc', 'combined', 'other_primary', 'metastasis_to_lung', 'unknown'].includes(clean.clinicalType)) {
      throw new RecordValidationError('data.clinicalType is not supported', 'data.clinicalType')
    }
  }
  return clean
}

export function createCaseFile({ id, workspaceId, subjectId, createdAt }) {
  return {
    schemaVersion: 1,
    id: requiredString(id, 'id'),
    workspaceId: requiredString(workspaceId, 'workspaceId'),
    subjectId: requiredString(subjectId, 'subjectId'),
    revision: 0,
    createdAt: requiredString(createdAt, 'createdAt'),
    records: [],
    decisions: [],
  }
}

export function appendRecord(caseFile, input, { expectedRevision } = {}) {
  assertRevision(caseFile, expectedRevision)
  const id = requiredString(input?.id, 'id')
  if (caseFile.records.some(record => record.id === id)) throw new DuplicateRecordError(id)
  const kind = requiredString(input?.kind, 'kind')
  if (!RECORD_KINDS.has(kind)) throw new RecordValidationError('kind is not supported', 'kind')
  const source = validateSource(input.source)
  const record = {
    id,
    kind,
    subjectId: caseFile.subjectId,
    date: validateDate(input.date),
    source,
    data: validateData(kind, input.data),
    review: { state: input.reviewState ?? 'candidate', revision: 1 },
    createdBy: requiredString(input.createdBy, 'createdBy'),
    createdAt: requiredString(input.createdAt, 'createdAt'),
  }
  if (!REVIEW_STATES.has(record.review.state)) throw new RecordValidationError('reviewState is not supported', 'reviewState')
  return { ...caseFile, revision: caseFile.revision + 1, records: [...caseFile.records, record] }
}

export function reviewRecord(caseFile, recordId, decision, {
  expectedRevision, expectedRecordRevision, actorId, at, reason = null, editedData,
} = {}) {
  assertRevision(caseFile, expectedRevision)
  if (!['accept', 'edit', 'reject', 'defer'].includes(decision)) throw new RecordValidationError('decision is not supported', 'decision')
  const index = caseFile.records.findIndex(record => record.id === recordId)
  if (index < 0) throw new RecordValidationError('record does not exist', 'recordId')
  const current = caseFile.records[index]
  if (current.review.revision !== expectedRecordRevision) throw new RevisionConflictError(expectedRecordRevision, current.review.revision)
  if (!['candidate', 'needs_review'].includes(current.review.state)) throw new RecordValidationError('only unconfirmed records can be reviewed', 'recordId')
  const state = { accept: 'accepted', edit: 'accepted', reject: 'rejected', defer: 'needs_review' }[decision]
  const next = {
    ...current,
    data: decision === 'edit' ? validateData(current.kind, editedData) : current.data,
    review: { state, revision: current.review.revision + 1 },
  }
  const records = [...caseFile.records]
  records[index] = next
  const decisionRecord = {
    id: `${recordId}:review:${next.review.revision}`,
    recordId,
    recordRevision: current.review.revision,
    decision,
    actorId: requiredString(actorId, 'actorId'),
    at: requiredString(at, 'at'),
    reason: reason == null ? null : String(reason),
    editedData: decision === 'edit' ? structuredClone(next.data) : null,
  }
  return { ...caseFile, revision: caseFile.revision + 1, records, decisions: [...caseFile.decisions, decisionRecord] }
}

export function assertRevision(caseFile, expectedRevision) {
  if (!Number.isInteger(expectedRevision) || expectedRevision !== caseFile.revision) {
    throw new RevisionConflictError(expectedRevision, caseFile.revision)
  }
}

export const clinicalRecordKinds = Object.freeze([...RECORD_KINDS])
