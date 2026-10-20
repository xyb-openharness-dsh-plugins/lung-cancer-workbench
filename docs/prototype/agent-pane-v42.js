const prototypeAgent={open:false,width:35,preview:'unavailable',dragging:false,narrow:false,lastDown:0};
const AGENT_LIMIT={min:25,max:45,base:35};
const AGENT_STORE='xiaofeibao.prototype.agent-width';
try{const saved=Number(localStorage.getItem(AGENT_STORE));if(Number.isFinite(saved)&&saved>=AGENT_LIMIT.min&&saved<=AGENT_LIMIT.max)prototypeAgent.width=saved}catch{}
const agentEl=id=>document.getElementById(id);
const agentFrame=()=>document.querySelector('.prototype-ai-frame');
function prototypeAgentWidth(value,persist=true){
  const next=Math.max(AGENT_LIMIT.min,Math.min(AGENT_LIMIT.max,Number(value)||AGENT_LIMIT.base));
  prototypeAgent.width=next;
  const rounded=Math.round(next),pane=agentEl('prototype-ai-pane'),split=agentEl('prototype-ai-splitter');
  if(pane)pane.style.flexBasis=next+'%';
  if(split){split.setAttribute('aria-valuenow',String(rounded));split.setAttribute('aria-valuetext',`${rounded}%（25% 到 45%）`)}
  const range=agentEl('prototype-ai-width');
  if(range&&document.activeElement!==range)range.value=String(next);
  ['prototype-ai-width-value','prototype-ai-meta-width','prototype-ai-bubble'].forEach(id=>{const el=agentEl(id);if(el)el.textContent=rounded+'%'});
  const narrower=agentEl('prototype-agent-narrower'),wider=agentEl('prototype-agent-wider');
  if(narrower)narrower.disabled=next<=AGENT_LIMIT.min;
  if(wider)wider.disabled=next>=AGENT_LIMIT.max;
  if(persist){try{localStorage.setItem(AGENT_STORE,String(next))}catch{}}
}
function prototypeAgentShow(open,focus=true){
  prototypeAgent.open=open;
  const pane=agentEl('prototype-ai-pane'),split=agentEl('prototype-ai-splitter'),toggle=agentEl('prototype-ai-open'),edge=agentEl('prototype-ai-edge'),scrim=agentEl('prototype-ai-scrim');
  if(pane)pane.hidden=!open;
  if(split)split.hidden=!open||prototypeAgent.narrow;
  if(edge)edge.hidden=open;
  if(scrim)scrim.hidden=!(open&&prototypeAgent.narrow);
  if(toggle)toggle.setAttribute('aria-expanded',String(open));
  const label=agentEl('prototype-ai-open-label');
  if(label)label.textContent=open?'隐藏 AI 对话':'AI 对话';
  const desired=open?'AI 对话已展开':'打开 AI 对话';
  const dash=document.querySelector('[data-action="prototype-ai-open"]');
  if(dash&&dash.textContent!==desired){dash.textContent=desired;dash.setAttribute('aria-disabled',String(open))}
  const status=agentEl('status-ai');
  if(status){const b=status.querySelector('b');if(b)b.textContent=open?'宿主示意':'未接入'}
  prototypeAgentWidth(prototypeAgent.width,false);
  if(!open&&focus&&toggle)toggle.focus({preventScroll:true});
}
function prototypeAgentNarrow(flag){
  if(prototypeAgent.narrow===flag)return;
  prototypeAgent.narrow=flag;
  const frame=agentFrame();
  if(frame)frame.classList.toggle('prototype-ai-narrow',flag);
  prototypeAgentShow(prototypeAgent.open,false);
}
function prototypeAgentPreview(value){
  prototypeAgent.preview=value;
  const views={unavailable:['原生对话挂载区域','真实 Desktop 在这里显示 DSH 原生对话：消息、模型选择、输入框与附件。当前为独立 HTML，未连接宿主，不会创建会话或发送资料。'],loading:['正在连接会话 · 状态示意','在目标 Desktop 中，首次打开会核验归属，并复用或创建当前工作台的会话；慢速连接期间工作台仍可使用。'],error:['连接暂不可用 · 状态示意','保留工作台资料、筛选与原生草稿，可重试；此处没有实际调用宿主，也不会静默新建会话。'],conflict:['检测到原生草稿或附件 · 状态示意','保留原生输入框已有内容，阻止覆盖和自动发送；请在原生会话中检查草稿，或取消本次带入。']};
  const [title,detail]=views[value]||views.unavailable;
  const t=agentEl('prototype-ai-slot-title'),d=agentEl('prototype-ai-slot-detail'),r=agentEl('prototype-ai-retry');
  if(t)t.textContent=title;if(d)d.textContent=detail;if(r)r.hidden=value!=='error';
}
function prototypeAgentInit(){
  const frame=agentFrame(),workspace=frame.querySelector('.workspace'),split=agentEl('prototype-ai-splitter');
  new ResizeObserver(entries=>{workspace.style.gridTemplateColumns=(entries[0].contentRect.width<620?'62px':'216px')+' minmax(0,1fr)'}).observe(workspace);
  new ResizeObserver(entries=>{prototypeAgentNarrow(entries[0].contentRect.width<900)}).observe(frame);
  const resize=e=>{const rect=frame.getBoundingClientRect();prototypeAgentWidth((rect.right-e.clientX)/rect.width*100)};
  split.addEventListener('pointerdown',e=>{
    if(e.button!==0&&e.pointerType==='mouse')return;
    if(prototypeAgent.narrow)return;
    e.preventDefault();
    const now=Date.now();
    if(now-(prototypeAgent.lastDown||0)<340){prototypeAgent.lastDown=0;prototypeAgentWidth(AGENT_LIMIT.base);return}
    prototypeAgent.lastDown=now;
    split.focus({preventScroll:true});prototypeAgent.dragging=true;split.setPointerCapture(e.pointerId);frame.classList.add('prototype-ai-dragging');resize(e)
  });
  split.addEventListener('pointermove',e=>{if(prototypeAgent.dragging)resize(e)});
  const end=()=>{prototypeAgent.dragging=false;frame.classList.remove('prototype-ai-dragging')};
  split.addEventListener('pointerup',end);split.addEventListener('pointercancel',end);split.addEventListener('lostpointercapture',end);
  split.addEventListener('keydown',e=>{const step=e.shiftKey?6:2;const values={ArrowLeft:prototypeAgent.width+step,ArrowRight:prototypeAgent.width-step,Home:AGENT_LIMIT.min,End:AGENT_LIMIT.max};if(e.key in values){e.preventDefault();prototypeAgentWidth(values[e.key])}});
  agentEl('prototype-ai-width').addEventListener('input',e=>prototypeAgentWidth(e.target.value));
  agentEl('prototype-ai-preview-state').addEventListener('change',e=>prototypeAgentPreview(e.target.value));
  document.addEventListener('click',e=>{
    const trigger=e.target.closest('[data-action]');if(!trigger)return;
    const action=trigger.dataset.action;
    if(action==='prototype-ai-toggle')prototypeAgentShow(!prototypeAgent.open);
    if(action==='prototype-ai-open')prototypeAgentShow(true);
    if(action==='prototype-ai-close')prototypeAgentShow(false);
    if(action==='prototype-agent-narrower')prototypeAgentWidth(prototypeAgent.width-2);
    if(action==='prototype-agent-wider')prototypeAgentWidth(prototypeAgent.width+2);
    if(action==='prototype-ai-retry')prototypeAgentPreview('unavailable');
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&prototypeAgent.open&&prototypeAgent.narrow)prototypeAgentShow(false)});
  const main=document.getElementById('main');
  if(main)new MutationObserver(()=>{const dash=document.querySelector('[data-action="prototype-ai-open"]');const text=prototypeAgent.open?'AI 对话已展开':'打开 AI 对话';if(dash&&dash.textContent!==text)dash.textContent=text}).observe(main,{childList:true,subtree:true});
  prototypeAgentShow(false,false);prototypeAgentPreview('unavailable');prototypeAgentWidth(prototypeAgent.width,false);
}
