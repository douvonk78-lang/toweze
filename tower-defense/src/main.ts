import Phaser from 'phaser';
import { GameScene, type GameState } from './game/GameScene';
import { LEVELS, TOWERS, TOWER_KINDS, type TowerKind } from './core/config';
import { loadProgress, recordVictory, saveProgress } from './core/progression';
import './style.css';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div class="app-shell">
    <header class="topbar">
      <div class="brand"><span class="brand-mark">B<span class="brand-mark-cut">/</span>R</span><span class="brand-copy"><strong>BASTION <em>ROUTE</em></strong><small>TACTICAL DEFENSE SYSTEM</small></span></div>
      <div class="topbar-center"><span class="live-dot"></span><span id="sector-label">SECTEUR 01 / AVANT-POSTE</span></div>
      <div class="topbar-actions"><button class="icon-button" data-action="sound" id="sound-button" aria-label="Activer ou désactiver le son" title="Son">♪</button><button class="icon-button" data-action="pause" aria-label="Mettre en pause" title="Pause">Ⅱ</button><button class="icon-button menu-button" data-action="menu" aria-label="Retour au menu" title="Menu">☰</button></div>
    </header>
    <main class="battle-layout">
      <section class="field-column" aria-label="Champ de bataille">
        <div class="field-header"><div><span class="eyebrow">OPÉRATION EN COURS</span><h1 id="level-name">Ligne de rupture</h1></div><div class="field-id">BR—<span id="level-number">01</span> <span class="field-slash">/</span> 03</div></div>
        <div class="board-frame"><div class="board-corner corner-tl"></div><div class="board-corner corner-tr"></div><div class="board-corner corner-bl"></div><div class="board-corner corner-br"></div><div id="game-canvas"></div><div id="toast" class="toast" role="status" aria-live="polite"></div></div>
        <div class="field-footer"><span><span class="indicator"></span> GRILLE TACTIQUE <b>10 × 7</b></span><span>TOUCHER UNE CASE POUR CONSTRUIRE <span class="footer-cross">✳</span></span></div>
      </section>
      <aside class="command-panel" aria-label="Centre de commandement">
        <div class="panel-heading"><span class="eyebrow">01 / SITUATION</span><span class="signal">● SIGNAL ACTIF</span></div>
        <div class="stats-grid"><div class="stat stat-life"><span class="stat-icon">♥</span><span class="stat-label">INTÉGRITÉ</span><strong id="lives">20</strong><small>VIES RESTANTES</small></div><div class="stat stat-coins"><span class="stat-icon">◈</span><span class="stat-label">RESSOURCES</span><strong id="coins">230</strong><small>PIÈCES DISPONIBLES</small></div></div>
        <div class="wave-strip"><div><span class="eyebrow">VAGUE ACTUELLE</span><strong><span id="wave">00</span><span class="wave-total"> / <span id="waves-total">06</span></span></strong></div><div class="wave-orbit">◎</div><div class="wave-pips" id="wave-pips"></div></div>
        <div class="panel-heading build-heading"><span class="eyebrow">02 / CONSTRUCTION</span><span class="hint">CHOISIR UNE TOUR ↓</span></div>
        <div class="tower-list" id="tower-list">${TOWER_KINDS.map(kind => { const t = TOWERS[kind]; return `<button class="tower-card" data-action="tower" data-kind="${kind}" aria-label="Construire ${t.name}, ${t.cost} pièces"><span class="tower-icon tower-${kind}">${t.icon}</span><span class="tower-detail"><strong>${t.name}</strong><small>${t.subtitle}</small></span><span class="tower-price">${t.cost}<span> ◈</span></span></button>`; }).join('')}</div>
        <div class="selection-panel" id="selection-panel"><div class="selection-idle"><span class="selection-crosshair">⌖</span><div><strong>Zone de construction</strong><small>Choisissez une tour, puis touchez une case libre sur la carte.</small></div></div></div>
        <div class="panel-bottom"><div class="score-row"><span>SCORE DE MISSION</span><strong id="score">000000</strong></div><button class="launch-button" id="launch-button" data-action="wave"><span class="launch-symbol">➜</span><span class="launch-copy"><strong>LANCER LA VAGUE</strong><small id="wave-description">Déployez vos défenses</small></span><span class="launch-index" id="launch-index">01</span></button><div class="speed-row"><span>VITESSE DU JEU</span><button data-action="speed" id="speed-button" aria-label="Changer la vitesse">1× <span>⇄</span></button></div></div>
      </aside>
    </main>
    <footer class="app-footer"><span>BASTION ROUTE <span class="dim">/</span> PROTOCOLE DE DÉFENSE</span><span>FAIT POUR TENIR LA LIGNE <span class="footer-cross">✳</span></span></footer>
  </div>
  <div id="overlay" class="overlay"></div>
`;

let progress = loadProgress();
let current: GameState | null = null;
let overlayMode: 'menu' | 'pause' | 'result' | 'none' = 'menu';
let toastTimer = 0;
const $ = <T extends HTMLElement = HTMLElement>(selector: string): T => document.querySelector<T>(selector)!;
const scene = new GameScene({
  onState: state => { current = state; renderState(state); },
  onEnd: (victory, score, id) => {
    if (victory) { progress = recordVictory(progress, id, score); saveProgress(progress); }
    overlayMode = 'result'; showResult(victory, score, id);
  },
  onNotice: message => { const toast = $('#toast'); toast.textContent = message; toast.classList.add('visible'); window.clearTimeout(toastTimer); toastTimer = window.setTimeout(() => toast.classList.remove('visible'), 2300); }
});
new Phaser.Game({ type: Phaser.AUTO, parent: 'game-canvas', width: 800, height: 560, backgroundColor: '#0d2027', transparent: false, antialias: true, render: { pixelArt: false }, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 800, height: 560 }, scene: [scene], audio: { noAudio: true } });
scene.setSound(progress.sound);

function renderState(s: GameState) {
  $('#sector-label').textContent = s.level.sector;
  $('#level-name').textContent = s.level.name;
  $('#level-number').textContent = String(s.level.id).padStart(2, '0');
  $('#lives').textContent = String(s.lives).padStart(2, '0');
  $('#coins').textContent = String(s.coins);
  $('#score').textContent = String(s.score).padStart(6, '0');
  $('#wave').textContent = String(s.wave).padStart(2, '0');
  $('#waves-total').textContent = String(s.level.waves).padStart(2, '0');
  $('#wave-pips').innerHTML = Array.from({ length: s.level.waves }, (_, i) => `<span class="${i < s.wave ? 'done' : ''} ${i === s.wave - 1 && s.enemiesRemaining ? 'current' : ''}"></span>`).join('');
  $('#speed-button').innerHTML = `${s.speed}× <span>⇄</span>`;
  $('#sound-button').textContent = progress.sound ? '♪' : '♪̸';
  $('#sound-button').classList.toggle('muted', !progress.sound);
  for (const kind of TOWER_KINDS) {
    const card = $<HTMLButtonElement>(`.tower-card[data-kind="${kind}"]`);
    card.classList.toggle('chosen', s.placing === kind);
    card.classList.toggle('unaffordable', s.coins < TOWERS[kind].cost);
    card.setAttribute('aria-pressed', String(s.placing === kind));
  }
  const launch = $<HTMLButtonElement>('#launch-button');
  const canLaunch = s.active && !s.paused && !s.ended && !s.enemiesRemaining && s.wave < s.level.waves;
  launch.disabled = !canLaunch;
  $('#launch-index').textContent = String(Math.min(s.wave + 1, s.level.waves)).padStart(2, '0');
  $('#wave-description').textContent = s.enemiesRemaining ? `${s.enemiesRemaining} ennemi${s.enemiesRemaining > 1 ? 's' : ''} en approche` : s.wave >= s.level.waves ? 'Toutes les vagues terminées' : s.wave === 0 ? 'Déployez vos défenses' : 'Prêt pour la suite';
  const selection = s.selected ? selectionMarkup(s) : `<div class="selection-idle"><span class="selection-crosshair">⌖</span><div><strong>${s.placing ? `${TOWERS[s.placing].name} sélectionnée` : 'Zone de construction'}</strong><small>${s.placing ? 'Touchez une case libre pour construire. Retouchez la carte pour en placer plusieurs.' : 'Choisissez une tour, puis touchez une case libre sur la carte.'}</small></div></div>`;
  const panel = $('#selection-panel');
  if (panel.innerHTML !== selection) panel.innerHTML = selection;
}
function selectionMarkup(s: GameState) {
  const sel = s.selected!; const t = TOWERS[sel.kind];
  return `<div class="selected-top"><span class="tower-icon tower-${sel.kind}">${t.icon}</span><div><span class="eyebrow">TOUR SÉLECTIONNÉE</span><strong>${t.name} <small>NV. ${sel.tier}</small></strong></div></div><p>${t.description}</p><div class="selected-stats"><span>DÉGÂTS <b>${sel.damage}</b></span><span>PORTÉE <b>${sel.range}</b></span></div><div class="selected-actions"><button data-action="upgrade" ${sel.tier >= 3 || s.coins < sel.upgrade ? 'disabled' : ''}>${sel.tier >= 3 ? 'NIVEAU MAX' : `↑ AMÉLIORER <b>${sel.upgrade} ◈</b>`}</button><button data-action="sell">VENDRE <b>+${sel.sell} ◈</b></button></div>`;
}
function menuMarkup() {
  return `<div class="menu-screen"><div class="menu-ambient ambient-one"></div><div class="menu-ambient ambient-two"></div><div class="menu-inner"><div class="menu-top"><div class="menu-logo"><span class="brand-mark">B<span class="brand-mark-cut">/</span>R</span><span>BASTION <em>ROUTE</em></span></div><span class="menu-version">SYSTÈME DE DÉFENSE // V1.0</span></div><div class="menu-body"><div class="menu-hero"><div class="eyebrow hero-eyebrow"><span class="live-dot"></span> LE PROTOCOLE EST ACTIVÉ</div><h2>LA LIGNE<br><i>NE TOMBE</i><br>PAS.</h2><p>Trois secteurs. Des vagues sans répit. Une seule mission : défendre le réacteur jusqu'au dernier assaut.</p><div class="hero-line"><span>01 — 03</span><span>CHOISISSEZ VOTRE SECTEUR <span class="arrow">↘</span></span></div><div class="radar-art"><div class="radar-ring r1"></div><div class="radar-ring r2"></div><div class="radar-ring r3"></div><div class="radar-sweep"></div><div class="radar-core">✳</div><span class="radar-label">SIGNAL // 001</span></div></div><div class="mission-list"><div class="mission-heading"><span class="eyebrow">SÉLECTION DE MISSION</span><span>${String(progress.unlocked).padStart(2, '0')} / 03 DÉVERROUILLÉ${progress.unlocked > 1 ? 'S' : ''}</span></div>${LEVELS.map(level => { const locked = level.id > progress.unlocked; const score = progress.bestScores[level.id]; return `<button class="mission-card ${locked ? 'locked' : ''}" data-action="level" data-id="${level.id}" ${locked ? 'disabled' : ''}><div class="mission-no">0${level.id}</div><div class="mission-info"><span>${level.sector}</span><strong>${level.name}</strong><small>${level.description}</small><div class="mission-meta"><span>◉ ${level.waves} VAGUES</span><span>${score ? `★ RECORD ${score}` : locked ? '⌁ VERROUILLÉ' : '↗ NOUVELLE MISSION'}</span></div></div><div class="mission-arrow">${locked ? '⌑' : '↗'}</div></button>`; }).join('')}<div class="menu-tip"><span>✳</span> ASTUCE : placez des canons près des virages pour frapper plusieurs ennemis à la fois.</div></div></div><div class="menu-foot"><span>BASTION ROUTE / TOWER DEFENSE</span><span>LE DESTIN DU SECTEUR EST ENTRE VOS MAINS.</span></div></div></div>`;
}
function showMenu() { overlayMode = 'menu'; $('#overlay').innerHTML = menuMarkup(); $('#overlay').className = 'overlay menu-overlay'; }
function showPause() { overlayMode = 'pause'; $('#overlay').className = 'overlay modal-overlay'; $('#overlay').innerHTML = `<div class="modal-card"><span class="eyebrow">TRANSMISSION INTERROMPUE</span><div class="modal-symbol">Ⅱ</div><h2>EN PAUSE<span>.</span></h2><p>Votre ligne tient toujours. Reprenez quand vous êtes prêt.</p><button class="modal-primary" data-action="resume">▶ &nbsp; REPRENDRE LA MISSION</button><button class="modal-secondary" data-action="menu">RETOUR AUX MISSIONS</button></div>`; }
function showResult(victory: boolean, score: number, id: number) {
  const next = id < LEVELS.length;
  $('#overlay').className = 'overlay modal-overlay';
  $('#overlay').innerHTML = `<div class="modal-card ${victory ? 'victory' : 'defeat'}"><span class="eyebrow">${victory ? 'MISSION ACCOMPLIE / SECTEUR SÉCURISÉ' : 'LIGNE ROMPUE / MISSION ÉCHOUÉE'}</span><div class="modal-symbol">${victory ? '✳' : '×'}</div><h2>${victory ? 'VICTOIRE' : 'DÉFAITE'}<span>.</span></h2><p>${victory ? 'Le réacteur est intact. Vous avez tenu la ligne.' : 'La base est tombée. Réorganisez vos défenses et réessayez.'}</p><div class="result-score"><span>SCORE FINAL</span><strong>${String(score).padStart(6, '0')}</strong></div>${victory && next ? `<button class="modal-primary" data-action="next" data-id="${id + 1}">SECTEUR SUIVANT &nbsp; ↗</button>` : `<button class="modal-primary" data-action="retry">↻ &nbsp; REJOUER LE SECTEUR</button>`}<button class="modal-secondary" data-action="menu">RETOUR AUX MISSIONS</button></div>`;
}
function hideOverlay() { overlayMode = 'none'; $('#overlay').className = 'overlay hidden'; $('#overlay').innerHTML = ''; }
function startLevel(id: number) { scene.startLevel(id); hideOverlay(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
app.addEventListener('click', event => {
  const button = (event.target as HTMLElement).closest<HTMLElement>('[data-action]'); if (!button) return;
  const action = button.dataset.action;
  if (action === 'level' || action === 'next') startLevel(Number(button.dataset.id));
  else if (action === 'tower') scene.chooseTower(button.dataset.kind as TowerKind);
  else if (action === 'wave') scene.startWave();
  else if (action === 'upgrade') scene.upgrade();
  else if (action === 'sell') scene.sell();
  else if (action === 'speed') scene.toggleSpeed();
  else if (action === 'sound') { progress.sound = !progress.sound; saveProgress(progress); scene.setSound(progress.sound); if (current) renderState(current); }
  else if (action === 'pause') { if (overlayMode === 'none') { scene.togglePause(); showPause(); } else if (overlayMode === 'pause') { scene.togglePause(); hideOverlay(); } }
  else if (action === 'resume') { scene.togglePause(); hideOverlay(); }
  else if (action === 'retry') startLevel(current?.level.id ?? 1);
  else if (action === 'menu') { scene.returnToMenu(); showMenu(); }
});
// The overlay is outside #app; delegate on document for menus and dialogs too.
document.addEventListener('click', event => {
  const button = (event.target as HTMLElement).closest<HTMLElement>('#overlay [data-action]'); if (!button) return;
  const action = button.dataset.action;
  if (action === 'level' || action === 'next') startLevel(Number(button.dataset.id));
  else if (action === 'resume') { scene.togglePause(); hideOverlay(); }
  else if (action === 'retry') startLevel(current?.level.id ?? 1);
  else if (action === 'menu') { scene.returnToMenu(); showMenu(); }
});
document.addEventListener('keydown', event => { if (event.key === 'Escape') { if (overlayMode === 'none' && current?.active) { scene.togglePause(); showPause(); } else if (overlayMode === 'pause') { scene.togglePause(); hideOverlay(); } } });
showMenu();
