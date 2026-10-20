const API_URL = 'https://clinicaltrials.gov/api/v2/studies'

export class ClinicalTrialsGovSearch {
  constructor({ fetchImpl = fetch, timeoutMs = 10000 } = {}) {
    this.fetchImpl = fetchImpl
    this.timeoutMs = timeoutMs
  }

  async search({ q = '', histology = '', signal } = {}) {
    q = String(q).trim().slice(0, 160)
    histology = ['NSCLC', 'SCLC'].includes(histology) ? histology : ''
    const query = new URLSearchParams({
      'query.cond': 'lung cancer',
      'pageSize': '30',
      'format': 'json',
    })
    if (q) query.set('query.term', [q, histology].filter(Boolean).join(' '))
    else if (histology) query.set('query.term', histology)
    const timeout = AbortSignal.timeout(this.timeoutMs)
    const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout
    let response
    try { response = await this.fetchImpl(`${API_URL}?${query}`, { signal: requestSignal, headers: { accept: 'application/json' } }) }
    catch (error) { throw Object.assign(new Error('ClinicalTrials.gov could not be reached'), { code: 'UPSTREAM_UNAVAILABLE', cause: error }) }
    if (!response.ok) throw Object.assign(new Error(`ClinicalTrials.gov returned ${response.status}`), { code: 'UPSTREAM_UNAVAILABLE' })
    let payload
    try { payload = await response.json() }
    catch { throw Object.assign(new Error('ClinicalTrials.gov returned invalid data'), { code: 'UPSTREAM_INVALID_RESPONSE' }) }
    const studies = Array.isArray(payload.studies) ? payload.studies.map(study => {
      const protocol = study.protocolSection ?? {}
      const identification = protocol.identificationModule ?? {}
      const status = protocol.statusModule ?? {}
      const design = protocol.designModule ?? {}
      const conditions = protocol.conditionsModule ?? {}
      const arms = protocol.armsInterventionsModule ?? {}
      const firstPost = status.studyFirstPostDateStruct ?? {}
      const lastUpdate = status.lastUpdatePostDateStruct ?? {}
      const nctId = identification.nctId ?? ''
      return {
        nctId,
        title: identification.briefTitle ?? identification.officialTitle ?? nctId,
        status: status.overallStatus ?? null,
        phase: Array.isArray(design.phases) ? design.phases.join(', ') : null,
        conditions: conditions.conditions ?? [],
        interventions: (arms.interventions ?? []).map(item => item.name).filter(Boolean),
        firstPostDate: firstPost.date ?? null,
        lastUpdate: lastUpdate.date ?? null,
        sourceUrl: nctId ? `https://clinicaltrials.gov/study/${encodeURIComponent(nctId)}` : 'https://clinicaltrials.gov/',
      }
    }) : []
    return { source: 'ClinicalTrials.gov API v2', retrievedAt: new Date().toISOString(), query: q, histology, studies }
  }
}
