import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {migrate,validState as validate,archiveCard,restoreCard,projectAction,visibleCard} from './model.mjs';
// Minimal DOM adapter exercises application startup and renders; not a browser test.
const nodes=new Map(),memory=new Map();
function node(selector){if(!nodes.has(selector))nodes.set(selector,{innerHTML:'',textContent:'',style:{},dataset:{},children:[],classList:{add(){},remove(){},toggle(){}},setAttribute(){},getAttribute(){return ''},focus(){},select(){},querySelector:s=>node(s),querySelectorAll:()=>[],addEventListener(){}});return nodes.get(selector);}
const ctx=vm.createContext({console,crypto:webcrypto,structuredClone,migrate,validate,archiveCard,restoreCard,projectAction,visibleCard,URL,Date,Math,innerWidth:1440,localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)},document:{querySelector:s=>node(s),querySelectorAll:()=>[],body:node('body'),addEventListener(){}},MutationObserver:class{observe(){}},queueMicrotask:fn=>fn(),setTimeout:()=>0,clearTimeout(){},performance:{now:()=>0}});
vm.runInContext(fs.readFileSync('app.js','utf8').replace(/^import .*\n/,''),ctx);
assert.match(node('#main').innerHTML,/我的桌面/);
assert.doesNotMatch(node('#main').innerHTML,/布置桌面|drag-destinations/);
vm.runInContext("view='thesis';render()",ctx);assert.match(node('#main').innerHTML,/当前研究/);
vm.runInContext("openDrawer('archive')",ctx);assert.match(node('#drawer-body').innerHTML,/暂无归档内容/);
vm.runInContext("archiveCard(state.cards[2],true);openDrawer('archive')",ctx);assert.match(node('#drawer-body').innerHTML,/修改开题报告/);assert.match(node('#drawer-body').innerHTML,/恢复/);
vm.runInContext("projectAction(state,'thesis','archive');openDrawer('archive')",ctx);assert.match(node('#drawer-body').innerHTML,/恢复 毕业设计/);
vm.runInContext("projectAction(state,'thesis','restore');view='thesis';openModule('当前研究')",ctx);assert.match(node('#drawer-body').innerHTML,/data-drop="module:当前研究"/);
console.log('PASS: app startup, desktop/modules render, task archive, project archive, folder opening');
