const fs=require('fs');
const vm=require('vm');
let definition,stored;
const wx={getStorageSync:()=>stored,setStorageSync:(key,value)=>{stored=value;},getSystemSetting:()=>({reducedMotion:false}),vibrateShort(){},showModal(){},showToast(){}};
const context={wx,App(){},Page(page){definition=page;},console,Date,Math,JSON,Object,Array,String,Number,Promise,setTimeout,clearTimeout};
vm.runInNewContext(fs.readFileSync(__dirname+'/pages/index/index.js','utf8'),context);
const page=definition;
page.setData=function(values){this.data={...this.data,...values};};
page.onLoad();
page.openProject({currentTarget:{dataset:{id:'life'}}});
page.openFolder({currentTarget:{dataset:{name:'购物清单'}}});
for(const text of ['洗衣液','牛奶','垃圾袋','咖啡豆','纸巾']){
  page.onComposerInput({detail:{value:text}});
  page.onComposerConfirm({detail:{value:text}});
  if(page.data.screen!=='folder'||page.data.composerValue!=='')throw Error('Folder composer did not stay ready');
}
const list=page.state.cards.find(c=>c.type==='LIST');
if(!list)throw Error('Seed LIST paper is missing');
page.openCard({currentTarget:{dataset:{id:list.id}}});
for(const text of ['牛奶','鸡蛋','面包','水果','咖啡'])page.addCheck({detail:{value:text}});
if(page.state.cards.filter(c=>c.home_module==='购物清单').length<6)throw Error('Folder items were not persisted');
if(list.checklist.length!==8||page.data.screen!=='detail')throw Error('Checklist was not appended in place');
if(JSON.parse(JSON.stringify(stored)).cards.find(c=>c.id===list.id).checklist.length!==8)throw Error('Checklist persistence failed');
page.openTray({currentTarget:{dataset:{nav:'archive'}}});
page.openCard({currentTarget:{dataset:{id:list.id}}});
page.back();
if(page.data.screen!=='tray')throw Error('Back from a tray paper did not return to its tray');
console.log('PASS: five continuous folder entries; five in-place checklist entries; storage persisted.');
