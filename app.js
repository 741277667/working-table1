import {bindContinuousInput,installTooltips} from './interactions.mjs?v=7';
import {paperTilt,paperPose,paperVariant} from './tactile.mjs?v=7';
import {migrate,validState as validate,archiveCard,restoreCard,projectAction,visibleCard} from './model.mjs';
const $=(s,p=document)=>p.querySelector(s), $$=(s,p=document)=>[...p.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const families=['cream-index','white-grid','soft-blue','warm-yellow','grey-archive','rose-postcard','green-ledger','plain-letter'];
const familyNames=['奶油索引','白色方格','浅蓝便笺','暖黄纸条','灰色档案','玫瑰明信片','绿色账页','素色信纸'];
const defaultZones=[{id:'media',name:'自媒体',en:'THE EDITORIAL',modules:['灵感纸篓','选题库','当前制作','素材文件格','待办便签','已发布 / 复盘']},{id:'thesis',name:'毕业设计',en:'RESEARCH STUDIO',modules:['当前研究','问题纸堆','灵感碎纸','研究地图','尝试记录','资料文件格','今日足迹','SAVE 存档','成果文件架']},{id:'freelance',name:'兼职',en:'SIDE PROJECTS',modules:['IN · 新任务','WORKING · 制作中','DELIVERED · 已交付','PAID · 已结算']},{id:'work',name:'工作',en:'WHAT’S NEXT',modules:['实习 · 短期任务','实习 · 长线项目','实习 · 等待','实习 · 已完成','校招 · WANT','校招 · APPLIED','校招 · PROCESS','校招 · WAITING','校招 · CLOSED']},{id:'life',name:'生活',en:'LITTLE THINGS',modules:['日常小事','购物清单','想买','最近想做']}];
const uid=()=>crypto.randomUUID(); const now=()=>new Date().toISOString();
function make(title,area,module,type='NOTE',family='cream-index',summary=''){return {id:uid(),title,summary,type,home_area:area,home_module:module,surface:area?'home':'inbox',lane:'TODAY',status:'ACTIVE',deadline:'',start_date:'',notes:'',checklist:[],attachments:[],links:[],tags:[],relations:[],history:[{at:now(),text:'创建卡片'}],created_at:now(),updated_at:now(),visual_dna:{family,rotation:(Math.random()-.5)*4},positions:{},stack_id:null};}
const seeds=[make('让灵感先发生','media','灵感纸篓','NOTE','warm-yellow','把生活里的小发现\n攒成下一次表达。'),make('九月的创作计划','media','当前制作','PROJECT','plain-letter','一篇图文，一次新的尝试。'),make('修改开题报告','thesis','当前研究','TASK','cream-index','重新梳理研究目的，\n让问题更清晰一点。'),make('视觉语法的边界','thesis','问题纸堆','NOTE','white-grid','离散单元，如何形成语言？'),make('收集一点蓝色','thesis','灵感碎纸','SAVE','soft-blue','色彩 · 结构 · 节奏'),make('本周设计交付','freelance','WORKING · 制作中','TASK','plain-letter','检查版式与导出文件。'),make('整理作品集','work','实习 · 长线项目','PROJECT','rose-postcard','选出最能代表自己的三个项目。'),make('下一站，去哪里？','work','校招 · WANT','NOTE','cream-index','记录想了解的岗位。'),make('把日子过得具体一点','life','购物清单','LIST','warm-yellow','鲜花、咖啡，还有好好吃饭。'),make('想研究 AI × 设计岗位',null,null,'NOTE','soft-blue','先记下来，慢慢整理。')];seeds[8].checklist=[{id:uid(),text:'买一束鲜花',done:false},{id:uid(),text:'补充咖啡豆',done:true},{id:uid(),text:'去公园散步',done:false}];
const KEY='personal-desk-v1';let state={version:1,cards:seeds,modules:Object.fromEntries(defaultZones.map(z=>[z.id,z.modules])),layouts:{},zoneOrder:defaultZones.map(z=>z.id)},storageError=false;
state=migrate(state,defaultZones);
let loadBlocked=false;
try {
  const raw=localStorage.getItem(KEY);
  if(raw){const parsed=migrate(JSON.parse(raw),defaultZones);if(validState(parsed)){if(JSON.parse(raw).version===1)localStorage.setItem(KEY+'-pre-v2',raw);state=parsed;}else loadBlocked=true;}
} catch {loadBlocked=true;}
function validState(s){return validate(s,families);}
const zones=()=>state.projects;
const activeZones=()=>zones().filter(z=>z.status==='active');
let mainDirty=false;
let view=null,drawer=null,selected=null,openModuleName=null,undoSnapshot=null,lastFocus=null,drag=null,toastTimer,expandedStacks=new Set();
function save(){if(loadBlocked){toast('旧数据读取失败，已保护原内容。请导出备份或导入有效文件。');return false;}try{localStorage.setItem(KEY,JSON.stringify(state));$('#save-status').textContent='已保存';return true;}catch{storageError=true;$('#save-status').textContent='保存失败 · 请导出桌面备份';toast('浏览器空间不足，请导出桌面备份。');}}
function change(c,text){c.updated_at=now();c.history.push({at:now(),text});save();}
function toast(msg,undo=false){clearTimeout(toastTimer);$('#toast').innerHTML=esc(msg)+(undo?' <button id="undo">撤销</button>':'');$('#toast').style.display='block';$('#undo')?.addEventListener('click',()=>{state=undoSnapshot;save();closeOverlay();render();toast('已撤销');});toastTimer=setTimeout(()=>$('#toast').style.display='none',6500);}
function snapshot(){undoSnapshot=structuredClone(state);}
function cardHTML(c,ghost=false){const p=c.positions[positionKey()]||{x:0,y:0};let siblings=c.stack_id?state.cards.filter(x=>x.stack_id===c.stack_id&&x.surface===c.surface):[];const hidden=siblings.length>1&&siblings[0].id!==c.id&&!expandedStacks.has(c.stack_id);return `<article class="card ${c.visual_dna.family} ${ghost?'ghost':''} ${hidden?'stack-hidden':''}" data-paper-variant="${paperVariant(c.id)}" data-card="${c.id}" data-ghost="${ghost}" tabindex="0" role="button" aria-label="打开 ${esc(c.title)}" style="--r:${Number(c.visual_dna.rotation)||0}deg;--x:${Number(p.x)||0}px;--y:${Number(p.y)||0}px"><div class="card-type">${esc(c.type)}<button class="complete" data-complete="${c.id}" aria-label="${c.surface==='archive'?'恢复':'完成并归档'} ${esc(c.title)}">${c.surface==='archive'?'↶':'✓'}</button></div><h3>${esc(c.title)}</h3><div class="summary">${esc(c.summary)}</div>${c.type==='LIST'?c.checklist.slice(0,3).map(i=>`<div class="check-row">${i.done?'☑':'□'} ${esc(i.text)}</div>`).join(''):''}${c.deadline?`<div class="stamp">${esc(c.deadline)}</div>`:''}${ghost?`<div class="stamp">→ currently ${esc(c.surface.toUpperCase())}</div>`:c.status!=='ACTIVE'?`<div class="stamp">${esc(c.status)}</div>`:''}${siblings.length>1?`<button class="stack-label" data-stack="${c.stack_id}">${siblings.length} 张纸 · ${expandedStacks.has(c.stack_id)?'收拢':'展开'}</button>`:''}${drawer==='archive'?`<div class="archive-meta">${esc(zones().find(z=>z.id===c.home_area)?.name||'未分类')}<br>${c.completed_at?'完成 '+formatDate(c.completed_at):c.status==='DONE'?'完成时间未记录':c.surface==='archive'?'已归档':'随项目归档'}</div>`:''}</article>`;}
function positionKey(){return (drawer==='module'?'module:'+view+':'+openModuleName:drawer||view||'desk')+(innerWidth<701?':mobile':'');}
function formatDate(v){return v?new Date(v).toLocaleString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}):'未记录';}
function layoutID(id){return id+(innerWidth<701?':mobile':'');}
function layoutStyle(id){const l=state.layouts[layoutID(id)]||{};return `style="--x:${Number(l.x)||0}px;--y:${Number(l.y)||0}px;z-index:${Number(l.z)||1}"`;}
function zoneMenu(z){return `<details class="zone-menu"><summary title="管理分区" aria-label="管理 ${esc(z.name)}">···</summary><div><button data-project="rename" data-id="${z.id}">重命名</button><button data-project="archive" data-id="${z.id}">归档</button><button data-project="delete" data-id="${z.id}">删除</button></div></details>`;}
function render(){
  if(view&&!activeZones().some(z=>z.id===view))view=null;
  $('#today-count').textContent=state.cards.filter(c=>c.surface==='today'&&visibleCard(state,c)).length;
  $('#inbox-count').textContent=state.cards.filter(c=>c.surface==='inbox'&&visibleCard(state,c)).length;
  $('#archive-count').textContent=state.cards.filter(c=>c.surface==='archive').length+zones().filter(z=>z.status==='archived').length;
  if(!view){
    $('#main').innerHTML=`<div class="desk-heading"><h1>我的桌面</h1><button id="new-project">＋ 新建分区</button></div><div class="desk">${state.zoneOrder.map(id=>zones().find(z=>z.id===id)).filter(z=>z.status==='active').map(z=>{
      const cards=state.cards.filter(c=>c.home_area===z.id&&!['archive','trash'].includes(c.surface));
      return `<section class="zone ${esc(z.style||'custom')}" data-zone="${z.id}" data-layout="${z.id}" data-drop="zone:${z.id}" ${layoutStyle(z.id)}><div class="zone-top"><button class="zone-title" data-open-zone="${z.id}">${esc(z.name)}</button>${zoneMenu(z)}</div><div class="zone-meta">${cards.length} 张纸</div><div class="cards">${cards.slice(0,z.style==='thesis'?3:2).map(c=>cardHTML(c,c.surface!=='home')).join('')||'<div class="empty">＋</div>'}</div></section>`;
    }).join('')}</div>`;
    $('#new-project').onclick=()=>editProject();
  }else{
    const z=zones().find(z=>z.id===view);
    $('#main').innerHTML=`<div class="zone-view"><div class="zone-header"><div><button id="back" title="返回桌面" aria-label="返回桌面">←</button><h1>${esc(z.name)}</h1></div><button id="add-module" title="新建文件夹">＋ 文件夹</button></div><div class="modules">${state.modules[view].map(m=>{
      const list=state.cards.filter(c=>c.home_area===view&&c.home_module===m&&!['archive','trash'].includes(c.surface));
      return `<section class="module" data-layout="${esc(view+':'+m)}" data-module="${esc(m)}" data-drop="module:${esc(m)}" ${layoutStyle(view+':'+m)}><header><h2><button class="module-title" data-open-module="${esc(m)}">${esc(m)}</button></h2><div><button data-module-add="${esc(m)}" title="新建纸条" aria-label="新建纸条">＋</button><button data-delete-module="${esc(m)}" title="删除文件夹" aria-label="删除文件夹">×</button></div></header><div class="cards">${list.map(c=>cardHTML(c,c.surface!=='home')).join('')||'<div class="empty">＋</div>'}</div></section>`;
    }).join('')}</div></div>`;
    $('#back').onclick=()=>{view=null;render();};
    $('#add-module').onclick=()=>nameForm('新建文件夹','',name=>{if(state.modules[view].includes(name)){toast('已有同名文件夹');return;}state.modules[view].push(name);save();closeOverlay();render();});
  }
  $$('[data-open-zone]').forEach(b=>b.onclick=()=>{view=b.dataset.openZone;render();});
  $$('[data-open-module]').forEach(b=>b.onclick=()=>openModule(b.dataset.openModule));
  $$('[data-module-add]').forEach(b=>b.onclick=()=>{openModule(b.dataset.moduleAdd);queueMicrotask(()=>$('#module-input')?.focus());});
  $$('[data-delete-module]').forEach(b=>b.onclick=()=>{if(!confirm('删除文件夹？纸片会保留在 INBOX。'))return;const m=b.dataset.deleteModule;snapshot();state.cards.filter(c=>c.home_area===view&&c.home_module===m).forEach(c=>{c.home_module=null;c.home_area=null;if(!['archive','trash'].includes(c.surface))c.surface='inbox';});state.modules[view]=state.modules[view].filter(x=>x!==m);save();render();toast('文件夹已删除',true);});
  $$('[data-project]').forEach(b=>b.onclick=()=>manageProject(b.dataset.id,b.dataset.project));
  bindCards($('#main'));bindLayouts();
}
function nameForm(title,value,submit){drawer=null;selected=null;shell(title,'','search-drawer');$('#drawer-body').innerHTML=`<form id="name-form"><input id="name-input" aria-label="名称" maxlength="60" required value="${esc(value)}" placeholder="名称"><button type="submit" title="保存" aria-label="保存">✓</button></form>`;$('#name-form').onsubmit=e=>{e.preventDefault();const v=$('#name-input').value.trim();if(v)submit(v);};queueMicrotask(()=>{$('#name-input')?.focus();$('#name-input')?.select();});}
function editProject(id){const z=zones().find(z=>z.id===id);nameForm(z?'重命名分区':'新建分区',z?.name||'',name=>{snapshot();if(z)z.name=name;else{const id=uid();state.projects.push({id,name,style:'custom',status:'active',created_at:now()});state.modules[id]=['纸片'];state.zoneOrder.push(id);}save();closeOverlay();render();});}
function manageProject(id,a){if(a==='rename'){editProject(id);return;}if(a==='delete'&&!confirm('删除这个分区及其内容？可从废纸篓恢复。'))return;snapshot();projectAction(state,id,a);save();if(view===id)view=null;refresh();toast(a==='restore'?'分区已恢复':a==='archive'?'分区已归档':'分区已移入废纸篓',true);}
function bindCards(root){$$('[data-card]',root).forEach(el=>{el.onclick=e=>{if(e.target.closest('button')||drag)return;openDetail(el.dataset.card);};el.oncontextmenu=e=>{e.preventDefault();openDetail(el.dataset.card);};el.onkeydown=e=>{if(e.target!==el)return;if(e.code==='Enter')openDetail(el.dataset.card);if(e.code==='Space'){e.preventDefault();el.classList.add('peeking');}};el.onkeyup=()=>el.classList.remove('peeking');el.onpointerdown=e=>startDrag(e,el,'card');});$$('[data-complete]',root).forEach(b=>b.onclick=e=>{e.stopPropagation();let c=state.cards.find(c=>c.id===b.dataset.complete);if(c.surface==='archive')action(c,'restore');else complete(c, b.closest('.card'));});$$('[data-stack]',root).forEach(b=>b.onclick=e=>{e.stopPropagation();const id=b.dataset.stack;expandedStacks.has(id)?expandedStacks.delete(id):expandedStacks.add(id);refresh();});}
function refresh(){render();if(selected)openDetail(selected,true);else if(drawer)openDrawer(drawer,true);}
function closeOverlay(){hideTooltip();drawer=null;selected=null;$('#overlay').innerHTML='';document.body.style.overflow='';if(mainDirty){mainDirty=false;render();}lastFocus?.focus?.();}
function shell(title,sub,cls=''){hideTooltip();if(!$('#overlay').children.length)lastFocus=document.activeElement;$('#overlay').innerHTML=`<div class="veil"></div><section class="drawer ${cls}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="drawer-heading"><div><h2>${esc(title)}</h2><p>${esc(sub)}</p></div><button class="close" aria-label="关闭">×</button></div><div id="drawer-body"></div></section>`;$('.veil').onclick=closeOverlay;$('.close').onclick=closeOverlay;document.body.style.overflow='hidden';queueMicrotask(()=>$('.close')?.focus());}
const laneNames={NOW:'正在做',TODAY:'今天计划处理','IF I WANT':'有余力再做',WAITING:'今天值得留意'};
function openDrawer(type,reopening=false){if(type==='module'){openModule(openModuleName);return;}drawer=type;selected=null;shell({today:'TODAY',inbox:'INBOX',search:'SEARCH',archive:'ARCHIVE',trash:'废纸篓'}[type],'',type==='search'?'search-drawer':'');const body=$('#drawer-body');if(type==='archive'||type==='trash'){renderArchive(type,body);return;}if(type==='search'){body.innerHTML='<input id="search-input" placeholder="输入标题、笔记或关键词…" aria-label="搜索卡片"><div class="results"></div>';$('#search-input').oninput=e=>{const q=e.target.value.trim().toLowerCase();$('.results').innerHTML=q?state.cards.filter(c=>c.surface!=='trash'&&zones().find(z=>z.id===c.home_area)?.status!=='deleted'&&[c.title,c.summary,c.notes,...c.attachments.map(a=>a.name)].join(' ').toLowerCase().includes(q)).map(c=>cardHTML(c)).join('')||'<p>没有找到这张纸，换个词试试。</p>':'<p class="history">可搜索标题、描述、笔记和附件名称。</p>';bindCards(body);};queueMicrotask(()=>$('#search-input').focus());return;}
let groups=type==='today'?Object.keys(laneNames):type==='archive'?zones().map(z=>z.id).concat('unfiled'):['all'];body.innerHTML=groups.map(g=>{const list=state.cards.filter(c=>c.surface===type&&visibleCard(state,c)&&(type==='today'?c.lane===g:type==='archive'?(c.home_area||'unfiled')===g:true));return `<section class="tray-section" data-drop="${type==='today'?'lane:'+g:type}"><h3>${type==='today'?g+' / '+laneNames[g]:type==='archive'?(zones().find(z=>z.id===g)?.name||'未分类'):''+list.length+' 张纸'}</h3><div class="cards">${list.map(c=>cardHTML(c)).join('')||'<div class="empty">暂无纸片</div>'}</div></section>`}).join('')+(type==='inbox'?'<button id="inbox-add">＋</button>':'');$('#inbox-add')?.addEventListener('click',()=>newPaper());bindCards(body);}
function safeURL(v){try{let u=new URL(v);return ['http:','https:'].includes(u.protocol)?u.href:null;}catch{return null;}}
function openDetail(id,reopening=false){const c=state.cards.find(c=>c.id===id);if(!c)return;selected=id;drawer=null;shell(c.type,`${zones().find(z=>z.id===c.home_area)?.name||'INBOX'}${c.home_module?' · '+c.home_module:''}　/　${c.surface==='home'?'原位':c.surface.toUpperCase()}`,'detail');const body=$('#drawer-body');body.innerHTML=`<div class="card ${c.visual_dna.family}" style="width:100%;min-height:70px;--r:${c.visual_dna.rotation}deg"><input id="detail-title" class="title-input" value="${esc(c.title)}" aria-label="卡片标题"></div><label class="field" for="detail-summary">下一步</label><textarea id="detail-summary">${esc(c.summary)}</textarea><label class="field" for="detail-notes">笔记</label><textarea id="detail-notes" placeholder="">${esc(c.notes)}</textarea><div class="row"><label class="field">截止日期<input id="detail-deadline" type="date" value="${esc(c.deadline)}"></label><label class="field">状态<select id="detail-status">${['ACTIVE','WAITING','DONE'].map(s=>`<option ${c.status===s?'selected':''}>${s}</option>`).join('')}</select></label></div><div class="archive-meta">创建 ${formatDate(c.created_at)}${c.completed_at?'<br>完成 '+formatDate(c.completed_at):''}${c.tags?.length?'<br>'+esc(c.tags.join(' · ')):''}</div><label class="field">清单</label><div id="checks">${c.checklist.map(i=>`<div class="check-row"><input type="checkbox" data-check="${i.id}" ${i.done?'checked':''} aria-label="${esc(i.text)}"><span>${esc(i.text)}</span><button data-remove-check="${i.id}" aria-label="删除清单项">×</button></div>`).join('')}</div><input id="check-new" placeholder="添加一项，按 Enter" aria-label="添加清单项"><label class="field">链接与附件</label>${c.links.filter(l=>safeURL(l.url)).map(l=>`<a class="attachment" href="${esc(safeURL(l.url))}" target="_blank" rel="noopener noreferrer">↗ ${esc(l.name||l.url)}</a>`).join('')}${c.attachments.map(a=>`<button class="attachment" data-download="${a.id}">↓ ${esc(a.name)}</button>`).join('')}<div class="row"><input id="link-new" type="url" placeholder="粘贴 https:// 链接，按 Enter" aria-label="添加链接"><label class="field">＋ 附件<input id="file-new" type="file"></label></div><label class="field">放到哪里</label><div class="row"><select id="move-area" aria-label="目标区域"><option value="">选择区域</option>${activeZones().map(z=>`<option value="${z.id}" ${c.home_area===z.id?'selected':''}>${esc(z.name)}</option>`).join('')}</select><select id="move-module" aria-label="目标模块"></select><button id="move-confirm">移入</button></div><div class="actions">${c.surface==='archive'?'<button data-action="restore">恢复任务</button>':c.surface==='trash'?'<button data-action="restore">捡回 INBOX</button><button data-action="destroy">永久删除</button>':'<button data-action="today">拿到 TODAY</button><button data-action="home">放回原位</button><button data-action="waiting">放入等待</button><button data-action="done">盖上 DONE</button><button data-action="archive">归档</button><button data-action="duplicate">复制纸片</button><button data-action="unstack">移出纸堆</button><button data-action="trash">丢入废纸篓</button>'}</div><label class="field">纸张</label><div class="paper-choices">${families.map((f,i)=>`<button data-paper="${f}" aria-pressed="${f===c.visual_dna.family}">${familyNames[i]}${f===c.visual_dna.family?' ✓':''}</button>`).join('')}</div><details style="margin-top:24px"><summary>这张纸的足迹</summary><div class="history">${c.history.slice().reverse().map(h=>`${esc(new Date(h.at).toLocaleString('zh-CN'))} · ${esc(h.text)}<br>`).join('')}</div></details>`;
['title','summary','notes','deadline','status'].forEach(k=>$('#detail-'+k).onchange=e=>{if(k==='title'&&!e.target.value.trim()){e.target.value=c.title;return;}if(k==='status'&&e.target.value==='DONE'){complete(c,$('.detail .card'));return;}if(k==='status'&&c.surface==='archive'&&e.target.value!=='DONE')restoreCard(state,c);c[k]=e.target.value;change(c,'编辑'+({title:'标题',summary:'下一步',notes:'笔记',deadline:'截止日期',status:'状态'}[k]));render();});bindChecklist(c);

$('#link-new').onkeydown=e=>{if(e.key==='Enter'){const url=safeURL(e.target.value);if(!url){toast('请输入完整的 http 或 https 链接');return;}c.links.push({url,name:new URL(url).hostname});change(c,'添加链接');openDetail(id);}};$('#file-new').onchange=e=>{const f=e.target.files[0];if(!f)return;if(f.size>1024*1024){toast('本地附件限 1 MB，大文件请使用链接');return;}const reader=new FileReader();reader.onload=()=>{c.attachments.push({id:uid(),name:f.name,data:reader.result});change(c,'添加附件 '+f.name);openDetail(id);};reader.readAsDataURL(f);};$$('[data-download]').forEach(b=>b.onclick=()=>{let a=c.attachments.find(a=>a.id===b.dataset.download);const link=document.createElement('a');link.href=a.data;link.download=a.name;link.click();});const modOptions=()=>$('#move-module').innerHTML=(state.modules[$('#move-area').value]||[]).map(m=>`<option ${c.home_module===m?'selected':''}>${esc(m)}</option>`).join('');$('#move-area').onchange=modOptions;modOptions();$('#move-confirm').onclick=()=>{if(!$('#move-area').value||!$('#move-module').value)return;move(c,'zone:'+$('#move-area').value,$('#move-module').value);render();openDetail(id);};$$('[data-action]').forEach(b=>b.onclick=()=>action(c,b.dataset.action));$$('[data-paper]').forEach(b=>b.onclick=()=>{c.visual_dna.family=b.dataset.paper;change(c,'更换纸张');render();openDetail(id);});}
function action(c,a){if(a==='trash'){snapshot();c.surface='trash';change(c,'丢入废纸篓');const el=$('.detail .card');if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)el?.animate?.([{translate:'0 0',opacity:1},{translate:'0 3px',opacity:0}],{duration:150,fill:'forwards'});setTimeout(()=>{if(selected===c.id)closeOverlay();refresh();toast('已丢入废纸篓',true);},150);return;}if(a==='done'){complete(c,$('.detail .card'));return;}snapshot();if(a==='destroy'){if(!confirm('永久删除这张纸？此操作无法撤销。'))return;state.cards=state.cards.filter(x=>x.id!==c.id);save();closeOverlay();render();toast('已永久删除');return;}if(a==='duplicate'){const copy=structuredClone(c);copy.id=uid();copy.surface='inbox';copy.status='ACTIVE';copy.completed_at=null;copy.archived_at=null;copy.title+=' · 副本';copy.stack_id=null;copy.created_at=now();copy.history=[{at:now(),text:'复制卡片'}];state.cards.push(copy);save();render();openDetail(copy.id);return;}if(a==='done')c.status='DONE';else if(a==='unstack')c.stack_id=null;else if(a==='restore')restoreCard(state,c);else if(a==='waiting'){c.surface='waiting';c.status='WAITING';}else if(a==='archive')archiveCard(c,false);else{c.surface=a==='home'&&!c.home_area?'inbox':a;if(a==='today')c.lane='TODAY';}change(c,({today:'拿到 TODAY',home:'放回原位',waiting:'放入等待',done:'盖上 DONE 印章',archive:'放入档案柜',trash:'丢入废纸篓',restore:'捡回 INBOX',unstack:'移出纸堆'}[a]));closeOverlay();render();toast('纸片已整理',true);}
function newPaper(area=null,module=null){closeOverlay();lastFocus=document.activeElement;$('#overlay').innerHTML=`<div class="veil"></div><div class="new-paper" role="dialog" aria-modal="true" aria-label="新建纸条"><small>${esc($('#new-type').value)} / ${area?esc(zones().find(z=>z.id===area).name):'INBOX'}</small><textarea id="new-title" placeholder="写点什么…" aria-label="新纸条内容"></textarea><small>Enter 收好 · Shift Enter 换行</small><button id="new-save">收好 ↗</button></div>`;$('.veil').onclick=closeOverlay;const submit=()=>{const title=$('#new-title').value.trim();if(!title)return;const c=make(title,area,module,$('#new-type').value,families[Math.floor(Math.random()*families.length)]);state.cards.push(c);save();closeOverlay();render();toast(area?'纸条已放好':'念头已收进 INBOX');};$('#new-save').onclick=submit;$('#new-title').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();submit();}};$('#new-title').focus();}
function move(c,target,module){snapshot();if(c.surface==='archive'&&target!=='archive')restoreCard(state,c);c.stack_id=null;c.positions={};if(target.startsWith('zone:')){c.home_area=target.slice(5);if(!state.modules[c.home_area].length)state.modules[c.home_area].push('纸片');c.home_module=module||state.modules[c.home_area][0];c.surface='home';c.status=c.status==='WAITING'?'ACTIVE':c.status;}else if(target.startsWith('module:')){c.home_area=view;c.home_module=target.slice(7);c.surface='home';}else if(target.startsWith('lane:')){c.surface='today';c.lane=target.slice(5);if(c.lane==='WAITING')c.status='WAITING';}else if(target==='archive')archiveCard(c,false);else {c.surface=target;if(target==='today')c.lane='TODAY';}change(c,'移动到 '+(module||target));toast('已放好',true);}
let suppressClickUntil=0,pendingPointer=null;
window.DESK_DEBUG??=new URLSearchParams(location.search).has('desk_debug');
let debugTrace={minTilt:Infinity,maxTilt:-Infinity,maxScale:1,transform:'none',shadow:'none',reversalLag:null};
function dragDebug(values={},reset=false){
  let panel=$('#drag-debug');
  if(!window.DESK_DEBUG){panel?.remove?.();return;}
  if(!panel){panel=document.createElement('pre');panel.id='drag-debug';document.body.append(panel);}
  if(reset)debugTrace={minTilt:Infinity,maxTilt:-Infinity,maxScale:1,transform:'none',shadow:'none',reversalLag:null};
  if(Number.isFinite(values.visualTilt)){debugTrace.minTilt=Math.min(debugTrace.minTilt,values.visualTilt);debugTrace.maxTilt=Math.max(debugTrace.maxTilt,values.visualTilt);}
  if(Number.isFinite(values.visualScale))debugTrace.maxScale=Math.max(debugTrace.maxScale,values.visualScale);
  if(Number.isFinite(values.reversalLag))debugTrace.reversalLag=values.reversalLag;
  if(values.transform)debugTrace.transform=values.transform;if(values.shadow)debugTrace.shadow=values.shadow;
  const v={pointer:'—',velocityX:'0.00',tilt:'0.00°',scale:'1.000',dragging:'false',target:'—',reducedMotion:String(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false),...values};
  const range=Number.isFinite(debugTrace.minTilt)?`${debugTrace.minTilt.toFixed(2)}° / ${debugTrace.maxTilt.toFixed(2)}°`:'—';
  panel.textContent=`DRAG STATE\npointer: ${v.pointer}\nvelocityX: ${v.velocityX}\ntilt: ${v.tilt}\ntiltRange: ${range}\nreversalLag: ${debugTrace.reversalLag==null?'—':Math.round(debugTrace.reversalLag)+'ms'}\nscale: ${v.scale} (max ${debugTrace.maxScale.toFixed(3)})\ndragging: ${v.dragging}\ntarget: ${v.target}\nreducedMotion: ${v.reducedMotion}\ntransform: ${debugTrace.transform}\nshadow: ${debugTrace.shadow}`;
}
document.addEventListener('click',e=>{if(performance.now()<suppressClickUntil){e.preventDefault();e.stopImmediatePropagation();}},true);
function bindLayouts(){
  $$('[data-layout]').forEach(el=>{
    el.onpointerdown=e=>{
      if(e.target.closest('.card,.zone-menu,input,textarea,select')||e.target.closest('button:not(.zone-title):not(.module-title)'))return;
      startDrag(e,el,'layout');
    };
    el.onclick=e=>{if(drag||e.target.closest('.card,.zone-menu,button,input,textarea,select'))return;if(el.dataset.zone){view=el.dataset.zone;render();}else openModule(el.dataset.module);};
  });
}
function startDrag(e,el,kind){
  if(e.button!==0||drag||pendingPointer!==null||e.target.closest('button:not(.zone-title):not(.module-title),input,textarea,select,.zone-menu')||el.dataset.ghost==='true')return;
  if(kind==='card'&&['archive','trash','search'].includes(drawer))return;
  e.stopPropagation();pendingPointer=e.pointerId;hideTooltip();
  const id=kind==='card'?el.dataset.card:el.dataset.layout;
  const c=kind==='card'?state.cards.find(c=>c.id===id):null;
  const key=kind==='card'?positionKey():layoutID(id);
  const previous=structuredClone((c?c.positions[key]:state.layouts[key])||{x:0,y:0});
  const startX=e.clientX,startY=e.clientY;
  let lastInput=performance.now(),lastPointerX=startX,velocityX=0,velocityTilt=0,currentTilt=0,lastVelocitySign=0,reversalAt=0,reversalLag=null,lastFrame=0,pickedAt=0,anchor={x:0,y:0},lastPose=null;
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;
  const weight=kind==='card'?'paper':'folder';
  dragDebug({pointer:`${Math.round(startX)} / ${Math.round(startY)}`,dragging:'false'},true);
  const pressTransform=getComputedStyle(el).transform;
  el.classList.add('paper-pressed');
  const press=reduced?null:el.animate?.([{transform:pressTransform},{transform:pressTransform+' scale(.995)'}],{duration:80,fill:'forwards',easing:'ease-out'});
  let x=startX,y=startY,active=false,clone=null,frame=0,target=null,rect,width,height,sourceScroll,baseLeft,baseTop,deltaX=0,deltaY=0;
  const scrollSum=()=>{let totalX=window.scrollX,totalY=window.scrollY;for(let n=el.parentElement;n&&n!==document.body;n=n.parentElement){totalX+=n.scrollLeft;totalY+=n.scrollTop;}return {x:totalX,y:totalY};};
  const rotation=kind==='card'?Number(c.visual_dna.rotation)||0:0;
  function begin(){
    press?.cancel();el.classList.remove('paper-pressed');hideTooltip();
    el.getAnimations?.().forEach(a=>a.cancel());active=true;drag=id;pickedAt=performance.now();lastFrame=pickedAt;rect=el.getBoundingClientRect();width=el.offsetWidth;height=el.offsetHeight;sourceScroll=scrollSum();
    anchor={x:startX-(rect.left+rect.width/2),y:startY-(rect.top+rect.height/2)};
    baseLeft=rect.left+rect.width/2-el.offsetWidth/2;baseTop=rect.top+rect.height/2-el.offsetHeight/2;
    clone=el.cloneNode(true);
    // Freeze inherited dimensions and typography once, before the pointer loop.
    const originals=[el,...el.querySelectorAll('*')],copies=[clone,...clone.querySelectorAll('*')];
    const frozenProperties=['box-sizing','width','height','min-width','min-height','max-width','max-height','padding','margin','border','border-radius','background','color','font','letter-spacing','line-height','display','gap','flex','align-items','justify-content','white-space','transform','transform-origin','position','top','right','bottom','left','box-shadow'];
    originals.forEach((node,i)=>{const cs=getComputedStyle(node);for(const name of frozenProperties)copies[i].style.setProperty(name,cs.getPropertyValue(name));copies[i].removeAttribute('id');copies[i].style.pointerEvents='none';});
    clone.classList.remove('paper-settling','paper-pressed');clone.inert=true;clone.classList.add('drag-proxy');clone.setAttribute('aria-hidden','true');clone.dataset.weight=weight;
    Object.assign(clone.style,{position:'fixed',left:baseLeft+'px',top:baseTop+'px',margin:'0',width:el.offsetWidth+'px',height:el.offsetHeight+'px',transformOrigin:'50% 50%',translate:'none',scale:'none',transition:'none',animation:'none',zIndex:'1000',pointerEvents:'none',transform:`translate3d(0,0,0) rotate(${rotation}deg)`});
    clone.style.setProperty('width',width+'px','important');clone.style.setProperty('height',height+'px','important');
    document.body.append(clone);el.classList.add('drag-placeholder');document.body.classList.add('dragging');
    el.setPointerCapture(e.pointerId);
    if(kind==='card')$$('[data-drop]').filter(n=>!el.contains(n)).forEach(n=>n.classList.add('drop-ready'));
  }
  function findTarget(){
    if(kind!=='card')return null;
    for(const node of document.elementsFromPoint(x,y)){
      const t=node.closest('[data-drop]');
      if(t&&!el.contains(t)&&!t.classList.contains('drag-placeholder'))return t;
    }
    return null;
  }
  function paint(){
    frame=0;if(!active)return;
    const t=performance.now(),dt=Math.min(40,Math.max(1,t-lastFrame));lastFrame=t;
    const age=Math.max(0,t-pickedAt),lift=reduced?0:1-Math.pow(1-Math.min(1,age/140),3);
    const desired=reduced?0:velocityTilt*Math.exp(-Math.max(0,t-lastInput)/(weight==='paper'?120:160));
    currentTilt+=(desired-currentTilt)*(1-Math.exp(-dt/(weight==='paper'?45:75)));
    if(reversalAt&&reversalLag==null&&Math.sign(currentTilt)===Math.sign(velocityTilt)&&Math.abs(currentTilt)>.3)reversalLag=t-reversalAt;
    deltaX=x-startX;deltaY=y-startY;
    lastPose=paperPose(deltaX,deltaY,rotation,currentTilt,lift,anchor,weight);
    clone.style.transform=`translate3d(${lastPose.x}px,${lastPose.y}px,0) rotate(${lastPose.angle}deg) scale(${lastPose.scale})`;

    clone.style.setProperty('--drag-shadow',`1px ${2+10*lift}px ${3+15*lift}px rgba(75,59,41,${.22+.1*lift})`);
    clone.style.setProperty('--tab-tilt',`${-currentTilt*.4}deg`);
    const next=findTarget();if(next!==target){target?.classList.remove('drop-hover');target=next;target?.classList.add('drop-hover');}
    if(window.DESK_DEBUG){const cs=getComputedStyle(clone),m=new DOMMatrixReadOnly(cs.transform),visualScale=Math.hypot(m.a,m.b),visualTilt=Math.atan2(m.b,m.a)*180/Math.PI-rotation;dragDebug({pointer:`${Math.round(x)} / ${Math.round(y)}`,velocityX:velocityX.toFixed(2),tilt:`${visualTilt.toFixed(2)}°`,scale:visualScale.toFixed(3),dragging:'true',target:target?.dataset.drop||'—',reducedMotion:String(reduced),visualTilt,visualScale,reversalLag,transform:cs.transform,shadow:cs.boxShadow});}
    if(!reduced&&(age<140||Math.abs(currentTilt)>.015||Math.abs(desired)>.015))frame=requestAnimationFrame(paint);
  }
  function onMove(ev){
    if(ev.pointerId!==e.pointerId)return;const t=performance.now();velocityX=(ev.clientX-lastPointerX)/Math.max(8,t-lastInput);velocityTilt=paperTilt(velocityX,weight);const sign=Math.sign(velocityTilt);if(sign&&lastVelocitySign&&sign!==lastVelocitySign){reversalAt=t;reversalLag=null;}if(sign)lastVelocitySign=sign;lastPointerX=ev.clientX;lastInput=t;x=ev.clientX;y=ev.clientY;
    if(!active&&Math.hypot(x-startX,y-startY)>=6)begin();
    if(active){ev.preventDefault();if(!frame)frame=requestAnimationFrame(paint);}
  }
  function cleanup(){
    pendingPointer=null;press?.cancel();el.classList.remove('paper-pressed');
    cancelAnimationFrame(frame);clone?.remove();el.classList.remove('drag-placeholder');document.body.classList.remove('dragging');
    $$('.drop-ready,.drop-hover').forEach(n=>n.classList.remove('drop-ready','drop-hover'));
    document.removeEventListener('pointermove',onMove);document.removeEventListener('pointerup',onUp);document.removeEventListener('pointercancel',cancel);document.removeEventListener('keydown',onKey);window.removeEventListener('blur',cancel);
    if(el.hasPointerCapture(e.pointerId))el.releasePointerCapture(e.pointerId);
    if(active)suppressClickUntil=performance.now()+180;drag=null;
    dragDebug({pointer:`${Math.round(x)} / ${Math.round(y)}`,velocityX:velocityX.toFixed(2),tilt:`${(lastPose?.angle-rotation||0).toFixed(2)}°`,scale:(lastPose?.scale||1).toFixed(3),dragging:'false',target:target?.dataset.drop||'—',reducedMotion:String(reduced)});
  }
  function cancel(){cleanup();}
  function onKey(ev){if(ev.key==='Escape'){ev.preventDefault();cancel();}}
  function onUp(ev){
    if(ev.pointerId!==e.pointerId)return;
    if(!active){cleanup();return;}
    x=ev.clientX;y=ev.clientY;cancelAnimationFrame(frame);paint();
    const scroll=scrollSum(),dx=x-startX+scroll.x-sourceScroll.x,dy=y-startY+scroll.y-sourceScroll.y;
    const destination=target?.dataset.drop;
    
    const sourceContainer=kind==='card'?el.parentElement.closest('[data-drop]'):null;
    const transfer=kind==='card'&&destination&&target!==sourceContainer;
    if(transfer){
      const receiver=target,held=clone,receiverID=target.dataset.layout;
      const r=receiver.getBoundingClientRect();
      const centerX=baseLeft+width/2+lastPose.x,centerY=baseTop+height/2+lastPose.y;
      // Commit immediately; the expendable proxy alone finishes the receiving gesture.
      clone=null;cleanup();move(c,destination);refresh();
      if(!reduced&&held.animate){
        const from=held.style.transform;
        held.animate([{transform:from,opacity:1},{transform:`translate3d(${lastPose.x+(r.left+r.width/2-centerX)*.35}px,${lastPose.y+(r.top+r.height/2-centerY)*.35}px,0) rotate(${rotation}deg) scale(.85)`,opacity:0}],{duration:150,easing:'ease-in',fill:'forwards'}).finished.catch(()=>{}).finally(()=>held.remove());
      }else held.remove();
      receivePaper(receiver.isConnected?receiver:receiverID?$$('[data-layout]').find(n=>n.dataset.layout===receiverID):$$('[data-drop]').find(n=>n.dataset.drop===destination));return;
    }

    snapshot();const position={...previous,x:(previous.x||0)+dx,y:(previous.y||0)+dy};
    // Keep a reachable top/left edge; there is no arbitrary displacement cap.
    const documentLeft=rect.left+window.scrollX+dx,documentTop=rect.top+window.scrollY+dy;
    if(documentLeft<35)position.x+=35-documentLeft;
    if(documentTop<100)position.y+=100-documentTop;
    if(c){c.positions[key]=position;c.stack_id=null;change(c,'移动纸片');}else{position.z=Math.max(1,...Object.values(state.layouts).map(l=>Number(l.z)||1))+1;state.layouts[key]=position;save();}
    el.style.setProperty('--x',position.x+'px');el.style.setProperty('--y',position.y+'px');if(!c)el.style.zIndex=position.z;
    cleanup();settlePaper(el,lastPose,rotation,weight);
  }
  document.addEventListener('pointermove',onMove,{passive:false});document.addEventListener('pointerup',onUp);document.addEventListener('pointercancel',cancel);document.addEventListener('keydown',onKey);window.addEventListener('blur',cancel);
}
$('#quick-new').onclick=()=>newPaper();
$('#home').onclick=()=>{closeOverlay();view=null;render();};$$('[data-drawer]').forEach(b=>b.onclick=()=>openDrawer(b.dataset.drawer));$('#add').onclick=()=>newPaper();$('#backup').onclick=()=>{const blob=new Blob([loadBlocked?(localStorage.getItem(KEY)||JSON.stringify(state,null,2)):JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='my-desk-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};$('#import').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const data=migrate(JSON.parse(await f.text()),defaultZones);if(!validState(data))throw Error();if(!confirm('用导入的桌面替换当前桌面？建议先导出备份。'))return;snapshot();state=data;loadBlocked=false;save();closeOverlay();render();toast('桌面已导入',true);}catch{toast('文件不是有效的桌面备份，当前内容未改变。');}finally{e.target.value='';}};
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openDrawer('search');}if(e.key==='Escape'&&!e.defaultPrevented&&!e.isComposing&&!drag)closeOverlay();if(e.key==='Tab'&&$('#overlay [role="dialog"]')){const focus=$$('button,input,textarea,select,a,[tabindex="0"]',$('#overlay')).filter(el=>!el.disabled&&el.offsetParent!==null);const first=focus[0],last=focus.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}});
$('#date').textContent=new Date().toLocaleDateString('en-US',{month:'long',day:'2-digit',year:'numeric'}).toUpperCase()+' / '+new Date().toLocaleDateString('zh-CN',{weekday:'long'});render();if(loadBlocked)toast('未能读取已有桌面，请先保留备份再继续操作。');

function complete(c,el){
  if(c.status==='DONE'&&c.surface==='archive')return;
  snapshot();archiveCard(c,true);change(c,'完成并自动归档');
  el?.classList.add('completing');
  // Commit before animation: a refresh during feedback cannot lose completion.
  setTimeout(()=>{if(selected===c.id)closeOverlay();refresh();toast('已完成，收入 Archive',true);},180);
}
function renderArchive(type,body){
  const projectStatus=type==='archive'?'archived':'deleted';
  const projects=zones().filter(z=>z.status===projectStatus);
  const cards=state.cards.filter(c=>c.surface===type&&zones().find(z=>z.id===c.home_area)?.status!=='deleted');
  body.innerHTML=projects.map(z=>`<section class="archived-project"><header><h3>${esc(z.name)}</h3><button data-project="restore" data-id="${z.id}" title="恢复分区" aria-label="恢复 ${esc(z.name)}">↶</button></header><details><summary>${state.modules[z.id].length} 个文件夹 · ${state.cards.filter(c=>c.home_area===z.id).length} 张纸</summary>${state.modules[z.id].map(m=>`<h4>${esc(m)}</h4><div class="cards">${state.cards.filter(c=>c.home_area===z.id&&c.home_module===m).map(c=>cardHTML(c)).join('')||'<p class="empty">暂无纸片</p>'}</div>`).join('')}</details></section>`).join('')+`<div class="results">${cards.filter(c=>!projects.some(z=>z.id===c.home_area)).sort((a,b)=>(b.completed_at||b.archived_at||'').localeCompare(a.completed_at||a.archived_at||'')).map(c=>cardHTML(c)).join('')}</div>`+(!projects.length&&!cards.length?'<p class="empty">暂无归档内容</p>':'');
  $$('[data-project]',body).forEach(b=>b.onclick=()=>manageProject(b.dataset.id,b.dataset.project));bindCards(body);
}

const glyphs={trash:'trash',backup:'download',home:'back',today:'today',waiting:'clock',done:'check',archive:'archive',duplicate:'copy',unstack:'unstack',destroy:'trash',restore:'restore'};
const paths={trash:'M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7',download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',upload:'M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5',back:'m14 5-7 7 7 7M7 12h14',today:'M4 5h16v16H4zM8 3v4M16 3v4M4 10h16M8 14h3v3H8z',clock:'M12 8v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',check:'m5 12 4 4L19 6',archive:'M3 4h18v5H3zM5 9v12h14V9M9 13h6',copy:'M8 8h12v13H8zM4 16V3h12',unstack:'M7 8h14v13H7zM3 15V3h14',restore:'M4 4v6h6M4 10a8 8 0 1 1 1 9',close:'m5 5 14 14M19 5 5 19',plus:'M12 4v16M4 12h16',move:'M3 12h18m-4-4 4 4-4 4'};
function iconButton(el,name,label){if(!el)return;if(el.dataset.icon!==name){el.dataset.icon=name;el.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name]||paths.plus}"/></svg>`;}el.removeAttribute('title');el.dataset.tooltip=label;el.setAttribute('aria-label',label);el.classList.add('icon-button');}
function polishButtons(){if(drag)return;
  $$('[data-action]:not([data-action="destroy"])').forEach(el=>iconButton(el,glyphs[el.dataset.action],({today:'拿到今日托盘',home:'放回原位',waiting:'等待',done:'完成并归档',archive:'归档',duplicate:'复制纸片',unstack:'移出纸堆',trash:'丢入废纸篓',destroy:'永久删除',restore:'恢复任务'}[el.dataset.action])));
  $$('[data-drawer="trash"]').forEach(el=>iconButton(el,'trash','废纸篓'));
  iconButton($('#backup'),'download','导出桌面备份');iconButton($('#back'),'back','返回桌面');iconButton($('#move-confirm'),'move','移动');
  $$('.close').forEach(el=>iconButton(el,'close','关闭'));
  $$('[data-remove-check]').forEach(el=>iconButton(el,'close','删除清单项'));
  iconButton($('#name-form button'),'check','保存');
  $$('[data-delete-module]').forEach(el=>iconButton(el,'trash','删除文件夹'));
  $$('[data-module-add],#quick-new,#add,#inbox-add,#module-new').forEach(el=>iconButton(el,'plus','新建纸条'));
  $$('[data-complete],[data-project="restore"],.zone-menu summary').forEach(el=>{el.dataset.tooltip=el.getAttribute('aria-label');el.removeAttribute('title');});
}
const hideTooltip=installTooltips(()=>Boolean(drag));
$('.import').dataset.tooltip='导入桌面备份';$('.import').setAttribute('aria-label','导入桌面备份');$('.import').removeAttribute('title');
new MutationObserver(records=>{if(records.some(r=>r.addedNodes.length&&[...r.addedNodes].some(n=>n.nodeType===1&&!['svg','path'].includes(n.nodeName.toLowerCase()))))polishButtons();}).observe(document.body,{childList:true,subtree:true});
polishButtons();
$('.import').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('#import').click();}};

$$('[data-drawer="today"],[data-drawer="inbox"],[data-drawer="archive"]').forEach(b=>b.dataset.drop=b.dataset.drawer);

function openModule(name){
  if(!view||!state.modules[view]?.includes(name))return;
  drawer='module';selected=null;openModuleName=name;
  shell(name,zones().find(z=>z.id===view)?.name||'','module-drawer');
  const area=view;
  $('#drawer-body').innerHTML=`<section class="tray-section" data-drop="module:${esc(name)}"><div class="cards" id="module-cards">${state.cards.filter(c=>c.home_area===area&&c.home_module===name&&!['archive','trash'].includes(c.surface)).map(c=>cardHTML(c,c.surface!=='home')).join('')||'<div class="empty">暂无纸片</div>'}</div></section><div class="inline-composer"><textarea id="module-input" rows="1" placeholder="＋ 添加一条……" aria-label="添加一条纸片"></textarea><button id="module-new" aria-label="新建纸条" data-tooltip="新建纸条">＋</button></div>`;
  const input=$('#module-input'),cards=$('#module-cards');
  const submit=()=>{
    const title=input.value.trim();if(!title)return;
    const c=make(title,area,name,$('#new-type').value,families[Math.floor(Math.random()*families.length)]);
    state.cards.push(c);save();mainDirty=true;
    cards.querySelector('.empty')?.remove();
    cards.insertAdjacentHTML('beforeend',cardHTML(c));bindCards(cards);
    input.value='';input.focus({preventScroll:true});
  };
  bindContinuousInput(input,submit);$('#module-new').onclick=submit;bindCards(cards);
}
function checkHTML(i){return `<div class="check-row"><input type="checkbox" data-check="${i.id}" ${i.done?'checked':''} aria-label="${esc(i.text)}"><span>${esc(i.text)}</span><button data-remove-check="${i.id}" aria-label="删除清单项" data-tooltip="删除清单项">×</button></div>`;}
function bindChecklist(c){
  const checks=$('#checks'),input=$('#check-new');
  checks.onchange=e=>{const i=c.checklist.find(i=>i.id===e.target.dataset.check);if(!i)return;i.done=e.target.checked;change(c,'更新清单');mainDirty=true;};
  checks.onclick=e=>{const b=e.target.closest('[data-remove-check]');if(!b)return;c.checklist=c.checklist.filter(i=>i.id!==b.dataset.removeCheck);b.closest('.check-row').remove();change(c,'删除清单项');mainDirty=true;};
  bindContinuousInput(input,()=>{
    const text=input.value.trim();if(!text)return;
    const panel=$('.drawer'),scroll=panel.scrollTop;
    const i={id:uid(),text,done:false};c.checklist.push(i);change(c,'添加清单项');mainDirty=true;
    checks.insertAdjacentHTML('beforeend',checkHTML(i));
    input.value='';input.focus({preventScroll:true});panel.scrollTop=scroll;requestAnimationFrame(()=>panel.scrollTop=scroll);
  });
}

function settlePaper(el,held,rotation=0,weight='paper'){
  if(!el||!held||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
  const x=parseFloat(el.style.getPropertyValue('--x'))||0,y=parseFloat(el.style.getPropertyValue('--y'))||0;
  const overshoot=rotation-(held.angle-rotation)*.22;
  el.animate?.([
    {transform:`translate3d(${x}px,${y}px,0) rotate(${held.angle}deg) scale(${held.scale})`,boxShadow:'1px 9px 11px #51432e38'},
    {transform:`translate3d(${x}px,${y}px,0) rotate(${overshoot}deg) scale(.994)`,boxShadow:'0 1px 1px #51432e28',offset:.68},
    {transform:`translate3d(${x}px,${y}px,0) rotate(${rotation}deg) scale(1)`,boxShadow:'0 1px 1px #51432e28'}
  ],{duration:weight==='paper'?230:260,easing:'cubic-bezier(.2,.75,.25,1)'});
}
function receivePaper(el){
  if(!el||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
  el.animate?.([{translate:'0 -3px',scale:'1.01'},{translate:'0 1px',scale:'.998',offset:.7},{translate:'0 0',scale:'1'}],{duration:160,easing:'ease-out'});
}
