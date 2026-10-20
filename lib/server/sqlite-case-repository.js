import { mkdirSync, chmodSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'
import {
  appendRecord, createCaseFile, reviewRecord, RevisionConflictError,
} from '../domain/clinical-records.js'

const MIGRATIONS = [
  `CREATE TABLE case_files (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    revision INTEGER NOT NULL CHECK (revision >= 0),
    created_at TEXT NOT NULL
  );
  CREATE TABLE clinical_records (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES case_files(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    date_json TEXT NOT NULL,
    source_json TEXT NOT NULL,
    data_json TEXT NOT NULL,
    review_json TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX records_by_case ON clinical_records(case_id, created_at);
  CREATE TABLE review_decisions (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES case_files(id) ON DELETE CASCADE,
    record_id TEXT NOT NULL REFERENCES clinical_records(id),
    record_revision INTEGER NOT NULL,
    decision TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    at TEXT NOT NULL,
    reason TEXT,
    edited_data_json TEXT
  );
  CREATE INDEX decisions_by_case ON review_decisions(case_id, at);`,
  `ALTER TABLE case_files ADD COLUMN display_name TEXT NOT NULL DEFAULT '';
   ALTER TABLE case_files ADD COLUMN subject_role TEXT NOT NULL DEFAULT 'patient';`,
  `CREATE TABLE documents (
    id TEXT PRIMARY KEY, case_id TEXT NOT NULL REFERENCES case_files(id), name TEXT NOT NULL,
    mime TEXT NOT NULL, extension TEXT NOT NULL, size INTEGER NOT NULL CHECK(size>0), sha256 TEXT NOT NULL,
    relative_path TEXT NOT NULL UNIQUE, preview_path TEXT, preview_error TEXT,
    status TEXT NOT NULL DEFAULT 'imported' CHECK(status IN ('imported','parsing','parsed','failed')),
    parse_revision INTEGER NOT NULL DEFAULT 0, parsed_text TEXT, parser TEXT, parse_error TEXT,
    consent_at TEXT, created_at TEXT NOT NULL, parsed_at TEXT, UNIQUE(case_id,sha256)
  );
  CREATE INDEX documents_by_case ON documents(case_id,created_at);
  CREATE TABLE document_candidates (
    id TEXT PRIMARY KEY, document_id TEXT NOT NULL REFERENCES documents(id),
    case_id TEXT NOT NULL REFERENCES case_files(id), parse_revision INTEGER NOT NULL,
    kind TEXT NOT NULL, date_json TEXT NOT NULL CHECK(json_valid(date_json)),
    data_json TEXT NOT NULL CHECK(json_valid(data_json)), source_quote TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'candidate' CHECK(status IN ('candidate','accepted','rejected')),
    record_id TEXT REFERENCES clinical_records(id), created_at TEXT NOT NULL, reviewed_at TEXT
  );
  CREATE INDEX candidates_by_document ON document_candidates(case_id,document_id,parse_revision);
  CREATE TABLE export_artifacts (
    id TEXT PRIMARY KEY, case_id TEXT NOT NULL REFERENCES case_files(id), name TEXT NOT NULL,
    mime TEXT NOT NULL, size INTEGER NOT NULL, sha256 TEXT NOT NULL,
    relative_path TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL
  );
  CREATE INDEX exports_by_case ON export_artifacts(case_id,created_at);`,
]

function toRecord(row) {
  return {
    id: row.id, kind: row.kind, subjectId: row.subject_id,
    date: JSON.parse(row.date_json), source: JSON.parse(row.source_json), data: JSON.parse(row.data_json),
    review: JSON.parse(row.review_json), createdBy: row.created_by, createdAt: row.created_at,
  }
}

export class SqliteCaseRepository {
  constructor(rootPath) {
    if (typeof rootPath !== 'string' || rootPath.trim() === '') throw new TypeError('A configured data root is required')
    this.rootPath = resolve(rootPath)
    mkdirSync(this.rootPath, { recursive: true, mode: 0o700 })
    this.databasePath = join(this.rootPath, 'lung-workbench.sqlite')
    this.db = new DatabaseSync(this.databasePath)
    this.db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;')
    this.db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)')
    this.#migrate()
    try { chmodSync(this.databasePath, 0o600) } catch { /* platform may not expose POSIX modes */ }
  }

  #migrate() {
    const current = this.db.prepare('SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations').get().version
    for (let i = current; i < MIGRATIONS.length; i++) {
      this.db.exec('BEGIN IMMEDIATE')
      try {
        this.db.exec(MIGRATIONS[i])
        this.db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES (?, ?)').run(i + 1, new Date().toISOString())
        this.db.exec('COMMIT')
      } catch (error) {
        this.db.exec('ROLLBACK')
        throw error
      }
    }
  }

  create({ id, workspaceId, subjectId, displayName, subjectRole, createdAt }) {
    const file = createCaseFile({ id, workspaceId, subjectId, displayName, subjectRole, createdAt })
    this.#transaction(() => this.db.prepare(
      'INSERT INTO case_files(id, workspace_id, subject_id, revision, created_at, display_name, subject_role) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run(file.id, file.workspaceId, file.subjectId, file.revision, file.createdAt, file.displayName, file.subjectRole))
    return file
  }

  list() {
    return this.db.prepare(`SELECT c.id, c.workspace_id AS workspaceId, c.subject_id AS subjectId, c.display_name AS displayName, c.subject_role AS subjectRole,
      c.revision, c.created_at AS createdAt, COUNT(r.id) AS recordCount
      FROM case_files c LEFT JOIN clinical_records r ON r.case_id=c.id
      GROUP BY c.id ORDER BY c.created_at DESC`).all()
  }

  get(caseId) {
    const row = this.db.prepare('SELECT * FROM case_files WHERE id=?').get(caseId)
    if (!row) return null
    const records = this.db.prepare('SELECT * FROM clinical_records WHERE case_id=? ORDER BY rowid').all(caseId).map(toRecord)
    const decisions = this.db.prepare('SELECT * FROM review_decisions WHERE case_id=? ORDER BY rowid').all(caseId).map(item => ({
      id: item.id, recordId: item.record_id, recordRevision: item.record_revision, decision: item.decision,
      actorId: item.actor_id, at: item.at, reason: item.reason,
      editedData: item.edited_data_json == null ? null : JSON.parse(item.edited_data_json),
    }))
    return {
      schemaVersion: 1, id: row.id, workspaceId: row.workspace_id, subjectId: row.subject_id,
      displayName: row.display_name, subjectRole: row.subject_role,
      revision: row.revision, createdAt: row.created_at, records, decisions,
    }
  }

  append(caseId, input, { expectedRevision }) {
    return this.#transaction(() => {
      const current = this.get(caseId)
      if (!current) throw Object.assign(new Error('Case does not exist'), { code: 'NOT_FOUND' })
      const next = appendRecord(current, input, { expectedRevision })
      const record = next.records.at(-1)
      const changed = this.db.prepare('UPDATE case_files SET revision=? WHERE id=? AND revision=?')
        .run(next.revision, caseId, expectedRevision).changes
      if (changed !== 1) throw new RevisionConflictError(expectedRevision, this.get(caseId)?.revision)
      this.#insertRecord(caseId, record)
      return next
    })
  }

  review(caseId, recordId, decision, options) {
    return this.#transaction(() => {
      const current = this.get(caseId)
      if (!current) throw Object.assign(new Error('Case does not exist'), { code: 'NOT_FOUND' })
      const next = reviewRecord(current, recordId, decision, options)
      const record = next.records.find(item => item.id === recordId)
      const changed = this.db.prepare('UPDATE case_files SET revision=? WHERE id=? AND revision=?')
        .run(next.revision, caseId, options.expectedRevision).changes
      if (changed !== 1) throw new RevisionConflictError(options.expectedRevision, this.get(caseId)?.revision)
      this.db.prepare(`UPDATE clinical_records SET data_json=?, review_json=? WHERE id=? AND case_id=?`)
        .run(JSON.stringify(record.data), JSON.stringify(record.review), recordId, caseId)
      const entry = next.decisions.at(-1)
      this.db.prepare(`INSERT INTO review_decisions(id, case_id, record_id, record_revision, decision, actor_id, at, reason, edited_data_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(entry.id, caseId, entry.recordId, entry.recordRevision, entry.decision, entry.actorId, entry.at, entry.reason,
          entry.editedData == null ? null : JSON.stringify(entry.editedData))
      return next
    })
  }

  integrityCheck() {
    return this.db.prepare('PRAGMA integrity_check').all().map(row => Object.values(row)[0])
  }

  confirmDocumentCandidates({ caseId, documentId, parseRevision, expectedRevision, items }) {
    return this.#transaction(() => {
      let file = this.get(caseId)
      if (!file) throw Object.assign(new Error('档案不存在'), { code: 'NOT_FOUND' })
      if (file.revision !== expectedRevision) throw new RevisionConflictError(expectedRevision, file.revision)
      const document = this.db.prepare('SELECT * FROM documents WHERE id=? AND case_id=?').get(documentId, caseId)
      if (!document || document.status !== 'parsed' || document.parse_revision !== parseRevision) throw Object.assign(new Error('解析版本已变化，请刷新后核对'), { code: 'REVISION_CONFLICT' })
      if (!Array.isArray(items) || !items.length || items.length > 30 || new Set(items.map(item => item.id)).size !== items.length) throw Object.assign(new Error('请选择1–30条不同候选'), { code: 'INVALID_INPUT' })
      for (const item of items) {
        const candidate = this.db.prepare("SELECT * FROM document_candidates WHERE id=? AND document_id=? AND case_id=? AND parse_revision=? AND status='candidate'").get(item.id, documentId, caseId, parseRevision)
        if (!candidate) throw Object.assign(new Error('候选已处理或已失效，请刷新'), { code: 'REVISION_CONFLICT' })
        const at = new Date().toISOString(), id = randomUUID()
        file = appendRecord(file, { id, kind: item.kind, date: item.date,
          source: { kind: 'report', documentId, excerpt: candidate.source_quote }, data: item.data,
          createdBy: file.subjectId, createdAt: at }, { expectedRevision: file.revision })
        file = reviewRecord(file, id, 'edit', { expectedRevision: file.revision, expectedRecordRevision: 1,
          actorId: file.subjectId, at, reason: '用户逐项核对导入原件后确认', editedData: item.data })
        this.#insertRecord(caseId, file.records.at(-1))
        const decision = file.decisions.at(-1)
        this.db.prepare('INSERT INTO review_decisions(id,case_id,record_id,record_revision,decision,actor_id,at,reason,edited_data_json) VALUES (?,?,?,?,?,?,?,?,?)')
          .run(decision.id,caseId,id,decision.recordRevision,decision.decision,decision.actorId,at,decision.reason,JSON.stringify(decision.editedData))
        this.db.prepare("UPDATE document_candidates SET status='accepted',record_id=?,reviewed_at=? WHERE id=?").run(id,at,item.id)
      }
      this.db.prepare('UPDATE case_files SET revision=? WHERE id=?').run(file.revision,caseId)
      return file
    })
  }

  close() { this.db.close() }

  #insertRecord(caseId, record) {
    this.db.prepare(`INSERT INTO clinical_records(id, case_id, kind, subject_id, date_json, source_json, data_json, review_json, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(record.id, caseId, record.kind, record.subjectId, JSON.stringify(record.date), JSON.stringify(record.source),
        JSON.stringify(record.data), JSON.stringify(record.review), record.createdBy, record.createdAt)
  }

  #transaction(fn) {
    this.db.exec('BEGIN IMMEDIATE')
    try {
      const result = fn()
      this.db.exec('COMMIT')
      return result
    } catch (error) {
      this.db.exec('ROLLBACK')
      throw error
    }
  }
}
