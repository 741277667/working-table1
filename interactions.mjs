// Keep the input node alive: Enter appends; composition and Shift+Enter remain native.
export function bindContinuousInput(input,submit){
  let composing=false;
  input.addEventListener('compositionstart',()=>composing=true);
  input.addEventListener('compositionend',()=>composing=false);
  input.addEventListener('keydown',e=>{
    if(composing||e.isComposing||e.keyCode===229)return;
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();input.blur();return;}
    if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();submit();}
  });
}
export function installTooltips(isDragging){
  const tip=document.createElement('div');tip.id='paper-tooltip';tip.role='tooltip';tip.hidden=true;document.body.append(tip);
  let owner=null,timer=0;
  const hide=()=>{clearTimeout(timer);tip.hidden=true;if(owner){const ids=(owner.getAttribute('aria-describedby')||'').split(' ').filter(id=>id&&id!==tip.id);if(ids.length)owner.setAttribute('aria-describedby',ids.join(' '));else owner.removeAttribute('aria-describedby');}owner=null;};
  const show=(button)=>{
    hide();if(!button||isDragging()||button.disabled)return;owner=button;
    timer=setTimeout(()=>{
      if(!owner?.isConnected||isDragging()){hide();return;}
      tip.textContent=owner.dataset.tooltip;tip.hidden=false;
      const r=owner.getBoundingClientRect(),w=tip.offsetWidth,h=tip.offsetHeight,gap=9,pad=12;
      const choices=[{x:r.left+(r.width-w)/2,y:r.top-h-gap},{x:r.left+(r.width-w)/2,y:r.bottom+gap},{x:r.right+gap,y:r.top+(r.height-h)/2},{x:r.left-w-gap,y:r.top+(r.height-h)/2}];
      const p=choices.find(p=>p.x>=pad&&p.y>=pad&&p.x+w<=innerWidth-pad&&p.y+h<=innerHeight-pad)||choices[1];
      tip.style.left=Math.max(pad,Math.min(innerWidth-w-pad,p.x))+'px';tip.style.top=Math.max(pad,Math.min(innerHeight-h-pad,p.y))+'px';
      owner.setAttribute('aria-describedby',[(owner.getAttribute('aria-describedby')||''),tip.id].filter(Boolean).join(' '));
    },300);
  };
  const button=e=>e.target.closest?.('[data-tooltip]');
  document.addEventListener('pointerover',e=>{if(e.pointerType!=='mouse')return;const b=button(e);if(b&&!b.contains(e.relatedTarget))show(b);});
  document.addEventListener('pointerout',e=>{if(owner?.contains(e.target)&&!owner.contains(e.relatedTarget))hide();});
  document.addEventListener('focusin',e=>{const b=button(e);if(b?.matches(':focus-visible'))show(b);});
  document.addEventListener('focusout',hide);
  document.addEventListener('pointerdown',hide,true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!tip.hidden){hide();e.preventDefault();}},true);
  document.addEventListener('scroll',hide,true);window.addEventListener('resize',hide);
  new MutationObserver(()=>{if(owner&&!owner.isConnected)hide();}).observe(document.body,{childList:true,subtree:true});
  return hide;
}
