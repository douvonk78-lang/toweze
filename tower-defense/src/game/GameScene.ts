import Phaser from 'phaser';
import { COLS, ROWS, TILE, LEVELS, TOWERS, type Level, type TowerKind, type EnemyKind, tileCenter, isPath, towerStats, upgradeCost, sellValue, enemyStats, waveEnemies, waveBonus } from '../core/config';

type Tower = { x: number; y: number; kind: TowerKind; tier: number; cooldown: number; angle: number };
type Enemy = { x: number; y: number; kind: EnemyKind; hp: number; maxHp: number; speed: number; next: number; slow: number; dead: boolean; radius: number; color: number; bounty: number; damage: number; score: number };
type Bullet = { x: number; y: number; target: Enemy; kind: TowerKind; damage: number; speed: number; splash: number; slow: number; tx: number; ty: number };
type Effect = { x: number; y: number; radius: number; age: number; duration: number; color: number };
export type Selection = { kind: TowerKind; tier: number; upgrade: number; sell: number; damage: number; range: number } | null;
export interface GameState { level: Level; wave: number; coins: number; lives: number; score: number; active: boolean; paused: boolean; ended: boolean; speed: number; selected: Selection; placing: TowerKind | null; enemiesRemaining: number }
export type GameCallbacks = { onState: (state: GameState) => void; onEnd: (victory: boolean, score: number, levelId: number) => void; onNotice: (message: string) => void };

export class GameScene extends Phaser.Scene {
  private callbacks: GameCallbacks;
  private level: Level = LEVELS[0];
  private terrain!: Phaser.GameObjects.Graphics;
  private sprites!: Phaser.GameObjects.Graphics;
  private labels: Phaser.GameObjects.Text[] = [];
  private towers: Tower[] = [];
  private enemies: Enemy[] = [];
  private bullets: Bullet[] = [];
  private effects: Effect[] = [];
  private queue: EnemyKind[] = [];
  private spawnClock = 0;
  private wave = 0;
  private waveResolved = true;
  private coins = 0;
  private lives = 0;
  private score = 0;
  private active = false;
  private paused = false;
  private ended = false;
  private speed = 1;
  private placing: TowerKind | null = null;
  private selected: Tower | null = null;
  private hover: { x: number; y: number } | null = null;
  private elapsed = 0;
  private uiClock = 0;
  private audio: AudioContext | null = null;
  private soundEnabled = true;

  constructor(callbacks: GameCallbacks) { super('battle'); this.callbacks = callbacks; }
  create() {
    this.terrain = this.add.graphics();
    this.sprites = this.add.graphics();
    this.drawTerrain();
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => { this.hover = { x: Math.floor(pointer.x / TILE), y: Math.floor(pointer.y / TILE) }; });
    this.input.on('pointerout', () => { this.hover = null; });
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.handleTap(Math.floor(pointer.x / TILE), Math.floor(pointer.y / TILE)));
    this.emitState();
  }
  setSound(enabled: boolean) { this.soundEnabled = enabled; }
  startLevel(id: number) {
    this.level = LEVELS.find(l => l.id === id) ?? LEVELS[0];
    this.towers = []; this.enemies = []; this.bullets = []; this.effects = []; this.queue = [];
    this.wave = 0; this.waveResolved = true; this.coins = this.level.startingCoins; this.lives = this.level.startingLives; this.score = 0;
    this.spawnClock = 0; this.elapsed = 0; this.speed = 1; this.active = true; this.paused = false; this.ended = false;
    this.placing = null; this.selected = null; this.hover = null;
    this.drawTerrain(); this.emitState();
  }
  returnToMenu() { this.active = false; this.paused = false; this.placing = null; this.selected = null; this.enemies = []; this.bullets = []; this.queue = []; this.emitState(); }
  chooseTower(kind: TowerKind | null) { if (!this.active || this.ended) return; this.placing = this.placing === kind ? null : kind; this.selected = null; this.emitState(); }
  startWave() {
    if (!this.active || this.paused || this.ended || this.queue.length || this.enemies.length || this.wave >= this.level.waves) return;
    this.wave++; this.waveResolved = false; this.queue = waveEnemies(this.wave); this.spawnClock = 0.15; this.tone(410, 0.16, 'sine', 0.045); this.callbacks.onNotice(`VAGUE ${String(this.wave).padStart(2, '0')} EN APPROCHE`); this.emitState();
  }
  togglePause() { if (!this.active || this.ended) return; this.paused = !this.paused; this.emitState(); }
  toggleSpeed() { if (!this.active || this.ended) return; this.speed = this.speed === 1 ? 2 : 1; this.emitState(); }
  upgrade() {
    if (!this.selected || this.selected.tier >= 3 || this.ended || this.paused) return;
    const cost = upgradeCost(this.selected.kind, this.selected.tier);
    if (this.coins < cost) { this.callbacks.onNotice('PIÈCES INSUFFISANTES'); this.tone(150, 0.1, 'triangle', 0.03); return; }
    this.coins -= cost; this.selected.tier++; this.effects.push({ x: this.selected.x, y: this.selected.y, radius: 43, age: 0, duration: 0.45, color: 0x64e5cf });
    this.tone(620, 0.14, 'sine', 0.06); this.emitState();
  }
  sell() {
    if (!this.selected || this.ended || this.paused) return;
    this.coins += sellValue(this.selected.kind, this.selected.tier);
    this.effects.push({ x: this.selected.x, y: this.selected.y, radius: 34, age: 0, duration: 0.3, color: 0xffc777 });
    this.towers = this.towers.filter(t => t !== this.selected); this.selected = null; this.tone(390, 0.1, 'sine', 0.04); this.emitState();
  }
  private handleTap(col: number, row: number) {
    if (!this.active || this.paused || this.ended || col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
    const tower = this.towers.find(t => Math.floor(t.x / TILE) === col && Math.floor(t.y / TILE) === row);
    if (tower) { this.selected = tower; this.placing = null; this.tone(510, 0.055, 'sine', 0.025); this.emitState(); return; }
    if (this.placing) {
      if (isPath(this.level, col, row)) { this.callbacks.onNotice('CHEMIN BLOQUÉ'); this.tone(145, 0.09, 'triangle', 0.03); return; }
      const definition = TOWERS[this.placing];
      if (this.coins < definition.cost) { this.callbacks.onNotice('PIÈCES INSUFFISANTES'); this.tone(145, 0.09, 'triangle', 0.03); return; }
      const { x, y } = tileCenter([col, row]);
      this.towers.push({ x, y, kind: this.placing, tier: 1, cooldown: 0, angle: -Math.PI / 2 });
      this.coins -= definition.cost;
      this.effects.push({ x, y, radius: 34, age: 0, duration: 0.32, color: definition.color });
      this.tone(560, 0.12, 'sine', 0.05); this.emitState();
    } else { this.selected = null; this.emitState(); }
  }
  private emitState() {
    const t = this.selected;
    this.callbacks.onState({ level: this.level, wave: this.wave, coins: this.coins, lives: this.lives, score: this.score, active: this.active, paused: this.paused, ended: this.ended, speed: this.speed, placing: this.placing, enemiesRemaining: this.enemies.length + this.queue.length,
      selected: t ? { kind: t.kind, tier: t.tier, upgrade: t.tier < 3 ? upgradeCost(t.kind, t.tier) : 0, sell: sellValue(t.kind, t.tier), ...towerStats(t.kind, t.tier) } : null });
  }
  private finish(victory: boolean) {
    if (this.ended) return;
    this.ended = true; this.queue = []; this.placing = null; this.selected = null;
    if (victory) { this.score += this.lives * 50; this.tone(680, 0.35, 'sine', 0.07); }
    else this.tone(120, 0.4, 'sawtooth', 0.035);
    this.emitState(); this.callbacks.onEnd(victory, this.score, this.level.id);
  }
  update(_time: number, deltaMs: number) {
    if (!this.sprites) return;
    if (this.active && !this.paused && !this.ended) {
      const dt = Math.min(deltaMs, 50) / 1000 * this.speed;
      this.elapsed += dt;
      this.updateSpawns(dt); this.updateEnemies(dt); this.updateTowers(dt); this.updateBullets(dt);
      this.effects = this.effects.filter(e => { e.age += dt; return e.age < e.duration; });
      this.uiClock += dt;
      if (this.uiClock > 0.5) { this.uiClock = 0; this.emitState(); }
      if (this.wave > 0 && !this.waveResolved && !this.queue.length && !this.enemies.length && !this.ended) {
        this.waveResolved = true;
        if (this.wave >= this.level.waves) this.finish(true);
        else { const bonus = waveBonus(this.wave); this.coins += bonus; this.callbacks.onNotice(`VAGUE TERMINÉE  +${bonus} PIÈCES`); this.tone(730, 0.18, 'sine', 0.05); this.emitState(); }
      }
    }
    this.drawSprites();
  }
  private updateSpawns(dt: number) {
    if (!this.queue.length) return;
    this.spawnClock -= dt;
    if (this.spawnClock > 0) return;
    const kind = this.queue.shift()!;
    const s = enemyStats(kind, this.level, this.wave);
    this.enemies.push({ x: -23, y: tileCenter(this.level.path[0]).y, kind, hp: s.hp, maxHp: s.hp, speed: s.speed, next: 0, slow: 0, dead: false, radius: s.radius, color: s.color, bounty: s.bounty, damage: s.damage, score: s.score });
    this.spawnClock = kind === 'tank' ? 0.78 : 0.63;
  }
  private updateEnemies(dt: number) {
    for (const e of this.enemies) {
      e.slow = Math.max(0, e.slow - dt);
      let remaining = e.speed * (e.slow > 0 ? 0.48 : 1) * dt;
      while (remaining > 0 && !e.dead) {
        const target = tileCenter(this.level.path[e.next]);
        const distance = Math.hypot(target.x - e.x, target.y - e.y);
        if (distance <= remaining) {
          e.x = target.x; e.y = target.y; remaining -= distance; e.next++;
          if (e.next >= this.level.path.length) {
            e.dead = true; this.lives = Math.max(0, this.lives - e.damage);
            this.effects.push({ x: e.x, y: e.y, radius: 38, age: 0, duration: 0.45, color: 0xf08483 });
            this.tone(190, 0.12, 'triangle', 0.04); this.emitState();
            if (this.lives <= 0) this.finish(false);
          }
        } else { e.x += (target.x - e.x) / distance * remaining; e.y += (target.y - e.y) / distance * remaining; remaining = 0; }
      }
    }
    this.enemies = this.enemies.filter(e => !e.dead);
  }
  private updateTowers(dt: number) {
    for (const t of this.towers) {
      t.cooldown -= dt;
      const stats = towerStats(t.kind, t.tier);
      const targets = this.enemies.filter(e => !e.dead && Math.hypot(e.x - t.x, e.y - t.y) <= stats.range);
      if (!targets.length) continue;
      // Prioritise the enemy furthest along the route, including its progress inside the tile.
      targets.sort((a, b) => (b.next * TILE - Math.hypot(b.x - tileCenter(this.level.path[b.next]).x, b.y - tileCenter(this.level.path[b.next]).y)) - (a.next * TILE - Math.hypot(a.x - tileCenter(this.level.path[a.next]).x, a.y - tileCenter(this.level.path[a.next]).y)));
      const target = targets[0];
      t.angle = Math.atan2(target.y - t.y, target.x - t.x);
      if (t.cooldown > 0) continue;
      const def = TOWERS[t.kind];
      this.bullets.push({ x: t.x + Math.cos(t.angle) * 18, y: t.y + Math.sin(t.angle) * 18, target, kind: t.kind, damage: stats.damage, speed: def.projectileSpeed, splash: def.splash ?? 0, slow: def.slow ?? 0, tx: target.x, ty: target.y });
      t.cooldown = stats.interval;
      this.tone(t.kind === 'cannon' ? 110 : t.kind === 'frost' ? 460 : 340, t.kind === 'cannon' ? 0.10 : 0.045, t.kind === 'cannon' ? 'triangle' : 'sine', 0.018);
    }
  }
  private updateBullets(dt: number) {
    this.bullets = this.bullets.filter(b => {
      if (!b.target.dead) { b.tx = b.target.x; b.ty = b.target.y; }
      const distance = Math.hypot(b.tx - b.x, b.ty - b.y);
      if (distance > b.speed * dt) { b.x += (b.tx - b.x) / distance * b.speed * dt; b.y += (b.ty - b.y) / distance * b.speed * dt; return true; }
      const color = TOWERS[b.kind].color;
      if (b.splash) {
        for (const e of this.enemies) if (!e.dead && Math.hypot(e.x - b.tx, e.y - b.ty) <= b.splash) this.hit(e, b.damage);
        this.effects.push({ x: b.tx, y: b.ty, radius: b.splash, age: 0, duration: 0.35, color });
        this.tone(90, 0.12, 'triangle', 0.025);
      } else if (!b.target.dead) {
        this.hit(b.target, b.damage);
        if (b.slow && !b.target.dead) b.target.slow = Math.max(b.target.slow, b.slow);
        this.effects.push({ x: b.tx, y: b.ty, radius: 19, age: 0, duration: 0.2, color });
      }
      return false;
    });
    this.enemies = this.enemies.filter(e => !e.dead);
  }
  private hit(enemy: Enemy, damage: number) {
    enemy.hp -= damage;
    if (enemy.hp > 0 || enemy.dead) return;
    enemy.dead = true; this.coins += enemy.bounty; this.score += enemy.score;
    this.effects.push({ x: enemy.x, y: enemy.y, radius: 31, age: 0, duration: 0.29, color: enemy.color });
    this.emitState();
  }
  private tone(freq: number, duration: number, wave: OscillatorType, volume: number) {
    if (!this.soundEnabled || typeof window === 'undefined') return;
    try {
      this.audio ??= new AudioContext();
      if (this.audio.state === 'suspended') void this.audio.resume();
      const osc = this.audio.createOscillator(); const gain = this.audio.createGain(); const now = this.audio.currentTime;
      osc.type = wave; osc.frequency.setValueAtTime(freq, now); osc.frequency.exponentialRampToValueAtTime(Math.max(55, freq * 0.66), now + duration);
      gain.gain.setValueAtTime(volume, now); gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain); gain.connect(this.audio.destination); osc.start(now); osc.stop(now + duration);
    } catch { /* Sound is optional on restricted WebViews. */ }
  }
  private drawTerrain() {
    if (!this.terrain) return;
    const g = this.terrain; g.clear(); this.labels.forEach(label => label.destroy()); this.labels = [];
    g.fillStyle(0x0d2027).fillRect(0, 0, 800, 560);
    // Deterministic decorative tiles: no texture downloads or particle systems.
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const n = (x * 37 + y * 71 + this.level.id * 17) % 11;
      g.fillStyle(n < 5 ? 0x112a32 : 0x10262e).fillRect(x * TILE + 1, y * TILE + 1, TILE - 2, TILE - 2);
      g.lineStyle(1, 0x2b4c50, 0.24).strokeRect(x * TILE + 3, y * TILE + 3, TILE - 6, TILE - 6);
      if (n < 3 && !isPath(this.level, x, y)) {
        g.lineStyle(1, 0x408177, 0.19).strokeCircle(x * TILE + 40, y * TILE + 40, 16);
        g.fillStyle(0x62b8a3, 0.22).fillCircle(x * TILE + 40, y * TILE + 40, 2);
      }
      if (n === 7 && !isPath(this.level, x, y)) { g.fillStyle(0x498378, 0.16).fillRect(x * TILE + 14, y * TILE + 16, 22, 2).fillRect(x * TILE + 14, y * TILE + 22, 13, 2); }
    }
    const path = this.level.path.map(tileCenter);
    g.lineStyle(66, 0x345856, 0.36); g.beginPath(); g.moveTo(-40, path[0].y); path.forEach(p => g.lineTo(p.x, p.y)); g.lineTo(840, path.at(-1)!.y); g.strokePath();
    g.lineStyle(57, 0x233d42, 1); g.beginPath(); g.moveTo(-40, path[0].y); path.forEach(p => g.lineTo(p.x, p.y)); g.lineTo(840, path.at(-1)!.y); g.strokePath();
    g.lineStyle(2, this.level.accent, 0.28); g.beginPath(); g.moveTo(-40, path[0].y); path.forEach(p => g.lineTo(p.x, p.y)); g.lineTo(840, path.at(-1)!.y); g.strokePath();
    path.forEach((p, i) => {
      g.lineStyle(1, 0x719a93, 0.19).strokeRect(p.x - 31, p.y - 31, 62, 62);
      if (i > 0 && i % 2 === 0) { g.fillStyle(this.level.accent, 0.37).fillCircle(p.x, p.y, 3); }
    });
    const entrance = path[0], exit = path.at(-1)!;
    g.fillStyle(0x63e3d3, 0.13).fillRect(0, entrance.y - 32, 20, 64);
    g.lineStyle(3, 0x63e3d3, 0.75).lineBetween(8, entrance.y - 25, 8, entrance.y + 25);
    g.fillStyle(0xe78e85, 0.16).fillRect(776, exit.y - 32, 24, 64);
    g.lineStyle(3, 0xf08c83, 0.9).lineBetween(788, exit.y - 25, 788, exit.y + 25);
    const label = (text: string, x: number, y: number, color: string) => { const t = this.add.text(x, y, text, { fontFamily: 'Arial, sans-serif', fontSize: '10px', fontStyle: 'bold', color, letterSpacing: 2 }).setOrigin(0.5); this.labels.push(t); };
    label('ENTRÉE', 48, entrance.y - 47, '#77bdb1'); label('BASE', 750, exit.y - 47, '#f2a09a');
  }
  private drawSprites() {
    const g = this.sprites; g.clear();
    if (!this.active) return;
    if (this.hover && this.placing && !this.paused && !this.ended) {
      const { x, y } = this.hover; if (x >= 0 && x < COLS && y >= 0 && y < ROWS) {
        const valid = !isPath(this.level, x, y) && !this.towers.some(t => Math.floor(t.x / TILE) === x && Math.floor(t.y / TILE) === y) && this.coins >= TOWERS[this.placing].cost;
        const center = tileCenter([x, y]);
        g.fillStyle(valid ? 0x63e3d3 : 0xef7777, 0.15).fillRect(x * TILE + 3, y * TILE + 3, 74, 74);
        g.lineStyle(2, valid ? 0x63e3d3 : 0xef7777, 0.7).strokeRect(x * TILE + 4, y * TILE + 4, 72, 72);
        if (valid) { g.lineStyle(1, TOWERS[this.placing].color, 0.3).strokeCircle(center.x, center.y, TOWERS[this.placing].range); }
      }
    }
    if (this.selected) { const t = this.selected; g.fillStyle(TOWERS[t.kind].color, 0.045).fillCircle(t.x, t.y, towerStats(t.kind, t.tier).range); g.lineStyle(2, TOWERS[t.kind].color, 0.46).strokeCircle(t.x, t.y, towerStats(t.kind, t.tier).range); g.lineStyle(2, 0xffffff, 0.58).strokeRect(t.x - 31, t.y - 31, 62, 62); }
    for (const t of this.towers) {
      const col = TOWERS[t.kind].color;
      g.fillStyle(0x030e15, 0.55).fillEllipse(t.x, t.y + 22, 52, 15);
      g.fillStyle(0x203a40).fillCircle(t.x, t.y, 27);
      g.lineStyle(2, col, 0.5).strokeCircle(t.x, t.y, 24);
      g.fillStyle(0x091a25).fillCircle(t.x, t.y, 18);
      g.lineStyle(1, col, 0.85).strokeCircle(t.x, t.y, 15);
      if (t.kind === 'cannon') {
        g.lineStyle(11, 0x584138).lineBetween(t.x, t.y, t.x + Math.cos(t.angle) * 27, t.y + Math.sin(t.angle) * 27);
        g.lineStyle(5, col).lineBetween(t.x + Math.cos(t.angle) * 10, t.y + Math.sin(t.angle) * 10, t.x + Math.cos(t.angle) * 29, t.y + Math.sin(t.angle) * 29);
        g.fillStyle(col).fillRect(t.x - 8, t.y - 8, 16, 16);
      } else if (t.kind === 'frost') {
        for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + this.elapsed * 0.45; g.lineStyle(3, col, 0.8).lineBetween(t.x, t.y, t.x + Math.cos(a) * 13, t.y + Math.sin(a) * 13); }
        g.fillStyle(0xe5f0ff).fillCircle(t.x, t.y, 5);
      } else {
        g.lineStyle(7, col).lineBetween(t.x, t.y, t.x + Math.cos(t.angle) * 24, t.y + Math.sin(t.angle) * 24);
        g.fillStyle(0xd7fff3).fillCircle(t.x, t.y, 6);
      }
      for (let i = 0; i < t.tier; i++) g.fillStyle(col).fillCircle(t.x - 7 + i * 7, t.y + 33, 2);
    }
    for (const e of this.enemies) {
      g.fillStyle(0x030e15, 0.42).fillEllipse(e.x, e.y + e.radius * 0.9, e.radius * 2.3, e.radius * 0.7);
      g.fillStyle(e.color, e.slow > 0 ? 0.45 : 0.21).fillCircle(e.x, e.y, e.radius + 5);
      if (e.kind === 'tank') { g.fillStyle(0x392f4a).fillRoundedRect(e.x - 17, e.y - 15, 34, 30, 7); g.lineStyle(2, e.color).strokeRoundedRect(e.x - 17, e.y - 15, 34, 30, 7); g.fillStyle(e.color).fillRect(e.x - 7, e.y - 6, 14, 12); }
      else if (e.kind === 'runner') { g.fillStyle(e.color).fillTriangle(e.x + 15, e.y, e.x - 10, e.y - 10, e.x - 10, e.y + 10); g.fillStyle(0x263039).fillCircle(e.x - 3, e.y, 4); }
      else { g.fillStyle(0x58343b).fillCircle(e.x, e.y, e.radius); g.lineStyle(2, e.color).strokeCircle(e.x, e.y, e.radius); g.fillStyle(e.color).fillCircle(e.x, e.y, 6); }
      if (e.slow > 0) g.lineStyle(2, 0x9cbcff, 0.8).strokeCircle(e.x, e.y, e.radius + 4);
      const width = e.radius * 2 + 12;
      g.fillStyle(0x06121b, 0.9).fillRect(e.x - width / 2, e.y - e.radius - 13, width, 4);
      g.fillStyle(e.hp / e.maxHp < 0.35 ? 0xf07f7c : 0x6fe2b5).fillRect(e.x - width / 2, e.y - e.radius - 13, width * Math.max(0, e.hp / e.maxHp), 4);
    }
    for (const b of this.bullets) { const col = TOWERS[b.kind].color; g.fillStyle(col, 0.16).fillCircle(b.x, b.y, b.kind === 'cannon' ? 13 : 9); g.fillStyle(col).fillCircle(b.x, b.y, b.kind === 'cannon' ? 6 : 4); g.fillStyle(0xffffff, 0.85).fillCircle(b.x, b.y, 2); }
    for (const e of this.effects) { const a = 1 - e.age / e.duration; g.lineStyle(3 * a, e.color, 0.8 * a).strokeCircle(e.x, e.y, e.radius * (0.4 + 0.65 * (1 - a))); g.fillStyle(e.color, 0.14 * a).fillCircle(e.x, e.y, e.radius * (1 - a * 0.4)); }
  }
}
