// ── DRUNKOLUTION: The Drunken Ape Theory — Tipos compartidos ────────────────

export type PlatformKind =
  | 'normal'
  | 'moving' // horizontal (Egipto: esclavos)
  | 'vmove' // vertical (Renacimiento: ornitópteros)
  | 'crumble' // se rompe al pisarla (Neolítico: piedra)
  | 'bounce' // trampolín (Roma: fuentes de vino)
  | 'ice' // resbaladiza (Grecia: mármol)
  | 'hidden' // solo se ve borracho
  | 'fake' // parece sólida pero caes (Prohibición)
  | 'blink' // se enciende/apaga con la música (Años 80)
  | 'melt' // se derrite (Impresionismo: absenta)
  | 'holo' // holográfica con glitches (Cyberpunk)
  | 'spike' // pinchos (Edad Media)
  | 'checkpoint'
  | 'ground'

export interface Platform {
  id: number
  x: number
  y: number
  w: number
  h: number
  kind: PlatformKind
  era: number
  // movimiento horizontal
  baseX: number
  range: number
  phase: number
  speed: number
  dx: number // desplazamiento horizontal de este frame
  dy: number // desplazamiento vertical de este frame (vmove)
  baseY: number // y original (vmove)
  // frágil / derritiéndose
  touchT: number
  broken: boolean
  vy: number
  alpha: number
  baseW: number // ancho original (melt se encoge y al regenerar recupera)
  regrowT: number // cuenta atrás para regenerar una plataforma rota (anti-softlock)
  // oculta
  revealT: number
  // auxiliar (ciclo blink/holo)
  aux: number
  // checkpoint ya activado
  used: boolean
}

export type ItemKind = 'gene' | 'bottle' | 'banana' | 'phone' | 'kebab' | 'tapas'

export interface Item {
  id: number
  kind: ItemKind
  x: number
  y: number
  taken: boolean
  t: number // fase de animación
  vx?: number
  vy?: number
  magnet?: boolean
  respawnT?: number // botellas: reaparecen tras beberlas (muros siempre superables)
}

export type ParticleKind = 'dust' | 'bubble' | 'sparkle' | 'confetti' | 'ring' | 'star'

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
  kind: ParticleKind
  grav: number
  rot: number
  vr: number
}

export interface FloatText {
  x: number
  y: number
  vy: number
  life: number
  maxLife: number
  text: string
  color: string
  size: number
}

// ── Jefes: Guardianes de la Sobriedad ───────────────────────────────────────
export type BossType = 'mamut' | 'caballero' | 'agente' | 'sober' | 'dios'

export interface Boss {
  idx: number // índice en BOSS_DEFS
  type: BossType
  x: number
  y: number
  baseY: number
  hp: number
  maxHp: number
  t: number
  hurtT: number // destello al recibir daño
  dead: boolean
  shootT: number // temporizador de disparo
  phase: number
  telegraph: { x: number; warn: number; active: number } | null // rayo eructo (dios) / luz sagrada
}

export type ProjKind = 'ice' | 'holy' | 'cork' | 'net' | 'planet' | 'bottle'

export interface Projectile {
  x: number
  y: number
  vx: number
  vy: number
  kind: ProjKind
  grav: number
  rot: number
  fromBoss: boolean
  dead: boolean
}

// cuervos empujadores de la Edad Media
export interface Crow {
  x: number
  y: number
  vx: number
  t: number
  dead: boolean
}

export interface Upgrades {
  legs: number
  brain: number
  liver: number
  eye: number
  boots: number
  magnet: number
}

export type UpgradeKey = keyof Upgrades

export interface GameStats {
  runs: number
  bottles: number
  genesTotal: number
  falls: number
  distTotal: number
  cosmosWins: number
  adsWatched: number
  bosses: number
}

export interface SaveData {
  v: number
  record: number // metros
  genes: number // banco de genes
  upgrades: Upgrades
  stats: GameStats
  maxEra: number // era más alta alcanzada (índice)
  muted: boolean
  boost2x: boolean // genes ×2 pendientes para la próxima partida (anuncio)
  vip: boolean // Tarjeta VIP del Borracho ($2.99, pago simulado)
}

export interface RunSummary {
  altitude: number
  genesRun: number
  bottles: number
  falls: number
  eras: number
  newRecord: boolean
  cosmos: boolean
  duration: number
  bosses: number
}

// estado de ebriedad del Motor de Ebriedad
export type DrunkState = 'sobrio' | 'alegre' | 'ciego' | 'blackout'

// minijuego de resaca entre eras
export interface HangoverData {
  eraIdx: number
  seq: string[] // secuencia de iconos: 💧 💊 ☕ 🥛
  idx: number // progreso (cuántos tocaste bien)
  t: number // tiempo restante
  sponsor: string | null // intersticial camuflado (null si VIP)
  done: boolean
  ok: boolean
}

export interface BossHud {
  name: string
  hp: number
  maxHp: number
}

export type RunState = 'running' | 'gameover'

export interface HudData {
  altitude: number
  eraIdx: number
  genesRun: number
  lives: number
  drunk: number
  drunkState: DrunkState
  stagnated: boolean // sobrio demasiado tiempo: ADN congelado
  courage: boolean
  divine: boolean
  newRecord: boolean
  state: RunState
  // efectos activos
  shield: boolean
  plate: boolean
  phone: boolean
  invert: boolean
  slow: boolean
  netted: boolean
  blackout: number // 0..1 progreso del blackout
  ammo: number // botellas para lanzar a jefes
  boss: BossHud | null
  hangover: HangoverData | null
}

export interface EngineEvents {
  onEra?: (eraIdx: number) => void
  onFall?: () => void
  onGameOver?: (s: RunSummary) => void
  onCosmos?: () => void
  onDrink?: () => void
  onBossDefeated?: (idx: number) => void
  onHipo?: () => void
  onHangoverEnd?: (ok: boolean) => void
}
