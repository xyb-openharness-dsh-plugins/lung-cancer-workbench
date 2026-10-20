import Schema from '@deepseek-ai/schemastery'
import { readFileSync } from 'node:fs'
import { createWorkbenchHandlers } from '../lib/server/api.js'
import { SqliteCaseRepository } from '../lib/server/sqlite-case-repository.js'
import { TrialSnapshotRepository } from '../lib/server/trial-snapshot.js'
import { ClinicalTrialsGovSearch } from '../lib/server/clinicaltrials-gov.js'
import { fileURLToPath } from 'node:url'

export const name = 'lung-cancer-workbench-main'
export const inject = ['webServer', 'connection']
export const Config = Schema.object({ root: Schema.string().required() })
const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

export function apply(ctx, config) {
  if (!ctx.webServer?.register) throw new Error('Desktop webServer.register is unavailable')
  if (typeof ctx.connection?.requestRejection !== 'function') throw new Error('Desktop connection authentication capability is unavailable')
  const repository = new SqliteCaseRepository(config.root)
  const trials = new TrialSnapshotRepository(fileURLToPath(new URL('../assets/data/lung-cancer-trials.sqlite', import.meta.url)))
  const liveTrials = new ClinicalTrialsGovSearch()
  const routes = createWorkbenchHandlers({
    repository,
    trials,
    liveTrials,
    version: manifest.version,
    authenticate: request => ctx.connection.requestRejection(request),
  })
  ctx.effect(() => {
    const disposers = []
    for (const [path, handler] of routes) {
      const dispose = ctx.webServer.register({ kind: 'exact', path, handler })
      if (typeof dispose === 'function') disposers.push(dispose)
    }
    return () => {
      for (const dispose of disposers) dispose()
      trials.close()
      repository.close()
    }
  }, 'lung-cancer-workbench local case API')
}
