// ── DRUNKOLUTION: The Drunken Ape Theory — Constantes, eras, jefes, mejoras ─
import type { Upgrades, UpgradeKey, BossType } from './types'

// Lienzo lógico
export const W = 480
export const H = 800

// Física
export const PX_PER_M = 3.6 // píxeles por metro
export const GRAVITY = 2400
export const MOVE_SPEED = 340
export const JUMP_V = 900
export const MAX_FALL = 1500

// Progresión
export const ERA_HEIGHT_M = 1500 // metros por era
export const COSMOS_M = 19500 // meta final: 13 eras × 1500m
export const MAX_LIVES = 5
export const START_LIVES = 3

export interface EraDef {
  name: string
  stage: string // disfraz evolutivo del mono (nunca deja de ser mono)
  drink: string // la bebida de la era
  emoji: string
  sky: [string, string] // degradado del cielo (arriba → abajo)
  accent: string // color destacado de la era
  platFill: string
  platEdge: string
  night: boolean
  gravityMul: number
}

// Las 13 eras de la teoría del simio bebedor (Robert Dudley aprobaría)
export const ERAS: EraDef[] = [
  {
    name: 'Mioceno',
    stage: 'Simio Mioceno',
    drink: 'Uvas fermentadas',
    emoji: '🍇',
    sky: ['#07281d', '#186a45'],
    accent: '#4ade80',
    platFill: '#6b4423',
    platEdge: '#8fbf6a',
    night: false,
    gravityMul: 1,
  },
  {
    name: 'Neolítico',
    stage: 'Simio Cerverizo',
    drink: 'Cerveza de barro',
    emoji: '🏺',
    sky: ['#121014', '#332a3a'],
    accent: '#a78bfa',
    platFill: '#4c4553',
    platEdge: '#8d8399',
    night: true,
    gravityMul: 1,
  },
  {
    name: 'Egipto Eterno',
    stage: 'Escriba Embraguado',
    drink: 'Vino de dátiles',
    emoji: '🏜️',
    sky: ['#241238', '#b06a2e'],
    accent: '#f4c542',
    platFill: '#c9973f',
    platEdge: '#f0d48a',
    night: false,
    gravityMul: 1,
  },
  {
    name: 'Antigua Grecia',
    stage: 'Filósofo Borracho',
    drink: 'Vino y Ouzo',
    emoji: '🏛️',
    sky: ['#1d2a4a', '#7fa8c9'],
    accent: '#93c5fd',
    platFill: '#d8dfe6',
    platEdge: '#f5f8fb',
    night: false,
    gravityMul: 1,
  },
  {
    name: 'Imperio Romano',
    stage: 'Legionario Viñador',
    drink: 'Vino de ánfora',
    emoji: '🍷',
    sky: ['#2a1c46', '#c96f4a'],
    accent: '#e879a0',
    platFill: '#d8d3c8',
    platEdge: '#f5f1e6',
    night: false,
    gravityMul: 1,
  },
  {
    name: 'Edad Media',
    stage: 'Escudero Cervezal',
    drink: 'Hidromiel y Ale',
    emoji: '🏰',
    sky: ['#0a0a16', '#232342'],
    accent: '#f59e0b',
    platFill: '#3d3a45',
    platEdge: '#6f6a7c',
    night: true,
    gravityMul: 1,
  },
  {
    name: 'Renacimiento',
    stage: 'Aprendiz de Da Vinci',
    drink: 'Vino Chianti',
    emoji: '🎨',
    sky: ['#3a2417', '#c98a4a'],
    accent: '#fbbf24',
    platFill: '#8a5a33',
    platEdge: '#e8c170',
    night: false,
    gravityMul: 1,
  },
  {
    name: 'Impresionismo',
    stage: 'Pincelada Turbulenta',
    drink: 'Absenta',
    emoji: '🌀',
    sky: ['#0c1a3a', '#2a5a8a'],
    accent: '#7dd3fc',
    platFill: '#3a5a8a',
    platEdge: '#93c5fd',
    night: true,
    gravityMul: 0.95,
  },
  {
    name: 'La Prohibición',
    stage: 'Gánster Contrabandista',
    drink: 'Moonshine',
    emoji: '🥃',
    sky: ['#160d24', '#69234a'],
    accent: '#f472b6',
    platFill: '#241a30',
    platEdge: '#c9973f',
    night: true,
    gravityMul: 1,
  },
  {
    name: 'Revolución Industrial',
    stage: 'Obrero Gin-Tonic',
    drink: 'Gin Tonic',
    emoji: '⚙️',
    sky: ['#1c1a15', '#5a4d3a'],
    accent: '#f97316',
    platFill: '#5b5148',
    platEdge: '#98876f',
    night: false,
    gravityMul: 1,
  },
  {
    name: 'Años 80',
    stage: 'Chico Neón',
    drink: 'Cócteles de neón',
    emoji: '🕶️',
    sky: ['#1a0a2e', '#4a1042'],
    accent: '#f0abfc',
    platFill: '#2a1038',
    platEdge: '#f0abfc',
    night: true,
    gravityMul: 1,
  },
  {
    name: 'Cyberpunk 2099',
    stage: 'Ciber-Simio',
    drink: 'Neon-Vodka',
    emoji: '🌃',
    sky: ['#050510', '#141441'],
    accent: '#22d3ee',
    platFill: '#101426',
    platEdge: '#22d3ee',
    night: true,
    gravityMul: 1,
  },
  {
    name: 'Era Espacial',
    stage: 'Simio Astral',
    drink: 'Cerveza Cuántica',
    emoji: '🚀',
    sky: ['#000003', '#180a2e'],
    accent: '#fde047',
    platFill: '#463a52',
    platEdge: '#b18cd9',
    night: true,
    gravityMul: 0.4, // gravedad cero: el simio flota
  },
]

export const ERA_COUNT = ERAS.length

// Índice de era según la altura en metros
export function eraAtM(m: number): number {
  return Math.max(0, Math.min(ERA_COUNT - 1, Math.floor(m / ERA_HEIGHT_M)))
}

// Altura (m) donde empieza una era
export function eraStartM(idx: number): number {
  return idx * ERA_HEIGHT_M
}

// ── Motor de Ebriedad: los 4 estados ────────────────────────────────────────
export interface DrunkStateDef {
  key: 'sobrio' | 'alegre' | 'ciego' | 'blackout'
  name: string
  mult: number // multiplicador de ADN
  color: string
}

export function drunkStateOf(d: number): DrunkStateDef {
  if (d >= 1) return { key: 'blackout', name: 'BLACKOUT', mult: 0, color: '#ef4444' }
  if (d > 0.7) return { key: 'ciego', name: 'CIEGO', mult: 2.5, color: '#f472b6' }
  if (d > 0.3) return { key: 'alegre', name: 'ALEGRE', mult: 1.5, color: '#fbbf24' }
  return { key: 'sobrio', name: 'SOBRIO', mult: 1, color: '#94a3b8' }
}

// ── Los 5 Jefes: Guardianes de la Sobriedad ────────────────────────────────
export interface BossDef {
  type: BossType
  name: string
  era: number // era donde vive (al final de esa era)
  hp: number
  reward: number // genes al derrotarlo
  taunt: string
}

export const BOSS_DEFS: BossDef[] = [
  {
    type: 'mamut',
    name: 'Mamut Anti-Resaca',
    era: 1, // Neolítico
    hp: 3,
    reward: 150,
    taunt: '¡Voy a curarte con hielo y humo medicinal!',
  },
  {
    type: 'caballero',
    name: 'Sir Abstinence',
    era: 5, // Edad Media
    hp: 4,
    reward: 250,
    taunt: '¡Jura sobriedad o enfréntate a mi luz sagrada!',
  },
  {
    type: 'agente',
    name: 'Agente de la Ley Seca',
    era: 8, // Prohibición
    hp: 4,
    reward: 300,
    taunt: '¡Alto! Ese moonshine es evidencia número 1.',
  },
  {
    type: 'sober',
    name: 'SOBER-9000',
    era: 11, // Cyberpunk
    hp: 5,
    reward: 400,
    taunt: 'DETECTO ALCOHOL. INICIANDO PROTOCOLO CURA.',
  },
  {
    type: 'dios',
    name: 'Dios Simio Cósmico',
    era: 12, // Espacial
    hp: 6,
    reward: 600,
    taunt: 'Tengo una resaca eterna... y tú vas a pagarla.',
  },
]

// metros donde empieza la arena del jefe (150m antes del fin de su era)
export function bossZoneM(def: BossDef): number {
  if (def.era >= ERA_COUNT - 1) return eraStartM(def.era) + ERA_HEIGHT_M - 150
  return eraStartM(def.era + 1) - 150
}

// ── Patrocinadores del intersticial camuflado ───────────────────────────────
export const SPONSORS: string[] = [
  'Agua Mineral "FAKE" — ¡Sabe a agua, pero te engaña!',
  'Kebab Al-Hopción — Ahora con 30% más arrepentimiento',
  'Cerveza Cuántica™ — 99% cuántica, 1% cerveza',
  'Túnicas Toga & Co — Viste tu borrachera con estilo',
  'Corchos Reales S.A. — Desde 1492 protegiendo el vino',
  'Hielo Medicinal del Mamut — ¡Fresquito y anti-resaca!',
]

// ── Utilidades de color ─────────────────────────────────────────────────────
export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function mixHex(a: string, b: string, t: number): string {
  const ca = hexToRgb(a)
  const cb = hexToRgb(b)
  const r = Math.round(lerp(ca[0], cb[0], t))
  const g = Math.round(lerp(ca[1], cb[1], t))
  const bl = Math.round(lerp(ca[2], cb[2], t))
  return `rgb(${r},${g},${bl})`
}

export function rgba(hex: string, a: number): string {
  const c = hexToRgb(hex)
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`
}

// ── Laboratorio de evolución ────────────────────────────────────────────────
export interface UpgradeDef {
  key: UpgradeKey
  name: string
  desc: string
  icon: string
  max: number
  baseCost: number
  effect: (lvl: number) => string
}

export const UPGRADES: UpgradeDef[] = [
  {
    key: 'legs',
    name: 'Piernas de Liana',
    desc: 'Salto más potente para alcanzar plataformas lejanas.',
    icon: '🦵',
    max: 5,
    baseCost: 50,
    effect: (l) => `+${l * 6}% altura de salto`,
  },
  {
    key: 'brain',
    name: 'Cerebro Simiósfera',
    desc: 'Más equilibrio: el tembleque del borracho afecta menos.',
    icon: '🧠',
    max: 5,
    baseCost: 50,
    effect: (l) => `−${l * 10}% tambaleo`,
  },
  {
    key: 'liver',
    name: 'Hígado de Titanio',
    desc: 'Sobria más rápido entre botella y botella.',
    icon: '🫀',
    max: 5,
    baseCost: 45,
    effect: (l) => `+${l * 35}% recuperación`,
  },
  {
    key: 'eye',
    name: 'Tercer Ojo',
    desc: 'Al beber, ves y revelas plataformas ocultas más lejos y por más tiempo.',
    icon: '👁️',
    max: 5,
    baseCost: 45,
    effect: (l) => `+${l * 45}px radio · +${(l * 2.5).toFixed(1)}s visión`,
  },
  {
    key: 'boots',
    name: 'Botas Cósmicas',
    desc: 'Salto extra en el aire. Nivel 2: doble salto doble.',
    icon: '🚀',
    max: 2,
    baseCost: 140,
    effect: (l) => (l === 0 ? 'sin salto aéreo' : `${l} salto${l > 1 ? 's' : ''} aéreo${l > 1 ? 's' : ''}`),
  },
  {
    key: 'magnet',
    name: 'Imán de Genes',
    desc: 'Los genes voladores se sienten atraídos hacia ti.',
    icon: '🧲',
    max: 3,
    baseCost: 70,
    effect: (l) => (l === 0 ? 'sin imán' : `radio ${90 + l * 35}px`),
  },
]

export function upgradeCost(def: UpgradeDef, currentLvl: number): number {
  return Math.round(def.baseCost * (1 + currentLvl * 0.6))
}

export function defaultUpgrades(): Upgrades {
  return { legs: 0, brain: 0, liver: 0, eye: 0, boots: 0, magnet: 0 }
}

// Clima/aleatorio determinista por semilla (mulberry32)
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
