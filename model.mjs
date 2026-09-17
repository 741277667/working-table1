export const surfaces = ['home','inbox','today','archive','trash','waiting'];
const copy = value => structuredClone(value);
export function migrate(input, defaults) {
  const s = copy(input);
  if (s.version === 1) {
    s.projects = defaults.map(z => ({id:z.id,name:z.name,style:z.id,status:'active',created_at:null}));
    s.version = 2;
    for (const c of s.cards) {
      if (c.status === 'DONE' && c.surface !== 'trash') {
        c.return_to = {surface:c.surface === 'archive' ? 'home' : c.surface,lane:c.lane};
        c.surface = 'archive';
        // Old data has no reliable completion timestamp. Never invent one.
        c.completed_at = c.completed_at || null;
      }
    }
  }
  return s;
}
export function validState(s, families) {
  if (!s || s.version !== 2 || !Array.isArray(s.projects) || !Array.isArray(s.cards) || !s.modules || !s.layouts || !Array.isArray(s.zoneOrder)) return false;
  const ids = s.projects.map(z => z.id);
  const safeID = id => typeof id === 'string' && /^[a-zA-Z0-9_-]+$/.test(id) && !['__proto__','constructor','prototype'].includes(id);
  if (new Set(ids).size !== ids.length || !s.projects.every(z=>safeID(z.id)&&typeof z.name==='string'&&z.name.trim()&&['active','archived','deleted'].includes(z.status)&&Array.isArray(s.modules[z.id])&&s.modules[z.id].every(m=>typeof m==='string'))) return false;
  if (s.zoneOrder.length !== ids.length || new Set(s.zoneOrder).size !== ids.length || !s.zoneOrder.every(id=>ids.includes(id))) return false;
  return new Set(s.cards.map(c=>c.id)).size === s.cards.length && s.cards.every(c=>c && safeID(c.id) && typeof c.title==='string' && typeof c.notes==='string' && typeof c.summary==='string' && families.includes(c.visual_dna?.family) && Number.isFinite(c.visual_dna.rotation) && surfaces.includes(c.surface) && ['ACTIVE','WAITING','DONE'].includes(c.status) && (!c.home_area||ids.includes(c.home_area)) && Array.isArray(c.history) && c.history.every(h=>h&&typeof h.text==='string') && Array.isArray(c.checklist) && c.checklist.every(i=>i&&safeID(i.id)&&typeof i.text==='string'&&typeof i.done==='boolean') && Array.isArray(c.links) && c.links.every(l=>l&&typeof l.url==='string') && Array.isArray(c.attachments) && c.attachments.every(a=>a&&safeID(a.id)&&typeof a.name==='string'&&typeof a.data==='string'&&/^data:[^,]*;base64,/.test(a.data)) && c.positions && typeof c.positions==='object');
}
export function archiveCard(c, completed, at=new Date().toISOString()) {
  if (c.surface !== 'archive') c.return_to = {surface:c.surface,lane:c.lane,status:c.status};
  c.surface='archive'; c.archived_at=at; c.stack_id=null;
  if(completed){c.status='DONE';c.completed_at=at;}
}
export function restoreCard(s,c) {
  const z=s.projects.find(z=>z.id===c.home_area);
  if(z && z.status!=='active') z.status='active';
  c.surface = c.home_area ? (['home','today','waiting'].includes(c.return_to?.surface)?c.return_to.surface:'home') : 'inbox';
  c.lane=c.return_to?.lane||'TODAY'; c.status=c.surface==='waiting'?'WAITING':'ACTIVE';
  c.completed_at=null;c.archived_at=null;c.stack_id=null;
}
export function projectAction(s,id,action) {
  const z=s.projects.find(z=>z.id===id);if(!z)return;
  z.status={archive:'archived',restore:'active',delete:'deleted'}[action];
  z.updated_at=new Date().toISOString();
  // Container lifecycle is independent of each card's completion/archive status.
  // Restoring a project never resurrects tasks that were completed separately.
}
export function visibleCard(s,c) {
  return !c.home_area || s.projects.find(z=>z.id===c.home_area)?.status==='active';
}
