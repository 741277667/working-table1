const KEY = 'personal-desk-v1';
const FAMILIES = ['cream-index','white-grid','soft-blue','warm-yellow','grey-archive','rose-postcard','green-ledger','plain-letter'];
const DEFAULTS = [
  {id:'media',name:'自媒体',style:'media',modules:['灵感纸篓','选题库','当前制作','素材文件格','待办便签','已发布 / 复盘']},
  {id:'thesis',name:'毕业设计',style:'thesis',modules:['当前研究','问题纸堆','灵感碎纸','研究地图','尝试记录','资料文件格','今日足迹','SAVE 存档','成果文件架']},
  {id:'freelance',name:'兼职',style:'freelance',modules:['IN · 新任务','WORKING · 制作中','DELIVERED · 已交付','PAID · 已结算']},
  {id:'work',name:'工作',style:'work',modules:['实习 · 短期任务','实习 · 长线项目','实习 · 等待','实习 · 已完成','校招 · WANT','校招 · APPLIED','校招 · PROCESS','校招 · WAITING','校招 · CLOSED']},
  {id:'life',name:'生活',style:'life',modules:['日常小事','购物清单','想买','最近想做']}
];
const uid = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2,8);
const now = () => new Date().toISOString();
function seeds() {
  const make=(title,area,module,type,family,summary)=>({id:uid(),title,summary,type,home_area:area,home_module:module,surface:area?'home':'inbox',lane:'TODAY',status:'ACTIVE',deadline:'',start_date:'',notes:'',checklist:[],attachments:[],links:[],tags:[],relations:[],history:[{at:now(),text:'创建卡片'}],created_at:now(),updated_at:now(),visual_dna:{family,rotation:(Math.random()-.5)*4},positions:{},stack_id:null});
  const cards=[make('让灵感先发生','media','灵感纸篓','NOTE','warm-yellow','把生活里的小发现攒成下一次表达。'),make('九月的创作计划','media','当前制作','PROJECT','plain-letter','一篇图文，一次新的尝试。'),make('修改开题报告','thesis','当前研究','TASK','cream-index','重新梳理研究目的，让问题更清晰一点。'),make('视觉语法的边界','thesis','问题纸堆','NOTE','white-grid','离散单元，如何形成语言？'),make('收集一点蓝色','thesis','灵感碎纸','SAVE','soft-blue','色彩 · 结构 · 节奏'),make('本周设计交付','freelance','WORKING · 制作中','TASK','plain-letter','检查版式与导出文件。'),make('整理作品集','work','实习 · 长线项目','PROJECT','rose-postcard','选出最能代表自己的三个项目。'),make('下一站，去哪里？','work','校招 · WANT','NOTE','cream-index','记录想了解的岗位。'),make('把日子过得具体一点','life','购物清单','LIST','warm-yellow','鲜花、咖啡，还有好好吃饭。'),make('想研究 AI × 设计岗位',null,null,'NOTE','soft-blue','先记下来，慢慢整理。')];
  cards[8].checklist=[{id:uid(),text:'买一束鲜花',done:false},{id:uid(),text:'补充咖啡豆',done:true},{id:uid(),text:'去公园散步',done:false}];
  return {version:1,cards,modules:Object.fromEntries(DEFAULTS.map(z=>[z.id,z.modules])),layouts:{},zoneOrder:DEFAULTS.map(z=>z.id)};
}
function loadState() {
  let old;
  try { old=wx.getStorageSync(KEY); } catch (_) {}
  const s=old&&old.cards?old:seeds();
  if(s.version===1){
    s.projects=DEFAULTS.map(z=>({id:z.id,name:z.name,style:z.style,status:'active',created_at:null}));
    s.version=2;
    s.cards.forEach(c=>{if(c.status==='DONE'&&c.surface!=='trash'){c.return_to={surface:c.surface==='archive'?'home':c.surface,lane:c.lane};c.surface='archive';c.completed_at=c.completed_at||null;}});
  }
  s.projects=s.projects||DEFAULTS.map(z=>({id:z.id,name:z.name,style:z.style,status:'active'}));
  s.modules=s.modules||Object.fromEntries(DEFAULTS.map(z=>[z.id,z.modules]));
  s.zoneOrder=s.zoneOrder||s.projects.map(z=>z.id); s.layouts=s.layouts||{};
  s.cards=(s.cards||[]).map(c=>({checklist:[],attachments:[],links:[],tags:[],relations:[],history:[],positions:{},...c}));
  return s;
}
function paper(c){return FAMILIES.includes(c.visual_dna&&c.visual_dna.family)?c.visual_dna.family:'cream-index';}

Page({
  data:{screen:'desk',nav:'desk',state:{projects:[],cards:[],modules:{},zoneOrder:[]},zones:[],cards:[],modules:[],currentProject:null,currentModule:'',selected:null,selectedId:null,composerValue:'',checkValue:'',statusText:'已保存在此设备',drag:null,toast:'',query:'',reducedMotion:false,todayCount:0,inboxCount:0,archiveCount:0},
  onLoad(){this.state=loadState();const system=wx.getSystemSetting?wx.getSystemSetting():{};this.setData({state:this.state,reducedMotion:system.reducedMotion===true});this.refresh();},
  persist(){try{wx.setStorageSync(KEY,this.state);this.setData({statusText:'已保存在此设备'});}catch(e){this.setData({statusText:'保存失败，请先导出备份'});}},
  refresh(){
    const s=this.state,projects=s.zoneOrder.map(id=>s.projects.find(z=>z.id===id)).filter(z=>z&&z.status==='active');
    const visible=s.cards.filter(c=>!c.home_area||s.projects.find(z=>z.id===c.home_area)?.status==='active');
    let cards=[],modules=[];
    if(this.data.screen==='folder') cards=visible.filter(c=>c.home_area===this.data.currentProject&&c.home_module===this.data.currentModule&&!['archive','trash'].includes(c.surface));
    if(this.data.screen==='project') modules=(s.modules[this.data.currentProject]||[]).map(name=>({name,count:visible.filter(c=>c.home_area===this.data.currentProject&&c.home_module===name&&!['archive','trash'].includes(c.surface)).length}));
    if(this.data.screen==='tray') cards=visible.filter(c=>c.surface===this.data.nav&&(this.data.nav!=='today'||c.lane==='TODAY'));
    if(this.data.screen==='detail') cards=[s.cards.find(c=>c.id===this.data.selectedId)].filter(Boolean);
    const counts={today:visible.filter(c=>c.surface==='today').length,inbox:visible.filter(c=>c.surface==='inbox').length,archive:s.cards.filter(c=>c.surface==='archive').length};
    const selected=s.cards.find(c=>c.id===this.data.selectedId)||null;
    this.setData({state:s,zones:projects,cards:cards.map(c=>({...c,paper:paper(c),rotation:c.visual_dna?.rotation||0})),modules,currentProject:projects.find(z=>z.id===this.data.currentProject)||s.projects.find(z=>z.id===this.data.currentProject)||null,...(this.data.screen==='detail'?{selected:selected?{...selected,paper:paper(selected)}:null}:{}),...{todayCount:counts.today,inboxCount:counts.inbox,archiveCount:counts.archive}});
  },
  goDesk(){this.setData({screen:'desk',nav:'desk',currentProject:null,currentModule:'',selected:null,selectedId:null});this.refresh();},
  openProject(e){const id=e.currentTarget.dataset.id;this.setData({screen:'project',currentProject:id,currentModule:'',nav:'desk'});this.refresh();},
  openFolder(e){this.setData({screen:'folder',currentModule:e.currentTarget.dataset.name,composerValue:''});this.refresh();},
  openTray(e){const nav=e.currentTarget.dataset.nav;this.setData({screen:'tray',nav,currentProject:null,currentModule:''});this.refresh();},
  openCard(e){if(Date.now()<(this.suppressTapUntil||0))return;this.setData({screen:'detail',selectedId:e.currentTarget.dataset.id,checkValue:''});this.refresh();},
  back(){if(this.data.screen==='detail'){this.setData({screen:this.data.currentModule?'folder':this.data.currentProject?'project':'tray'});}else if(this.data.screen==='folder')this.setData({screen:'project'});else this.goDesk();this.refresh();},
  onComposerInput(e){this.setData({composerValue:e.detail.value});},
  onComposerConfirm(e){const text=(e.detail.value||this.data.composerValue||'').trim();if(!text)return;const c=this.newCard(text,this.data.currentProject,this.data.currentModule,'NOTE');this.state.cards.push(c);this.persist();this.setData({composerValue:''});this.refresh();},
  addCard(){if(this.data.screen==='folder'){this.onComposerConfirm({detail:{value:this.data.composerValue}});return;}wx.showModal({title:'新建纸条',editable:true,placeholderText:'写下一件小事',success:r=>{if(r.confirm&&r.content.trim()){this.state.cards.push(this.newCard(r.content.trim(),this.data.screen==='project'?this.data.currentProject:null,this.data.screen==='project'?this.data.currentModule:null,'NOTE'));this.persist();this.refresh();}}});},
  newCard(title,area,module,type){const t=now();return {id:uid(),title,summary:'',type,home_area:area||null,home_module:module||null,surface:area?'home':'inbox',lane:'TODAY',status:'ACTIVE',deadline:'',start_date:'',notes:'',checklist:[],attachments:[],links:[],tags:[],relations:[],history:[{at:t,text:'创建卡片'}],created_at:t,updated_at:t,visual_dna:{family:FAMILIES[Math.floor(Math.random()*FAMILIES.length)],rotation:(Math.random()-.5)*4},positions:{},stack_id:null};},
  editTitle(e){const c=this.state.cards.find(x=>x.id===this.data.selectedId);if(!c)return;c.title=e.detail.value;c.updated_at=now();this.persist();},
  editNotes(e){const c=this.state.cards.find(x=>x.id===this.data.selectedId);if(!c)return;c.notes=e.detail.value;c.updated_at=now();this.persist();},
  onCheckInput(e){this.setData({checkValue:e.detail.value});},
  addCheck(e){const text=(e.detail.value||this.data.checkValue||'').trim(),c=this.state.cards.find(x=>x.id===this.data.selectedId);if(!text||!c)return;c.checklist.push({id:uid(),text,done:false});c.updated_at=now();this.persist();this.setData({checkValue:''});this.refresh();},
  toggleCheck(e){const c=this.state.cards.find(x=>x.id===this.data.selectedId),item=c&&c.checklist.find(i=>i.id===e.currentTarget.dataset.id);if(!item)return;item.done=!item.done;c.updated_at=now();this.persist();this.refresh();},
  finishCard(){const c=this.state.cards.find(x=>x.id===this.data.selectedId);if(!c)return;if(c.surface!=='archive')c.return_to={surface:c.surface,lane:c.lane,status:c.status};c.surface='archive';c.status='DONE';c.completed_at=now();c.archived_at=c.completed_at;c.updated_at=c.completed_at;this.persist();this.back();},
  trashCard(){const c=this.state.cards.find(x=>x.id===this.data.selectedId);if(!c)return;c.return_to={surface:c.surface,lane:c.lane,status:c.status};c.surface='trash';c.updated_at=now();this.persist();this.back();},
  restoreCard(e){const c=this.state.cards.find(x=>x.id===e.currentTarget.dataset.id);if(!c)return;c.surface=c.home_area?'home':'inbox';c.status='ACTIVE';c.archived_at=null;c.completed_at=null;this.persist();this.refresh();},
  onSearch(e){this.setData({query:e.detail.value});const q=e.detail.value.trim().toLowerCase();const cards=this.state.cards.filter(c=>c.surface!=='trash'&&[c.title,c.summary,c.notes].join(' ').toLowerCase().includes(q));this.setData({cards:cards.map(c=>({...c,paper:paper(c),rotation:c.visual_dna?.rotation||0}))});},
  onCardTouchStart(e){const id=e.currentTarget.dataset.id,p=e.touches[0],c=this.state.cards.find(x=>x.id===id);this.dragStart={x:p.clientX,y:p.clientY};this.dragTimer=setTimeout(()=>{this.dragId=id;this.dragLastX=p.clientX;this.dragPoint={x:p.clientX,y:p.clientY};this.setData({drag:{id,title:c?.title||'',x:p.clientX,y:p.clientY,tilt:0}});if(!this.data.reducedMotion)wx.vibrateShort({type:'light'});},220);},
  onCardTouchMove(e){const p=e.touches[0];if(!this.dragId){if(Math.abs(p.clientX-this.dragStart.x)+Math.abs(p.clientY-this.dragStart.y)>10)clearTimeout(this.dragTimer);return;}const vx=p.clientX-(this.dragLastX||p.clientX);this.dragLastX=p.clientX;this.dragPoint={x:p.clientX,y:p.clientY};const c=this.state.cards.find(x=>x.id===this.dragId);this.setData({drag:{id:this.dragId,title:c?.title||'',x:p.clientX,y:p.clientY,tilt:this.data.reducedMotion?0:Math.max(-6,Math.min(6,-vx*.55))}});},
  onCardTouchEnd(){clearTimeout(this.dragTimer);if(!this.dragId)return;const id=this.dragId;this.dragId=null;this.dragLastX=null;this.suppressTapUntil=Date.now()+450;const q=wx.createSelectorQuery();q.selectAll('.drop-target').fields({rect:true,dataset:true});q.exec(res=>{const drag=this.data.drag,point=this.dragPoint||drag||{};if(!drag)return;const target=(res[0]||[]).find(r=>point.x>=r.left&&point.x<=r.right&&point.y>=r.top&&point.y<=r.bottom);const c=this.state.cards.find(x=>x.id===id);if(target&&c){if(target.dataset.project){c.home_area=target.dataset.project;c.home_module=this.state.modules[c.home_area]?.[0]||null;}if(target.dataset.module){c.home_module=target.dataset.module;if(this.data.currentProject)c.home_area=this.data.currentProject;}c.surface='home';c.stack_id=null;c.updated_at=now();this.persist();}this.dragPoint=null;this.setData({drag:null});this.refresh();});},
  onCardTouchCancel(){clearTimeout(this.dragTimer);this.dragId=null;this.dragLastX=null;this.setData({drag:null});},
  onExport(){const fs=wx.getFileSystemManager(),filePath=`${wx.env.USER_DATA_PATH}/personal-desk-${Date.now()}.json`;fs.writeFile({filePath,data:JSON.stringify(this.state,null,2),encoding:'utf8',success:()=>wx.shareFileMessage({filePath,fileName:'慢慢来桌面备份.json',fail:()=>wx.showToast({title:'备份文件已生成',icon:'none'})}),fail:()=>wx.showToast({title:'无法生成备份文件',icon:'none'})});},
  onImport(){wx.chooseMessageFile({count:1,type:'file',extension:['json'],success:r=>{const fs=wx.getFileSystemManager();fs.readFile({filePath:r.tempFiles[0].path,encoding:'utf8',success:file=>{try{let s=JSON.parse(file.data);if(!s||!Array.isArray(s.cards))throw Error();if(s.version===1){s.projects=DEFAULTS.map(z=>({id:z.id,name:z.name,style:z.style,status:'active',created_at:null}));s.version=2;s.cards.forEach(c=>{if(c.status==='DONE'&&c.surface!=='trash'){c.return_to={surface:c.surface==='archive'?'home':c.surface,lane:c.lane};c.surface='archive';c.completed_at=c.completed_at||null;}});}if(!Array.isArray(s.projects)||s.version!==2)throw Error();s.modules=s.modules||Object.fromEntries(DEFAULTS.map(z=>[z.id,z.modules]));s.zoneOrder=s.zoneOrder||s.projects.map(z=>z.id);s.layouts=s.layouts||{};wx.showModal({title:'导入备份',content:'将用备份替换本机内容？',success:a=>{if(a.confirm){this.state=s;this.persist();this.goDesk();}}});}catch(_){wx.showToast({title:'文件不是有效的桌面备份',icon:'none'});}}});}});},
  stop(){},
  onUnload(){clearTimeout(this.dragTimer);}
});
