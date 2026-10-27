import './sync-prototype-cases.mjs'
import { readFileSync, writeFileSync } from 'node:fs'

const clientPath = new URL('../lib/client.js', import.meta.url)
const logoPath = new URL('../assets/brand/lung-care-logo.png', import.meta.url)
const versionPath = new URL('../VERSION', import.meta.url)
const demoCasesPath = new URL('../lib/demo-cases.json', import.meta.url)
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const version = readFileSync(versionPath, 'utf8').trim()
if (version !== packageJson.version) throw new Error(`VERSION (${version}) does not match package.json (${packageJson.version})`)

let client = readFileSync(clientPath, 'utf8')
const geometry=readFileSync(new URL('../lib/chart-geometry.js',import.meta.url),'utf8').replace(/^export /gm,'')
client=client.replace(/\/\*__CHART_HELPERS_START__\*\/[\s\S]*?\/\*__CHART_HELPERS_END__\*\//,()=>`/*__CHART_HELPERS_START__*/\n${geometry}\n/*__CHART_HELPERS_END__*/`)
const catalog=readFileSync(new URL('../lib/metric-catalog.js',import.meta.url),'utf8').replace(/^import .*$/gm,'').replace(/^export /gm,'')
client=client.replace(/\/\*__METRIC_CATALOG_START__\*\/[\s\S]*?\/\*__METRIC_CATALOG_END__\*\//,()=>`/*__METRIC_CATALOG_START__*/\n${catalog}\n/*__METRIC_CATALOG_END__*/`)
const kitPattern=/\/\*__UI_KIT_START__\*\/[\s\S]*?\/\*__UI_KIT_END__\*\//
if(!kitPattern.test(client))throw new Error('UI kit marker was not found')
client=client.replace(kitPattern,()=>`/*__UI_KIT_START__*/\n${readFileSync(new URL('../lib/client-ui.js',import.meta.url),'utf8')}\n/*__UI_KIT_END__*/`)
for(const [marker,file] of [['METRICS','client-metrics.js'],['ARCHIVE','client-archives.js'],['TIMELINE','client-timeline.js'],['REVIEW_SAVED','client-review-saved.js'],['TRIALS','client-trials.js']]){
  const pattern=new RegExp(`/\\*__${marker}_PAGE_START__\\*/[\\s\\S]*?/\\*__${marker}_PAGE_END__\\*/`)
  if(!pattern.test(client))throw new Error(`${marker} client marker was not found`)
  client=client.replace(pattern,()=>`/*__${marker}_PAGE_START__*/\n${readFileSync(new URL('../lib/'+file,import.meta.url),'utf8')}\n/*__${marker}_PAGE_END__*/`)
}
const detailCss=readFileSync(new URL('../assets/workspace-detail.css',import.meta.url),'utf8')+'\n'+readFileSync(new URL('../assets/prototype-parity.css',import.meta.url),'utf8')+'\n'+readFileSync(new URL('../assets/trials.css',import.meta.url),'utf8')
client=client.replace(/\/\*__EXTRA_CSS_START__\*\/[\s\S]*?\/\*__EXTRA_CSS_END__\*\//,()=>`/*__EXTRA_CSS_START__*/\n${detailCss}\n/*__EXTRA_CSS_END__*/`)
// 36 号 v2 · 疾病概要：数据与样式都以 docs/prototype 为单一来源，避免两处漂移。
const primerDataPath=new URL('../docs/prototype/primer-data.js',import.meta.url)
const primerDataSource=readFileSync(primerDataPath,'utf8')
if(!/window\.DISEASE_PRIMER\s*=\s*\{/.test(primerDataSource))throw new Error('primer-data.js must assign a plain object literal to window.DISEASE_PRIMER')
const primerData=primerDataSource.replace(/window\.DISEASE_PRIMER\s*=\s*/,'const PRIMER_DATA = ').trim()
if(!primerData.includes('const PRIMER_DATA = {')||!primerData.endsWith('}'))throw new Error('primer-data.js must be a single assignment ending with a closing brace')
client=client.replace(/\/\*__PRIMER_DATA_START__\*\/[\s\S]*?\/\*__PRIMER_DATA_END__\*\//,()=>`/*__PRIMER_DATA_START__*/\n${primerData}\n/*__PRIMER_DATA_END__*/`)
const primerCss=readFileSync(new URL('../docs/prototype/primer.css',import.meta.url),'utf8')+'\n'+readFileSync(new URL('../assets/primer-theme.css',import.meta.url),'utf8')
if(/[`]|\$\{/.test(primerCss))throw new Error('primer CSS must not contain backticks or ${} template syntax')
client=client.replace(/\/\*__PRIMER_CSS_START__\*\/[\s\S]*?\/\*__PRIMER_CSS_END__\*\//,()=>`/*__PRIMER_CSS_START__*/\n${primerCss}\n/*__PRIMER_CSS_END__*/`)
const primerPagePattern=/\/\*__PRIMER_PAGE_START__\*\/[\s\S]*?\/\*__PRIMER_PAGE_END__\*\//
if(!primerPagePattern.test(client))throw new Error('PRIMER page marker was not found')
client=client.replace(primerPagePattern,()=>`/*__PRIMER_PAGE_START__*/\n${readFileSync(new URL('../lib/client-primer.js',import.meta.url),'utf8')}\n/*__PRIMER_PAGE_END__*/`)
const logo = `data:image/png;base64,${readFileSync(logoPath).toString('base64')}`
const logoMarker = /const LOGO_DATA_URI = '(?:__LUNG_CARE_LOGO_DATA_URI__|data:image\/png;base64,[A-Za-z0-9+/=]+)'/
if (!logoMarker.test(client)) throw new Error('Client logo marker was not found')
client = client.replace(logoMarker, `const LOGO_DATA_URI = '${logo}'`)
const versionMarker = /const VERSION = '(?:__WORKBENCH_VERSION__|\d+\.\d+\.\d+(?:-[\w.-]+)? · 开发中)'/
if (!versionMarker.test(client)) {
  throw new Error('Client version marker was not found or is inconsistent')
}
client = client.replace(versionMarker, `const VERSION = '${version} · 开发中'`)
const demoMarker = /const DEMO_CASES = JSON\.parse\(\/\*__LUNG_DEMO_CASES__\*\/"(?:[^"\\]|\\.)*"\)/
if (!demoMarker.test(client)) throw new Error('Client demo-data marker was not found')
const demoCases = JSON.parse(readFileSync(demoCasesPath, 'utf8'))
if (!Array.isArray(demoCases) || demoCases.length < 2 || demoCases.some(item => item.demo !== true)) {
  throw new Error('At least two explicitly synthetic demo cases are required')
}
const encodedDemoCases = JSON.stringify(JSON.stringify(demoCases)).slice(1, -1)
client = client.replace(demoMarker, `const DEMO_CASES = JSON.parse(/*__LUNG_DEMO_CASES__*/"${encodedDemoCases}")`)
writeFileSync(clientPath, client)
process.stdout.write(`Embedded the brand logo, synthetic demo cases, and v${version} in the single-file DSH client.\n`)
