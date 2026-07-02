/* ================================================================
   CargaCerta — Simulador Logístico
   js/app.js — Lógica com Amarração Automática (Intertravamento)
   ================================================================ */

/* ── Estado Global ──────────────────────────────────────────── */
let currentTab   = 'endereco';
let currentViz   = 'topo';
let endViz       = 'topo';
let currentLayer = 1;
let isoRotation  = 0;
let palletData   = null;
let endData      = null;

const PBR_L = 120, PBR_W = 100, PBR_H = 15;

/* ── PWA — Instalação ──────────────────────────────────────── */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; document.getElementById('install-btn').classList.remove('hidden'); });
function installApp() { if (!deferredPrompt) return; deferredPrompt.prompt(); deferredPrompt.userChoice.then(() => { deferredPrompt = null; document.getElementById('install-btn').classList.add('hidden'); }); }
if ('serviceWorker' in navigator) { window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); }); }

/* ── Online / Offline ───────────────────────────────────────── */
function updateOnlineStatus() { const el = document.getElementById('online-indicator'); const on = navigator.onLine; el.classList.toggle('offline', !on); el.querySelector('.online-label').textContent = on ? 'Online' : 'Offline'; el.dataset.tooltip = on ? 'Conectado' : 'Sem conexão'; }
window.addEventListener('online', updateOnlineStatus); window.addEventListener('offline', updateOnlineStatus); updateOnlineStatus();

/* ── Abas ───────────────────────────────────────────────────── */
function switchTab(tab) { currentTab = tab; document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab)); document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + tab)); }

/* ── Atalhos de Teclado ─────────────────────────────────────── */
document.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { const f = currentTab === 'endereco' ? document.getElementById('form-endereco') : document.getElementById('form-pallet'); if (f) f.requestSubmit(); } if (e.key === 'Escape') { const f = currentTab === 'endereco' ? document.getElementById('form-endereco') : document.getElementById('form-pallet'); if (f) f.reset(); } });

/* ── Loading ────────────────────────────────────────────────── */
function showLoading() { document.getElementById('loading-overlay').classList.remove('hidden'); }
function hideLoading() { document.getElementById('loading-overlay').classList.add('hidden'); }

/* ── Helpers ────────────────────────────────────────────────── */
const val  = id => { const v = parseFloat(document.getElementById(id).value); return isNaN(v) || v <= 0 ? null : v; };
const valO = id => { const v = parseFloat(document.getElementById(id).value); return isNaN(v) || v <= 0 ? null : v; };
function fmtInt(n)  { return Math.round(n).toLocaleString('pt-BR'); }
function fmtNum(n, d = 1) { return n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }); }
function fmtPct(n)  { return fmtNum(n, 1) + '%'; }
function fmtDim(n)  { return fmtNum(n, 1); }
function fmtVol(cm3) { if (cm3 >= 1e6) return fmtNum(cm3 / 1e6, 3) + ' m³'; if (cm3 >= 1e3) return fmtNum(cm3 / 1e3, 1) + ' L'; return fmtInt(cm3) + ' cm³'; }
function showErr(id, msg) { const el = document.getElementById(id); el.textContent = msg; el.classList.remove('hidden'); }
function hideErr(id) { document.getElementById(id).classList.add('hidden'); }

/* ── Permutações ────────────────────────────────────────────── */
function perms(a, b, c) { return [[a,b,c],[a,c,b],[b,a,c],[b,c,a],[c,a,b],[c,b,a]]; }
function orientLabel(perm, orig) { const names = ['C','L','A']; const origArr = [orig.c, orig.l, orig.a]; const used = [false, false, false]; const labels = []; for (let i = 0; i < 3; i++) { for (let j = 0; j < 3; j++) { if (!used[j] && Math.abs(perm[i] - origArr[j]) < 0.001) { labels.push(names[j]); used[j] = true; break; } } } return labels.join('×'); }

/* ================================================================
   FERRAMENTA 1 — ENDEREÇAMENTO  (inalterado)
   ================================================================ */
function calcularEnderecamento(event) {
    event.preventDefault(); hideErr('err-end');
    const eC = val('end-c'), eL = val('end-l'), eA = val('end-a');
    const pC = val('cx-c'),  pL = val('cx-l'),  pA = val('cx-a');
    if (!eC || !eL || !eA || !pC || !pL || !pA) { showErr('err-end', 'Preencha todas as dimensões do endereço e da caixa.'); return; }
    showLoading();
    setTimeout(() => {
        const allPerms = perms(pC, pL, pA); let bestQ = 0, bestPerm = null, bestArr = null;
        for (const [pc,pl,pa] of allPerms) { const nC = Math.floor(eC/pc), nL = Math.floor(eL/pl), nA = Math.floor(eA/pa), q = nC*nL*nA; if (q > bestQ) { bestQ = q; bestPerm = [pc,pl,pa]; bestArr = {nC,nL,nA}; } }
        if (bestQ === 0) { hideLoading(); showErr('err-end', 'A caixa não cabe no endereço em nenhuma orientação.'); document.getElementById('res-end').classList.add('hidden'); document.getElementById('empty-end').classList.remove('hidden'); return; }
        const volEnd = eC*eL*eA, volUtil = bestQ*pC*pL*pA, volLivre = volEnd-volUtil, ocup = (volUtil/volEnd)*100;
        endData = { eC,eL,eA, pC:bestPerm[0],pL:bestPerm[1],pA:bestPerm[2], origC:pC,origL:pL,origA:pA, qtd:bestQ, nC:bestArr.nC,nL:bestArr.nL,nA:bestArr.nA, volEnd,volUtil,volLivre, ocup,vazio:100-ocup, orientLabel:orientLabel(bestPerm,{c:pC,l:pL,a:pA}) };
        renderEndResult(endData); hideLoading();
    }, 350);
}
function renderEndResult(d) {
    document.getElementById('empty-end').classList.add('hidden'); document.getElementById('res-end').classList.remove('hidden');
    document.getElementById('r-end-qtd').textContent = fmtInt(d.qtd); document.getElementById('r-end-ocup').textContent = fmtPct(d.ocup); document.getElementById('r-end-vazio').textContent = fmtPct(d.vazio);
    document.getElementById('r-end-arranjo').textContent = fmtInt(d.nC)+'×'+fmtInt(d.nL)+'×'+fmtInt(d.nA); document.getElementById('r-end-orient').textContent = d.orientLabel;
    document.getElementById('r-end-vutil').textContent = fmtVol(d.volUtil); document.getElementById('r-end-vlivre').textContent = fmtVol(d.volLivre); document.getElementById('r-end-vtotal').textContent = fmtVol(d.volEnd); document.getElementById('r-end-efic').textContent = fmtPct(d.ocup);
    const bar = document.getElementById('r-end-bar'), pct = document.getElementById('r-end-bar-pct');
    bar.style.width = Math.min(d.ocup,100)+'%'; pct.textContent = fmtPct(d.ocup);
    bar.className = 'bar-fill'+(d.ocup>=80?' good':d.ocup>=50?'':d.ocup>=25?' warn':' bad');
    document.getElementById('r-end-ocup').style.color = d.ocup>=80?'var(--green)':d.ocup>=50?'var(--orange)':'var(--red)';
    endViz='topo'; document.querySelectorAll('[data-endviz]').forEach(b=>b.classList.toggle('active',b.dataset.endviz==='topo'));
    document.getElementById('end-viz-topo').classList.remove('hidden'); document.getElementById('end-viz-iso').classList.add('hidden');
    renderEndSVG(d); renderEndIso(d);
}
function switchEndViz(v) { endViz=v; document.querySelectorAll('[data-endviz]').forEach(b=>b.classList.toggle('active',b.dataset.endviz===v)); document.getElementById('end-viz-topo').classList.toggle('hidden',v!=='topo'); document.getElementById('end-viz-iso').classList.toggle('hidden',v!=='iso'); }
function renderEndSVG(d) {
    const c=document.getElementById('svg-end'), pad=14, maxW=700, sc=Math.min((maxW-2*pad)/d.eC,(440-2*pad)/d.eL), w=d.eC*sc+2*pad, h=d.eL*sc+2*pad;
    let s=`<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg"><defs><marker id="ah" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto"><path d="M0,0 L6,2 L0,4" fill="#5a6478"/></marker></defs>`;
    s+=`<rect x="${pad}" y="${pad}" width="${d.eC*sc}" height="${d.eL*sc}" fill="#0d1117" rx="3"/>`;
    let num=0; for(let i=0;i<d.nC;i++) for(let j=0;j<d.nL;j++){ num++; const x=pad+i*d.pC*sc,y=pad+j*d.pL*sc,bw=d.pC*sc,bh=d.pL*sc; s+=`<rect x="${x+.5}" y="${y+.5}" width="${bw-1}" height="${bh-1}" rx="2" class="box-single"/>`; if(bw>18&&bh>14){const fs=Math.min(9,bw/4,bh/3);s+=`<text x="${x+bw/2}" y="${y+bh/2}" class="box-num" style="font-size:${fs}px">${num}</text>`;} if(bw>30&&bh>20){const cx=x+bw/2,cy=y+bh/2,al=Math.min(bw,bh)*.28;s+=`<line x1="${cx-al}" y1="${cy+bh*.2}" x2="${cx+al}" y2="${cy+bh*.2}" class="arrow-line" marker-end="url(#ah)"/>`;} }
    s+=`<rect x="${pad}" y="${pad}" width="${d.eC*sc}" height="${d.eL*sc}" class="border-addr" rx="3"/>`;
    s+=`<text x="${pad+d.eC*sc/2}" y="${h-2}" class="axis-label" style="font-size:9px">C: ${fmtDim(d.eC)} cm (${d.nC})</text>`;
    s+=`<text x="5" y="${pad+d.eL*sc/2}" class="axis-label" style="font-size:9px" transform="rotate(-90,5,${pad+d.eL*sc/2})">L: ${fmtDim(d.eL)} cm (${d.nL})</text>`;
    s+=`<text x="${pad+4}" y="${pad+12}" style="font-family:'JetBrains Mono',monospace;font-size:7px;fill:#5a6478">Orientação: ${d.orientLabel} | A: ${fmtDim(d.eA)} cm (${d.nA})</text>`;
    s+='</svg>'; c.innerHTML=s;
}
function isoProj(x,y,z,sc,ox,oy){return{sx:ox+(x-z)*.866*sc,sy:oy+(x+z)*.5*sc-y*sc};}
function renderEndIso(d) {
    const container=document.getElementById('svg-end-iso'),sc=.9,ox=260,oy=360; const eC=d.eC,eL=d.eL,eA=d.eA,pC=d.pC,pL=d.pL,pA=d.pA,totalH=eA;
    function P(x,y,z){return isoProj(x,y,z,sc,ox,oy);}
    const pts=[P(0,totalH,0),P(eC,0,0),P(0,0,eL),P(eC,0,eL),P(-5,0,-5),P(eC+5,0,eL+5),P(eC+25,0,0)];
    const xs=pts.map(p=>p.sx),ys=pts.map(p=>p.sy); const minX=Math.min(...xs)-30,maxX=Math.max(...xs)+80,minY=Math.min(...ys)-20,maxY=Math.max(...ys)+30;
    let s=`<svg viewBox="${minX} ${minY} ${maxX-minX} ${maxY-minY}" xmlns="http://www.w3.org/2000/svg">`;
    const f0=P(-5,0,-5),f1=P(eC+5,0,-5),f2=P(eC+5,0,eL+5),f3=P(-5,0,eL+5);
    s+=`<polygon points="${f0.sx},${f0.sy} ${f1.sx},${f1.sy} ${f2.sx},${f2.sy} ${f3.sx},${f3.sy}" fill="#080b10" opacity=".4"/>`;
    function drawBox(px,py,pz,bw,bh,bd,t,f,si,st){const p0=P(px,py,pz),p1=P(px+bw,py,pz),p2=P(px+bw,py+bh,pz),p3=P(px,py+bh,pz),p4=P(px,py,pz+bd),p5=P(px+bw,py,pz+bd),p6=P(px+bw,py+bh,pz+bd),p7=P(px,py+bh,pz+bd);s+=`<polygon points="${p4.sx},${p4.sy} ${p5.sx},${p5.sy} ${p6.sx},${p6.sy} ${p7.sx},${p7.sy}" fill="${f}" stroke="${st}" stroke-width=".5"/>`;s+=`<polygon points="${p1.sx},${p1.sy} ${p5.sx},${p5.sy} ${p6.sx},${p6.sy} ${p2.sx},${p2.sy}" fill="${si}" stroke="${st}" stroke-width=".5"/>`;s+=`<polygon points="${p3.sx},${p3.sy} ${p2.sx},${p2.sy} ${p6.sx},${p6.sy} ${p7.sx},${p7.sy}" fill="${t}" stroke="${st}" stroke-width=".5"/>`;}
    function drawWire(px,py,pz,bw,bh,bd,st){const p0=P(px,py,pz),p1=P(px+bw,py,pz),p2=P(px+bw,py+bh,pz),p3=P(px,py+bh,pz),p4=P(px,py,pz+bd),p5=P(px+bw,py,pz+bd),p6=P(px+bw,py+bh,pz+bd),p7=P(px,py+bh,pz+bd);const d='6 3',w='.8';const lines=[[p0,p1],[p1,p5],[p5,p4],[p4,p0],[p3,p2],[p2,p6],[p6,p7],[p7,p3],[p0,p3],[p1,p2],[p5,p6],[p4,p7]];for(const[a,b]of lines)s+=`<line x1="${a.sx}" y1="${a.sy}" x2="${b.sx}" y2="${b.sy}" stroke="${st}" stroke-width="${w}" stroke-dasharray="${d}"/>`;}
    const lc=[{t:'rgba(255,106,43,0.65)',f:'rgba(255,106,43,0.48)',si:'rgba(255,106,43,0.35)',st:'#FF6A2B'},{t:'rgba(62,142,255,0.65)',f:'rgba(62,142,255,0.48)',si:'rgba(62,142,255,0.35)',st:'#3E8EFF'}];
    let cnt=0;const mx=200;for(let k=0;k<d.nA&&cnt<mx;k++){const c=lc[k%2];for(let i=0;i<d.nC&&cnt<mx;i++)for(let j=0;j<d.nL&&cnt<mx;j++){drawBox(i*pC,k*pA,j*pL,pC,pA,pL,c.t,c.f,c.si,c.st);cnt++;}}
    drawWire(0,0,0,eC,eA,eL,'#5a6478');
    const axLbl=P(eC/2,-8,0);s+=`<text x="${axLbl.sx}" y="${axLbl.sy}" fill="#8892a6" font-size="9" font-family="'JetBrains Mono',monospace" text-anchor="middle">X: ${fmtDim(eC)} cm (${d.nC})</text>`;
    const azLbl=P(-10,0,eL/2);s+=`<text x="${azLbl.sx}" y="${azLbl.sy}" fill="#8892a6" font-size="9" font-family="'JetBrains Mono',monospace" text-anchor="middle">Z: ${fmtDim(eL)} cm (${d.nL})</text>`;
    const ayLbl=P(0,eA/2,-14);s+=`<text x="${ayLbl.sx}" y="${ayLbl.sy}" fill="#8892a6" font-size="9" font-family="'JetBrains Mono',monospace" text-anchor="middle">Y: ${fmtDim(eA)} cm (${d.nA})</text>`;
    const infoP=P(eC/2,eA+16,eL+10);s+=`<text x="${infoP.sx}" y="${infoP.sy}" fill="#5a6478" font-size="8" font-family="'JetBrains Mono',monospace" text-anchor="middle">${fmtInt(d.qtd)} un. | ${d.orientLabel} | ${fmtPct(d.ocup)}</text>`;
    s+='</svg>';container.innerHTML=s;
}

/* ================================================================
   FERRAMENTA 2 — PALETIZAÇÃO PBR COM AMARRAÇÃO AUTOMÁTICA
   ================================================================ */

/* ── Algoritmo de Camada para Orientação Específica ─────────── */
function calcLayerFixed(boxC, boxL, palL, palW, forcePriIdx) {
    const orients = [{ l: boxC, w: boxL }, { l: boxL, w: boxC }];
    let best = { total: 0, main: null, comp: null, split: null, priIdx: forcePriIdx };
    const pri = orients[forcePriIdx], sec = orients[1 - forcePriIdx];

    // Divisão ao longo do COMPRIMENTO
    const maxCL = Math.floor(palL / pri.l);
    for (let n = maxCL; n >= 1; n--) {
        const mainAL = n, mainAW = Math.floor(palW / pri.w), mainBoxes = mainAL * mainAW;
        const usedL = n * pri.l, remL = palL - usedL;
        let compBoxes = 0, compAL = 0, compAW = 0, compOri = null;
        if (remL > 0) {
            const c1L = Math.floor(remL / sec.l), c1W = Math.floor(palW / sec.w), c1 = c1L * c1W;
            const c2L = Math.floor(remL / sec.w), c2W = Math.floor(palW / sec.l), c2 = c2L * c2W;
            if (c1 >= c2 && c1 > 0) { compBoxes = c1; compAL = c1L; compAW = c1W; compOri = { l: sec.l, w: sec.w }; }
            else if (c2 > 0) { compBoxes = c2; compAL = c2L; compAW = c2W; compOri = { l: sec.w, w: sec.l }; }
        }
        const total = mainBoxes + compBoxes;
        if (total > best.total) best = { total, main: { aL: mainAL, aW: mainAW, ori: { l: pri.l, w: pri.w }, boxes: mainBoxes, ox: 0, oy: 0 }, comp: compBoxes > 0 ? { aL: compAL, aW: compAW, ori: compOri, boxes: compBoxes, ox: usedL, oy: 0 } : null, split: 'L', priIdx: forcePriIdx };
    }

    // Divisão ao longo da LARGURA
    const maxCW = Math.floor(palW / pri.w);
    for (let n = maxCW; n >= 1; n--) {
        const mainAW = n, mainAL = Math.floor(palL / pri.l), mainBoxes = mainAL * mainAW;
        const usedW = n * pri.w, remW = palW - usedW;
        let compBoxes = 0, compAL = 0, compAW = 0, compOri = null;
        if (remW > 0) {
            const c1L = Math.floor(palL / sec.l), c1W = Math.floor(remW / sec.w), c1 = c1L * c1W;
            const c2L = Math.floor(palL / sec.w), c2W = Math.floor(remW / sec.l), c2 = c2L * c2W;
            if (c1 >= c2 && c1 > 0) { compBoxes = c1; compAL = c1L; compAW = c1W; compOri = { l: sec.l, w: sec.w }; }
            else if (c2 > 0) { compBoxes = c2; compAL = c2L; compAW = c2W; compOri = { l: sec.w, w: sec.l }; }
        }
        const total = mainBoxes + compBoxes;
        if (total > best.total) best = { total, main: { aL: mainAL, aW: mainAW, ori: { l: pri.l, w: pri.w }, boxes: mainBoxes, ox: 0, oy: 0 }, comp: compBoxes > 0 ? { aL: compAL, aW: compAW, ori: compOri, boxes: compBoxes, ox: 0, oy: usedW } : null, split: 'W', priIdx: forcePriIdx };
    }
    return best;
}

/* ── Melhor padrão geral (ambas orientações) ────────────────── */
function calcLayer(boxC, boxL, palL, palW) {
    const a = calcLayerFixed(boxC, boxL, palL, palW, 0);
    const b = calcLayerFixed(boxC, boxL, palL, palW, 1);
    return a.total >= b.total ? a : b;
}

/* ── Padrão offset para caixas quadradas ────────────────────── */
function calcOffsetPattern(base, boxC, boxL, palL, palW) {
    const offsetL = Math.min(boxC, boxL) / 2;
    const m = base.main;
    const newOxL = m.ox + offsetL;
    const newAL = Math.floor((palL - newOxL) / m.ori.l);
    if (newAL <= 0) return null;
    let totalBoxes = newAL * m.aW;
    const offsetMain = { aL: newAL, aW: m.aW, ori: { ...m.ori }, boxes: newAL * m.aW, ox: newOxL, oy: m.oy };
    let offsetComp = null;
    // Preencher lacuna no início com orientação alternativa
    if (newOxL > 0) {
        const secOri = { l: m.ori.w, w: m.ori.l };
        const gapI = Math.floor(newOxL / secOri.l);
        const gapJ = Math.floor(palW / secOri.w);
        if (gapI > 0 && gapJ > 0) {
            offsetComp = { aL: gapI, aW: gapJ, ori: secOri, boxes: gapI * gapJ, ox: 0, oy: 0 };
            totalBoxes += gapI * gapJ;
        }
    }
    return { total: totalBoxes, main: offsetMain, comp: offsetComp, split: 'L', priIdx: base.priIdx };
}

/* ── Cálculo de Intertravamento ─────────────────────────────── */
function calcInterlocking(patA, patB, palL, palW) {
    // Juntas verticais (eixo X) do padrão A
    const seamsA = [], seamsAZ = [];
    function addSeams(block, arr, arrZ) {
        if (!block) return;
        for (let i = 1; i < block.aL; i++) arr.push(block.ox + i * block.ori.l);
        for (let j = 1; j < block.aW; j++) arrZ.push(block.oy + j * block.ori.w);
    }
    addSeams(patA.main, seamsA, seamsAZ);
    addSeams(patA.comp, seamsA, seamsAZ);

    // Ranges das caixas do padrão B
    const rangesBX = [], rangesBZ = [];
    function addRanges(block, rx, rz) {
        if (!block) return;
        for (let i = 0; i < block.aL; i++) rx.push([block.ox + i * block.ori.l, block.ox + (i + 1) * block.ori.l]);
        for (let j = 0; j < block.aW; j++) rz.push([block.oy + j * block.ori.w, block.oy + (j + 1) * block.ori.w]);
    }
    addRanges(patB.main, rangesBX, rangesBZ);
    addRanges(patB.comp, rangesBX, rangesBZ);

    function covered(seams, ranges) {
        if (seams.length === 0) return 100;
        let c = 0;
        for (const s of seams) { for (const [a, b] of ranges) { if (s > a + 0.01 && s < b - 0.01) { c++; break; } } }
        return (c / seams.length) * 100;
    }
    const covX = covered(seamsA, rangesBX);
    const covZ = covered(seamsAZ, rangesBZ);
    return seamsA.length + seamsAZ.length > 0 ? (covX * seamsA.length + covZ * seamsAZ.length) / (seamsA.length + seamsAZ.length) : 100;
}

/* ── Classificação da Amarração ─────────────────────────────── */
function classifyAmarracao(interlockingPct, samePattern, isOffset) {
    if (samePattern && !isOffset) return { label: 'Sem amarração', cls: 'ruim' };
    if (isOffset && interlockingPct < 50) return { label: 'Amarração simples', cls: 'regular' };
    if (interlockingPct >= 85) return { label: 'Intertravamento completo', cls: 'excelente' };
    if (interlockingPct >= 60) return { label: 'Intertravamento parcial', cls: 'bom' };
    return { label: 'Amarração cruzada', cls: 'regular' };
}

/* ── Classificação da Estabilidade ──────────────────────────── */
function classifyEstab(score) {
    if (score >= 90) return { label: 'Excelente', cls: 'excelente' };
    if (score >= 75) return { label: 'Muito Boa', cls: 'bom' };
    if (score >= 60) return { label: 'Boa', cls: 'bom' };
    if (score >= 40) return { label: 'Regular', cls: 'regular' };
    return { label: 'Baixa', cls: 'ruim' };
}

/* ── Cálculo Principal ──────────────────────────────────────── */
function calcularPaletizacao(event) {
    event.preventDefault(); hideErr('err-pal');
    const bC = val('pc-c'), bL = val('pc-l'), bA = val('pc-a');
    const altMax = val('p-alt-max'), peso = valO('p-peso'), capPeso = valO('p-cap');
    if (!bC || !bL || !bA || !altMax) { showErr('err-pal', 'Preencha as dimensões da caixa e a altura máxima.'); return; }
    showLoading();

    setTimeout(() => {
        // Padrão A = melhor geral
        const patternA = calcLayer(bC, bL, PBR_L, PBR_W);
        if (patternA.total === 0) { hideLoading(); showErr('err-pal', 'A caixa não cabe na base do pallet.'); document.getElementById('res-pal').classList.add('hidden'); document.getElementById('empty-pal').classList.remove('hidden'); return; }

        const numCam = Math.floor(altMax / bA);
        if (numCam === 0) { hideLoading(); showErr('err-pal', 'A altura da caixa excede a altura máxima.'); return; }

        // Padrão B = orientação alternativa
        const altPriIdx = 1 - patternA.priIdx;
        let patternB = calcLayerFixed(bC, bL, PBR_L, PBR_W, altPriIdx);
        let isOffset = false;
        let samePattern = false;

        // Verificar se padrões são idênticos (caixa quadrada ou mesmo resultado)
        if (patternB.total === patternA.total && patternsEqual(patternA, patternB)) {
            // Tentar offset
            const offsetPat = calcOffsetPattern(patternA, bC, bL, PBR_L, PBR_W);
            if (offsetPat && offsetPat.total > 0) {
                patternB = offsetPat;
                isOffset = true;
            } else {
                patternB = patternA; // Sem alternativa
                samePattern = true;
            }
        }

        // Caixas por camada (diferente se amarração)
        const cxA = patternA.total;
        const cxB = patternB.total;
        const layersA = Math.ceil(numCam / 2);   // camadas ímpares
        const layersB = Math.floor(numCam / 2);   // camadas pares
        const totalCx = layersA * cxA + layersB * cxB;
        const altTotal = numCam * bA + PBR_H;

        // Cobertura média
        let areaA = patternA.main.aL * patternA.main.ori.l * patternA.main.aW * patternA.main.ori.w;
        if (patternA.comp) areaA += patternA.comp.aL * patternA.comp.ori.l * patternA.comp.aW * patternA.comp.ori.w;
        let areaB = patternB.main.aL * patternB.main.ori.l * patternB.main.aW * patternB.main.ori.w;
        if (patternB.comp) areaB += patternB.comp.aL * patternB.comp.ori.l * patternB.comp.aW * patternB.comp.ori.w;
        const cobA = (areaA / (PBR_L * PBR_W)) * 100;
        const cobB = (areaB / (PBR_L * PBR_W)) * 100;
        const cobertura = (cobA * layersA + cobB * layersB) / numCam;

        // Eficiência volumétrica
        const volCx = bC * bL * bA;
        const volOcup = totalCx * volCx;
        const volDisp = PBR_L * PBR_W * (numCam * bA);
        const eficiencia = volDisp > 0 ? (volOcup / volDisp) * 100 : 0;

        // Peso
        const pesoTotal = peso !== null ? peso * totalCx : null;
        const pesoOk = pesoTotal === null || capPeso === null || pesoTotal <= capPeso;

        // Intertravamento
        const interlockingPct = samePattern ? 0 : calcInterlocking(patternA, patternB, PBR_L, PBR_W);
        const amarracao = classifyAmarracao(interlockingPct, samePattern, isOffset);

        // Estabilidade
        const minSide = Math.min(PBR_L, PBR_W);
        const stabRatio = altTotal / minSide;
        const heightPenalty = stabRatio > 1.5 ? (stabRatio - 1.5) * 12 : 0;
        const weightScore = pesoOk ? 100 : 60;
        const estabilidade = Math.max(0, Math.min(100,
            interlockingPct * 0.45 +
            cobertura * 0.25 +
            Math.max(0, 100 - heightPenalty) * 0.20 +
            weightScore * 0.10
        ));
        const estabClass = classifyEstab(estabilidade);

        // Pontuação final (cobertura + estabilidade + altura + peso + amarração)
        const pontuacao = Math.max(0, Math.min(100,
            cobertura * 0.25 +
            estabilidade * 0.35 +
            Math.max(0, 100 - heightPenalty) * 0.20 +
            (pesoOk ? 100 : 50) * 0.10 +
            interlockingPct * 0.10
        ));

        let classif, classCls;
        if (pontuacao >= 90) { classif = 'Excelente'; classCls = 'excelente'; }
        else if (pontuacao >= 75) { classif = 'Bom'; classCls = 'bom'; }
        else if (pontuacao >= 60) { classif = 'Regular'; classCls = 'regular'; }
        else { classif = 'Ruim'; classCls = 'ruim'; }

        const aprovado = pontuacao >= 75 && pesoOk;

        palletData = {
            patternA, patternB, numCam, totalCx, altTotal,
            bC, bL, bA, altMax,
            cxA, cxB, cobertura, cobA, cobB,
            eficiencia, volOcup,
            pesoTotal, capPeso, pesoOk,
            pontuacao, classif, classCls, aprovado,
            amarracao, interlockingPct, isOffset, samePattern,
            estabilidade, estabClass
        };

        currentLayer = 1; isoRotation = 0;
        renderPalResult(palletData);
        hideLoading();
    }, 400);
}

/* ── Verificar se padrões são iguais ────────────────────────── */
function patternsEqual(a, b) {
    if (a.total !== b.total) return false;
    if (a.priIdx !== b.priIdx) return false;
    const ma = a.main, mb = b.main;
    if (ma.aL !== mb.aL || ma.aW !== mb.aW) return false;
    if (Math.abs(ma.ori.l - mb.ori.l) > 0.01 || Math.abs(ma.ori.w - mb.ori.w) > 0.01) return false;
    return true;
}

/* ── Renderizar Resultados ──────────────────────────────────── */
function renderPalResult(d) {
    document.getElementById('empty-pal').classList.add('hidden');
    document.getElementById('res-pal').classList.remove('hidden');

    document.getElementById('r-pal-total').textContent = fmtInt(d.totalCx);
    document.getElementById('r-pal-cxcl').textContent = d.cxA === d.cxB ? fmtInt(d.cxA) : (fmtInt(d.cxA) + '/' + fmtInt(d.cxB));
    document.getElementById('r-pal-cam').textContent = fmtInt(d.numCam);
    document.getElementById('r-pal-alt').textContent = fmtDim(d.altTotal) + ' cm';
    document.getElementById('r-pal-cob').textContent = fmtPct(d.cobertura);
    document.getElementById('r-pal-efic').textContent = fmtPct(d.eficiencia);
    document.getElementById('r-pal-vol').textContent = fmtVol(d.volOcup);

    // Peso
    const cardPeso = document.getElementById('card-pal-peso');
    if (d.pesoTotal !== null) { cardPeso.classList.remove('hidden'); const el = document.getElementById('r-pal-peso'); el.textContent = fmtNum(d.pesoTotal, 1) + ' kg'; el.style.color = d.pesoOk ? 'var(--green)' : 'var(--red)'; }
    else { cardPeso.classList.add('hidden'); }

    // Cobertura cor
    document.getElementById('r-pal-cob').style.color = d.cobertura >= 85 ? 'var(--green)' : d.cobertura >= 60 ? 'var(--orange)' : 'var(--red)';

    // Amarração
    const amarEl = document.getElementById('r-pal-amar');
    amarEl.textContent = d.amarracao.label;
    amarEl.style.fontSize = '0.82rem';
    const amarColors = { excelente: 'var(--green)', bom: 'var(--blue)', regular: 'var(--yellow)', ruim: 'var(--red)' };
    amarEl.style.color = amarColors[d.amarracao.cls] || 'var(--text)';

    // Estabilidade
    const estabEl = document.getElementById('r-pal-estab');
    estabEl.textContent = fmtPct(d.estabilidade);
    estabEl.style.color = d.estabilidade >= 75 ? 'var(--green)' : d.estabilidade >= 50 ? 'var(--yellow)' : 'var(--red)';
    const estabBar = document.getElementById('r-pal-estab-bar');
    estabBar.style.width = Math.min(d.estabilidade, 100) + '%';
    estabBar.className = 'card-bar-fill' + (d.estabilidade >= 75 ? '' : d.estabilidade >= 50 ? ' warn' : ' bad');
    const estabClassEl = document.getElementById('r-pal-estab-class');
    estabClassEl.textContent = d.estabClass.label;
    estabClassEl.style.color = amarColors[d.estabClass.cls] || 'var(--text3)';

    // Qualidade geral
    const scoreEl = document.getElementById('r-pal-score');
    scoreEl.textContent = fmtPct(d.pontuacao);
    scoreEl.style.color = d.pontuacao >= 75 ? 'var(--green)' : d.pontuacao >= 60 ? 'var(--yellow)' : 'var(--red)';
    document.getElementById('r-pal-class').textContent = d.classif;
    document.getElementById('r-pal-class').className = 'quality-badge ' + d.classCls;
    document.getElementById('r-pal-seal').textContent = d.aprovado ? '✓ Aprovado' : '✗ Reprovado';
    document.getElementById('r-pal-seal').className = 'quality-seal ' + (d.aprovado ? 'aprovado' : 'reprovado');

    const bar = document.getElementById('r-pal-bar'), pct = document.getElementById('r-pal-bar-pct');
    bar.style.width = Math.min(d.cobertura, 100) + '%'; pct.textContent = fmtPct(d.cobertura);
    bar.className = 'bar-fill' + (d.cobertura >= 85 ? ' good' : d.cobertura >= 50 ? '' : ' bad');

    // Vistas
    currentViz = 'topo';
    document.querySelectorAll('[data-viz]').forEach(b => b.classList.toggle('active', b.dataset.viz === 'topo'));
    document.getElementById('viz-topo').classList.remove('hidden');
    document.getElementById('viz-iso').classList.add('hidden');
    document.getElementById('layer-nav').classList.remove('hidden');
    document.getElementById('btn-rotate').classList.add('hidden');
    updateLayerNav();
    renderPalTopo(d, currentLayer);
    renderPalIso(d);
}

/* ── Navegação de Camadas ───────────────────────────────────── */
function updateLayerNav() {
    if (!palletData) return;
    const isA = (currentLayer - 1) % 2 === 0;
    const tipo = isA ? 'A' : 'B';
    document.getElementById('layer-label').textContent = `Camada ${currentLayer}/${palletData.numCam} (${tipo})`;
    document.getElementById('btn-lprev').disabled = currentLayer <= 1;
    document.getElementById('btn-lnext').disabled = currentLayer >= palletData.numCam;
}
function changeLayer(delta) {
    if (!palletData) return;
    currentLayer = Math.max(1, Math.min(palletData.numCam, currentLayer + delta));
    updateLayerNav();
    renderPalTopo(palletData, currentLayer);
}
function toggleRotation() { isoRotation = isoRotation === 0 ? 90 : 0; if (palletData) renderPalIso(palletData); }
function switchViz(v) {
    currentViz = v;
    document.querySelectorAll('[data-viz]').forEach(b => b.classList.toggle('active', b.dataset.viz === v));
    document.getElementById('viz-topo').classList.toggle('hidden', v !== 'topo');
    document.getElementById('viz-iso').classList.toggle('hidden', v !== 'iso');
    document.getElementById('layer-nav').classList.toggle('hidden', v !== 'topo');
    document.getElementById('btn-rotate').classList.toggle('hidden', v !== 'iso' || !palletData);
}

/* ── Obter padrão da camada ─────────────────────────────────── */
function getLayerPattern(d, layer) {
    return (layer - 1) % 2 === 0 ? d.patternA : d.patternB;
}

/* ── SVG Pallet — Vista Superior (com padrão alternado) ─────── */
function renderPalTopo(d, layer) {
    const c = document.getElementById('svg-pal-topo');
    const pat = getLayerPattern(d, layer);
    const isA = (layer - 1) % 2 === 0;
    const pad = 14, maxW = 700;
    const sc = Math.min((maxW - 2 * pad) / PBR_L, (480 - 2 * pad) / PBR_W);
    const w = PBR_L * sc + 2 * pad, h = PBR_W * sc + 2 * pad;

    let s = `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">`;
    s += `<defs><marker id="ah2" markerWidth="5" markerHeight="3.5" refX="4" refY="1.75" orient="auto"><path d="M0,0 L5,1.75 L0,3.5" fill="#5a6478"/></marker></defs>`;
    s += `<rect x="${pad}" y="${pad}" width="${PBR_L*sc}" height="${PBR_W*sc}" fill="#0d1117" rx="3"/>`;
    s += `<line x1="${pad+PBR_L*sc/2}" y1="${pad}" x2="${pad+PBR_L*sc/2}" y2="${pad+PBR_W*sc}" stroke="#1a2230" stroke-width=".5" stroke-dasharray="4 4"/>`;
    s += `<line x1="${pad}" y1="${pad+PBR_W*sc/2}" x2="${pad+PBR_L*sc}" y2="${pad+PBR_W*sc/2}" stroke="#1a2230" stroke-width=".5" stroke-dasharray="4 4"/>`;

    let num = 0;
    const m = pat.main;
    for (let i = 0; i < m.aL; i++) {
        for (let j = 0; j < m.aW; j++) {
            num++;
            const x = pad + (m.ox + i * m.ori.l) * sc, y = pad + (m.oy + j * m.ori.w) * sc;
            const bw = m.ori.l * sc, bh = m.ori.w * sc;
            s += `<rect x="${x+.5}" y="${y+.5}" width="${bw-1}" height="${bh-1}" rx="2" class="box-main"/>`;
            if (bw > 18 && bh > 14) { const fs = Math.min(8, bw/4, bh/3); s += `<text x="${x+bw/2}" y="${y+bh/2}" class="box-num" style="font-size:${fs}px">${num}</text>`; }
            if (bw > 28 && bh > 20) { const cx=x+bw/2,cy=y+bh/2,al=Math.min(bw,bh)*.22; s+=`<line x1="${cx-al}" y1="${cy+bh*.22}" x2="${cx+al}" y2="${cy+bh*.22}" class="arrow-line" marker-end="url(#ah2)"/>`; }
        }
    }
    if (pat.comp) {
        const cp = pat.comp;
        for (let i = 0; i < cp.aL; i++) {
            for (let j = 0; j < cp.aW; j++) {
                num++;
                const x = pad + (cp.ox + i * cp.ori.l) * sc, y = pad + (cp.oy + j * cp.ori.w) * sc;
                const bw = cp.ori.l * sc, bh = cp.ori.w * sc;
                s += `<rect x="${x+.5}" y="${y+.5}" width="${bw-1}" height="${bh-1}" rx="2" class="box-comp"/>`;
                if (bw > 18 && bh > 14) { const fs = Math.min(8, bw/4, bh/3); s += `<text x="${x+bw/2}" y="${y+bh/2}" class="box-num" style="font-size:${fs}px;fill:rgba(255,255,255,.85)">${num}</text>`; }
                if (bw > 28 && bh > 20) { const cx=x+bw/2,cy=y+bh/2,al=Math.min(bw,bh)*.22; s+=`<line x1="${cx-al}" y1="${cy+bh*.22}" x2="${cx+al}" y2="${cy+bh*.22}" class="arrow-line" marker-end="url(#ah2)"/>`; }
            }
        }
    }

    s += `<rect x="${pad}" y="${pad}" width="${PBR_L*sc}" height="${PBR_W*sc}" class="border-pallet" rx="3"/>`;
    s += `<text x="${pad+PBR_L*sc/2}" y="${h-2}" class="axis-label" style="font-size:9px">120 cm (C)</text>`;
    s += `<text x="5" y="${pad+PBR_W*sc/2}" class="axis-label" style="font-size:9px" transform="rotate(-90,5,${pad+PBR_W*sc/2})">100 cm (L)</text>`;

    // Legenda com indicador de camada
    const lx = pad + PBR_L*sc - 6, ly = pad + 8;
    s += `<rect x="${lx-72}" y="${ly}" width="8" height="8" rx="1" fill="#FF6A2B" fill-opacity=".55"/>`;
    s += `<text x="${lx-60}" y="${ly+7}" style="font-family:'JetBrains Mono',monospace;font-size:7px;fill:#8892a6">Principal</text>`;
    if (pat.comp) {
        s += `<rect x="${lx-72}" y="${ly+12}" width="8" height="8" rx="1" fill="#3E8EFF" fill-opacity=".55"/>`;
        s += `<text x="${lx-60}" y="${ly+19}" style="font-family:'JetBrains Mono',monospace;font-size:7px;fill:#8892a6">Complementar</text>`;
    }
    // Indicador de padrão
    s += `<text x="${pad+4}" y="${pad+12}" style="font-family:'JetBrains Mono',monospace;font-size:7px;fill:${isA?'#FF6A2B':'#3E8EFF'}">Padrão ${isA?'A':'B'} | ${pat.total} cx</text>`;

    s += '</svg>';
    c.innerHTML = s;
}

/* ── SVG Pallet — Vista Isométrica com caixas individuais ────── */
function isoP(x,y,z,sc,ox,oy,rot) {
    if (rot===0) return{sx:ox+(x-z)*.866*sc,sy:oy+(x+z)*.5*sc-y*sc};
    return{sx:ox+(z-x)*.866*sc,sy:oy+(x+z)*.5*sc-y*sc};
}

function renderPalIso(d) {
    const c = document.getElementById('svg-pal-iso');
    const sc = 1.1, ox = 280, oy = 400, rot = isoRotation;
    const totalH = d.altTotal;
    function P(x,y,z) { return isoP(x,y,z,sc,ox,oy,rot); }

    const pts=[isoP(0,totalH,0,sc,ox,oy,rot),isoP(PBR_L,0,0,sc,ox,oy,rot),isoP(0,0,PBR_W,sc,ox,oy,rot),isoP(PBR_L,0,PBR_W,sc,ox,oy,rot),isoP(-5,0,-5,sc,ox,oy,rot),isoP(PBR_L+5,0,PBR_W+5,sc,ox,oy,rot),isoP(PBR_L+30,0,0,sc,ox,oy,rot)];
    const xs=pts.map(p=>p.sx),ys=pts.map(p=>p.sy);
    const minX=Math.min(...xs)-30,maxX=Math.max(...xs)+80,minY=Math.min(...ys)-20,maxY=Math.max(...ys)+30;

    let s = `<svg viewBox="${minX} ${minY} ${maxX-minX} ${maxY-minY}" xmlns="http://www.w3.org/2000/svg">`;
    s += `<defs>
        <linearGradient id="wood1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#A07818"/><stop offset="100%" stop-color="#6B4F10"/></linearGradient>
        <linearGradient id="wood2" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#8B6914"/><stop offset="100%" stop-color="#5A4210"/></linearGradient>
        <linearGradient id="wood3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#B8891C"/><stop offset="100%" stop-color="#8B6914"/></linearGradient>
    </defs>`;

    // Sombra
    const f0=P(-5,0,-5),f1=P(PBR_L+5,0,-5),f2=P(PBR_L+5,0,PBR_W+5),f3=P(-5,0,PBR_W+5);
    s+=`<polygon points="${f0.sx},${f0.sy} ${f1.sx},${f1.sy} ${f2.sx},${f2.sy} ${f3.sx},${f3.sy}" fill="#080b10" opacity=".5"/>`;

    function drawBox(px,py,pz,bw,bh,bd,topC,frontC,sideC,strokeC) {
        const p0=P(px,py,pz),p1=P(px+bw,py,pz),p2=P(px+bw,py+bh,pz),p3=P(px,py+bh,pz),p4=P(px,py,pz+bd),p5=P(px+bw,py,pz+bd),p6=P(px+bw,py+bh,pz+bd),p7=P(px,py+bh,pz+bd);
        s+=`<polygon points="${p4.sx},${p4.sy} ${p5.sx},${p5.sy} ${p6.sx},${p6.sy} ${p7.sx},${p7.sy}" fill="${frontC}" stroke="${strokeC}" stroke-width=".5"/>`;
        s+=`<polygon points="${p1.sx},${p1.sy} ${p5.sx},${p5.sy} ${p6.sx},${p6.sy} ${p2.sx},${p2.sy}" fill="${sideC}" stroke="${strokeC}" stroke-width=".5"/>`;
        s+=`<polygon points="${p3.sx},${p3.sy} ${p2.sx},${p2.sy} ${p6.sx},${p6.sy} ${p7.sx},${p7.sy}" fill="${topC}" stroke="${strokeC}" stroke-width=".5"/>`;
    }

    // Pallet de madeira
    drawBox(0,0,0,PBR_L,PBR_H,PBR_W,'url(#wood3)','url(#wood1)','url(#wood2)','#4A3610');
    const boardH=2,nBoards=5,gap=PBR_W/nBoards;
    for(let i=0;i<nBoards;i++){const bz=i*gap+3;drawBox(2,PBR_H-boardH,bz,PBR_L-4,boardH,gap-6,'#B8891C','#8B6914','#7A5C12','#5A4210');}
    drawBox(8,2,8,14,PBR_H-boardH-2,14,'#7A5C12','#6B4F10','#5A4210','#4A3610');
    drawBox(PBR_L-22,2,8,14,PBR_H-boardH-2,14,'#7A5C12','#6B4F10','#5A4210','#4A3610');
    drawBox(8,2,PBR_W-22,14,PBR_H-boardH-2,14,'#7A5C12','#6B4F10','#5A4210','#4A3610');
    drawBox(PBR_L-22,2,PBR_W-22,14,PBR_H-boardH-2,14,'#7A5C12','#6B4F10','#5A4210','#4A3610');

    // Caixas por camada com amarração A/B
    const layerColors = [
        { top:'rgba(255,106,43,0.72)',front:'rgba(255,106,43,0.52)',side:'rgba(255,106,43,0.40)',stroke:'#FF6A2B' },
        { top:'rgba(62,142,255,0.72)',front:'rgba(62,142,255,0.52)',side:'rgba(62,142,255,0.40)',stroke:'#3E8EFF' }
    ];

    const bA = d.bA;
    const gap2 = 0.4; // pequeno gap visual entre caixas

    for (let c = 0; c < d.numCam; c++) {
        const yBase = PBR_H + c * bA;
        const pat = getLayerPattern(d, c + 1);
        const col = layerColors[c % 2];

        // Desenhar cada caixa individual com gap
        const m = pat.main;
        for (let i = 0; i < m.aL; i++) {
            for (let j = 0; j < m.aW; j++) {
                const bx = m.ox + i * m.ori.l + gap2;
                const bz = m.oy + j * m.ori.w + gap2;
                const bl = m.ori.l - gap2 * 2;
                const bw = m.ori.w - gap2 * 2;
                const bh = bA - gap2;
                drawBox(bx, yBase + gap2, bz, bl, bh, bw, col.top, col.front, col.side, col.stroke);
            }
        }
        if (pat.comp) {
            const cp = pat.comp;
            for (let i = 0; i < cp.aL; i++) {
                for (let j = 0; j < cp.aW; j++) {
                    const bx = cp.ox + i * cp.ori.l + gap2;
                    const bz = cp.oy + j * cp.ori.w + gap2;
                    const bl = cp.ori.l - gap2 * 2;
                    const bw = cp.ori.w - gap2 * 2;
                    const bh = bA - gap2;
                    drawBox(bx, yBase + gap2, bz, bl, bh, bw, col.top, col.front, col.side, col.stroke);
                }
            }
        }
    }

    // Seta de altura
    if (d.numCam > 0) {
        const ax = PBR_L + 18;
        const ab=P(ax,0,0),at=P(ax,totalH,0);
        s+=`<line x1="${ab.sx}" y1="${ab.sy}" x2="${at.sx}" y2="${at.sy}" stroke="#5a6478" stroke-width="1" stroke-dasharray="3 3"/>`;
        s+=`<polygon points="${at.sx},${at.sy} ${at.sx-3},${at.sy+6} ${at.sx+3},${at.sy+6}" fill="#5a6478"/>`;
        const am=P(ax,totalH/2,0);
        s+=`<text x="${am.sx+10}" y="${am.sy}" fill="#8892a6" font-size="10" font-family="'JetBrains Mono',monospace" dominant-baseline="middle">${fmtDim(d.altTotal)} cm</text>`;
    }

    // Rótulo
    const rp=P(PBR_L/2,-6,PBR_W+12);
    s+=`<text x="${rp.sx}" y="${rp.sy}" fill="#5a6478" font-size="8" font-family="'JetBrains Mono',monospace" text-anchor="middle">PBR 100×120 | ${fmtInt(d.numCam)} cam | ${fmtInt(d.totalCx)} cx | ${d.amarracao.label}</text>`;

    s += '</svg>';
    c.innerHTML = s;
}

/* ── Inicialização ──────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => { switchTab('endereco'); });
