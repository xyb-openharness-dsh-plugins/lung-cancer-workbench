import test from 'node:test'
import assert from 'node:assert/strict'
import { ClinicalTrialsGovSearch } from '../lib/server/clinicaltrials-gov.js'

test('ClinicalTrials.gov adapter scopes query to lung cancer and maps official records', async () => {
  let requestedUrl
  const search = new ClinicalTrialsGovSearch({
    fetchImpl: async url => {
      requestedUrl = new URL(url)
      const study = {
        protocolSection: {
          identificationModule: { nctId: 'NCT12345678', briefTitle: 'EGFR lung study' },
          statusModule: { overallStatus: 'RECRUITING', studyFirstPostDateStruct: { date: '2026-01-02' }, lastUpdatePostDateStruct: { date: '2026-04-03' } },
          designModule: { phases: ['PHASE2'] },
          conditionsModule: { conditions: ['Lung Cancer'] },
          armsInterventionsModule: { interventions: [{ name: 'Example drug' }] },
        },
      }
      return { ok: true, async json() { return { studies: [study] } } }
    },
  })
  const result = await search.search({ q: 'EGFR', histology: 'NSCLC' })
  assert.equal(requestedUrl.origin, 'https://clinicaltrials.gov')
  assert.equal(requestedUrl.pathname, '/api/v2/studies')
  assert.equal(requestedUrl.searchParams.get('query.cond'), 'lung cancer')
  assert.equal(requestedUrl.searchParams.get('query.term'), 'EGFR NSCLC')
  assert.equal(result.studies[0].nctId, 'NCT12345678')
  assert.equal(result.studies[0].status, 'RECRUITING')
  assert.equal(result.studies[0].firstPostDate, '2026-01-02')
  assert.equal(result.studies[0].lastUpdate, '2026-04-03')
  assert.equal(result.studies[0].sourceUrl, 'https://clinicaltrials.gov/study/NCT12345678')
})

test('online search fails with a recoverable code and does not invent empty results', async () => {
  const search = new ClinicalTrialsGovSearch({ fetchImpl: async () => { throw new Error('offline') } })
  await assert.rejects(search.search({ q: 'lung cancer' }), error => error.code === 'UPSTREAM_UNAVAILABLE')
})
