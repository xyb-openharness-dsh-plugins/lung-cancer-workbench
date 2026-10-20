// Isolated browser acceptance environment. Real API + disposable synthetic-data directory; optional explicitly labelled native-node fixture for UI layout only.
import { createServer } from 'node:http'
import { readFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import { SqliteCaseRepository } from '../lib/server/sqlite-case-repository.js'
import { TrialSnapshotRepository } from '../lib/server/trial-snapshot.js'
import { fileURLToPath } from 'node:url'
import { createWorkbenchHandlers } from '../lib/server/api.js'
const reactRoot=process.argv[2]
if(!reactRoot)throw new Error('Pass an existing React/ReactDOM development package.json path as first argument')
const rootRequire=createRequire(reactRoot),modules=[],seen=new Map()
function bundle(path){if(seen.has(path))return seen.get(path);const id=modules.length;seen.set(path,id);modules.push('');const req=createRequire(path);const source=readFileSync(path,'utf8').replace(/\brequire\(["']([^"']+)["']\)/g,(_,name)=>`require(${bundle(req.resolve(name))})`);modules[id]=`function(module,exports,require){${source}\n}`;return id}
const reactId=bundle(rootRequire.resolve('react')),domId=bundle(rootRequire.resolve('react-dom/client'))
const runtime=`const process={env:{NODE_ENV:'production'}};const modules=[${modules.join(',')}],cache={};function req(id){if(cache[id])return cache[id].exports;const module=cache[id]={exports:{}};modules[id](module,module.exports,req);return module.exports}const React=req(${reactId}),ReactDOM=req(${domId});window.__ModuleLoader__={load(def){const plugin=def.factory(name=>{if(name==='react')return React;throw Error(name)});const fixture=new URLSearchParams(location.search).has('native-fixture');if(fixture)document.querySelector('.dev-label').textContent='UI验收 · 会话为布局测试替身 · 非真实DSH或模型服务';const input={setDraft:async()=>{},state:{getSnapshot:()=>({phase:'plain',draft:''})}};plugin.apply({effect(fn){fn()},uiWorkspace:{pickDirectory:async()=>'/ui-fixture'},sessions:{scope:()=>({get:()=>({input:{for:()=>input}})})},desktopWorkbenches:{isActive:()=>true,currentSession:()=>fixture?'ui-fixture':null,ownsSession:()=>fixture,...(fixture?{ensureSession:async()=>'ui-fixture'}:{}),register(config,Panel){ReactDOM.createRoot(document.getElementById('app')).render(React.createElement(Panel,{conversation:fixture?React.createElement('div',{style:{display:'flex',height:'100%',flexDirection:'column',padding:16,gap:12}},React.createElement('p',null,'会话节点：仅布局测试替身，不调用AI'),React.createElement('textarea',{'aria-label':'布局测试草稿',placeholder:'测试收起后草稿保留',style:{marginTop:'auto',minHeight:90}})):null}))}}})}};`
const root=mkdtempSync(join(tmpdir(),'lung-ui-acceptance-')),repository=new SqliteCaseRepository(root)
const trials=new TrialSnapshotRepository(fileURLToPath(new URL('../assets/data/lung-cancer-trials.sqlite',import.meta.url)))
const routes=createWorkbenchHandlers({repository,trials,liveTrials:{search(){throw Error('not used')}},authenticate:()=>undefined,version:'UI-acceptance'})
const html='<!doctype html><html><meta charset="utf-8"><title>小肺宝 · 本地UI验收</title><style>html,body{margin:0;height:100%}#app{height:calc(100% - 24px)}.dev-label{height:24px;font:12px/24px sans-serif;background:#fff0dc;text-align:center}</style><body><div class="dev-label">本地UI验收环境 · 独立合成资料目录 · 非DSH宿主</div><div id="app"></div><script src="/runtime.js"></script><script src="/client.js"></script></body></html>'
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost'),handler=routes.get(url.pathname);if(handler)return await handler(req,res)
  const files={'/client.js':new URL('../lib/client.js',import.meta.url),'/prototype':new URL('../docs/prototype/lung-workbench-v4.2.6.html',import.meta.url),'/prototype-v427':new URL('../docs/prototype/lung-workbench-v4.2.7.html',import.meta.url)}
  if(url.pathname==='/'){res.setHeader('content-type','text/html;charset=utf-8');return res.end(html)}
  if(url.pathname==='/runtime.js'){res.setHeader('content-type','text/javascript');return res.end(runtime)}
  if(files[url.pathname]){res.setHeader('content-type',url.pathname.startsWith('/prototype')?'text/html;charset=utf-8':'text/javascript');return res.end(readFileSync(files[url.pathname]))}
  res.writeHead(404);res.end()
}catch(e){res.writeHead(500);res.end('UI preview failed')}})
server.listen(54187,'127.0.0.1',()=>console.log('UI acceptance: http://127.0.0.1:54187 (auto-stops in 15 minutes)'))
function stop(){server.close();repository.close();trials.close();rmSync(root,{recursive:true,force:true});process.exit(0)}
process.on('SIGINT',stop);process.on('SIGTERM',stop);setTimeout(stop,15*60*1000)
