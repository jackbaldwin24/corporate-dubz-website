// /assets/js/cue-clicker.js
(() => {
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => Math.floor(n).toLocaleString();

  const initial = {
    hype: 0,
    perClick: 1,
    perSec: 0,
    shop: [
      // Per‑click path (more CDJs & better cue feel)
      { id:'cdj',   name:'Additional CDJ',         desc:'+1 hype/click (more cue buttons)', cost:150,   type:'click',  value:1,   owned:0, scale:1.45 },
      { id:'spr',   name:'High‑Tension Cue Springs',desc:'+2 hype/click (snappier stabs)',   cost:1200,  type:'click',  value:2,   owned:0, scale:1.5  },
      // Multipliers (limited so they don’t snowball)
      { id:'mixer', name:'DJM‑900NXS2 Mixer',      desc:'×1.5 click power (one‑time)',      cost:8000,  type:'mult',   value:1.5, owned:0, scale:1.6, max:1 },
      { id:'brand', name:'Corporate Merch Drop',   desc:'×2 all hype gain (one‑time)',       cost:120000,type:'global', value:2,   owned:0, scale:1.7, max:1 },
      // Passive income path (harder scaling)
      { id:'dub',   name:'Exclusive Dubplate',     desc:'+3 hype/sec',                      cost:3000,  type:'passive',value:3,   owned:0, scale:1.55 },
      { id:'mon',   name:'Studio Monitors Stack',  desc:'+8 hype/sec',                      cost:12000, type:'passive',value:8,   owned:0, scale:1.6  },
      { id:'stage', name:'Mainstage Booking',      desc:'+40 hype/sec',                     cost:60000, type:'passive',value:40,  owned:0, scale:1.65 }
    ]
  };

  // state
  let state = null;
  const load = () => {
    try { const s = JSON.parse(localStorage.getItem('cc_save')); if (s) return s; } catch(e){}
    return JSON.parse(JSON.stringify(initial));
  };
  const save  = () => localStorage.setItem('cc_save', JSON.stringify(state));
  const reset = () => { state = JSON.parse(JSON.stringify(initial)); renderAll(); log('Reset save.'); };

  // ===== Audio setup =====
  let audioCtx; let muted = false;
  const CUE_SRC = '/assets/audio/cue-track.mp3'; // put your file here (avoid spaces in filename)
  const CUE_POINT = 0; // seconds; set this to jump to a cue-in point if you want

  let cueAudio = new Audio(CUE_SRC);
  cueAudio.preload = 'auto';
  cueAudio.volume = 0.7;
  cueAudio.crossOrigin = 'anonymous';
  cueAudio.playsInline = true;

  // Play a one-shot blip on a separate element so spammed taps don't cut off
  function playBlipOneShot(durationMs){
    if(muted) return;
    const a = new Audio(CUE_SRC);
    a.volume = cueAudio.volume;
    a.preload = 'auto';
    a.currentTime = CUE_POINT;

    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      try { a.pause(); } catch(_) {}
      // Properly detach the media without navigating to '/'
      a.removeAttribute('src');
      a.load();
    };

    // Ensure we clean up even if the audio naturally ends
    a.addEventListener('ended', cleanup, { once: true });

    a.play().catch(()=>{});

    // Stop after the requested duration for a blip
    if (Number.isFinite(durationMs)) {
      setTimeout(cleanup, durationMs);
    }
  }

  function ensureCtx(){ if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)(); }

  // Prime audio on first user interaction to reduce latency (mobile Safari etc.)
  let primed = false;
  function primeAudio(){
    if(primed) return;
    primed = true;
    ensureCtx();
    // Attempt a silent play-pause to warm up the element
    try {
      const t = Math.max(0, CUE_POINT - 0.01);
      cueAudio.currentTime = t;
      cueAudio.muted = true;
      cueAudio.play().then(()=>{
        cueAudio.pause();
        cueAudio.muted = false;
        cueAudio.currentTime = CUE_POINT;
      }).catch(()=>{ /* ignore */ });
    } catch(e) { /* ignore */ }
  }

  // Old buy blip remains (uses WebAudio oscillator)
  function playBuy(){
    if(muted) return; ensureCtx();
    const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
    o.type='sine'; o.frequency.value=300; g.gain.value=0.15;
    o.connect(g); g.connect(audioCtx.destination); o.start();
    o.frequency.exponentialRampToValueAtTime(120, audioCtx.currentTime+0.18);
    o.stop(audioCtx.currentTime+0.20);
  }

  const log = (msg) => { const el=$('cc-log'); if(!el) return; const p=document.createElement('div'); p.textContent=msg; el.prepend(p); };

  function renderStats(){
    if(!$('cc-hype')) return; // section might be absent on some pages
    $('cc-hype').textContent     = fmt(state.hype);
    $('cc-perclick').textContent = fmt(state.perClick);
    $('cc-persec').textContent   = fmt(state.perSec);
  }

  function renderShop(){
    const wrap = $('cc-shop'); if(!wrap) return;
    wrap.innerHTML='';
    state.shop.forEach(item=>{
      const atMax = (typeof item.max === 'number') && (item.owned >= item.max);
      const btn = document.createElement('button');
      btn.id = `cc-shop-${item.id}`;
      btn.className = 'w-full text-left p-3 border rounded-lg bg-white hover:bg-pink-50 transition disabled:opacity-50';
      const afford = !atMax && (state.hype >= item.cost);
      btn.disabled = !afford;
      const costLabel = atMax ? 'MAXED' : fmt(item.cost);
      const rightClasses = atMax ? 'font-bold text-gray-400' : 'font-bold text-pink-600';
      btn.innerHTML = `
        <div class="flex justify-between items-center">
          <div>
            <div class="font-semibold">${item.name}${atMax ? ' (max)' : ''}</div>
            <div class="text-xs text-gray-500">${item.desc}</div>
            <div class="text-xs text-gray-400">Owned: ${item.owned}${item.max?` / ${item.max}`:''}</div>
          </div>
          <div class="${rightClasses}">${costLabel}</div>
        </div>`;
      btn.onclick = ()=>{
        if(atMax) return;
        if(state.hype < item.cost) return;
        state.hype -= item.cost;
        item.owned++;
        // scale price (per-item scaling, defaults harder than before)
        const s = (typeof item.scale === 'number' && item.scale > 1) ? item.scale : 1.45;
        item.cost = Math.ceil(item.cost * s);
        if(item.type==='click')   state.perClick += item.value;
        if(item.type==='mult')    state.perClick *= item.value;
        if(item.type==='passive') state.perSec   += item.value;
        if(item.type==='global'){ state.perClick *= item.value; state.perSec *= item.value; }
        playBuy();
        renderAll();
        log(`Purchased ${item.name}.`);
        save();
      };
      wrap.appendChild(btn);
    });
  }
  function updateShopAfford(){
    const wrap = $('cc-shop'); if(!wrap) return;
    state.shop.forEach(item => {
      const btn = document.getElementById(`cc-shop-${item.id}`);
      if(!btn) return;
      const atMax = (typeof item.max === 'number') && (item.owned >= item.max);
      const afford = !atMax && (state.hype >= item.cost);
      btn.disabled = !afford;
      // Update the right-hand price/max label in-place
      const priceEl = btn.querySelector('div > div.font-bold');
      if(priceEl){
        if(atMax){
          priceEl.textContent = 'MAXED';
          priceEl.className = 'font-bold text-gray-400';
        }else{
          priceEl.textContent = fmt(item.cost);
          priceEl.className = 'font-bold text-pink-600';
        }
      }
      // Update the Owned line
      const ownedEl = btn.querySelector('div .text-xs.text-gray-400');
      if(ownedEl){ ownedEl.textContent = `Owned: ${item.owned}${item.max?` / ${item.max}`:''}`; }
    });
  }

  function renderAll(){ renderStats(); renderShop(); }

  function tick(){
    // called 10x/sec
    state.hype += state.perSec / 10;
    renderStats();
    updateShopAfford();
  }

  function wireUI(){
    const cue = $('cc-cue');
    if(!cue) return;

    // Prime audio on first interaction anywhere in the doc
    ['mousedown','touchstart'].forEach(evt=>document.addEventListener(evt, primeAudio, { once:true, passive:true }));

    // Tap vs Hold logic: quick tap plays a tiny blip; holding keeps playing until release
    let pressing = false;
    const BLIP_MIN_MS = 220; // quick tap blip length
    const HOLD_THRESHOLD_MS = 100; // if held past this, treat as hold
    let holdTimer = null;
    let holdStarted = false;

    function startCue(){
      if (muted || !cueAudio) return;
      if (pressing) return; // guard against duplicate events
      pressing = true;
      holdStarted = false;
      // Delay starting main audio until we know it's a hold
      clearTimeout(holdTimer);
      holdTimer = setTimeout(() => {
        if (!pressing) return; // released before threshold
        holdStarted = true;
        cueAudio.currentTime = CUE_POINT;
        cueAudio.play().catch(()=>{});
      }, HOLD_THRESHOLD_MS);
    }

    function endCue(){
      if (!pressing) return;
      pressing = false;
      clearTimeout(holdTimer);

      if (!holdStarted) {
        // It was a quick tap: play ONE blip on its own element so spamming doesn't cut off
        playBlipOneShot(BLIP_MIN_MS);
      } else {
        // It was a hold: stop and reset the main audio
        try { cueAudio.pause(); } catch(_) {}
        cueAudio.currentTime = CUE_POINT;
      }

      state.hype += state.perClick;
      renderStats();
      updateShopAfford();
    }

    // Desktop
    cue.addEventListener('mousedown', (e)=>{ e.preventDefault(); if(e.button!==0) return; startCue(); });
    cue.addEventListener('mouseup',   (e)=>{ e.preventDefault(); if(e.button!==0) return; endCue(); });
    cue.addEventListener('mouseleave',(e)=>{ if(e.buttons===0 || !pressing) return; endCue(); });

    // Safety: end press if mouse/touch ends outside the button
    window.addEventListener('mouseup',   ()=>{ if (pressing) endCue(); });
    window.addEventListener('touchend',  ()=>{ if (pressing) endCue(); }, { passive:true });
    window.addEventListener('touchcancel',()=>{ if (pressing) endCue(); }, { passive:true });

    // Mobile
    cue.addEventListener('touchstart', (e)=>{ e.preventDefault(); startCue(); }, { passive:false });
    cue.addEventListener('touchend',   (e)=>{ e.preventDefault(); endCue(); },   { passive:false });

    const saveBtn = $('cc-save');  if(saveBtn)  saveBtn.addEventListener('click', ()=>{ save(); log('Saved.'); });
    const resetBtn= $('cc-reset'); if(resetBtn) resetBtn.addEventListener('click', ()=>{ reset(); save(); });
    const muteBtn = $('cc-mute');  if(muteBtn)  muteBtn.addEventListener('click', (e)=>{ muted=!muted; e.target.textContent = muted? '🔇 Muted' : '🔊 Mute'; });
  }

  // Boot only when DOM is ready (plays nice with your scripts.js)
  document.addEventListener('DOMContentLoaded', () => {
    state = load();
    renderAll();
    wireUI();
    setInterval(tick, 100); // 10 FPS idle tick
  });
})();