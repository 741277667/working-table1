import {bindContinuousInput} from './interactions.mjs';
import {paperTilt,paperPose,paperVariant} from './tactile.mjs';
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {migrate,validState as validate,archiveCard,restoreCard,projectAction,visibleCard} from './model.mjs';
// Minimal DOM adapter exercises application startup and renders; not a browser test.
const nodes=new Map(),memory=new Map();
function node(selector){if(!nodes.has(selector))nodes.set(selector,{innerHTML:'',textContent:'',style:{},dataset:{},children:[],classList:{add(){},remove(){},toggle(){}},removeAttribute(){},setAttribute(){},getAttribute(){return ''},focus(){},select(){},querySelector:s=>node(s),querySelectorAll:()=>[],addEventListener(){}});return nodes.get(selector);}
const ctx=vm.createContext({bindContinuousInput,installTooltips:()=>()=>{},paperTilt,paperPose,paperVariant,console,crypto:webcrypto,structuredClone,migrate,validate,archiveCard,restoreCard,projectAction,visibleCard,URL,Date,Math,innerWidth:1440,window:{DESK_DEBUG:false},localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)},document:{querySelector:s=>node(s),querySelectorAll:()=>[],body:node('body'),addEventListener(){}},MutationObserver:class{observe(){}},queueMicrotask:fn=>fn(),setTimeout:()=>0,clearTimeout(){},performance:{now:()=>0}});
vm.runInContext(fs.readFileSync('app.js','utf8').replace(/^import .*\n/gm,''),ctx);
assert.match(node('#main').innerHTML,/我的桌面/);
assert.doesNotMatch(node('#main').innerHTML,/布置桌面|drag-destinations/);
vm.runInContext("view='thesis';render()",ctx);assert.match(node('#main').innerHTML,/当前研究/);
vm.runInContext("openDrawer('archive')",ctx);assert.match(node('#drawer-body').innerHTML,/暂无归档内容/);
vm.runInContext("archiveCard(state.cards[2],true);openDrawer('archive')",ctx);assert.match(node('#drawer-body').innerHTML,/修改开题报告/);assert.match(node('#drawer-body').innerHTML,/恢复/);
vm.runInContext("projectAction(state,'thesis','archive');openDrawer('archive')",ctx);assert.match(node('#drawer-body').innerHTML,/恢复 毕业设计/);
vm.runInContext("projectAction(state,'thesis','restore');view='thesis';openModule('当前研究')",ctx);assert.match(node('#drawer-body').innerHTML,/data-drop="module:当前研究"/);
console.log('PASS: app startup, desktop/modules render, task archive, project archive, folder opening');
// Numeric pointer regression: no browser/network is needed for coordinate math.
const events=new Map();let saves=0;
ctx.document.addEventListener=(name,fn)=>events.set(name,fn);
ctx.document.removeEventListener=(name)=>events.delete(name);
ctx.window={scrollX:0,scrollY:0,addEventListener(){},removeEventListener(){}};
ctx.requestAnimationFrame=()=>1;ctx.cancelAnimationFrame=()=>{};
ctx.getComputedStyle=()=>({getPropertyValue:()=>''});
ctx.localStorage.setItem=(k,v)=>{saves++;memory.set(k,v);};
ctx.document.body.append=()=>{};
const container={scrollLeft:0,scrollTop:0,parentElement:ctx.document.body,dataset:{drop:'zone:thesis'},classList:{add(){},remove(){},contains(){return false;}},closest(){return this;}};
ctx.document.elementsFromPoint=()=>[container];
const style={setProperty(k,v){this[k]=v;},getPropertyValue(k){return this[k]||'';}};
const fake={dataset:{card:'',ghost:'false'},style,parentElement:container,offsetWidth:200,offsetHeight:160,querySelectorAll:()=>[],contains:()=>false,classList:{add(){},remove(){}},setPointerCapture(){},hasPointerCapture:()=>false,getBoundingClientRect:()=>({left:200,top:200,width:200,height:160}),cloneNode:()=>({dataset:{},style:{setProperty(){}},classList:{add(){},remove(){}},setAttribute(){},removeAttribute(){},querySelectorAll:()=>[],remove(){}})};
ctx.testElement=fake;
fake.dataset.card=vm.runInContext("state.cards[2].id",ctx);
const pointer=(x,y)=>({pointerId:1,button:0,clientX:x,clientY:y,target:{closest:()=>null},stopPropagation(){},preventDefault(){}});
ctx.testDown=pointer(220,220);
vm.runInContext("drawer=null;view=null;selected=null;state.cards[2].positions={};state.cards[2].visual_dna.rotation=0;startDrag(testDown,testElement,'card')",ctx);
const before=saves;
events.get('pointermove')(pointer(224,223));assert.equal(vm.runInContext('drag',ctx),null,'5px remains a click');
events.get('pointerup')(pointer(224,223));assert.equal(saves,before,'click does not save coordinates');
vm.runInContext("startDrag(testDown,testElement,'card')",ctx);
events.get('pointermove')(pointer(520,350));assert.equal(saves,before,'move never writes storage');
events.get('pointerup')(pointer(520,350));
assert.equal(style['--x'],'300px');assert.equal(style['--y'],'130px');assert.equal(saves,before+1);
assert.equal(JSON.parse(memory.get('personal-desk-v1')).cards[2].positions.desk.x,300);
vm.runInContext("startDrag(testDown,testElement,'card')",ctx);events.get('pointermove')(pointer(580,390));events.get('pointercancel')();assert.equal(saves,before+1,'cancel retains saved position');
vm.runInContext("state.cards[2].positions={};startDrag(testDown,testElement,'card')",ctx);events.get('pointermove')(pointer(260,250));ctx.window.scrollY=100;events.get('pointerup')(pointer(260,250));assert.equal(style['--y'],'130px','window scroll is included exactly once');
console.log('PASS: drag threshold, no writes during motion, 300px movement without snapback, persisted coordinates, pointer cancellation, scroll compensation');

assert.equal(paperTilt(100),-6.5);assert.equal(paperTilt(-100),6.5);assert.equal(paperTilt(0),0);
for(const base of [-2,0,2])for(const velocity of [-20,0,20])for(const anchor of [{x:0,y:0},{x:80,y:-60}]){
 const pose=paperPose(300,130,base,paperTilt(velocity),1,anchor),a=(pose.angle-base)*Math.PI/180;
 const gripX=pose.x+pose.scale*(anchor.x*Math.cos(a)-anchor.y*Math.sin(a));
 const gripY=pose.y+pose.scale*(anchor.x*Math.sin(a)+anchor.y*Math.cos(a));
 assert.ok(Math.abs(gripX-300-anchor.x)<1e-9);assert.ok(Math.abs(gripY-127-anchor.y)<1e-9);assert.equal(pose.scale,1.055);
}
assert.deepEqual(paperPose(10,20,2,0,0,{x:80,y:60}),{x:10,y:20,angle:2,scale:1});
assert.equal(paperVariant('same-id'),paperVariant('same-id'));
console.log('PASS: tilt bounds/direction, 5.5% scale plus 3px lift, grip-point compensation, reduced-motion pose, stable paper variations');

// Real composer handlers against stable nodes: no drawer/main replacement on submit.
for(const selector of ['#module-input','#check-new']){
 const el=node(selector);el.handlers={};el.addEventListener=(name,fn)=>el.handlers[name]=fn;
 el.focus=()=>ctx.document.activeElement=el;el.blur=()=>ctx.document.activeElement=null;
}
node('.empty').remove=()=>{};
for(const selector of ['#module-cards','#checks'])node(selector).insertAdjacentHTML=function(_,html){this.innerHTML+=html;};
node('#new-type').value='NOTE';
vm.runInContext("view='life';openModule('购物清单')",ctx);
const moduleInput=node('#module-input'),moduleShell=node('#overlay').innerHTML,mainHTML=node('#main').innerHTML;
const initialCount=vm.runInContext('state.cards.length',ctx);
let prevented=0;
const enter=(extra={})=>({key:'Enter',preventDefault(){prevented++;},stopPropagation(){},...extra});
for(const value of ['洗衣液','牛奶','垃圾袋','咖啡豆','鲜花']){moduleInput.value=value;moduleInput.handlers.keydown(enter());assert.equal(moduleInput.value,'');assert.equal(ctx.document.activeElement,moduleInput);}
assert.equal(vm.runInContext('state.cards.length',ctx),initialCount+5);
assert.equal(node('#overlay').innerHTML,moduleShell);assert.equal(node('#main').innerHTML,mainHTML);assert.equal(vm.runInContext('drawer',ctx),'module');
moduleInput.value='正在选字';moduleInput.handlers.compositionstart();moduleInput.handlers.keydown(enter());moduleInput.handlers.compositionend();
moduleInput.handlers.keydown(enter({isComposing:true}));moduleInput.handlers.keydown(enter({keyCode:229}));moduleInput.handlers.keydown(enter({shiftKey:true}));
assert.equal(vm.runInContext('state.cards.length',ctx),initialCount+5);assert.equal(prevented,5);
moduleInput.handlers.keydown(enter({key:'Escape'}));assert.equal(vm.runInContext('drawer',ctx),'module');
vm.runInContext("testList=state.cards.find(c=>c.type==='LIST');bindChecklist(testList)",ctx);
const checkInput=node('#check-new'),beforeChecks=vm.runInContext('testList.checklist.length',ctx);node('.drawer').scrollTop=233;
for(let i=0;i<5;i++){checkInput.value='清单 '+i;checkInput.handlers.keydown(enter());assert.equal(checkInput.value,'');assert.equal(ctx.document.activeElement,checkInput);assert.equal(node('.drawer').scrollTop,233);}
assert.equal(vm.runInContext('testList.checklist.length',ctx),beforeChecks+5);assert.equal(node('#overlay').innerHTML,moduleShell);
const persisted=JSON.parse(memory.get('personal-desk-v1'));assert.equal(persisted.cards.length,initialCount+5);assert.equal(persisted.cards.find(c=>c.type==='LIST').checklist.length,beforeChecks+5);
assert.equal(paperTilt(100,'folder'),-3.5);assert.equal(paperPose(0,0,0,0,1,{x:0,y:0},'folder').scale,1.035);
ctx.window.matchMedia=()=>({matches:true});
vm.runInContext("drawer=null;state.cards[2].positions={};startDrag(testDown,testElement,'card')",ctx);events.get('pointermove')(pointer(260,250));events.get('pointerup')(pointer(260,250));assert.equal(style['--x'],'40px');
console.log('PASS: five folder entries + five checklist entries, stable drawer/input/focus/scroll, IME/229/Shift+Enter/Escape, persisted data, folder weight, reduced-motion dragging');
