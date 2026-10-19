// ── DRUNKOLUTION: motor de ebriedad, jefes y generación procedural ──────────
import {
  W,
  H,
  GRAVITY,
  MOVE_SPEED,
  JUMP_V,
  MAX_FALL,
  PX_PER_M,
  ERA_HEIGHT_M,
  COSMOS_M,
  MAX_LIVES,
  START_LIVES,
  ERAS,
  ERA_COUNT,
  eraAtM,
  eraStartM,
  BOSS_DEFS,
  bossZoneM,
  SPONSORS,
  drunkStateOf,
  mulberry32,
} from './eras'
import { sfx } from './audio'
import type {
  Platform,
  Item,
  Particle,
  FloatText,
  Upgrades,
  HudData,
  RunSummary,
  RunState,
  EngineEvents,
  PlatformKind,
  ItemKind,
  Boss,
  Projectile,
  Crow,
  HangoverData,
  ProjKind,
} from './types'
import type { BossDef } from './eras'

const PLAT_H = 16
const RESACA_ICONS = ['💧', '💊', '☕', '🥛']

const PHONE_LINES = [
  '📞 "¿Hola? Sí, estoy EVOLUCIONANDO..."',
  '📞 "No, mamá, el mono NO es una fase"',
  '📞 "Lo del ex fue un error... otra vez"',
  '📞 "¿Una llamada a las 3 de la mañana?"',
]

// tabla de tipos de plataforma por era (Pilar 3: cada era, su mundo)
const KIND_TABLES: Array<Array<[PlatformKind, number]>> = [
  [['normal', 0.85], ['moving', 0.15]], // 0 Mioceno (tutorial)
  [['crumble', 0.42], ['normal', 0.45], ['moving', 0.13]], // 1 Neolítico
  [['moving', 0.48], ['normal', 0.4], ['bounce', 0.12]], // 2 Egipto
  [['ice', 0.5], ['normal', 0.35], ['moving', 0.15]], // 3 Grecia
  [['bounce', 0.3], ['normal', 0.5], ['moving', 0.2]], // 4 Roma
  [['spike', 0.16], ['crumble', 0.16], ['normal', 0.5], ['moving', 0.18]], // 5 Media
  [['vmove', 0.45], ['normal', 0.35], ['moving', 0.2]], // 6 Renacimiento
  [['melt', 0.45], ['normal', 0.3], ['ice', 0.15], ['vmove', 0.1]], // 7 Impresionismo
  [['fake', 0.3], ['normal', 0.45], ['moving', 0.15], ['crumble', 0.1]], // 8 Prohibición
  [['normal', 0.4], ['moving', 0.28], ['bounce', 0.14], ['crumble', 0.18]], // 9 Industrial
  [['blink', 0.5], ['normal', 0.28], ['moving', 0.22]], // 10 Años 80
  [['holo', 0.45], ['normal', 0.3], ['moving', 0.15], ['blink', 0.1]], // 11 Cyberpunk
  [['normal', 0.5], ['vmove', 0.2], ['moving', 0.2], ['bounce', 0.1]], // 12 Espacio
]

export class Engine {
  upgrades: Upgrades
  record: number
  events: EngineEvents = {}
  vip = false // Tarjeta VIP del Borracho: sin intersticiales

  state: RunState = 'running'
  time = 0
  duration = 0

  // jugador
  px = W / 2
  py = -20
  vx = 0
  vy = 0
  pw = 28
  ph = 38
  face = 1
  onGround = false
  standOn: Platform | null = null
  coyote = 0
  jumpBuf = 0
  airJumps = 0
  invuln = 0

  // ── Motor de Ebriedad ──
  drunk = 0
  courageT = 0
  swayPhase = Math.random() * Math.PI * 2
  soberT = 0 // tiempo continuo sobrio (estancamiento de ADN)
  stagnated = false
  stagnWarnT = 0
  hipoT = 7 // ¡HIPO! saltito automático
  blackoutT = 0 // ragdoll de 2s
  invertT = 0 // controles invertidos (Sir Abstinence)
  slowT = 0 // congelado (Mamut)
  netT = 0 // atrapado en red (Agente)
  shieldT = 0 // escudo de grasa (Kebab)
  plateT = 0 // plato de tapas orbitando
  plateAng = 0
  tapas = 0
  phoneT = 0 // teléfono del ex (hover + invulnerable)
  phoneLineT = 0

  // estadísticas de la partida
  genesRun = 0
  bottles = 0
  falls = 0
  lives = START_LIVES
  maxAltitude = 0
  curEra = 0
  maxEraRun = 0
  cosmosReached = false
  divine = false
  newRecord = false
  checkpointY = 0
  bossesWon = 0

  // multiplicador de genes de la partida (anuncio ×2 antes de empezar)
  geneBoost = 1
  // progreso ya contabilizado tras un game over (continuar por anuncio)
  bankedGenes = 0
  bankedBottles = 0
  bankedFalls = 0
  bankedAlt = 0
  bankedBosses = 0

  // cámara y mundo
  camTop = 0
  platforms: Platform[] = []
  items: Item[] = []
  particles: Particle[] = []
  floats: FloatText[] = []
  crows: Crow[] = []
  projectiles: Projectile[] = []
  boss: Boss | null = null
  bossBlocking = false
  private nextId = 1
  private genY = 0
  private prevGenX = W / 2
  private nextCheckpointIdx = 1
  private nextBossIdx = 0
  private rowsSinceCp = 0 // filas generadas desde el último checkpoint (escalera de entrada segura)
  private gateSpawned = false
  gateY: number | null = null

  banner: { text: string; sub: string; t: number } | null = null
  flashT = 0
  hangover: HangoverData | null = null
  hangoverFreeze = false

  input = { left: false, right: false }
  jumpPressed = false

  private rand: () => number

  constructor(upgrades: Upgrades, record: number) {
    this.upgrades = { ...upgrades }
    this.record = record
    this.rand = mulberry32((Math.random() * 1e9) | 0)
    this.initWorld()
  }

  private initWorld(): void {
    // suelo inicial
    this.addPlatform(W / 2 - 150, 0, 300, 'ground', 0)
    this.py = -this.ph / 2 - 0.5
    this.camTop = this.py - H * 0.55
    this.genY = -6 // primera fila a ~98-122px del suelo: alcanzable con un salto
    this.prevGenX = W / 2
    this.maxAltitude = 0
    this.ensureGen()
  }

  // ── utilidades ────────────────────────────────────────────────────────────
  private addPlatform(x: number, y: number, w: number, kind: PlatformKind, era: number): Platform {
    const p: Platform = {
      id: this.nextId++,
      x,
      y,
      w,
      h: PLAT_H,
      kind,
      era,
      baseX: x,
      baseY: y,
      range: 0,
      phase: this.rand() * Math.PI * 2,
      speed: 1.1 + this.rand() * 1.3,
      dx: 0,
      dy: 0,
      touchT: 0,
      broken: false,
      vy: 0,
      alpha: 1,
      baseW: w,
      regrowT: 0,
      revealT: 0,
      aux: 0,
      used: false,
    }
    if (kind === 'moving') {
      p.range = 30 + this.rand() * 42
      p.baseX = Math.min(Math.max(x, 16 + p.range), W - 16 - w - p.range)
      p.x = p.baseX
    } else if (kind === 'vmove') {
      p.range = 26 + this.rand() * 26 // antes 36+34: en lo alto el hueco era imposible
      // Math.max soltaba la plataforma HACIA ABAJO al inicio de era: agujeros de 300px
      p.baseY = Math.min(y, -eraStartM(era) * PX_PER_M + 60)
      p.y = p.baseY
    }
    this.platforms.push(p)
    return p
  }

  private addItem(kind: ItemKind, x: number, y: number): void {
    this.items.push({ id: this.nextId++, kind, x, y, taken: false, t: this.rand() * 6 })
  }

  private addFloat(x: number, y: number, text: string, color: string, size = 16): void {
    this.floats.push({ x, y, vy: -46, life: 1.1, maxLife: 1.1, text, color, size })
    if (this.floats.length > 24) this.floats.shift()
  }

  addParticle(o: Partial<Particle>): void {
    if (this.particles.length > 260) return
    this.particles.push({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0.6,
      maxLife: 0.6,
      size: 4,
      color: '#fff',
      kind: 'dust',
      grav: 0,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 6,
      ...o,
    })
  }

  burst(x: number, y: number, color: string, n: number, kind: Particle['kind'], speed = 130): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      const s = speed * (0.4 + Math.random() * 0.8)
      this.addParticle({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.5 + Math.random() * 0.5,
        maxLife: 1,
        size: 3 + Math.random() * 4,
        color,
        kind,
        grav: kind === 'confetti' ? 420 : kind === 'bubble' ? -160 : 60,
      })
    }
  }

  heightM(): number {
    return Math.max(0, -this.py / PX_PER_M)
  }

  hud(): HudData {
    return {
      altitude: Math.round(this.heightM()),
      eraIdx: this.curEra,
      genesRun: this.genesRun,
      lives: this.lives,
      drunk: this.drunk,
      drunkState: drunkStateOf(this.drunk).key,
      stagnated: this.stagnated,
      courage: this.courageT > 0,
      divine: this.divine,
      newRecord: this.newRecord,
      state: this.state,
      shield: this.shieldT > 0,
      plate: this.plateT > 0,
      phone: this.phoneT > 0,
      invert: this.invertT > 0,
      slow: this.slowT > 0,
      netted: this.netT > 0,
      blackout: this.blackoutT > 0 ? this.blackoutT / 2 : 0,
      ammo: this.bottles,
      boss:
        this.boss && !this.boss.dead
          ? { name: BOSS_DEFS[this.boss.idx].name, hp: this.boss.hp, maxHp: this.boss.maxHp }
          : null,
      hangover: this.hangover ? { ...this.hangover, seq: [...this.hangover.seq] } : null,
    }
  }

  // ¿esta plataforma es sólida ahora mismo?
  private solid(p: Platform): boolean {
    if (p.broken || p.alpha <= 0) return false
    if (p.kind === 'hidden' && p.revealT <= 0) return false
    if (p.kind === 'fake') return false // ¡parece sólida pero no lo es!
    if (p.kind === 'blink' && Math.sin(this.time * 1.5 + p.phase) <= -0.35) return false
    if (p.kind === 'holo' && p.aux > 0) return false // glitch: atraviesas
    return true
  }

  // ── generación procedural ────────────────────────────────────────────────
  ensureGen(): void {
    const target = this.camTop - 620
    while (this.genY > target && !this.bossBlocking) this.spawnNext()
  }

  // La llegada a cada checkpoint debe ser justa: la última plataforma generada
  // debe ser sólida, estable y a salto seguro del checkpoint. Si es crumble se
  // rompería (0.45s) antes de permitir despegar; si es vmove se hunde hasta
  // 52px; si es hidden la ruta visible queda rota. Se corrige al momento.
  private sanitizePreCheckpoint(yB: number): void {
    const prev = this.platforms[this.platforms.length - 1]
    if (!prev || prev.kind === 'checkpoint' || prev.kind === 'ground') return
    if (prev.kind === 'hidden') {
      // LEDGE visible de bienvenida a 92px bajo el checkpoint: garantiza el
      // último tramo aunque el puente oculto no esté revelado
      const lx = Math.min(Math.max(this.prevGenX + (this.rand() * 2 - 1) * 60, 40), W - 136)
      this.addPlatform(lx, yB + 92, 96, 'normal', prev.era)
      this.prevGenX = lx
    } else if (prev.kind === 'crumble') {
      prev.kind = 'normal' // sólida para siempre: es el trampolín al checkpoint
      prev.touchT = 0
    } else if (prev.kind === 'vmove') {
      prev.kind = 'normal'
      prev.baseY = Math.min(prev.baseY, yB + 104) // nunca a más de 104px del checkpoint
      prev.y = prev.baseY
    }
  }

  private spawnNext(): void {
    // 1) ¿corresponde un checkpoint de era antes que una fila?
    if (this.nextCheckpointIdx < ERA_COUNT) {
      const yB = -eraStartM(this.nextCheckpointIdx) * PX_PER_M
      // 140 dejaba el salto de llegada a ~20px del máximo real (~161px): el
      // inicio de cada era se sentía imposible. 108 = margen cómodo.
      if (this.genY - 108 <= yB) {
        this.sanitizePreCheckpoint(yB)
        const cp = this.addPlatform(W / 2 - 105, yB, 210, 'checkpoint', this.nextCheckpointIdx)
        cp.used = false
        this.rowsSinceCp = 0 // la escalera de entrada de la era renace segura
        this.addItem('gene', W / 2 - 40, yB - 34)
        this.addItem('gene', W / 2, yB - 46)
        this.addItem('gene', W / 2 + 40, yB - 34)
        this.nextCheckpointIdx++
        this.genY = yB + 20
        this.prevGenX = W / 2
        return
      }
    }
    // 2) ¿arena de un jefe?
    if (this.nextBossIdx < BOSS_DEFS.length) {
      const def = BOSS_DEFS[this.nextBossIdx]
      const yZ = -bossZoneM(def) * PX_PER_M
      // 220 dejaba huecos de hasta 220px; 140 dejaba solo ~20px de margen
      if (this.genY - 108 <= yZ) {
        this.sanitizePreCheckpoint(yZ)
        this.rowsSinceCp = 0
        this.spawnBossZone(def, yZ)
        return
      }
    }
    // 3) puerta de la ascensión
    const yGate = -COSMOS_M * PX_PER_M
    if (!this.gateSpawned && this.genY <= yGate + 140) {
      this.gateY = yGate
      this.gateSpawned = true
      this.rowsSinceCp = 0
      this.addPlatform(W / 2 - 160, yGate, 320, 'checkpoint', ERA_COUNT - 1)
      this.genY = yGate + 20
      this.prevGenX = W / 2
      return
    }

    const era = eraAtM(-this.genY / PX_PER_M)
    const r = this.rand()
    if (r < 0.1) this.spawnBottleCluster(era)
    else if (era >= 4 && r < 0.19) this.spawnWallGap(era)
    else this.spawnNormalRow(era)
  }

  private spawnBossZone(def: BossDef, yZ: number): void {
    // arena: suelo ancho con bandera + jefe flotando arriba
    const cp = this.addPlatform(W / 2 - 130, yZ, 260, 'checkpoint', def.era)
    cp.used = true
    this.checkpointY = yZ
    // botellas de munición en la arena
    this.addItem('bottle', W / 2 - 90, yZ - 40)
    this.addItem('bottle', W / 2 + 90, yZ - 40)
    this.addItem('bottle', W / 2, yZ - 56)
    this.boss = {
      idx: this.nextBossIdx,
      type: def.type,
      x: W / 2,
      y: yZ - 250,
      baseY: yZ - 250,
      hp: def.hp,
      maxHp: def.hp,
      t: 0,
      hurtT: 0,
      dead: false,
      shootT: 1.5,
      phase: this.rand() * Math.PI * 2,
      telegraph: null,
    }
    this.bossBlocking = true
    this.nextBossIdx++
    // -40/-10 dejaban la primera fila a 132-176px: a veces IMPOSIBLE salir.
    // +20 replica la generación natural: fila a 74-116px del suelo de la arena
    this.genY = yZ + 20 // la generación continúa cuando caiga el jefe
    this.banner = { text: `👹 ${def.name.toUpperCase()}`, sub: def.taunt, t: 0 }
    this.flashT = 0.5
    sfx.bossRoar()
  }

  private rowGapFor(era: number): number {
    return 92 + this.rand() * 24 + Math.min(era, 9) * 2.2
  }

  private platWidth(era: number): number {
    const base = era === 0 ? Math.max(70, 100 - era * 2) : Math.max(56, 82 - era * 2)
    return base + this.rand() * 16
  }

  private pickKind(era: number): PlatformKind {
    const table = KIND_TABLES[Math.min(era, KIND_TABLES.length - 1)]
    let r = this.rand()
    for (const [kind, w] of table) {
      if (r < w) return kind
      r -= w
    }
    return 'normal'
  }

  private spawnNormalRow(era: number): void {
    let kind = this.pickKind(era)
    const prevKind = this.platforms[this.platforms.length - 1]?.kind
    // vmove se hunde hasta 52px desde su base: dos vmove seguidos podían
    // sumar +104px al hueco (imposible). Nunca consecutivos y hueco compensado
    if (kind === 'vmove' && prevKind === 'vmove') kind = 'normal'
    // ANTI-SOFTLOCK: las 3 primeras filas tras un checkpoint/jefe nunca son
    // frágiles: si la entrada de la era se rompía (crumble/melt), el salto
    // restante superaba el máximo y el mono quedaba atrapado para siempre
    if (this.rowsSinceCp < 3 && (kind === 'crumble' || kind === 'melt' || kind === 'fake')) kind = 'normal'
    this.rowsSinceCp++
    const dip = (kind === 'vmove' ? 52 : 0) + (prevKind === 'vmove' ? 52 : 0)
    const gap = dip > 0 ? Math.max(60, Math.min(this.rowGapFor(era), 155 - dip)) : this.rowGapFor(era)
    this.genY -= gap
    const y = this.genY
    const w = this.platWidth(era)
    const spread = 150 + this.rand() * 55
    const x = Math.min(Math.max(this.prevGenX + (this.rand() * 2 - 1) * spread, 30), W - 30 - w)
    let mainKind = kind
    if (kind === 'fake') {
      // LA RUTA NUNCA DEPENDE DE UNA FAKE: la principal es real y la fake
      // queda de gemela troll al lado (la misma broma, cero callejones)
      mainKind = 'normal'
      const wF = this.platWidth(era)
      const xF = Math.min(
        Math.max(x + (w + 100 + this.rand() * 80) * (this.rand() < 0.5 ? -1 : 1), 24),
        W - 24 - wF
      )
      this.addPlatform(xF, y + this.rand() * 20 - 10, wF, 'fake', era)
    }
    this.addPlatform(x, y, w, mainKind, era)

    // cuervos empujadores de la Edad Media
    if (era === 5 && this.rand() < 0.35) {
      this.crows.push({
        x: 40 + this.rand() * (W - 80),
        y: y - 70 - this.rand() * 50,
        vx: (this.rand() < 0.5 ? -1 : 1) * (50 + this.rand() * 45),
        t: 0,
        dead: false,
      })
    }

    // genes
    if (this.rand() < 0.55) {
      this.addItem('gene', x + w / 2, y - 30)
      if (this.rand() < 0.3) {
        this.addItem('gene', x + w / 2 - 24, y - 52)
        this.addItem('gene', x + w / 2 + 24, y - 52)
      }
    }
    if (this.rand() < 0.035) this.addItem('banana', x + w / 2, y - 34)

    // power-ups cómicos
    const pr = this.rand()
    if (era >= 2 && pr < 0.016) this.addItem('kebab', x + w / 2, y - 46)
    else if (era >= 3 && pr < 0.028) this.addItem('phone', x + w / 2, y - 46)
    else if (era >= 4 && pr < 0.041) this.addItem('tapas', x + w / 2, y - 46)

    this.prevGenX = x

    // segunda plataforma a veces
    if (this.rand() < Math.max(0.12, 0.32 - era * 0.015)) {
      const w2 = this.platWidth(era)
      let x2 = x + (w + 120 + this.rand() * 90) * (this.rand() < 0.5 ? -1 : 1)
      x2 = Math.min(Math.max(x2, 24), W - 24 - w2)
      if (Math.abs(x2 - x) > w / 2 + w2 / 2 + 60) {
        const k2 = mainKind === 'crumble' ? 'normal' : mainKind
        this.addPlatform(x2, y + this.rand() * 26 - 13, w2, k2, era)
        if (this.rand() < 0.4) this.addItem('gene', x2 + w2 / 2, y - 40)
      }
    }
  }

  private spawnBottleCluster(era: number): void {
    // fila con botella
    this.genY -= this.rowGapFor(era)
    const y1 = this.genY
    const w1 = this.platWidth(era) + 14
    const x1 = Math.min(Math.max(this.prevGenX + (this.rand() * 2 - 1) * 140, 30), W - 30 - w1)
    this.addPlatform(x1, y1, w1, 'normal', era)
    this.addItem('bottle', x1 + w1 / 2, y1 - 26)
    this.prevGenX = x1

    // escalera oculta con botín
    this.genY -= 94
    const y2 = this.genY
    const hx1 = Math.min(Math.max(x1 + 60 + this.rand() * 70, 30), W - 96)
    this.addPlatform(hx1, y2, 66, 'hidden', era)
    this.addItem('gene', hx1 + 33, y2 - 28)
    if (this.rand() < 0.5) this.addItem('gene', hx1 + 33, y2 - 52)

    this.genY -= 94
    const y3 = this.genY
    const hx2 = Math.min(Math.max(hx1 + 50 + this.rand() * 70, 24), W - 90)
    this.addPlatform(hx2, y3, 66, 'hidden', era)
    for (let i = 0; i < 3; i++) this.addItem('gene', hx2 + 33, y3 - 30 - i * 24)
    if (this.rand() < 0.35) this.addItem('banana', hx2 + 33, y3 - 106)
    this.prevGenX = hx2
  }

  private spawnWallGap(era: number): void {
    // muro imposible sin beber: botella + puente oculto
    this.genY -= this.rowGapFor(era)
    const y1 = this.genY
    const w1 = this.platWidth(era) + 14
    const x1 = Math.min(Math.max(this.prevGenX + (this.rand() * 2 - 1) * 120, 30), W - 30 - w1)
    this.addPlatform(x1, y1, w1, 'normal', era)
    this.addItem('bottle', x1 + w1 / 2, y1 - 26)
    if (this.rand() < 0.4) this.addItem('gene', x1 + w1 / 2 - 30, y1 - 30)

    const hx1 = Math.min(Math.max(x1 + 55 + this.rand() * 45, 24), W - 90)
    const hx2 = Math.min(Math.max(x1 + 125 + this.rand() * 55, 24), W - 90)
    this.addPlatform(hx1, y1 - 95, 66, 'hidden', era)
    this.addItem('gene', hx1 + 33, y1 - 124)
    this.addPlatform(hx2, y1 - 205, 66, 'hidden', era)
    this.addItem('gene', hx2 + 33, y1 - 234)

    this.genY = y1 - 322
    const w3 = this.platWidth(era)
    const x3 = Math.min(Math.max(hx2 + (this.rand() * 2 - 1) * 70, 30), W - 30 - w3)
    this.addPlatform(x3, this.genY, w3, this.rand() < 0.3 ? 'moving' : 'normal', era)
    if (this.rand() < 0.6) this.addItem('gene', x3 + w3 / 2, this.genY - 30)
    this.prevGenX = x3
  }

  // ── bucle principal ──────────────────────────────────────────────────────
  update(dt: number): void {
    if (this.state !== 'running') {
      this.updateParticles(dt)
      return
    }
    this.time += dt
    this.duration += dt
    if (this.flashT > 0) this.flashT -= dt
    if (this.invuln > 0) this.invuln -= dt
    if (this.courageT > 0) this.courageT -= dt
    if (this.banner) {
      this.banner.t += dt
      if (this.banner.t > 2.6) this.banner = null
    }

    // minijuego de resaca: el mundo se congela mientras curas la cruda
    if (this.hangoverFreeze) {
      this.updateParticles(dt)
      this.updateHangover(dt)
      return
    }

    this.updatePlatforms(dt)
    this.updatePlayer(dt)
    this.updateItems(dt)
    this.updateDrunk(dt)
    this.updatePowerups(dt)
    this.updateBoss(dt)
    this.updateProjectiles(dt)
    this.updateParticles(dt)
    this.updateCamera(dt)
    this.checkEra()
    this.ensureGen()
    this.prune()
  }

  private updatePlatforms(dt: number): void {
    for (const p of this.platforms) {
      if (p.kind === 'moving') {
        const nx = p.baseX + Math.sin(this.time * p.speed + p.phase) * p.range
        p.dx = nx - p.x
        p.x = nx
      }
      if (p.kind === 'vmove') {
        const ny = p.baseY + Math.sin(this.time * p.speed * 0.8 + p.phase) * p.range
        p.dy = ny - p.y
        p.y = ny
      }
      if (p.kind === 'hidden' && p.revealT > 0) p.revealT -= dt
      if (p.kind === 'holo') {
        // glitch aleatorio: se vuelve intangible un instante
        if (p.aux > 0) p.aux -= dt
        else if (this.rand() < dt * 0.35) p.aux = 0.4 + this.rand() * 0.3
      }
      if (p.kind === 'melt') {
        // la absenta derrite las plataformas (Van Gogh llora)… pero SOLO si
        // alguien las pisa: derritiéndose solas dejaban huecos imposibles
        if (this.standOn === p) {
          p.w -= 8 * dt
          if (p.w < 26) {
            p.broken = true
            p.vy = 40
          }
        }
      }
      if (p.broken) {
        if (p.kind === 'crumble' || p.kind === 'melt') {
          // ANTI-SOFTLOCK: las plataformas frágiles REGENERAN. Antes se rompían
          // para siempre y la poda las borraba: un solo pisotón dejaba agujeros
          // de +180px (salto máx ~169px) y el mono quedaba atrapado de por vida
          if (p.alpha > 0.03) {
            // animación de caída/desvanecimiento (intacta)
            p.vy += GRAVITY * 0.45 * dt
            p.y += p.vy * dt
            p.alpha -= dt * 1.4
            if (p.alpha <= 0.03) {
              p.alpha = 0.03 // fantasma: invisible pero vive (prune no la come)
              p.y = p.baseY
              p.vy = 0
              p.regrowT = 6
            }
          } else {
            p.regrowT -= dt
            if (p.regrowT <= 0) {
              p.broken = false
              p.alpha = 1
              p.touchT = 0
              p.vy = 0
              p.y = p.baseY
              p.w = p.baseW
              p.revealT = 0
              this.burst(p.x + p.w / 2, p.y + 4, ERAS[p.era].accent, 6, 'sparkle', 70)
            }
          }
        } else {
          p.vy += GRAVITY * 0.45 * dt
          p.y += p.vy * dt
          p.alpha -= dt * 1.4
        }
      }
    }
  }

  private updatePlayer(dt: number): void {
    // ── BLACKOUT: ragdoll sin control durante 2s ──
    if (this.blackoutT > 0) {
      this.blackoutT -= dt
      if (this.onGround) {
        // sigue "dormido" sobre la plataforma sin atravesarla
        this.vy = 0
        if (this.standOn) this.py = this.standOn.y - this.ph / 2
        this.vx *= 1 - 3 * dt
      } else {
        const grav = ERAS[this.curEra].gravityMul * (this.divine ? 0.75 : 1)
        this.vy = Math.min(MAX_FALL, this.vy + GRAVITY * grav * dt)
        const prevBottom = this.py + this.ph / 2
        this.px = Math.min(W - 14, Math.max(14, this.px + this.vx * dt))
        this.py += this.vy * dt
        // puede aterrizar sin control (aterrizaje de milagro)
        if (this.vy >= 0) {
          const bottom = this.py + this.ph / 2
          for (const p of this.platforms) {
            if (!this.solid(p)) continue
            if (this.px + this.pw / 2 <= p.x || this.px - this.pw / 2 >= p.x + p.w) continue
            if (prevBottom > p.y + 10 || bottom < p.y) continue
            this.py = p.y - this.ph / 2
            this.vy = 0
            this.onGround = true
            this.standOn = p
            break
          }
        }
      }
      if (Math.random() < dt * 8) this.vx += (Math.random() - 0.5) * 260
      if (Math.random() < dt * 10) {
        this.addParticle({
          x: this.px,
          y: this.py,
          vx: (Math.random() - 0.5) * 60,
          vy: (Math.random() - 0.5) * 60,
          life: 0.5,
          maxLife: 0.5,
          size: 3,
          color: '#f472b6',
          kind: 'star',
          grav: 0,
        })
      }
      if (this.blackoutT <= 0) {
        if (this.onGround) {
          this.drunk = 0.35
          this.addFloat(this.px, this.py - 46, '¿QUÉ PASÓ AQUÍ? 🐒', '#f472b6', 15)
        } else {
          this.loseLife()
        }
      }
      return
    }

    // teléfono del ex: hover en el aire
    if (this.phoneT > 0) {
      this.phoneT -= dt
      this.phoneLineT -= dt
      this.vy = 0
      this.vx *= 1 - 4 * dt
      this.px += this.vx * dt
      if (this.phoneLineT <= 0) {
        this.phoneLineT = 1.7
        this.addFloat(
          this.px,
          this.py - 50,
          PHONE_LINES[Math.floor(Math.random() * PHONE_LINES.length)],
          '#7dd3fc',
          12
        )
      }
      if (this.phoneT <= 0) {
        this.vy = 300 // cuelgas y pierdes algo de altura: el precio de contestar
        this.addFloat(this.px, this.py - 40, ' chau, te llamo luego', '#94a3b8', 12)
      }
      return
    }

    // entrada horizontal (con efectos que la alteran)
    let dir = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0)
    if (this.invertT > 0) dir = -dir
    if (this.netT > 0) dir = 0
    if (dir !== 0) this.face = dir
    const stateMul = this.slowT > 0 ? 0.45 : 1
    const target = dir * MOVE_SPEED * stateMul
    const onIce = this.onGround && this.standOn?.kind === 'ice'
    const ciego = this.drunk > 0.7 ? 1 - (this.drunk - 0.7) / 0.3 * 0.35 : 1 // hasta -35% control
    let accel = this.onGround ? (onIce ? 850 : 4400) : 2700
    accel *= stateMul * ciego
    const dv = target - this.vx
    this.vx += Math.max(-accel * dt, Math.min(accel * dt, dv))
    if (this.netT > 0) {
      this.netT -= dt
      this.vx *= 1 - 6 * dt
    }
    if (this.invertT > 0) this.invertT -= dt
    if (this.slowT > 0) this.slowT -= dt

    // tambaleo de borracho (inercia altísima en estado Ciego)
    const brain = this.upgrades.brain
    const dEff = this.drunk * (1 - 0.1 * brain)
    const sway = Math.sin(this.time * 4.6 + this.swayPhase) * 950 * dEff * dEff
    this.vx += sway * dt
    if (dEff > 0.3 && Math.random() < dEff * 0.06) this.vx += (Math.random() - 0.5) * 220

    // salto
    if (this.jumpPressed) {
      this.jumpBuf = 0.13
      this.jumpPressed = false
    }
    if (this.coyote > 0) this.coyote -= dt
    if (this.jumpBuf > 0) this.jumpBuf -= dt
    if (this.jumpBuf > 0) {
      const jumpMul =
        (1 + 0.06 * this.upgrades.legs) *
        (this.courageT > 0 ? 1.1 : 1) *
        (this.drunk > 0.3 && this.drunk <= 0.7 ? 1.05 : 1) * // Alegre: rebote más alto
        (this.divine ? 1.05 : 1)
      if (this.onGround || this.coyote > 0) {
        this.vy = -JUMP_V * jumpMul
        this.onGround = false
        this.standOn = null
        this.coyote = 0
        this.jumpBuf = 0
        sfx.jump()
        this.burst(this.px, this.py + this.ph / 2, 'rgba(255,255,255,0.5)', 6, 'dust', 70)
      } else if (this.airJumps > 0) {
        this.vy = -JUMP_V * 0.92 * jumpMul
        this.airJumps--
        this.jumpBuf = 0
        sfx.airJump()
        this.burst(this.px, this.py + this.ph / 2, '#fde047', 10, 'sparkle', 120)
      }
    }

    // gravedad e integración
    const grav = ERAS[this.curEra].gravityMul * (this.divine ? 0.75 : 1)
    this.vy = Math.min(MAX_FALL, this.vy + GRAVITY * grav * dt)
    const prevBottom = this.py + this.ph / 2
    this.px += this.vx * dt
    if (this.px < 14) {
      this.px = 14
      this.vx = Math.abs(this.vx) * 0.35
    }
    if (this.px > W - 14) {
      this.px = W - 14
      this.vx = -Math.abs(this.vx) * 0.35
    }
    this.py += this.vy * dt

    // mantenerse sobre plataforma
    if (this.onGround && this.standOn) {
      const p = this.standOn
      if (!this.solid(p)) {
        this.onGround = false
        this.coyote = 0.09
        this.standOn = null
      } else {
        if (p.kind === 'moving') this.px += p.dx
        if (p.kind === 'vmove') this.py += p.dy
        const overlap = this.px + this.pw / 2 > p.x && this.px - this.pw / 2 < p.x + p.w
        const atTop = this.py + this.ph / 2 >= p.y - 6 && this.py + this.ph / 2 <= p.y + 12
        if (!overlap || !atTop) {
          this.onGround = false
          this.coyote = 0.09
          this.standOn = null
        } else {
          this.py = p.y - this.ph / 2
          this.vy = 0
          if (p.kind === 'crumble' && !p.broken) {
            p.touchT += dt
            if (p.touchT > 0.45) {
              p.broken = true
              sfx.crumble()
            }
          }
        }
      }
    }

    // aterrizaje (colisión unidireccional desde arriba)
    if (!this.onGround && this.vy >= 0) {
      const bottom = this.py + this.ph / 2
      for (const p of this.platforms) {
        if (!this.solid(p)) continue
        if (this.px + this.pw / 2 <= p.x || this.px - this.pw / 2 >= p.x + p.w) continue
        if (prevBottom > p.y + 10 || bottom < p.y) continue
        if (p.kind === 'bounce') {
          this.vy = -JUMP_V * 1.55
          sfx.bounce()
          this.burst(this.px, p.y, ERAS[p.era].accent, 12, 'sparkle', 150)
        } else if (p.kind === 'spike') {
          // pinchos medievales: rebote doloroso (no quita vida, quita dignidad)
          this.vy = -JUMP_V * 0.85
          this.drunk = Math.max(0, this.drunk - 0.08)
          this.invuln = 0.8
          sfx.spike()
          this.addFloat(this.px, p.y - 30, '¡AY! ¡PINCHOS!', '#f87171', 15)
          this.burst(this.px, p.y, '#f87171', 10, 'dust', 140)
        } else {
          if (this.vy > 500) sfx.land()
          if (this.vy > 350)
            this.burst(this.px, p.y, 'rgba(255,255,255,0.6)', 5, 'dust', 80)
          this.py = p.y - this.ph / 2
          this.vy = 0
          this.onGround = true
          this.standOn = p
          this.airJumps = this.upgrades.boots
          if (p.kind === 'checkpoint' && !p.used) {
            p.used = true
            sfx.checkpoint()
            this.addFloat(this.px, p.y - 40, 'CHECKPOINT', '#4ade80', 15)
          }
        }
        break
      }
    }

    // altura / récord
    const alt = this.heightM()
    if (alt > this.maxAltitude) {
      this.maxAltitude = alt
      if (this.record > 0 && alt > this.record && !this.newRecord) {
        this.newRecord = true
        this.addFloat(this.px, this.py - 50, '¡NUEVO RÉCORD!', '#fde047', 18)
        this.burst(this.px, this.py, '#fde047', 14, 'sparkle', 160)
      }
    }

    // caída al vacío
    if (this.py - this.ph / 2 > this.camTop + H + 70) this.loseLife()
  }

  private updateItems(dt: number): void {
    const magnetLvl = this.upgrades.magnet
    const magnetR = 90 + magnetLvl * 35
    for (const it of this.items) {
      if (it.taken) {
        // botellas bebidas: cuenta atrás para reaparecer en su sitio
        if (it.kind === 'bottle' && it.respawnT !== undefined) {
          it.respawnT -= dt
          if (it.respawnT <= 0) {
            it.taken = false
            it.respawnT = undefined
            this.burst(it.x, it.y, '#fbbf24', 6, 'bubble', 80)
          }
        }
        continue
      }
      it.t += dt
      const dx = this.px - it.x
      const dy = this.py - it.y
      const d = Math.hypot(dx, dy)
      if (magnetLvl > 0 && it.kind === 'gene' && d < magnetR) {
        const pull = 1100 * (1 - d / magnetR) + 300
        it.x += (dx / (d || 1)) * pull * dt
        it.y += (dy / (d || 1)) * pull * dt
        it.magnet = true
      }
      const grabR = it.kind === 'bottle' ? 36 : it.kind === 'phone' || it.kind === 'kebab' || it.kind === 'tapas' ? 34 : 30
      if (d < grabR) this.collect(it)
    }
  }

  private collect(it: Item): void {
    it.taken = true
    const ds = drunkStateOf(this.drunk)
    const mult = this.stagnated ? 0 : ds.mult
    const shown = (n: number) => (Number.isInteger(n) ? `${n}` : n.toFixed(1))
    if (it.kind === 'gene') {
      const gain = mult * this.geneBoost * (this.divine ? 2 : 1)
      this.genesRun += gain
      sfx.gene()
      if (this.stagnated) {
        if (this.stagnWarnT <= 0) {
          this.stagnWarnT = 2
          this.addFloat(it.x, it.y - 10, 'ADN CONGELADO: ¡BEBE! 🍺', '#f87171', 14)
        }
        this.stagnWarnT -= 0.1
      } else {
        this.addFloat(it.x, it.y - 10, `+${shown(gain)}`, mult > 1 ? '#fbbf24' : '#a7f3d0', mult > 1 ? 17 : 14)
      }
      this.burst(it.x, it.y, '#6ee7b7', 5, 'sparkle', 90)
    } else if (it.kind === 'bottle') {
      this.drunk = Math.min(1, this.drunk + 0.32)
      this.courageT = 8
      this.bottles++
      it.respawnT = 12 // el brebaje fermenta de nuevo: los muros 'bebe o no pasas' nunca quedan sin botella
      const radius = 240 + this.upgrades.eye * 45
      let revealed = 0
      for (const p of this.platforms) {
        if (p.kind !== 'hidden' || p.revealT > 0) continue
        const d = Math.hypot(p.x + p.w / 2 - it.x, p.y - it.y)
        if (d < radius) {
          p.revealT = 9 + this.upgrades.eye * 2.5
          revealed++
          this.burst(p.x + p.w / 2, p.y, '#fbbf24', 8, 'sparkle', 110)
        }
      }
      sfx.bottle()
      this.addFloat(it.x, it.y - 14, '¡GLUGLUG!', '#fbbf24', 18)
      if (revealed > 0) this.addFloat(it.x, it.y - 38, `${revealed} PLATAFORMAS`, '#fde047', 13)
      this.burst(it.x, it.y, '#fcd34d', 14, 'bubble', 120)
      this.events.onDrink?.()
    } else if (it.kind === 'banana') {
      this.genesRun += 5 * mult * this.geneBoost * (this.divine ? 2 : 1)
      sfx.banana()
      this.addFloat(it.x, it.y - 10, `+5 🍌`, '#facc15', 16)
      this.burst(it.x, it.y, '#fde047', 10, 'sparkle', 110)
    } else if (it.kind === 'phone') {
      // El Teléfono del Ex: hover 5s, invulnerable, +1 vida, pierdes altura
      this.phoneT = 5
      this.phoneLineT = 0.4
      this.lives = Math.min(MAX_LIVES, this.lives + 1)
      this.invuln = Math.max(this.invuln, 5.5)
      this.vy = 0
      sfx.phone()
      this.addFloat(it.x, it.y - 20, '📞 TELÉFONO DEL EX (+1 vida)', '#7dd3fc', 14)
      this.burst(it.x, it.y, '#7dd3fc', 12, 'sparkle', 110)
    } else if (it.kind === 'kebab') {
      if (this.drunk > 0.7 && this.rand() < 0.5) {
        // riesgo: con la vista doble, te comes una botella
        this.drunk = Math.min(1, this.drunk + 0.25)
        sfx.hiccup()
        this.addFloat(it.x, it.y - 20, '¿ESTO NO ERA UN KEBAB? 🍾', '#f472b6', 14)
      } else {
        this.drunk = Math.min(this.drunk, 0.2)
        this.shieldT = 10
        sfx.kebab()
        this.addFloat(it.x, it.y - 20, '🥙 KEBAB DE LA SABIDURÍA', '#fbbf24', 14)
        this.addFloat(it.x, it.y - 42, 'escudo de grasa 10s', '#fde68a', 11)
      }
      this.burst(it.x, it.y, '#fbbf24', 12, 'sparkle', 110)
    } else if (it.kind === 'tapas') {
      this.plateT = 12
      this.tapas = 0
      sfx.tapas()
      this.addFloat(it.x, it.y - 20, '🫓 PLATO DE TAPAS VOLADOR', '#f97316', 14)
      this.burst(it.x, it.y, '#fb923c', 12, 'sparkle', 110)
    }
  }

  private updateDrunk(dt: number): void {
    // BLACKOUT al 100%: ragdoll 2s (si estás en el aire, reza)
    // (se comprueba ANTES de la bajada natural: si no, 1.0 → 0.9997 y nunca ocurre)
    if (this.drunk >= 1 && this.blackoutT <= 0) {
      this.blackoutT = 2
      sfx.blackout()
      this.flashT = 0.6
      this.addFloat(this.px, this.py - 56, '¡BLACKOUT! 😵', '#ef4444', 20)
    }
    if (this.blackoutT <= 0) {
      const rate = 0.02 + 0.007 * this.upgrades.liver
      this.drunk = Math.max(0, this.drunk - rate * dt)
    }
    // estancamiento: si estás sobrio mucho tiempo, el ADN deja de contar
    if (this.drunk < 0.31 && !this.divine) {
      this.soberT += dt
      if (this.soberT > 8) this.stagnated = true
    } else {
      this.soberT = 0
      this.stagnated = false
    }

    // ¡HIPO! saltito automático (más frecuente en estado Ciego)
    this.hipoT -= dt
    if (this.hipoT <= 0) {
      const ciegoAmt = Math.max(0, (this.drunk - 0.7) / 0.3)
      this.hipoT = 10 - ciegoAmt * 6.5 + this.rand() * 4
      if (this.drunk > 0.05) {
        this.vy = Math.min(this.vy, -JUMP_V * 0.5)
        this.onGround = false
        this.standOn = null
        sfx.hiccup()
        this.addFloat(this.px, this.py - 40, '¡HIPO!', '#f472b6', 17)
        this.burst(this.px, this.py, '#f472b6', 6, 'bubble', 90)
        this.events.onHipo?.()
      }
    }

    // BLACKOUT al 100%: ragdoll 2s (si estás en el aire, reza)
    if (this.drunk >= 1 && this.blackoutT <= 0) {
      this.blackoutT = 2
      sfx.blackout()
      this.flashT = 0.6
      this.addFloat(this.px, this.py - 56, '¡BLACKOUT! 😵', '#ef4444', 20)
    }

    // burbujas del mono esponado
    if (this.drunk > 0.12 && Math.random() < this.drunk * 0.14) {
      this.addParticle({
        x: this.px + (Math.random() - 0.5) * 22,
        y: this.py - 8,
        vx: (Math.random() - 0.5) * 30,
        vy: -50 - Math.random() * 50,
        life: 1 + Math.random(),
        maxLife: 2,
        size: 2 + Math.random() * 4,
        color: 'rgba(200,230,255,0.55)',
        kind: 'bubble',
        grav: -40,
      })
    }
    if (this.divine && Math.random() < 0.25) {
      this.addParticle({
        x: this.px + (Math.random() - 0.5) * 30,
        y: this.py + (Math.random() - 0.5) * 30,
        vx: (Math.random() - 0.5) * 40,
        vy: -60,
        life: 0.8,
        maxLife: 0.8,
        size: 2 + Math.random() * 3,
        color: '#fde047',
        kind: 'star',
        grav: 0,
      })
    }
  }

  private updatePowerups(dt: number): void {
    if (this.shieldT > 0) this.shieldT -= dt
    if (this.plateT > 0) {
      this.plateT -= dt
      this.plateAng += dt * 5
    }
  }

  private platePos(): { x: number; y: number } {
    return {
      x: this.px + Math.cos(this.plateAng) * 44,
      y: this.py - 6 + Math.sin(this.plateAng) * 44 * 0.6,
    }
  }

  // ── jefes: guardianes de la sobriedad ────────────────────────────────────
  private updateBoss(dt: number): void {
    const b = this.boss
    if (!b || b.dead) return
    b.t += dt
    if (b.hurtT > 0) b.hurtT -= dt
    const def = BOSS_DEFS[b.idx]

    // movimiento flotante
    switch (b.type) {
      case 'mamut':
        b.x = W / 2 + Math.sin(b.t * 0.7) * 130
        b.y = b.baseY + Math.sin(b.t * 1.1) * 26
        break
      case 'caballero':
        b.x = W / 2 + Math.sin(b.t * 1.0 + b.phase) * 160
        b.y = b.baseY + Math.sin(b.t * 0.8) * 34
        break
      case 'agente':
        b.x = W / 2 + Math.sin(b.t * 0.5) * 90
        b.y = b.baseY + Math.sin(b.t * 0.6) * 16
        break
      case 'sober':
        b.x = W / 2 + Math.sin(b.t * 1.4) * 110
        b.y = b.baseY + Math.sin(b.t * 0.9) * 44
        break
      case 'dios':
        b.x = W / 2 + Math.sin(b.t * 0.6) * 140
        b.y = b.baseY + Math.sin(b.t * 0.5) * 30
        break
    }

    // disparos
    b.shootT -= dt
    if (b.shootT <= 0 && !b.telegraph) {
      this.bossShoot(b, def)
    }

    // telegrafía (luz sagrada del caballero / eructo del dios)
    if (b.telegraph) {
      const tg = b.telegraph
      if (tg.warn > 0) {
        tg.warn -= dt
        if (tg.warn <= 0) tg.active = 0.5
      } else if (tg.active > 0) {
        tg.active -= dt
        if (Math.abs(this.px - tg.x) < 30 && this.invuln <= 0) {
          this.applyBossHit(b.type === 'dios' ? 'planet' : 'holy', tg.x)
          this.invuln = 1
        }
        if (tg.active <= 0) b.telegraph = null
      }
    }

    // contacto con el jefe: rebote (no quita vida)
    const d = Math.hypot(this.px - b.x, this.py - b.y)
    if (d < 46 && this.invuln <= 0) {
      this.vx = (this.px < b.x ? -1 : 1) * 430
      this.vy = Math.min(this.vy, -240)
      this.invuln = 1.2
      this.addFloat(this.px, this.py - 40, '¡CHOCASTE CON LA SOBRIEDAD!', '#f87171', 12)
    }
  }

  private bossShoot(b: Boss, def: BossDef): void {
    const shoot = (kind: ProjKind, vx: number, vy: number, grav: number): void => {
      this.projectiles.push({
        x: b.x,
        y: b.y + 20,
        vx,
        vy,
        kind,
        grav,
        rot: this.rand() * 6,
        fromBoss: true,
        dead: false,
      })
    }
    const toPlayer = (sp: number): { vx: number; vy: number } => {
      const dx = this.px - b.x
      const dy = this.py - b.y
      const n = Math.hypot(dx, dy) || 1
      return { vx: (dx / n) * sp, vy: (dy / n) * sp }
    }
    switch (b.type) {
      case 'mamut': {
        // lanza hielo medicinal en parábola
        shoot('ice', (this.px - b.x) / 1.2, -180, 460)
        b.shootT = 2.2
        break
      }
      case 'caballero': {
        // luz sagrada sobria directa
        const v = toPlayer(320)
        shoot('holy', v.vx, v.vy, 0)
        b.shootT = 1.8
        if (Math.floor(b.t / 6) !== Math.floor((b.t - b.shootT) / 6)) {
          b.telegraph = { x: this.px, warn: 0.8, active: 0 }
        }
        break
      }
      case 'agente': {
        // ráfaga de corchos + red cada tercera ráfaga
        const rafaga = Math.floor(b.t / 1.9)
        for (let i = -1; i <= 1; i++) shoot('cork', i * 110 + (this.px - b.x) / 3, -140, 380)
        if (rafaga % 3 === 2) {
          const v = toPlayer(240)
          shoot('net', v.vx, v.vy, 120)
        }
        b.shootT = 1.9
        break
      }
      case 'sober': {
        // si estás sobrio te apunta con precisión; si estás ciego se confunde
        if (this.drunk < 0.5) {
          const v = toPlayer(360)
          shoot('cork', v.vx, v.vy, 0)
          b.shootT = 0.75
        } else {
          shoot('cork', (this.rand() - 0.5) * 300, -240, 320)
          b.shootT = 1.7
        }
        break
      }
      case 'dios': {
        // lanza planetas
        shoot('planet', (this.px - b.x) / 1.4, -260, 320)
        b.shootT = 2.4
        if (Math.floor(b.t / 7) !== Math.floor((b.t - b.shootT) / 7)) {
          b.telegraph = { x: this.px, warn: 0.9, active: 0 }
        }
        break
      }
    }
  }

  private applyBossHit(kind: ProjKind, fromX: number): void {
    switch (kind) {
      case 'ice':
        this.slowT = 1.8
        this.addFloat(this.px, this.py - 46, '¡CONGELADO! 🧊', '#7dd3fc', 14)
        break
      case 'holy':
        this.invertT = 2.2
        this.addFloat(this.px, this.py - 46, '¡LUZ SOBRIA! CONTROLES INVERTIDOS', '#fde047', 12)
        break
      case 'cork':
        this.vx += this.px < fromX ? -260 : 260
        this.addFloat(this.px, this.py - 42, '¡POC!', '#d6a26a', 13)
        break
      case 'net':
        this.netT = 1.5
        this.addFloat(this.px, this.py - 46, '¡RED! ¡ESTÁS ATRAPADO!', '#a3e635', 14)
        break
      case 'planet':
        this.vy = Math.min(this.vy, -420)
        this.drunk = Math.max(0, this.drunk - 0.25)
        this.addFloat(this.px, this.py - 50, '¡PLANETAZO! 🪐', '#c084fc', 15)
        break
      default:
        break
    }
    sfx.spike()
  }

  throwBottle(): void {
    const b = this.boss
    if (!b || b.dead || this.bottles <= 0) return
    this.bottles--
    this.projectiles.push({
      x: this.px,
      y: this.py - 10,
      vx: Math.max(-280, Math.min(280, (b.x - this.px) / 1.1)),
      vy: -820,
      kind: 'bottle',
      grav: 760,
      rot: 0,
      fromBoss: false,
      dead: false,
    })
    sfx.throwBottle()
  }

  private hitBoss(b: Boss): void {
    b.hp--
    b.hurtT = 0.25
    sfx.bossHit()
    this.burst(b.x, b.y, '#fbbf24', 14, 'sparkle', 160)
    if (b.hp <= 0) {
      b.dead = true
      this.bossBlocking = false
      this.bossesWon++
      const def = BOSS_DEFS[b.idx]
      this.genesRun += def.reward
      this.lives = Math.min(MAX_LIVES, this.lives + 1)
      this.banner = { text: `💀 ${def.name.toUpperCase()} DERROTADO`, sub: `+${def.reward} genes · +1 vida`, t: 0 }
      this.flashT = 0.7
      sfx.bossDefeat()
      this.burst(b.x, b.y, '#fde047', 34, 'confetti', 260)
      this.events.onBossDefeated?.(b.idx)
      this.addFloat(this.px, this.py - 60, '¡EL ALCOHOL GANA OTRA VEZ!', '#fde047', 15)
    }
  }

  private updateProjectiles(dt: number): void {
    const plate = this.plateT > 0 ? this.platePos() : null
    for (const p of this.projectiles) {
      if (p.dead) continue
      p.vy += p.grav * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.rot += 7 * dt

      if (p.fromBoss) {
        // impacto en el jugador
        if (this.invuln <= 0 && Math.hypot(p.x - this.px, p.y - this.py) < 20) {
          if (this.shieldT > 0) {
            this.shieldT = 0
            this.addFloat(this.px, this.py - 46, 'ESCUDO DE GRASA ABSORBIDO 🥙', '#fbbf24', 13)
            this.burst(p.x, p.y, '#fbbf24', 10, 'sparkle', 130)
          } else {
            this.applyBossHit(p.kind, p.x)
          }
          p.dead = true
          this.invuln = 1
          continue
        }
        // el plato de tapas destruye proyectiles
        if (plate && Math.hypot(p.x - plate.x, p.y - plate.y) < 26) {
          p.dead = true
          this.genesRun += 10
          this.tapas++
          this.addFloat(plate.x, plate.y - 14, '+10 🫓', '#fb923c', 12)
          sfx.tapas()
          if (this.tapas >= 5) {
            this.genesRun += 150
            this.plateT = 0
            this.tapas = 0
            this.addFloat(this.px, this.py - 56, '¡LLUVIA DE TAPAS! +150 🫓', '#fde047', 16)
            this.burst(plate.x, plate.y, '#fb923c', 24, 'confetti', 220)
          }
          continue
        }
      } else {
        // botella lanzada por el jugador: ¿golpea al jefe?
        const b = this.boss
        if (b && !b.dead && Math.hypot(p.x - b.x, p.y - b.y) < 48) {
          p.dead = true
          if (b.type === 'caballero' && this.drunk < 0.3) {
            this.addFloat(b.x, b.y - 40, '¡EL VINO REBOTA! 🛡️', '#93c5fd', 13)
            sfx.click()
          } else if (b.type === 'sober' && this.drunk < 0.5) {
            this.addFloat(b.x, b.y - 40, '¡NÚCLEO CERRADO! ESTÁS DEMASIADO SOBRIO', '#22d3ee', 12)
            sfx.click()
          } else {
            this.hitBoss(b)
          }
          continue
        }
      }
      if (p.y > this.camTop + H + 80 || p.y < this.camTop - 260 || p.x < -50 || p.x > W + 50) p.dead = true
    }
    this.projectiles = this.projectiles.filter((p) => !p.dead)

    // cuervos: empujan al mono (Edad Media)
    for (const c of this.crows) {
      if (c.dead) continue
      c.t += dt
      c.x += c.vx * dt
      if (c.x < 24 || c.x > W - 24) c.vx = -c.vx
      if (this.invuln <= 0 && this.phoneT <= 0 && Math.hypot(c.x - this.px, c.y - this.py) < 24) {
        c.dead = true
        this.vx = (this.px < c.x ? -1 : 1) * 480
        this.vy = Math.min(this.vy, -140)
        this.invuln = 0.8
        sfx.quack()
        this.addFloat(c.x, c.y - 24, '¡CUAC! 🐦‍⬛', '#111827', 14)
        if (plate && Math.hypot(c.x - plate.x, c.y - plate.y) < 30) {
          this.genesRun += 10
          c.dead = true
        }
      }
    }
    this.crows = this.crows.filter((c) => !c.dead)
  }

  // ── minijuego de resaca (transición entre eras) ──────────────────────────
  private updateHangover(dt: number): void {
    const h = this.hangover
    if (!h) return
    h.t -= dt
    if (h.t <= 0) this.finishHangover(false)
  }

  cureHangover(icon: string): void {
    const h = this.hangover
    if (!h || h.done) return
    if (icon === h.seq[h.idx]) {
      h.idx++
      sfx.gene()
      if (h.idx >= h.seq.length) this.finishHangover(true)
    } else {
      h.idx = 0
      h.t = Math.max(1.4, h.t - 0.7)
      sfx.hiccup()
    }
  }

  private finishHangover(ok: boolean): void {
    const h = this.hangover
    if (!h) return
    this.hangover = null
    this.hangoverFreeze = false
    this.events.onHangoverEnd?.(ok)
    const e = ERAS[h.eraIdx]
    if (ok) {
      this.drunk = 0.12
      this.soberT = 0
      this.stagnated = false
      this.genesRun += 25
      this.banner = { text: `🧉 RESACA CURADA +25`, sub: `${e.emoji} ${e.name}: ${e.drink}`, t: 0 }
      sfx.cure()
      this.flashT = 0.35
    } else {
      this.drunk = Math.min(1, this.drunk + 0.15)
      this.banner = { text: '😵 RESACA PERSISTENTE', sub: `Sigues hecho papilla: +15% ebriedad`, t: 0 }
      sfx.hangoverFail()
      this.flashT = 0.5
    }
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.life -= dt
      if (p.life <= 0) {
        this.particles.splice(i, 1)
        continue
      }
      p.vy += p.grav * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.rot += p.vr * dt
    }
    for (let i = this.floats.length - 1; i >= 0; i--) {
      const f = this.floats[i]
      f.life -= dt
      if (f.life <= 0) {
        this.floats.splice(i, 1)
        continue
      }
      f.y += f.vy * dt
    }
  }

  private updateCamera(dt: number): void {
    void dt
    const want = this.py - H * 0.4
    if (want < this.camTop) this.camTop = want
  }

  private checkEra(): void {
    const era = eraAtM(this.heightM())
    if (era > this.curEra) {
      this.curEra = era
      this.maxEraRun = Math.max(this.maxEraRun, era)
      this.checkpointY = -eraStartM(era) * PX_PER_M
      this.lives = Math.min(MAX_LIVES, this.lives + 1)
      const e = ERAS[era]
      sfx.era()
      this.burst(this.px, this.py, e.accent, 26, 'confetti', 220)
      this.events.onEra?.(era)
      // minijuego de resaca: la transición se cura (o se patrocina)
      const seqLen = 3 + Math.min(2, Math.floor(era / 4))
      const seq: string[] = []
      for (let i = 0; i < seqLen; i++) seq.push(RESACA_ICONS[Math.floor(this.rand() * RESACA_ICONS.length)])
      this.hangover = {
        eraIdx: era,
        seq,
        idx: 0,
        t: 6.5,
        sponsor: this.vip ? null : SPONSORS[Math.floor(this.rand() * SPONSORS.length)],
        done: false,
        ok: false,
      }
      this.hangoverFreeze = true
    }
    if (!this.cosmosReached && this.heightM() >= COSMOS_M) {
      this.cosmosReached = true
      this.divine = true
      this.banner = {
        text: '✨ ASCENSIÓN SIMIA ✨',
        sub: 'Modo divino: ADN ×2 y gravedad suave',
        t: 0,
      }
      this.flashT = 0.9
      sfx.cosmos()
      this.burst(this.px, this.py, '#fde047', 40, 'confetti', 260)
      this.events.onCosmos?.()
    }
  }

  private loseLife(): void {
    this.lives--
    this.falls++
    this.drunk = 0
    this.courageT = 0
    this.blackoutT = 0
    this.invertT = 0
    this.slowT = 0
    this.netT = 0
    this.phoneT = 0
    this.projectiles = []
    sfx.fall()
    this.flashT = 0.4
    if (this.lives <= 0) {
      this.gameOver()
      return
    }
    this.events.onFall?.()
    this.px = W / 2
    this.py = this.checkpointY - this.ph / 2 - 2
    this.vx = 0
    this.vy = 0
    this.invuln = 2
    this.onGround = false
    this.standOn = null
    this.camTop = this.py - H * 0.55
    this.respawnWorld()
    this.addFloat(W / 2, this.checkpointY - 60, '¡RESACA! -1 vida', '#f87171', 18)
  }

  // ── respawn / continuación / salto de era (anuncios) ─────────────────────
  // Al escalar, las plataformas por debajo de la cámara se podan: tras una
  // caída hay que REGENERAR el mundo desde el checkpoint (si no, el mono
  // reaparece en el vacío y muere en bucle).
  private respawnWorld(): void {
    this.platforms = []
    this.items = []
    this.floats = []
    this.crows = []
    const eraIdx = eraAtM(-this.checkpointY / PX_PER_M)
    const cp = this.addPlatform(W / 2 - 105, this.checkpointY, 210, 'checkpoint', eraIdx)
    cp.used = true
    // -10 dejaba la primera fila a 104-146px del checkpoint (casi al límite del
    // salto); +20 replica la generación natural: 74-116px, aterrizaje amable
    this.genY = this.checkpointY + 20
    this.prevGenX = W / 2
    this.rowsSinceCp = 0 // entrada de era regenerada: escalera segura
    this.nextCheckpointIdx = Math.min(ERA_COUNT, eraIdx + 1)
    // si la partida ya pasó la puerta, restaurarla (queda arriba)
    if (this.gateSpawned && this.gateY !== null && this.checkpointY > this.gateY) {
      const g = this.addPlatform(W / 2 - 160, this.gateY, 320, 'checkpoint', ERA_COUNT - 1)
      g.used = true
    }
    this.ensureGen()
  }

  // Continuar tras game over (La Cura Milagrosa): revive en el checkpoint
  continueRun(newLives: number): void {
    this.state = 'running'
    this.lives = Math.min(newLives, MAX_LIVES)
    this.px = W / 2
    this.py = this.checkpointY - this.ph / 2 - 2
    this.vx = 0
    this.vy = 0
    this.drunk = 0
    this.courageT = 0
    this.blackoutT = 0
    this.invertT = 0
    this.slowT = 0
    this.netT = 0
    this.phoneT = 0
    this.invuln = 2.5
    this.onGround = false
    this.standOn = null
    this.camTop = this.py - H * 0.55
    this.respawnWorld()
    this.addFloat(W / 2, this.checkpointY - 64, '¡CURA MILAGROSA! 🥙✨', '#4ade80', 18)
    this.flashT = 0.4
  }

  // Desbloquear nivel (anuncio): teletransporta al inicio de la era indicada
  skipToEra(eraIdx: number): void {
    const target = Math.max(this.curEra, Math.min(ERA_COUNT - 1, eraIdx))
    // los jefes de eras pasadas quedan "evitados" (sin recompensa)
    while (this.nextBossIdx < BOSS_DEFS.length && bossZoneM(BOSS_DEFS[this.nextBossIdx]) < eraStartM(target)) {
      this.nextBossIdx++
      if (this.boss && !this.boss.dead) {
        this.boss.dead = true
        this.bossBlocking = false
      }
    }
    this.checkpointY = -eraStartM(target) * PX_PER_M
    this.maxAltitude = Math.max(this.maxAltitude, eraStartM(target))
    this.px = W / 2
    this.py = this.checkpointY - this.ph / 2 - 2
    this.vx = 0
    this.vy = 0
    this.drunk = 0
    this.blackoutT = 0
    this.invuln = 2.5
    this.onGround = false
    this.standOn = null
    this.camTop = this.py - H * 0.55
    this.projectiles = []
    this.hangover = null
    this.hangoverFreeze = false
    this.respawnWorld()
    // checkEra() detecta la nueva era y dispara el minijuego de resaca
  }

  // teleport dev (solo con ?dev=1): para pruebas y capturas
  devTeleport(eraIdx: number): void {
    this.skipToEra(eraIdx)
    this.curEra = eraIdx
    this.maxEraRun = Math.max(this.maxEraRun, eraIdx)
  }

  devSetDrunk(v: number): void {
    this.drunk = Math.max(0, Math.min(1, v))
    if (v > 0.3) this.soberT = 0
  }

  private gameOver(): void {
    this.state = 'gameover'
    const summary: RunSummary = {
      altitude: Math.round(this.maxAltitude),
      genesRun: this.genesRun,
      bottles: this.bottles,
      falls: this.falls,
      eras: this.maxEraRun,
      newRecord: this.newRecord || Math.round(this.maxAltitude) > this.record,
      cosmos: this.cosmosReached,
      duration: Math.round(this.duration),
      bosses: this.bossesWon,
    }
    this.events.onGameOver?.(summary)
  }

  private prune(): void {
    const limit = this.camTop + H + 400
    this.platforms = this.platforms.filter((p) => p.y < limit && p.alpha > 0)
    // las botellas regenerándose no se podan: si no, su respawn moriría fuera de cámara
    this.items = this.items.filter((it) => (it.kind === 'bottle' || !it.taken) && it.y < limit)
  }
}

