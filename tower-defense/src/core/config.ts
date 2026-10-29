export const COLS = 10;
export const ROWS = 7;
export const TILE = 80;
export type Cell = readonly [number, number];
export type TowerKind = 'pulse' | 'cannon' | 'frost';
export type EnemyKind = 'drone' | 'runner' | 'tank';
export interface Level { id: number; name: string; sector: string; description: string; waves: number; startingCoins: number; startingLives: number; difficulty: number; path: Cell[]; accent: number }
// Every bend is made of orthogonally adjacent tiles; entrance is at x=0.
export const LEVELS: Level[] = [
  { id: 1, name: 'Ligne de rupture', sector: 'SECTEUR 01 / AVANT-POSTE', description: 'Une première ligne à tenir. Verrouillez les virages.', waves: 6, startingCoins: 230, startingLives: 20, difficulty: 1, accent: 0x62e3cf, path: [[0,3],[1,3],[2,3],[2,2],[3,2],[4,2],[4,3],[5,3],[6,3],[6,4],[7,4],[8,4],[8,3],[9,3]] },
  { id: 2, name: 'Le défilé', sector: 'SECTEUR 02 / CANYON', description: 'Les coureurs arrivent. Exploitez le long couloir.', waves: 7, startingCoins: 250, startingLives: 18, difficulty: 1.25, accent: 0xffbd77, path: [[0,1],[1,1],[2,1],[3,1],[3,2],[3,3],[3,4],[4,4],[5,4],[6,4],[6,3],[6,2],[7,2],[8,2],[9,2]] },
  { id: 3, name: 'Dernier bastion', sector: 'SECTEUR 03 / CITADELLE', description: 'Des blindés lourds approchent. Tenez la ligne.', waves: 8, startingCoins: 280, startingLives: 16, difficulty: 1.5, accent: 0xb89aff, path: [[0,5],[1,5],[2,5],[2,4],[2,3],[2,2],[2,1],[3,1],[4,1],[5,1],[5,2],[5,3],[5,4],[5,5],[6,5],[7,5],[8,5],[8,4],[8,3],[8,2],[9,2]] }
];
export interface TowerDefinition { name: string; subtitle: string; description: string; cost: number; range: number; damage: number; interval: number; projectileSpeed: number; color: number; icon: string; splash?: number; slow?: number }
export const TOWERS: Record<TowerKind, TowerDefinition> = {
  pulse: { name: 'Sentinelle', subtitle: 'TIR RAPIDE', description: 'Précise et rapide. Cible en tête.', cost: 75, range: 143, damage: 18, interval: 0.48, projectileSpeed: 490, color: 0x63e3d3, icon: '✧' },
  cannon: { name: 'Canon', subtitle: 'DÉGÂTS DE ZONE', description: 'Explosion puissante sur les groupes.', cost: 130, range: 158, damage: 49, interval: 1.65, projectileSpeed: 330, color: 0xffb46e, icon: '◈', splash: 69 },
  frost: { name: 'Cryo', subtitle: 'RALENTISSEMENT', description: 'Freine les ennemis pendant 1,8 s.', cost: 105, range: 135, damage: 11, interval: 0.85, projectileSpeed: 380, color: 0x9cbcff, icon: '❄', slow: 1.8 }
};
export const TOWER_KINDS: TowerKind[] = ['pulse', 'cannon', 'frost'];
export interface EnemyDefinition { hp: number; speed: number; bounty: number; radius: number; damage: number; color: number; score: number }
export const ENEMIES: Record<EnemyKind, EnemyDefinition> = {
  drone: { hp: 65, speed: 58, bounty: 13, radius: 14, damage: 1, color: 0xf08483, score: 100 },
  runner: { hp: 44, speed: 102, bounty: 17, radius: 11, damage: 1, color: 0xf7c477, score: 150 },
  tank: { hp: 260, speed: 38, bounty: 35, radius: 19, damage: 2, color: 0xb49bee, score: 300 }
};
export function tileCenter([x, y]: Cell): { x: number; y: number } { return { x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 }; }
export function isPath(level: Level, x: number, y: number): boolean { return level.path.some(([px, py]) => px === x && py === y); }
export function towerStats(kind: TowerKind, tier: number) { const base = TOWERS[kind]; return { damage: Math.round(base.damage * Math.pow(1.55, tier - 1)), range: base.range + (tier - 1) * 13, interval: base.interval * Math.pow(0.9, tier - 1) }; }
export function upgradeCost(kind: TowerKind, tier: number): number { return Math.round(TOWERS[kind].cost * (0.7 + tier * 0.5)); }
export function sellValue(kind: TowerKind, tier: number): number { let spent = TOWERS[kind].cost; for (let t = 1; t < tier; t++) spent += upgradeCost(kind, t); return Math.floor(spent * 0.65); }
export function enemyStats(kind: EnemyKind, level: Level, wave: number): EnemyDefinition { const base = ENEMIES[kind]; return { ...base, hp: Math.round(base.hp * level.difficulty * (1 + (wave - 1) * 0.22)), speed: base.speed * (1 + (wave - 1) * 0.035) }; }
export function waveEnemies(wave: number): EnemyKind[] { const result: EnemyKind[] = []; const count = 6 + wave * 2; for (let i = 0; i < count; i++) { if (wave >= 4 && i % 6 === 5) result.push('tank'); else if (wave >= 2 && i % 3 === 2) result.push('runner'); else result.push('drone'); } return result; }
export function waveBonus(wave: number): number { return 30 + wave * 10; }
