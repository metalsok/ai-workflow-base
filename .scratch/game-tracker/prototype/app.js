/* Prototype only: UI variations and in-memory mutations; no accounts or API calls. */
const games = window.PROTOTYPE_GAMES;
const titles = ['A', 'B', 'C', 'D'];
const labels = { A: 'Cinematic spotlight', B: 'Editorial magazine', C: 'Discovery dashboard', D: 'Cinematic dashboard' };
const statuses = ['Want to play', 'Playing', 'Completed', 'Stopped playing'];
const saved = new Map();
let variant = new URLSearchParams(location.search).get('variant') || 'A';
if (!titles.includes(variant)) variant = 'A';
let view = 'discover', query = '', filter = 'All', activeGame = null;
let toastTimer;
const byId = id => games.find(game => game.id === Number(id));
const elden = byId(119133);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ordered = [119133,119171,...games.filter(g => ![119133,119171].includes(g.id)).map(g=>g.id)].map(byId);
const meta = game => game.platforms.filter(p => !['Stadia', 'Linux'].includes(p)).slice(0,3).join(' · ');
const btn = (action,text,cls='',id='') => `<button class="${cls}" data-action="${action}" ${id ? `data-game="${id}"` : ''}>${text}</button>`;
function saveButton(game, round=false) {
  const exists = saved.has(game.id);
  return `<button class="${round ? 'round-save' : 'save'} ${exists ? 'saved' : ''}" data-action="save" data-game="${game.id}" aria-label="${exists ? 'Open saved game' : 'Add to Want to play'}: ${esc(game.name)}">${round ? (exists ? '✓' : '+') : (exists ? '✓ ' + esc(saved.get(game.id)) : '+ Want to play')}</button>`;
}
function card(game, rank) {
  return `<article class="game-card"><button class="cover-button" data-action="details" data-game="${game.id}" aria-label="View ${esc(game.name)}"><img src="${game.cover}" alt="${esc(game.name)} cover" loading="lazy">${rank ? `<span class="card-number">${String(rank).padStart(2,'0')} / SAMPLE PICK</span>` : ''}</button><h3>${esc(game.name)}</h3><p class="game-meta">${esc(meta(game))}</p>${saveButton(game)}</article>`;
}
function section(title, subtitle, list, extra='') {
  return `<section class="section ${extra}"><div class="section-head"><div><h2>${title}</h2><p>${subtitle}</p></div><span class="section-index">${list.length} PICKS</span></div><div class="game-grid">${list.map((g,i)=>card(g,i+1)).join('')}</div></section>`;
}
function header(sidebar=false) {
  const brand = `<button class="brand" data-action="discover" aria-label="Sidequest home"><span class="brand-mark">↗</span>sidequest</button>`;
  const nav = `<button data-action="discover" class="${view === 'discover' ? 'active' : ''}">${sidebar ? '◎ &nbsp; ' : ''}Discover</button><button data-action="library" class="${view === 'library' ? 'active' : ''}">${sidebar ? '▤ &nbsp; ' : ''}My Library <span class="count">${saved.size}</span></button>`;
  const search = `<div class="searchbox"><input id="search" type="search" placeholder="Find your next game" aria-label="Search sample games" value="${esc(query)}"></div>`;
  return sidebar ? `<aside class="sidebar">${brand}<nav>${nav}</nav><p class="side-note">Your next great adventure<br>starts with a little curiosity.<br><br>PC + Console<br>Big worlds. Small wonders.</p></aside>` : `<header class="topbar">${brand}<nav class="nav">${nav}</nav>${search}<div class="avatar" title="Sample account">JD</div></header>`;
}
function intro() {
  return `<div class="intro"><div><div class="eyebrow">A LITTLE CURIOSITY GOES A LONG WAY</div><h1>${variant === 'B' ? 'The next great escape.' : 'Find your next obsession.'}</h1></div><p>Big worlds. Small wonders.<br>There’s always something worth playing.</p></div>`;
}
function cinematic() {
  return `${intro()}<section class="hero"><img src="assets/hero.jpg" alt="An expansive landscape from Elden Ring"><div class="hero-copy"><span class="tag">THE SPOTLIGHT · SAMPLE PICK</span><h2>Lose yourself.<br>Find your legend.</h2><p>A world that rewards getting lost. Step into the Lands Between and make the journey your own.</p><div class="actions">${btn('save',saved.has(elden.id) ? '✓ Added to your library' : '+ Want to play','primary',elden.id)}${btn('details','Explore Elden Ring ↗','secondary',elden.id)}</div></div><div class="hero-meta">ELDEN RING &nbsp; / &nbsp; FROMSOFTWARE</div></section>${section('Popular now','A mix of major releases and indie favorites · sample collection',ordered)}${section('Fresh discoveries','Layout preview for the new-releases shelf · sample titles, not a live release feed',[...ordered].reverse())}`;
}
function editorial() {
  const hades = games.find(g=>g.name==='Hades') || elden;
  return `${intro()}<div class="editorial-layout"><article class="editorial-feature"><button data-action="details" data-game="${elden.id}" aria-label="Explore Elden Ring"><img src="assets/hero.jpg" alt="Elden Ring landscape"></button><div class="eyebrow" style="margin-top:22px">THE LONG WAY HOME / FEATURED PICK</div><h2>Some worlds are worth getting lost in.</h2><p>Take the scenic route through the Lands Between. This issue’s spotlight is a reminder that the journey is the whole point.</p><div class="actions">${btn('details','Discover Elden Ring ↗','primary',elden.id)}${btn('save',saved.has(elden.id) ? '✓ Saved' : '+ Save for later','secondary',elden.id)}</div></article><section class="section"><div class="section-head"><div><h2>The conversation starters</h2><p>Popular now · sample ranking</p></div><span class="section-index">01—04</span></div><div class="rank-list">${[hades,...ordered.filter(g=>g.id!==hades.id)].slice(0,4).map((g,i)=>`<article class="rank-row"><span class="rank">0${i+1}</span><button data-action="details" data-game="${g.id}" style="padding:0;background:none" aria-label="View ${esc(g.name)}"><img src="${g.cover}" alt="${esc(g.name)} cover"></button><div><h3>${esc(g.name)}</h3><p>${esc(g.developer)}</p></div>${saveButton(g,true)}</article>`).join('')}</div></section></div>${section('Small studios. Lasting impressions.','Independent games deserve a place in the spotlight, too.',games.filter(g=>!['Elden Ring',"Baldur's Gate III",'The Legend of Zelda: Breath of the Wild'].includes(g.name)), 'second')}`;
}
function dashboard() {
  const indie = games.find(g=>g.name==='Hollow Knight') || elden;
  return `${intro()}<div class="dashboard-layout"><article class="dashboard-spotlight"><img src="${indie.cover}" alt="${esc(indie.name)} cover"><div><div class="eyebrow">SMALL STUDIO / BIG ADVENTURE</div><h2>${esc(indie.name)}</h2><p>Follow your curiosity into a beautifully strange world. A sample discovery pick for your next session.</p>${btn('details','Take a closer look ↗','primary',indie.id)}</div></article><aside class="library-shortcut"><div class="eyebrow">MAKE ROOM FOR WHAT’S NEXT</div><h2>Your next chapter</h2><p>${saved.size ? `${saved.size} game${saved.size!==1?'s':''} saved. A whole world of possibilities.` : 'Your library is a collection of adventures waiting to happen.'}</p>${btn('library','Open My Library →','secondary')}</aside></div>${section('On everyone’s radar','Major releases and indie standouts · sample collection',ordered)}`;
}
function library() {
  const list = games.filter(g=>saved.has(g.id) && (filter==='All' || (filter==='Played' ? saved.get(g.id)!=='Want to play' : saved.get(g.id)===filter)));
  return `<div class="intro"><div><div class="eyebrow">YOUR GAMES, YOUR JOURNEY</div><h1>My Library</h1></div><p>One place for every adventure.</p></div><div class="library-filter">${['All',...statuses,'Played'].map(s=>`<button data-action="filter" data-filter="${s}" class="${filter===s?'active':''}">${s}</button>`).join('')}</div>${list.length ? `<div class="library-grid">${list.map(g=>`<article class="library-item"><button style="padding:0;background:none" data-action="details" data-game="${g.id}" aria-label="View ${esc(g.name)}"><img src="${g.cover}" alt="${esc(g.name)} cover"></button><div><h3>${esc(g.name)}</h3><select data-status-game="${g.id}" aria-label="Play status for ${esc(g.name)}">${statuses.map(s=>`<option ${saved.get(g.id)===s?'selected':''}>${s}</option>`).join('')}</select>${btn('remove','Remove from library','remove',g.id)}</div></article>`).join('')}</div>` : `<div class="empty"><h2>${saved.size ? 'No games in this list yet.' : 'Your next adventure starts here.'}</h2><p>${saved.size ? 'Change a game’s status to see it here.' : 'Find a game you love and add it to Want to play.'}</p><div>${btn('discover','Discover something great →','primary')}</div></div>`}`;
}
function content() {
  if (query.trim()) {
    const list = games.filter(g=>(g.name+' '+g.developer).toLowerCase().includes(query.trim().toLowerCase()));
    return `<div class="intro"><div><div class="eyebrow">SEARCH THE SAMPLE CATALOG</div><h1>Find your next game.</h1></div></div><p class="small-note">${list.length} result${list.length!==1?'s':''} for “${esc(query)}” · six sample titles only</p><div class="results">${list.length ? `<div class="game-grid">${list.map(g=>card(g)).join('')}</div>` : '<div class="empty"><h2>No sample games found.</h2><p>Try Elden Ring, Hades, Celeste, Zelda, Baldur, or Hollow Knight.</p></div>'}</div>`;
  }
  if (view==='library') return library();
  return variant==='A' || variant==='D' ? cinematic() : variant==='B' ? editorial() : dashboard();
}
function footer() {
  const state = {variant,view,search:query,filter,library:[...saved].map(([id,status])=>({game:byId(id).name,status}))};
  return `<p class="small-note">Design sample only. Collection order is curated for layout comparison; it is not a current popularity or new-release chart.</p><footer class="footer"><span>SIDEQUEST / A place for the games you love.</span><span>Game metadata & artwork: <a href="https://www.igdb.com/" target="_blank" rel="noopener">IGDB</a></span></footer><details class="debug"><summary>Prototype state · ${saved.size} saved game${saved.size!==1?'s':''}</summary><pre>${esc(JSON.stringify(state,null,2))}</pre></details>`;
}
function render() {
  document.body.className = variant==='B' ? 'editorial' : variant==='D' ? 'compact hybrid' : variant==='C' ? 'compact' : '';
  const shell = document.getElementById('shell');
  const focusSearch = document.activeElement?.id==='search';
  const pos = focusSearch ? document.activeElement.selectionStart : null;
  shell.innerHTML = variant==='C' || variant==='D' ? `<div class="compact-layout">${header(true)}<main class="compact-main"><div class="compact-toolbar"><p>YOUR DAILY DOSE OF DISCOVERY</p><div class="searchbox"><input id="search" type="search" placeholder="Search games" aria-label="Search sample games" value="${esc(query)}"></div><div class="avatar">JD</div></div><div id="content">${content()}${footer()}</div></main></div>` : `${header()}<main class="page"><div id="content">${content()}${footer()}</div></main>`;
  document.getElementById('variant-label').textContent = `${variant} · ${labels[variant]}`;
  if (focusSearch) {const input=document.getElementById('search');input.focus();if(pos!==null && input.type!=='search') input.setSelectionRange(pos,pos);}
}
function switchVariant(delta) {
  variant=titles[(titles.indexOf(variant)+delta+titles.length)%titles.length];
  const url=new URL(location);url.searchParams.set('variant',variant);history.replaceState({},'',url);
  render();
}
function toast(text) {
  const node=document.getElementById('toast');node.textContent=text;node.classList.add('visible');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.classList.remove('visible'),2200);
}
function details(id) {
  activeGame=Number(id);const game=byId(id), dialog=document.getElementById('game-dialog');
  dialog.innerHTML=`<div class="dialog-top"><span>GAME DETAILS / SAMPLE CATALOG</span>${btn('close','×','','')}</div><div class="dialog-body"><img src="${game.cover}" alt="${esc(game.name)} cover"><div><h2>${esc(game.name)}</h2><p class="genres">${esc(game.genres.join(' · '))}</p><p>${esc(game.developer)}<br>${esc(meta(game))}</p><label for="dialog-status">Your play status</label><select id="dialog-status">${statuses.map(s=>`<option ${saved.get(game.id)===s?'selected':''}>${s}</option>`).join('')}</select>${btn('dialog-save',saved.has(game.id)?'Update status':'Add to my library','primary',game.id)}</div></div><p class="dialog-note">${esc(game.summary.slice(0,650))}${game.summary.length>650?'…':''}</p><p class="dialog-note">Prototype interaction only. Reloading clears your sample library.</p>`;
  if(!dialog.open) dialog.showModal();
}
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-action]');if(!button)return;
  const action=button.dataset.action,id=Number(button.dataset.game);
  if(action==='previous')return switchVariant(-1);
  if(action==='next')return switchVariant(1);
  if(action==='close')return document.getElementById('game-dialog').close();
  if(action==='details')return details(id);
  if(action==='save') {
    if(saved.has(id))return details(id);
    saved.set(id,'Want to play');render();toast(`${byId(id).name} added to Want to play`);return;
  }
  if(action==='dialog-save') {
    saved.set(id,document.getElementById('dialog-status').value);
    document.getElementById('game-dialog').close();render();toast('Library updated');return;
  }
  if(action==='remove'){saved.delete(id);render();toast('Game removed from your library');return;}
  if(action==='filter'){filter=button.dataset.filter;render();return;}
  if(action==='discover'||action==='library'){view=action;query='';render();window.scrollTo({top:0,behavior:'smooth'});}
});
document.addEventListener('input',event=>{
  if(event.target.id==='search'){query=event.target.value;document.getElementById('content').innerHTML=content()+footer();}
});
document.addEventListener('change',event=>{
  if(event.target.dataset.statusGame){saved.set(Number(event.target.dataset.statusGame),event.target.value);render();toast('Play status updated');}
});
document.addEventListener('keydown',event=>{
  if(event.target.closest('input,textarea,select,[contenteditable]')||document.getElementById('game-dialog').open)return;
  if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();switchVariant(event.key==='ArrowRight'?1:-1);}
});
document.getElementById('game-dialog').addEventListener('click',event=>{if(event.target===event.currentTarget)event.currentTarget.close();});
window.addEventListener('popstate',()=>{variant=new URLSearchParams(location.search).get('variant')||'A';if(!titles.includes(variant))variant='A';render();});
render();
