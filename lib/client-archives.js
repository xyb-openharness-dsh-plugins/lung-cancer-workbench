      const fileUrl = (id,kind='source',preview=false) => `${API}/files/download?${new URLSearchParams({caseId:caseFile?.id||'',id,kind,preview:String(preview)})}`
      const refreshArchives = async (id=caseFile?.id) => {
        if(!id||id.startsWith('demo-'))return
        const result=await api(`/archives?caseId=${encodeURIComponent(id)}`)
        if(activeCaseRef.current===id)setArchives(result)
      }
      const importFiles = async files => {
        if(!caseFile||isDemoCase){notify('请先选择或创建真实病例档案；演示病例只读。');setShowCasePicker(true);return}
        if(archiveBusy)return
        const list=Array.from(files||[]),caseId=caseFile.id
        if(!list.length)return
        setArchiveBusy(true);setError('');let success=0;const failures=[]
        try{
          for(let i=0;i<list.length;i++){
            const file=list[i];if(activeCaseRef.current!==caseId)break
            setUploadProgress(`正在保存 ${i+1}/${list.length}：${file.name}`)
            if(file.size>20*1024*1024||!file.size){failures.push(`${file.name}：大小需在0–20MB之间`);continue}
            try{const encoded=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(new Error('本机读取失败'));reader.readAsDataURL(file)})
              await api('/documents/import',{method:'POST',body:JSON.stringify({caseId,name:file.name,dataBase64:encoded})});success++
            }catch(e){failures.push(`${file.name}：${e.message}`)}
          }
          if(activeCaseRef.current===caseId){await refreshArchives(caseId);setPage('archives');setArchiveTab('imports');setShowComposer(false);setUploadProgress(`导入完成：${success}份成功${failures.length?`；${failures.length}份失败：${failures.join('；')}`:'。原件已保存在本机，尚未成为病例事实。'}`)}
        }finally{setArchiveBusy(false)}
      }
      const uploadWidget = () => h('div',{className:'wb-upload-zone',onDragOver:e=>e.preventDefault(),onDrop:e=>{e.preventDefault();importFiles(e.dataTransfer.files)}},h('b',null,'导入报告原件'),h('p',{className:'wb-muted wb-small'},'点击选择或拖放文件 · 支持PDF、Word、Excel、PPT、文本及常见图片（含HEIC/HEIF）· 每份20MB以内'),
        h('input',{type:'file',multiple:true,accept:'.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.rtf,.txt,.md,.csv,.json,.html,.htm,.png,.jpg,.jpeg,.webp,.gif,.bmp,.tif,.tiff,.heic,.heif',disabled:archiveBusy||isDemoCase||!caseFile,'aria-label':'选择要导入的报告文件',onChange:e=>{const files=Array.from(e.target.files||[]);e.target.value='';importFiles(files)}}),
        !caseFile||isDemoCase?button('选择 / 创建本机档案',()=>{setShowComposer(false);setShowCasePicker(true)}):null,
        h('p',{className:'wb-muted wb-small'},'原件先留在本机；解析结果须逐项核对，确认后才进入病例。'),uploadProgress?h('p',{role:'status','aria-live':'polite',className:'wb-upload-result'},uploadProgress):null)
      const openDocument = async id => {
        const caseId=caseFile?.id;if(!caseId||isDemoCase)return
        setError('');try{const detail=await api(`/documents/read?caseId=${encodeURIComponent(caseId)}&documentId=${encodeURIComponent(id)}`);if(activeCaseRef.current===caseId){setDocumentReview({...detail,candidates:detail.candidates.map(c=>({...c,selected:false}))});setCloudConsent(false);setDocumentConfirmConsent(false)}}catch(e){setError(e.message)}
      }
      const parseDocument = async () => {
        if(!documentReview||parsing)return
        const caseId=caseFile.id,documentId=documentReview.document.id
        setParsing(true);setError('')
        try{const result=await api('/documents/parse',{method:'POST',body:JSON.stringify({caseId,documentId,cloudConsent})});if(activeCaseRef.current===caseId)setDocumentReview(old=>old?.document.id===documentId?{...result,candidates:result.candidates.map(c=>({...c,selected:false}))}:old);await refreshArchives(caseId);setDocumentConfirmConsent(false)}catch(e){setError(e.message);await refreshArchives(caseId).catch(()=>{})}finally{setParsing(false)}
      }
      const updateCandidate = (id,field,value) => {setDocumentConfirmConsent(false);setDocumentReview(old=>({...old,candidates:old.candidates.map(c=>c.id!==id?c:field==='selected'?{...c,selected:value}:field==='date'?{...c,date:value?{precision:'day',value}:{precision:'unknown',value:null}}:field==='kind'?{...c,kind:value}:{...c,data:{...c.data,[field]:value}})}))}
      const confirmDocument = async () => {
        if(!documentReview||!documentConfirmConsent||archiveBusy)return
        const caseId=caseFile.id,doc=documentReview.document,items=documentReview.candidates.filter(c=>c.selected&&c.status==='candidate').map(c=>({id:c.id,kind:c.kind,date:c.date,data:c.data}))
        if(!items.length)return
        setArchiveBusy(true);setError('')
        try{const result=await api('/documents/confirm',{method:'POST',body:JSON.stringify({caseId,documentId:doc.id,parseRevision:doc.parse_revision,expectedRevision:caseFile.revision,items})});if(activeCaseRef.current===caseId){setCaseFile(result.caseFile);await openDocument(doc.id);notify(`已确认${items.length}条记录并保存到SQLite`)} }catch(e){setError(e.message)}finally{setArchiveBusy(false)}
      }
      const exportArchive = async (format='json') => {
        if(!caseFile||isDemoCase){notify('请先选择真实病例档案；演示资料不导出。');return}
        const caseId=caseFile.id
        try{const result=await api('/exports/create',{method:'POST',body:JSON.stringify({caseId,format,expectedRevision:caseFile.revision})});if(activeCaseRef.current===caseId){await refreshArchives(caseId);const a=document.createElement('a');a.href=fileUrl(result.artifact.id,'export');a.download=result.artifact.name;a.click();notify('已生成输出文件，可在档案管理重新下载。')}}catch(e){setError(e.message)}
      }
      const archivesPage = () => h('div',{className:'wb-page'},head('档案管理','统一管理本病例的导入原件、解析与核对状态，以及生成的输出文件。',button('切换 / 创建档案',()=>setShowCasePicker(true))),
        h('div',{className:'wb-subnav'},[['imports','导入原件'],['exports','导出文件']].map(([key,label])=>h('button',{key,'aria-pressed':archiveTab===key,onClick:()=>setArchiveTab(key)},label))),
        !caseFile||isDemoCase?h('div',{className:'wb-alert'},'请选择真实病例档案后导入文件；演示档案只用于界面预览。',button('选择 / 创建档案',()=>setShowCasePicker(true))):null,
        archiveTab==='imports'?h(React.Fragment,null,uploadWidget(),h('div',{className:'wb-stack',style:{marginTop:18}},archives.documents.length?archives.documents.map(doc=>h('article',{className:'wb-card wb-archive-row',key:doc.id},h('div',null,h('h3',null,doc.name),h('p',{className:'wb-muted wb-small'},`${(doc.size/1024).toFixed(1)}KB · ${doc.created_at.slice(0,10)} · ${doc.mime}`),h('span',{className:'wb-tag'},({imported:'待解析',parsing:'解析中',parsed:'已解析 / 待核对',failed:'解析失败'})[doc.status]),doc.preview_error?h('p',{className:'wb-muted wb-small'},doc.preview_error):null,doc.parse_error?h('p',{className:'wb-alert'},doc.parse_error):null),h('div',{className:'wb-actions'},button('预览 / 解析 / 确认',()=>openDocument(doc.id),'wb-button primary'),h('a',{className:'wb-button',href:fileUrl(doc.id),download:doc.name},'下载原件')))):h('div',{className:'wb-empty'},'还没有导入原件；可从一份病理、基因或复查报告开始。'))):
          h('div',{className:'wb-stack'},h('div',{className:'wb-actions'},button('生成已确认资料 JSON',()=>exportArchive('json'),'wb-button primary'),button('生成病程摘要 Markdown',()=>exportArchive('md'))),h('p',{className:'wb-muted wb-small'},'输出只包含已确认且未标记私密的记录和来源索引，不包含原件。'),archives.exports.length?archives.exports.map(file=>h('article',{className:'wb-card wb-archive-row',key:file.id},h('div',null,h('b',null,file.name),h('p',{className:'wb-muted wb-small'},`${(file.size/1024).toFixed(1)}KB · ${file.created_at}`)),h('a',{href:fileUrl(file.id,'export'),className:'wb-button',download:file.name},'重新下载'))):h('div',{className:'wb-empty'},'还没有生成输出文件。')))
      const documentDialog = documentReview ? h('div',{className:'wb-dialog-backdrop',role:'presentation'},h('section',{className:'wb-dialog wb-document-dialog',role:'dialog','aria-modal':true,'aria-label':'原件预览、解析与确认'},
        h('header',{className:'wb-row'},h('div',null,h('h2',null,documentReview.document.name),h('small',{className:'wb-muted'},'原件 → 解析候选 → 核对后写入病例')),button('关闭',()=>setDocumentReview(null))),
        h('div',{className:'wb-dialog-body'},h('div',{className:'wb-document-columns'},h('div',{className:'wb-stack'},h('h3',null,'原件预览'),documentReview.document.hasPreview?(documentReview.document.mime==='application/pdf'?h('iframe',{className:'wb-document-preview',title:'报告原件预览',src:fileUrl(documentReview.document.id,'source',true)}):h('img',{className:'wb-document-preview',alt:'原件预览副本',src:fileUrl(documentReview.document.id,'source',true)})):h('div',{className:'wb-empty'},'此格式请下载到本机查看；解析后可在这里回看文本。'),h('a',{className:'wb-button',href:fileUrl(documentReview.document.id),download:documentReview.document.name},'下载原件'),h('p',{className:'wb-muted wb-small'},documentReview.document.preview_error||'预览副本不替代原件。'),
          h('h3',null,'解析文本'),documentReview.text?h('pre',{className:'wb-parsed-text'},documentReview.text):h('p',{className:'wb-muted'},'尚未解析。')),
          h('div',{className:'wb-stack'},h('h3',null,'解析与人工核对'),h('p',{className:'wb-muted wb-small'},'解析只提取原文和候选；未确认内容不进入病例事实。日期未知的指标不会绘制成曲线。'),
            !documentReview.document.localParse?h('label',{className:'wb-agent-consent'},h('input',{type:'checkbox',checked:cloudConsent,onChange:e=>setCloudConsent(e.target.checked)}),'同意将本文件发送至 MinerU（mineru.net）进行解析。'):h('p',{className:'wb-tag green'},'此文本格式可在本机解析'),
            h('button',{className:'wb-button primary',disabled:parsing||archiveBusy||(!documentReview.document.localParse&&!cloudConsent),onClick:parseDocument},parsing?'正在解析，请稍候…':documentReview.text?'重新解析（生成新版本）':'开始解析'),
            documentReview.candidates.length?documentReview.candidates.map(c=>h('section',{className:'wb-candidate',key:c.id},h('label',null,h('input',{type:'checkbox',disabled:c.status!=='candidate',checked:c.selected,onChange:e=>updateCandidate(c.id,'selected',e.target.checked)}),c.status==='accepted'?'已确认入库':'选择本条候选'),
              h('fieldset',{className:'wb-form',disabled:c.status!=='candidate',style:{border:0,padding:0}},select(c.kind,v=>updateCandidate(c.id,'kind',v),[['pathology','报告 / 病理原文'],['diagnosis','诊断分型'],['staging','分期原文'],['biomarker','分子 / PD-L1 原文'],['metric','指标']],'记录类型'),h('label',{className:'wb-field'},h('span',null,'报告 / 采样日期（未知可空）'),h('input',{type:'date',value:c.date?.precision==='day'?c.date.value:'',disabled:c.status!=='candidate',onChange:e=>updateCandidate(c.id,'date',e.target.value)})),
                c.kind==='metric'?h(React.Fragment,null,...[['metricName','指标名称'],['rawValue','报告数值'],['unit','报告单位'],['methodText','检测方法（可空）'],['laboratoryText','实验室（可空）']].map(([key,label])=>h('label',{className:'wb-field',key},h('span',null,label),h('input',{value:c.data[key]||'',onChange:e=>updateCandidate(c.id,key,e.target.value)})))):
                  c.kind==='diagnosis'?h(React.Fragment,null,select(c.data.clinicalType||'unknown',v=>updateCandidate(c.id,'clinicalType',v),[['unknown','未知'],['nsclc','NSCLC'],['sclc','SCLC'],['combined','混合型']],'临床类型'),h('label',{className:'wb-field'},h('span',null,'病理分型原文'),h('input',{value:c.data.histologyText||'',onChange:e=>updateCandidate(c.id,'histologyText',e.target.value)}))):
                  c.kind==='staging'?h('label',{className:'wb-field full'},h('span',null,'分期原文'),h('input',{value:c.data.stageText||'',onChange:e=>updateCandidate(c.id,'stageText',e.target.value)})):null,
                h('label',{className:'wb-field full'},h('span',null,'原文 / 核对内容'),h('textarea',{value:c.data.originalText||c.sourceQuote||'',disabled:c.status!=='candidate',onChange:e=>updateCandidate(c.id,'originalText',e.target.value)}))),h('small',{className:'wb-muted'},'请与左侧原件核对；不确定的条目可留待以后处理。'))):h('div',{className:'wb-empty'},'解析完成后，候选条目会出现在这里。')))),
        h('footer',{className:'wb-document-footer'},h('label',{className:'wb-agent-consent'},h('input',{type:'checkbox',checked:documentConfirmConsent,onChange:e=>setDocumentConfirmConsent(e.target.checked)}),'我已对照原件，核对所选记录的类型、日期、数值与单位。'),h('button',{className:'wb-button primary',disabled:archiveBusy||parsing||!documentConfirmConsent||!documentReview.candidates.some(c=>c.selected&&c.status==='candidate'),onClick:confirmDocument},archiveBusy?'保存中…':'确认所选记录并保存病例')))) : null
