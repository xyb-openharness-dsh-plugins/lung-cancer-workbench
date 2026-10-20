import { DatabaseSync } from 'node:sqlite'

const HISTOLOGIES = ['NSCLC', 'SCLC', 'Mixed', 'Lung cancer / other']
const STATUSES = ['NOT_YET_RECRUITING', 'RECRUITING', 'ENROLLING_BY_INVITATION', 'ACTIVE_NOT_RECRUITING',
  'COMPLETED', 'SUSPENDED', 'TERMINATED', 'WITHDRAWN', 'AVAILABLE', 'NO_LONGER_AVAILABLE']
const PHASES = ['PHASE1', 'PHASE2', 'PHASE3', 'PHASE4']
const WHERE = `(? = '' OR lower(nct_id || ' ' || title || ' ' || COALESCE(histology,'') || ' ' ||
  COALESCE(sponsor,'') || ' ' || interventions_json || ' ' || conditions_json || ' ' || locations_json) LIKE lower(?) ESCAPE '\\')
  AND (? = '' OR histology = ?)
  AND (? = '' OR status = ?)
  AND (? = '' OR (',' || replace(COALESCE(phase,''), ', ', ',') || ',') LIKE '%,' || ? || ',%')
  AND (? = '' OR lower(locations_json) LIKE lower(?) ESCAPE '\\')
  AND (? = '' OR lower(title || ' ' || interventions_json || ' ' || conditions_json) LIKE lower(?) ESCAPE '\\')`

export class TrialSnapshotRepository {
  constructor(databasePath) {
    if (!databasePath) throw new TypeError('A packaged trial snapshot is required')
    this.db = new DatabaseSync(databasePath, { readOnly: true })
    this.metadata = Object.fromEntries(this.db.prepare('SELECT key, value FROM metadata').all().map(row => [row.key, row.value]))
    this.queries = Object.fromEntries(Object.entries({posted:'first_post_date DESC, nct_id',start:'start_date DESC, nct_id',id:'nct_id',phase:'phase, nct_id'}).map(([key,order])=>[key,this.db.prepare(`SELECT nct_id, title, histology, phase, status, sponsor, start_date, start_date_type,
      first_post_date, last_update, interventions_json, enrollment, source_url, cohort, retrieved_at,
      discovery_source, discovery_url, study_type, conditions_json, intervention_types_json, locations_json
      FROM trials WHERE ${WHERE} ORDER BY ${order} LIMIT ? OFFSET ?`)]))
    this.count = this.db.prepare(`SELECT COUNT(*) AS total FROM trials WHERE ${WHERE}`)
  }

  search({ q = '', histology = '', status = '', phase = '', country = '', target = '', sort = 'posted', page = 1, pageSize = 20 } = {}) {
    q = String(q).trim().slice(0, 200)
    if (/^(?:lung(?:\s+cancer)?|肺癌)$/i.test(q)) q = ''
    histology = HISTOLOGIES.includes(histology) ? histology : ''
    status = STATUSES.includes(status) ? status : ''
    phase = PHASES.includes(phase) ? phase : ''
    country = String(country).trim().slice(0, 80)
    page = Math.max(1, Math.min(1000, Number.parseInt(page, 10) || 1))
    pageSize = Math.max(1, Math.min(50, Number.parseInt(pageSize, 10) || 20))
    const term = q ? `%${q.replace(/[\\%_]/g, '\\$&')}%` : ''
    const countryTerm = country ? `%${country.replace(/[\\%_]/g, '\\$&')}%` : ''
    const targetText=String(target).trim().slice(0,80),targetTerm=targetText?'%'+targetText.replace(/[\\%_]/g,'\\$&')+'%':''
    const filters = [term, term, histology, histology, status, status, phase, phase, country, countryTerm,targetText,targetTerm]
    const total = this.count.get(...filters).total
    const studies = (this.queries[sort]||this.queries.posted).all(...filters, pageSize, (page - 1) * pageSize).map(row => ({
      nctId: row.nct_id, title: row.title, histology: row.histology, phase: row.phase, status: row.status,
      sponsor: row.sponsor, startDate: row.start_date, startDateType: row.start_date_type,
      firstPostDate: row.first_post_date, lastUpdate: row.last_update,
      interventions: safeJsonArray(row.interventions_json), enrollment: row.enrollment,
      studyType: row.study_type, conditions: safeJsonArray(row.conditions_json),
      interventionTypes: safeJsonArray(row.intervention_types_json), locations: safeJsonArray(row.locations_json),
      sourceUrl: row.source_url, cohort: row.cohort, retrievedAt: row.retrieved_at,
      discoverySource: row.discovery_source, discoveryUrl: row.discovery_url,
    }))
    return {
      studies, total, page, pageSize,
      snapshot: {
        retrievedDate: this.metadata.retrieved_date,
        completeness: this.metadata.completeness,
        intendedUse: this.metadata.intended_use,
        registry: this.metadata.registry,
        windowStart: this.metadata.window_start,
        windowEnd: this.metadata.window_end,
        windowMonths: Number(this.metadata.window_months) || null,
        apiTotalCount: Number(this.metadata.api_total_count) || null,
        excludedUnrelatedCount: Number(this.metadata.excluded_unrelated_count) || null,
      },
    }
  }

  close() { this.db.close() }
}

function safeJsonArray(value) {
  try {
    const parsed = JSON.parse(value || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}
