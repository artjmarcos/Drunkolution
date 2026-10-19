// ── DRUNKOLUTION: renderizado canvas — cielos, parallax, jefes y efectos ────
import { W, H, ERAS, PX_PER_M, ERA_HEIGHT_M, mixHex, rgba, eraStartM, mulberry32 } from './eras'
import type { Engine } from './engine'
import type { Platform, Item, Boss, Projectile, Crow } from './types'

const TILE = 1000

// ── sprites cacheados (rendimiento móvil: cero gradientes por partícula) ────
const spriteCache = new Map<string, HTMLCanvasElement>()

function glowSprite(color: string): HTMLCanvasElement {
  const key = 'glow:' + color
  const hit = spriteCache.get(key)
  if (hit) return hit
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 64
  const g2 = c.getContext('2d')!
  const grad = g2.createRadialGradient(32, 32, 2, 32, 32, 31)
  grad.addColorStop(0, rgba(color, 0.85))
  grad.addColorStop(0.45, rgba(color, 0.32))
  grad.addColorStop(1, rgba(color, 0))
  g2.fillStyle = grad
  g2.fillRect(0, 0, 64, 64)
  spriteCache.set(key, c)
  return c
}

function softShadowSprite(): HTMLCanvasElement {
  const key = 'shadow'
  const hit = spriteCache.get(key)
  if (hit) return hit
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 32
  const g2 = c.getContext('2d')!
  const grad = g2.createRadialGradient(32, 16, 2, 32, 16, 30)
  grad.addColorStop(0, 'rgba(0,0,0,0.5)')
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  g2.save()
  g2.translate(32, 16)
  g2.scale(1, 0.5)
  g2.translate(-32, -16)
  g2.fillStyle = grad
  g2.fillRect(0, 0, 64, 32)
  g2.restore()
  spriteCache.set(key, c)
  return c
}

// ── utilidades de dibujo ────────────────────────────────────────────────────
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

function tiles(
  ctx: CanvasRenderingContext2D,
  camTop: number,
  par: number,
  seedBase: number,
  draw: (yOff: number, rng: () => number, n: number) => void
): void {
  const start = Math.floor((camTop * par - 400) / TILE)
  const end = Math.floor((camTop * par + H + 400) / TILE)
  for (let n = start; n <= end; n++) {
    const rng = mulberry32((seedBase + n * 2654435761) | 0)
    draw(n * TILE - camTop * par, rng, n)
  }
}

function starField(ctx: CanvasRenderingContext2D, camTop: number, par: number, seed: number, density: number, t: number): void {
  ctx.save()
  tiles(ctx, camTop, par, seed, (yOff, rng) => {
    for (let i = 0; i < density; i++) {
      const x = rng() * W
      const y = yOff + rng() * TILE
      const s = 0.6 + rng() * 1.6
      const tw = 0.45 + 0.55 * Math.abs(Math.sin(t * (0.6 + rng()) + i))
      ctx.globalAlpha = tw * 0.9
      ctx.fillStyle = rng() < 0.15 ? '#fde68a' : '#e2e8f0'
      ctx.fillRect(x, y, s, s)
    }
  })
  ctx.restore()
}

// siluetas paramétricas ------------------------------------------------------
function motes(
  ctx: CanvasRenderingContext2D,
  camTop: number,
  par: number,
  seed: number,
  color: string,
  t: number,
  n: number
): void {
  tiles(ctx, camTop, par, seed, (yOff, rng) => {
    for (let i = 0; i < n; i++) {
      const mx = rng() * W
      const my = yOff + rng() * TILE
      const sp = 0.4 + rng() * 0.8
      const ph = rng() * Math.PI * 2
      const mx2 = mx + Math.sin(t * sp + ph) * 14
      const my2 = my + Math.cos(t * sp * 0.8 + ph) * 9
      const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * (0.8 + sp) + ph * 2))
      const r = 1.2 + rng() * 1.8
      ctx.fillStyle = rgba(color, 0.2 * tw)
      ctx.beginPath()
      ctx.arc(mx2, my2, r * 2.6, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = rgba(color, 0.7 * tw)
      ctx.beginPath()
      ctx.arc(mx2, my2, r, 0, Math.PI * 2)
      ctx.fill()
    }
  })
}

function palmSil(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string): void {
  ctx.fillStyle = color
  ctx.fillRect(x - 2 * s, y - 46 * s, 4 * s, 46 * s)
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.55
    ctx.beginPath()
    ctx.moveTo(x, y - 46 * s)
    ctx.quadraticCurveTo(
      x + Math.cos(a) * 20 * s,
      y - 46 * s + Math.sin(a) * 20 * s - 8 * s,
      x + Math.cos(a) * 34 * s,
      y - 46 * s + Math.sin(a) * 34 * s + 6 * s
    )
    ctx.quadraticCurveTo(
      x + Math.cos(a) * 18 * s,
      y - 46 * s + Math.sin(a) * 18 * s + 4 * s,
      x,
      y - 46 * s
    )
    ctx.fill()
  }
}

function acaciaSil(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string): void {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(x - 8 * s, y)
  ctx.lineTo(x - 2 * s, y - 40 * s)
  ctx.lineTo(x + 2 * s, y - 40 * s)
  ctx.lineTo(x + 8 * s, y)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(x, y - 44 * s, 30 * s, 8 * s, 0, 0, Math.PI * 2)
  ctx.fill()
}

function pyramidSil(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string): void {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(x - 60 * s, y)
  ctx.lineTo(x, y - 90 * s)
  ctx.lineTo(x + 60 * s, y)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = rgba('#f4c542', 0.25)
  ctx.beginPath()
  ctx.moveTo(x, y - 90 * s)
  ctx.lineTo(x + 60 * s, y)
  ctx.lineTo(x + 12 * s, y)
  ctx.closePath()
  ctx.fill()
}

function columnSil(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string): void {
  ctx.fillStyle = color
  ctx.fillRect(x - 10 * s, y - 70 * s, 20 * s, 70 * s)
  ctx.fillRect(x - 15 * s, y - 78 * s, 30 * s, 10 * s)
  ctx.fillRect(x - 15 * s, y - 8 * s, 30 * s, 8 * s)
  ctx.fillStyle = rgba('#000000', 0.25)
  for (let i = -1; i <= 1; i++) ctx.fillRect(x + i * 7 * s - 1 * s, y - 68 * s, 2 * s, 58 * s)
}

// templo griego: basamento + columnas + frontón
function templeSil(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string): void {
  ctx.fillStyle = color
  ctx.fillRect(x - 52 * s, y - 8 * s, 104 * s, 8 * s)
  for (let i = 0; i < 5; i++) {
    const cx = x - 40 * s + i * 20 * s
    ctx.fillRect(cx - 4 * s, y - 58 * s, 8 * s, 50 * s)
  }
  ctx.fillRect(x - 52 * s, y - 62 * s, 104 * s, 6 * s)
  ctx.beginPath()
  ctx.moveTo(x - 56 * s, y - 62 * s)
  ctx.lineTo(x, y - 86 * s)
  ctx.lineTo(x + 56 * s, y - 62 * s)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = rgba('#ffffff', 0.22)
  for (let i = 0; i < 5; i++) {
    const cx = x - 40 * s + i * 20 * s
    ctx.fillRect(cx - 1.2 * s, y - 58 * s, 2 * s, 50 * s)
  }
}

function castleSil(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string): void {
  ctx.fillStyle = color
  ctx.fillRect(x - 40 * s, y - 55 * s, 80 * s, 55 * s)
  for (const tx of [-46, 26]) {
    ctx.fillRect(x + tx * s, y - 85 * s, 20 * s, 85 * s)
    ctx.beginPath()
    ctx.moveTo(x + (tx - 3) * s, y - 85 * s)
    ctx.lineTo(x + (tx + 10) * s, y - 112 * s)
    ctx.lineTo(x + (tx + 23) * s, y - 85 * s)
    ctx.fill()
  }
  for (let i = 0; i < 5; i++) ctx.fillRect(x - 38 * s + i * 17 * s, y - 63 * s, 9 * s, 8 * s)
}

// cúpula renacentista con linterna
function domeSil(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string): void {
  ctx.fillStyle = color
  ctx.fillRect(x - 34 * s, y - 30 * s, 68 * s, 30 * s)
  ctx.beginPath()
  ctx.arc(x, y - 30 * s, 34 * s, Math.PI, 0)
  ctx.fill()
  ctx.fillRect(x - 4 * s, y - 74 * s, 8 * s, 14 * s)
  ctx.beginPath()
  ctx.moveTo(x - 6 * s, y - 74 * s)
  ctx.lineTo(x, y - 84 * s)
  ctx.lineTo(x + 6 * s, y - 74 * s)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = rgba('#ffffff', 0.16)
  ctx.beginPath()
  ctx.arc(x - 10 * s, y - 36 * s, 26 * s, Math.PI * 1.15, Math.PI * 1.6)
  ctx.fill()
}

// ornitóptero de Da Vinci: alas batiendo
function ornithSil(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, color: string): void {
  const flap = Math.sin(t * 6 + x) * 0.5
  ctx.strokeStyle = color
  ctx.lineWidth = 2.4 * s
  for (const d of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.quadraticCurveTo(x + d * 16 * s, y - 14 * s - flap * 10 * s, x + d * 30 * s, y - 6 * s + flap * 8 * s)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x + d * 30 * s, y - 6 * s + flap * 8 * s)
    ctx.quadraticCurveTo(x + d * 20 * s, y + 2 * s, x, y + 4 * s)
    ctx.stroke()
  }
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.ellipse(x, y + 4 * s, 6 * s, 9 * s, 0, 0, Math.PI * 2)
  ctx.fill()
}

function factorySil(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string, t: number): void {
  ctx.fillStyle = color
  ctx.fillRect(x - 55 * s, y - 40 * s, 110 * s, 40 * s)
  ctx.fillRect(x - 30 * s, y - 78 * s, 14 * s, 40 * s)
  ctx.fillRect(x + 8 * s, y - 92 * s, 14 * s, 54 * s)
  ctx.fillStyle = rgba('#9ca3af', 0.18)
  for (let i = 0; i < 3; i++) {
    const px = x - 23 * s + Math.sin(t * 0.7 + i * 2) * 8
    ctx.beginPath()
    ctx.arc(px + i * 9, y - 90 * s - i * 14 - ((t * 10 + i * 20) % 30), 7 * s + i * 2, 0, Math.PI * 2)
    ctx.fill()
  }
}

function decoSil(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string): void {
  ctx.fillStyle = color
  const tiers = [
    [50, 30],
    [36, 62],
    [24, 92],
    [12, 118],
  ]
  for (const [w, h] of tiers) ctx.fillRect(x - (w / 2) * s, y - h * s, w * s, h * s)
  ctx.fillStyle = rgba('#fbbf24', 0.8)
  for (const [w, h] of tiers) ctx.fillRect(x - (w / 2) * s, y - h * s, w * s, 2 * s)
}

// dirigible de la Ley Seca
function blimpSil(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string): void {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.ellipse(x, y, 60 * s, 18 * s, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(x - 58 * s, y - 6 * s)
  ctx.lineTo(x - 76 * s, y - 16 * s)
  ctx.lineTo(x - 76 * s, y + 16 * s)
  ctx.lineTo(x - 58 * s, y + 6 * s)
  ctx.closePath()
  ctx.fill()
  ctx.fillRect(x - 14 * s, y + 18 * s, 28 * s, 10 * s)
  ctx.fillStyle = rgba('#fbbf24', 0.5)
  for (let i = -2; i <= 2; i++) ctx.fillRect(x + i * 18 * s - 3 * s, y - 3 * s, 6 * s, 6 * s)
}

// rascacielos cyberpunk con ventanas neón
function megaSil(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string, rng: () => number): void {
  const w = (24 + rng() * 30) * s
  const h = (90 + rng() * 160) * s
  ctx.fillStyle = color
  ctx.fillRect(x - w / 2, y - h, w, h)
  const cols = ['#22d3ee', '#f0abfc', '#fde047', '#f472b6']
  for (let i = 0; i < h / 12; i++) {
    for (let j = 0; j < Math.max(1, Math.floor(w / 10)); j++) {
      if (rng() < 0.32) {
        ctx.fillStyle = rgba(cols[Math.floor(rng() * cols.length)], 0.5 + rng() * 0.4)
        ctx.fillRect(x - w / 2 + 3 + j * 10, y - h + 6 + i * 12, 4, 5)
      }
    }
  }
}

// palmera synthwave con neón
function neonPalmSil(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number): void {
  const glow = 0.5 + Math.sin(t * 2 + x) * 0.2
  ctx.strokeStyle = rgba('#f472b6', 0.85 * glow)
  ctx.lineWidth = 3.4 * s
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.quadraticCurveTo(x + 6 * s, y - 26 * s, x + 2 * s, y - 48 * s)
  ctx.stroke()
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.5
    ctx.beginPath()
    ctx.moveTo(x + 2 * s, y - 48 * s)
    ctx.quadraticCurveTo(
      x + 2 * s + Math.cos(a) * 16 * s,
      y - 48 * s + Math.sin(a) * 16 * s,
      x + 2 * s + Math.cos(a) * 28 * s,
      y - 48 * s + Math.sin(a) * 28 * s + 8 * s
    )
    ctx.stroke()
  }
}

// simio cósmico gigante de luz
function apeSil(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, color: string): void {
  const breathe = Math.sin(t * 0.8) * 0.04
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(1 + breathe, 1 - breathe)
  ctx.fillStyle = color
  // cuerpo
  ctx.beginPath()
  ctx.ellipse(0, 40 * s, 46 * s, 54 * s, 0, 0, Math.PI * 2)
  ctx.fill()
  // brazos enormes
  ctx.beginPath()
  ctx.ellipse(-52 * s, 20 * s, 14 * s, 44 * s, 0.3, 0, Math.PI * 2)
  ctx.ellipse(52 * s, 20 * s, 14 * s, 44 * s, -0.3, 0, Math.PI * 2)
  ctx.fill()
  // cabeza
  ctx.beginPath()
  ctx.arc(0, -32 * s, 30 * s, 0, Math.PI * 2)
  ctx.fill()
  // orejas
  ctx.beginPath()
  ctx.arc(-28 * s, -36 * s, 9 * s, 0, Math.PI * 2)
  ctx.arc(28 * s, -36 * s, 9 * s, 0, Math.PI * 2)
  ctx.fill()
  // cara
  ctx.fillStyle = rgba('#ffffff', 0.35)
  ctx.beginPath()
  ctx.ellipse(0, -28 * s, 19 * s, 16 * s, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  // halo
  ctx.strokeStyle = rgba('#fde047', 0.8)
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.ellipse(x, y - 72 * s, 34 * s, 8 * s, 0, 0, Math.PI * 2)
  ctx.stroke()
}

function asteroidSil(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string, rng: () => number): void {
  ctx.fillStyle = color
  ctx.beginPath()
  const pts = 9
  for (let i = 0; i <= pts; i++) {
    const a = (i / pts) * Math.PI * 2
    const r = 26 * s * (0.75 + (i % 2 === 0 ? rng() * 0.4 : 0.1))
    const px = x + Math.cos(a) * r
    const py = y + Math.sin(a) * r * 0.85
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.fill()
  ctx.fillStyle = rgba('#000000', 0.3)
  ctx.beginPath()
  ctx.arc(x - 8 * s, y - 4 * s, 6 * s, 0, Math.PI * 2)
  ctx.arc(x + 9 * s, y + 7 * s, 4 * s, 0, Math.PI * 2)
  ctx.fill()
}

function nebulaBlob(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, color)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(x - r, y - r, r * 2, r * 2)
}

function planetSil(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, c1: string, ring: boolean): void {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.2, x, y, r)
  g.addColorStop(0, c1)
  g.addColorStop(1, rgba('#000000', 0.85))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  if (ring) {
    ctx.strokeStyle = rgba('#e2e8f0', 0.5)
    ctx.lineWidth = 4
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(-0.4)
    ctx.scale(1, 0.32)
    ctx.beginPath()
    ctx.arc(0, 0, r * 1.55, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }
}

// ── cielo con transición entre eras ─────────────────────────────────────────
function skyMix(camMidM: number): { idx: number; idx2: number; blend: number } {
  const idx = Math.max(0, Math.min(ERAS.length - 1, Math.floor(camMidM / ERA_HEIGHT_M)))
  const eraEnd = eraStartM(idx) + ERA_HEIGHT_M
  const blend = Math.max(0, Math.min(1, (camMidM - (eraEnd - 600)) / 600))
  const idx2 = Math.min(ERAS.length - 1, idx + 1)
  return { idx, idx2, blend }
}

function drawSky(ctx: CanvasRenderingContext2D, camMidM: number, t: number): void {
  const { idx, idx2, blend } = skyMix(camMidM)
  const top = mixHex(ERAS[idx].sky[0], ERAS[idx2].sky[0], blend)
  const bot = mixHex(ERAS[idx].sky[1], ERAS[idx2].sky[1], blend)
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, top)
  g.addColorStop(1, bot)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  // astro guía: sol dorado de día, luna plateada de noche (halo + rayos suaves)
  const night = (ERAS[idx].night ? 1 : 0) * (1 - blend) + (ERAS[idx2].night ? 1 : 0) * blend
  const ax = W * 0.74
  const ay = 148
  const core = night > 0.5 ? '226,232,240' : '255,240,180'
  const halo = ctx.createRadialGradient(ax, ay, 6, ax, ay, 170)
  halo.addColorStop(0, `rgba(${core},${0.3 - night * 0.14})`)
  halo.addColorStop(0.4, `rgba(${core},${0.11 - night * 0.05})`)
  halo.addColorStop(1, `rgba(${core},0)`)
  ctx.fillStyle = halo
  ctx.fillRect(0, 0, W, H)
  ctx.save()
  ctx.translate(ax, ay)
  ctx.rotate(t * 0.04)
  ctx.fillStyle = `rgba(${core},${0.035 + (1 - night) * 0.025})`
  for (let i = 0; i < 7; i++) {
    ctx.rotate((Math.PI * 2) / 7)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(-26, -400)
    ctx.lineTo(26, -400)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
  ctx.fillStyle = `rgba(${core},${0.8 - night * 0.22})`
  ctx.beginPath()
  ctx.arc(ax, ay, night > 0.5 ? 23 : 28, 0, Math.PI * 2)
  ctx.fill()
  if (night > 0.5) {
    ctx.fillStyle = 'rgba(148,163,184,0.3)'
    ctx.beginPath()
    ctx.arc(ax - 8, ay - 6, 5, 0, Math.PI * 2)
    ctx.arc(ax + 7, ay + 8, 4, 0, Math.PI * 2)
    ctx.arc(ax + 10, ay - 9, 3, 0, Math.PI * 2)
    ctx.fill()
  }

  // bruma del horizonte (profundidad atmosférica)
  const hb = ctx.createLinearGradient(0, H * 0.6, 0, H)
  hb.addColorStop(0, 'rgba(255,255,255,0)')
  hb.addColorStop(1, night > 0.5 ? 'rgba(88,110,190,0.1)' : `rgba(${core},0.08)`)
  ctx.fillStyle = hb
  ctx.fillRect(0, H * 0.6, W, H * 0.4)
}

// ── capas de parallax por era (las 13 de la biblia) ─────────────────────────
function drawEraLayers(
  ctx: CanvasRenderingContext2D,
  era: number,
  camTop: number,
  t: number,
  alpha: number
): void {
  ctx.save()
  ctx.globalAlpha = alpha
  const e = ERAS[era]
  const base = era * 7919

  if (e.night) starField(ctx, camTop, 0.12, base + 1, era >= 7 ? 46 : 22, t)

  switch (era) {
    case 0: // Mioceno: jungla
      tiles(ctx, camTop, 0.16, base + 2, (yOff) => {
        ctx.fillStyle = 'rgba(6,40,26,0.85)'
        ctx.beginPath()
        ctx.moveTo(0, yOff + 820)
        for (let x = 0; x <= W; x += 40)
          ctx.lineTo(x, yOff + 760 + Math.sin(x * 0.02 + 1.3) * 40)
        ctx.lineTo(W, yOff + TILE)
        ctx.lineTo(0, yOff + TILE)
        ctx.fill()
      })
      tiles(ctx, camTop, 0.35, base + 3, (yOff, rng) => {
        const n = 2 + Math.floor(rng() * 2)
        for (let i = 0; i < n; i++)
          palmSil(ctx, 40 + rng() * (W - 80), yOff + 300 + rng() * 550, 0.8 + rng() * 0.7, 'rgba(4,26,17,0.9)')
      })
      // acantilado pintado con cascada (profundidad de jungla, estilo póster)
      tiles(ctx, camTop, 0.22, base + 7, (yOff, rng) => {
        const gx = 60 + rng() * (W - 120)
        const topW = 90 + rng() * 60
        const cl = ctx.createLinearGradient(gx - topW, yOff + 140, gx + topW, yOff + 980)
        cl.addColorStop(0, 'rgba(46,110,82,0.5)')
        cl.addColorStop(1, 'rgba(12,44,30,0.72)')
        ctx.fillStyle = cl
        ctx.beginPath()
        ctx.moveTo(gx - topW, yOff + 140)
        ctx.quadraticCurveTo(gx - topW * 0.5, yOff + 560, gx - topW * 0.7, yOff + 980)
        ctx.lineTo(gx + topW * 0.7, yOff + 980)
        ctx.quadraticCurveTo(gx + topW * 0.4, yOff + 520, gx + topW, yOff + 140)
        ctx.closePath()
        ctx.fill()
        const wx = gx - 6 + rng() * 12
        ctx.fillStyle = 'rgba(224,247,250,0.3)'
        ctx.beginPath()
        ctx.moveTo(wx - 16, yOff + 190)
        ctx.quadraticCurveTo(wx - 10, yOff + 560, wx - 14, yOff + 950)
        ctx.lineTo(wx + 14, yOff + 950)
        ctx.quadraticCurveTo(wx + 10, yOff + 540, wx + 16, yOff + 190)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.35)'
        for (let i = 0; i < 5; i++) {
          const fy = yOff + 240 + ((i * 160 + ((t * 90) % 160)) % 700)
          ctx.beginPath()
          ctx.ellipse(wx + Math.sin(t * 2 + i) * 5, fy, 7, 3, 0, 0, Math.PI * 2)
          ctx.fill()
        }
      })
      break
    case 1: { // Neolítico: cuevas + menhires
      tiles(ctx, camTop, 0.2, base + 2, (yOff, rng) => {
        ctx.fillStyle = 'rgba(18,14,22,0.9)'
        for (let i = 0; i < 6; i++) {
          const x = rng() * W
          const w = 26 + rng() * 44
          const h = 60 + rng() * 130
          ctx.beginPath()
          ctx.moveTo(x - w / 2, yOff)
          ctx.lineTo(x + w / 2, yOff)
          ctx.lineTo(x, yOff + h)
          ctx.fill()
        }
      })
      tiles(ctx, camTop, 0.4, base + 3, (yOff, rng) => {
        ctx.fillStyle = 'rgba(10,8,13,0.95)'
        ctx.beginPath()
        ctx.moveTo(0, yOff + TILE)
        for (let x = 0; x <= W; x += 46)
          ctx.lineTo(x, yOff + 880 + Math.sin(x * 0.05 + rng() * 0.2) * 46)
        ctx.lineTo(W, yOff + TILE)
        ctx.fill()
        for (let i = 0; i < 3; i++) {
          const x = rng() * W
          const y = yOff + 880 + rng() * 60
          ctx.fillStyle = rgba('#a78bfa', 0.5)
          ctx.beginPath()
          ctx.moveTo(x, y)
          ctx.lineTo(x + 5, y - 16)
          ctx.lineTo(x + 10, y)
          ctx.fill()
        }
        // menhires con runas de cerveza
        for (let i = 0; i < 2; i++) {
          const x = 40 + rng() * (W - 80)
          ctx.fillStyle = 'rgba(46,40,54,0.9)'
          ctx.fillRect(x, yOff + 800, 26, 80)
          ctx.fillStyle = rgba('#a78bfa', 0.35)
          ctx.fillRect(x + 6, yOff + 818, 14, 3)
          ctx.fillRect(x + 6, yOff + 830, 14, 3)
        }
      })
      break
    }
    case 2: // Egipto: pirámides
      tiles(ctx, camTop, 0.15, base + 2, (yOff, rng) => {
        pyramidSil(ctx, 90 + rng() * 120, yOff + 860, 1 + rng() * 0.7, 'rgba(50,26,54,0.85)')
        if (rng() < 0.7) pyramidSil(ctx, 260 + rng() * 160, yOff + 900, 0.7 + rng() * 0.5, 'rgba(62,32,60,0.8)')
      })
      tiles(ctx, camTop, 0.34, base + 3, (yOff, rng) => {
        for (let i = 0; i < 3; i++)
          columnSil(ctx, 40 + i * 160 + rng() * 40, yOff + 930, 0.8 + rng() * 0.4, 'rgba(43,20,45,0.9)')
      })
      break
    case 3: // Grecia: templos de mármol
      tiles(ctx, camTop, 0.15, base + 2, (yOff, rng) => {
        templeSil(ctx, 110 + rng() * 100, yOff + 860, 1 + rng() * 0.5, 'rgba(70,88,110,0.85)')
        if (rng() < 0.6) templeSil(ctx, 320 + rng() * 100, yOff + 910, 0.6 + rng() * 0.4, 'rgba(60,76,96,0.8)')
      })
      tiles(ctx, camTop, 0.34, base + 3, (yOff, rng) => {
        for (let i = 0; i < 2; i++)
          columnSil(ctx, 50 + i * 300 + rng() * 60, yOff + 940, 0.9 + rng() * 0.4, 'rgba(84,102,124,0.9)')
        // ánfora de ouzo
        const x = 60 + rng() * (W - 120)
        ctx.fillStyle = 'rgba(52,66,84,0.9)'
        ctx.beginPath()
        ctx.ellipse(x, yOff + 900, 12, 16, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillRect(x - 3, yOff + 880, 6, 8)
      })
      break
    case 4: // Roma: acueductos
      tiles(ctx, camTop, 0.16, base + 2, (yOff) => {
        ctx.fillStyle = 'rgba(38,24,60,0.85)'
        ctx.fillRect(0, yOff + 800, W, 26)
        for (let i = 0; i < 4; i++)
          columnSil(ctx, 36 + i * 130, yOff + 800, 0.85, 'rgba(52,34,78,0.9)')
        ctx.fillStyle = 'rgba(52,34,78,0.9)'
        ctx.fillRect(0, yOff + 700, W, 18)
      })
      tiles(ctx, camTop, 0.36, base + 3, (yOff, rng) => {
        for (let i = 0; i < 2; i++) {
          const x = 60 + rng() * (W - 120)
          ctx.fillStyle = 'rgba(30,18,50,0.9)'
          ctx.beginPath()
          ctx.arc(x, yOff + 920, 70 + rng() * 50, Math.PI, 0)
          ctx.fill()
          ctx.fillRect(x - 70 - rng() * 50, yOff + 920, 140, 60)
        }
      })
      break
    case 5: // Edad Media: castillos, luna y antorchas
      tiles(ctx, camTop, 0.16, base + 2, (yOff, rng) => {
        castleSil(ctx, 90 + rng() * 120, yOff + 870, 0.9 + rng() * 0.6, 'rgba(14,14,28,0.95)')
        if (rng() < 0.6) castleSil(ctx, 300 + rng() * 120, yOff + 920, 0.6 + rng() * 0.4, 'rgba(18,18,34,0.9)')
        ctx.fillStyle = rgba('#e2e8f0', 0.75)
        ctx.beginPath()
        ctx.arc(390, yOff + 180, 34, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = rgba('#0a0a16', 0.9)
        ctx.beginPath()
        ctx.arc(378, yOff + 172, 30, 0, Math.PI * 2)
        ctx.fill()
      })
      tiles(ctx, camTop, 0.38, base + 3, (yOff, rng) => {
        for (let i = 0; i < 3; i++) {
          const x = 50 + rng() * (W - 100)
          const y = yOff + 500 + rng() * 400
          const fl = 0.6 + Math.abs(Math.sin(t * 7 + i * 2)) * 0.5
          ctx.fillStyle = rgba('#3d3a45', 0.9)
          ctx.fillRect(x - 2, y, 4, 14)
          nebulaBlob(ctx, x, y - 4, 26 * fl, rgba('#f59e0b', 0.35))
          ctx.fillStyle = rgba('#fbbf24', 0.9)
          ctx.beginPath()
          ctx.arc(x, y - 5, 3.4 * fl, 0, Math.PI * 2)
          ctx.fill()
        }
      })
      break
    case 6: // Renacimiento: cúpulas y ornitópteros
      tiles(ctx, camTop, 0.16, base + 2, (yOff, rng) => {
        domeSil(ctx, 100 + rng() * 100, yOff + 880, 1 + rng() * 0.5, 'rgba(74,48,28,0.9)')
        if (rng() < 0.7) domeSil(ctx, 320 + rng() * 100, yOff + 920, 0.7 + rng() * 0.4, 'rgba(64,42,26,0.85)')
      })
      tiles(ctx, camTop, 0.36, base + 3, (yOff, rng) => {
        const n = 1 + Math.floor(rng() * 2)
        for (let i = 0; i < n; i++)
          ornithSil(ctx, 60 + rng() * (W - 120), yOff + 200 + rng() * 500, 1 + rng() * 0.6, t, 'rgba(90,60,34,0.85)')
      })
      break
    case 7: // Impresionismo: cielo de Van Gogh
      tiles(ctx, camTop, 0.12, base + 2, (yOff, rng) => {
        // remolinos de absenta
        for (let i = 0; i < 4; i++) {
          const cx = rng() * W
          const cy = yOff + rng() * TILE
          const r = 30 + rng() * 50
          ctx.strokeStyle = rgba(i % 2 ? '#7dd3fc' : '#fde047', 0.2)
          ctx.lineWidth = 3
          ctx.beginPath()
          for (let a = 0; a < Math.PI * 6; a += 0.25) {
            const rr = (a / (Math.PI * 6)) * r
            const px = cx + Math.cos(a + t * 0.6) * rr
            const py = cy + Math.sin(a + t * 0.6) * rr * 0.7
            if (a === 0) ctx.moveTo(px, py)
            else ctx.lineTo(px, py)
          }
          ctx.stroke()
        }
      })
      tiles(ctx, camTop, 0.34, base + 3, (yOff, rng) => {
        // aguja de iglesia (la de La Noche Estrellada)
        const x = 70 + rng() * (W - 140)
        ctx.fillStyle = 'rgba(16,34,64,0.95)'
        ctx.beginPath()
        ctx.moveTo(x - 18, yOff + 960)
        ctx.lineTo(x - 10, yOff + 800)
        ctx.lineTo(x, yOff + 760)
        ctx.lineTo(x + 10, yOff + 800)
        ctx.lineTo(x + 18, yOff + 960)
        ctx.closePath()
        ctx.fill()
      })
      break
    case 8: // Prohibición: skyline deco + dirigible
      tiles(ctx, camTop, 0.16, base + 2, (yOff, rng) => {
        decoSil(ctx, 70 + rng() * 140, yOff + 900, 1 + rng() * 0.6, 'rgba(22,12,34,0.95)')
        if (rng() < 0.8) decoSil(ctx, 300 + rng() * 120, yOff + 940, 0.7 + rng() * 0.5, 'rgba(30,16,44,0.92)')
        // luna de jazz
        ctx.fillStyle = rgba('#fde68a', 0.6)
        ctx.beginPath()
        ctx.arc(W - 70, yOff + 150, 30, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = rgba('#160d24', 0.85)
        ctx.beginPath()
        ctx.arc(W - 82, yOff + 142, 27, 0, Math.PI * 2)
        ctx.fill()
      })
      tiles(ctx, camTop, 0.3, base + 3, (yOff, rng) => {
        blimpSil(ctx, W / 2 + Math.sin(t * 0.3) * 60, yOff + 240 + rng() * 200, 0.9, 'rgba(58,48,70,0.9)')
        // cartel de speakeasy
        const x = 60 + rng() * 240
        const y = yOff + 500 + rng() * 300
        const on = Math.sin(t * 3 + x) > -0.7
        if (on) {
          ctx.strokeStyle = rgba('#f472b6', 0.8)
          ctx.lineWidth = 3
          ctx.strokeRect(x, y, 60, 24)
          ctx.fillStyle = rgba('#f472b6', 0.25)
          ctx.fillRect(x, y, 60, 24)
        }
      })
      break
    case 9: // Industrial: fábricas y humo
      tiles(ctx, camTop, 0.16, base + 2, (yOff, rng) => {
        factorySil(ctx, 100 + rng() * 100, yOff + 880, 1 + rng() * 0.5, 'rgba(26,22,17,0.95)', t)
        if (rng() < 0.7) factorySil(ctx, 320 + rng() * 100, yOff + 920, 0.8, 'rgba(32,27,20,0.9)', t + 2)
      })
      tiles(ctx, camTop, 0.36, base + 3, (yOff, rng) => {
        ctx.strokeStyle = 'rgba(10,9,7,0.8)'
        ctx.lineWidth = 3
        for (let i = 0; i < 2; i++) {
          const y = yOff + 400 + rng() * 500
          ctx.beginPath()
          ctx.moveTo(0, y)
          ctx.quadraticCurveTo(W / 2, y - 30, W, y)
          ctx.stroke()
        }
      })
      break
    case 10: { // Años 80: sol synthwave + rejilla + palmeras neón
      tiles(ctx, camTop, 0.1, base + 2, (yOff) => {
        // sol de rayas
        const sy = yOff + 300
        const g = ctx.createLinearGradient(0, sy - 80, 0, sy + 60)
        g.addColorStop(0, '#fbbf24')
        g.addColorStop(1, '#f472b6')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(W / 2, sy, 70, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = 'rgba(26,10,46,0.9)'
        for (let i = 0; i < 5; i++) {
          const yy = sy + 8 + i * 14
          ctx.fillRect(W / 2 - 75, yy, 150, 4 + i * 1.6)
        }
      })
      tiles(ctx, camTop, 0.34, base + 3, (yOff, rng) => {
        // rejilla synthwave
        ctx.strokeStyle = rgba('#f0abfc', 0.25)
        ctx.lineWidth = 1.4
        const hy = yOff + 620
        for (let i = 0; i <= 10; i++) {
          ctx.beginPath()
          ctx.moveTo((W / 10) * i, hy)
          ctx.lineTo((W / 5) * (i - 2), yOff + TILE)
          ctx.stroke()
        }
        for (let j = 0; j < 6; j++) {
          const yy = hy + Math.pow(j / 6, 1.9) * (TILE - 620)
          ctx.beginPath()
          ctx.moveTo(0, yy)
          ctx.lineTo(W, yy)
          ctx.stroke()
        }
        neonPalmSil(ctx, 60 + rng() * (W - 120), yOff + 640 + rng() * 200, 0.9 + rng() * 0.5, t)
      })
      break
    }
    case 11: // Cyberpunk: megatorres + lluvia de código
      tiles(ctx, camTop, 0.16, base + 2, (yOff, rng) => {
        megaSil(ctx, 60 + rng() * (W - 120), yOff + 960, 1.1, 'rgba(10,12,24,0.96)', rng)
        megaSil(ctx, 60 + rng() * (W - 120), yOff + 980, 0.9, 'rgba(14,16,30,0.94)', rng)
      })
      tiles(ctx, camTop, 0.14, base + 3, (yOff, rng) => {
        ctx.font = '13px monospace'
        for (let i = 0; i < 7; i++) {
          const x = 20 + rng() * (W - 40)
          const len = 6 + Math.floor(rng() * 10)
          const sp = 60 + rng() * 90
          for (let j = 0; j < len; j++) {
            const y = yOff + ((rng() * TILE + t * sp + j * 15) % (TILE + 100)) - 50
            ctx.fillStyle = rgba('#22d3ee', 0.16 + (j / len) * 0.5)
            ctx.fillText(rng() < 0.5 ? '0' : '1', x, y)
          }
        }
      })
      break
    default: { // 12 Espacio: planetas + simio cósmico
      tiles(ctx, camTop, 0.1, base + 2, (yOff, rng) => {
        nebulaBlob(ctx, rng() * W, yOff + rng() * TILE, 240, rgba('#fde047', 0.12))
        nebulaBlob(ctx, rng() * W, yOff + rng() * TILE, 260, rgba('#a855f7', 0.2))
        nebulaBlob(ctx, rng() * W, yOff + rng() * TILE, 200, rgba('#ec4899', 0.13))
      })
      tiles(ctx, camTop, 0.3, base + 3, (yOff, rng) => {
        planetSil(ctx, rng() * W, yOff + rng() * TILE, 34 + rng() * 40, '#fbbf24', rng() < 0.5)
      })
      tiles(ctx, camTop, 0.22, base + 4, (yOff, rng) => {
        // siluetas del Dios Simio Cósmico observando
        apeSil(ctx, 90 + rng() * (W - 180), yOff + 420 + rng() * 300, 0.7 + rng() * 0.5, t, 'rgba(253,224,71,0.08)')
      })
      break
    }
  }

  // brillo ambiental de la era (polen, luciérnagas, brasas, motas neón...)
  motes(ctx, camTop, 0.5, base + 91, e.accent, t, e.night ? 11 : 7)

  ctx.restore()
}

// ── plataformas ─────────────────────────────────────────────────────────────
function drawPlatform(ctx: CanvasRenderingContext2D, p: Platform, t: number, camTop: number, ciego: number): void {
  const e = ERAS[Math.min(p.era, ERAS.length - 1)]
  const y = p.y - camTop
  let x = p.x
  if (p.kind === 'crumble' && p.touchT > 0 && !p.broken)
    x += Math.sin(t * 42) * 2.4 * (p.touchT / 0.45)

  if (p.kind === 'hidden') {
    if (p.revealT <= 0) return
    const a = Math.min(1, p.revealT / 1.2)
    ctx.save()
    ctx.globalAlpha = a
    ctx.setLineDash([7, 5])
    ctx.strokeStyle = '#fbbf24'
    ctx.lineWidth = 2.5
    roundRect(ctx, x, y, p.w, p.h, 8)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = rgba('#fbbf24', 0.22)
    ctx.fill()
    ctx.restore()
    return
  }

  ctx.save()
  ctx.globalAlpha = p.alpha

  // falsas de la Prohibición: idénticas... salvo que ciego las delata
  if (p.kind === 'fake') {
    if (ciego > 0) ctx.globalAlpha = p.alpha * (0.4 + Math.abs(Math.sin(t * 8)) * 0.35 * ciego)
  }
  // holográficas con glitch
  if (p.kind === 'holo') {
    ctx.globalAlpha = p.alpha * (p.aux > 0 ? 0.3 : 0.82)
  }
  // neón de los 80: apagadas casi invisibles
  const blinkOn = Math.sin(t * 1.5 + p.phase) > -0.35
  if (p.kind === 'blink' && !blinkOn) {
    ctx.globalAlpha = p.alpha * 0.22
  }

  // sombra suave proyectada (volumen de ilustración)
  const effA = ctx.globalAlpha
  const sh = softShadowSprite()
  ctx.globalAlpha = effA * 0.32
  ctx.drawImage(sh, x - 8, y + p.h - 5, p.w + 16, 18)
  ctx.globalAlpha = effA

  // cuerpo con degradado vertical + tapa luminosa + contorno de tinta
  const body = ctx.createLinearGradient(0, y, 0, y + p.h)
  body.addColorStop(0, mixHex(e.platFill, '#ffffff', 0.16))
  body.addColorStop(0.55, e.platFill)
  body.addColorStop(1, mixHex(e.platFill, '#000000', 0.38))
  ctx.fillStyle = body
  roundRect(ctx, x, y, p.w, p.h, 7)
  ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.4)'
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.fillStyle = e.platEdge
  roundRect(ctx, x, y, p.w, 5, 3)
  ctx.fill()

  switch (p.kind) {
    case 'bounce': {
      // fuente romana: chorro de vino
      ctx.strokeStyle = '#e879a0'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      for (let i = 0; i < 3; i++) {
        const yy = y + p.h + 4 + i * 4
        ctx.moveTo(x + 6, yy)
        ctx.lineTo(x + p.w - 6, yy)
      }
      ctx.stroke()
      ctx.fillStyle = rgba('#e879a0', 0.5)
      ctx.beginPath()
      ctx.arc(x + p.w / 2, y + 2, 3.2, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'moving': {
      ctx.fillStyle = rgba('#ffffff', 0.35)
      const cx = x + p.w / 2
      for (const d of [-1, 1]) {
        ctx.beginPath()
        ctx.moveTo(cx + d * 8, y + 8)
        ctx.lineTo(cx + d * 14, y + 8)
        ctx.lineTo(cx + d * 10, y + 3.5)
        ctx.lineTo(cx + d * 10, y + 12.5)
        ctx.lineTo(cx + d * 14, y + 8)
        ctx.fill()
      }
      break
    }
    case 'vmove': {
      // ornitóptero de Da Vinci: flechas verticales + alas
      ctx.fillStyle = rgba('#ffffff', 0.4)
      const cx = x + p.w / 2
      for (const d of [-1, 1]) {
        ctx.beginPath()
        ctx.moveTo(cx, y + 8 + d * 4)
        ctx.lineTo(cx - 5, y + 8 + d * 9)
        ctx.lineTo(cx + 5, y + 8 + d * 9)
        ctx.closePath()
        ctx.fill()
      }
      const flap = Math.sin(t * 7 + p.phase) * 4
      ctx.strokeStyle = rgba('#8a5a33', 0.9)
      ctx.lineWidth = 2.2
      for (const d of [-1, 1]) {
        ctx.beginPath()
        ctx.moveTo(x + (d < 0 ? 4 : p.w - 4), y + 3)
        ctx.quadraticCurveTo(x + (d < 0 ? -6 : p.w + 6), y - 7 - flap, x + (d < 0 ? -10 : p.w + 10), y + 2 + flap)
        ctx.stroke()
      }
      break
    }
    case 'crumble': {
      ctx.strokeStyle = rgba('#000000', 0.4)
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(x + p.w * 0.3, y + 2)
      ctx.lineTo(x + p.w * 0.42, y + p.h - 3)
      ctx.moveTo(x + p.w * 0.66, y + 2)
      ctx.lineTo(x + p.w * 0.56, y + p.h - 3)
      ctx.stroke()
      break
    }
    case 'ice': {
      // mármol griego pulido
      ctx.fillStyle = rgba('#ffffff', 0.3)
      roundRect(ctx, x + 3, y + 2, p.w - 6, 4, 2)
      ctx.fill()
      ctx.strokeStyle = rgba('#ffffff', 0.5)
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x + p.w * 0.25, y + 6)
      ctx.lineTo(x + p.w * 0.3, y + p.h)
      ctx.moveTo(x + p.w * 0.7, y + 6)
      ctx.lineTo(x + p.w * 0.64, y + p.h)
      ctx.stroke()
      break
    }
    case 'spike': {
      // pinchos medievales
      ctx.fillStyle = '#9ca3af'
      const n = Math.max(3, Math.floor(p.w / 12))
      for (let i = 0; i < n; i++) {
        const sx = x + (i + 0.5) * (p.w / n)
        ctx.beginPath()
        ctx.moveTo(sx - 4, y)
        ctx.lineTo(sx, y - 9)
        ctx.lineTo(sx + 4, y)
        ctx.closePath()
        ctx.fill()
      }
      ctx.fillStyle = 'rgba(0,0,0,0.35)'
      ctx.fillRect(x, y, p.w, 2)
      break
    }
    case 'melt': {
      // pincelada que se derrite (absenta)
      ctx.strokeStyle = rgba(e.accent, 0.7)
      ctx.lineWidth = 2
      ctx.beginPath()
      const drips = Math.max(2, Math.floor(p.w / 30))
      for (let i = 0; i < drips; i++) {
        const dx = x + ((i + 0.5) * p.w) / drips
        const dl = 8 + Math.sin(t * 3 + i * 2) * 4
        ctx.moveTo(dx, y + p.h)
        ctx.quadraticCurveTo(dx + 2, y + p.h + dl * 0.6, dx, y + p.h + dl)
      }
      ctx.stroke()
      break
    }
    case 'fake': {
      // caja de contrabando: misma cara que una sólida
      ctx.strokeStyle = rgba('#000000', 0.28)
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.moveTo(x + 2, y + 2)
      ctx.lineTo(x + p.w - 2, y + p.h - 2)
      ctx.moveTo(x + p.w - 2, y + 2)
      ctx.lineTo(x + 2, y + p.h - 2)
      ctx.stroke()
      break
    }
    case 'blink': {
      // neón de los 80
      if (blinkOn) {
        ctx.strokeStyle = '#f0abfc'
        ctx.lineWidth = 2
        ctx.shadowColor = '#f0abfc'
        ctx.shadowBlur = 12
        roundRect(ctx, x, y, p.w, p.h, 7)
        ctx.stroke()
        ctx.shadowBlur = 0
      } else {
        ctx.strokeStyle = rgba('#f0abfc', 0.4)
        ctx.lineWidth = 1.2
        roundRect(ctx, x, y, p.w, p.h, 7)
        ctx.stroke()
      }
      break
    }
    case 'holo': {
      // holograma cyberpunk con scanlines
      ctx.strokeStyle = '#22d3ee'
      ctx.lineWidth = 2
      ctx.shadowColor = '#22d3ee'
      ctx.shadowBlur = 10
      roundRect(ctx, x, y, p.w, p.h, 7)
      ctx.stroke()
      ctx.shadowBlur = 0
      ctx.fillStyle = 'rgba(34,211,238,0.14)'
      for (let sy = y + 2; sy < y + p.h; sy += 3) ctx.fillRect(x + 2, sy, p.w - 4, 1.2)
      if (p.aux > 0) {
        // glitch: rebanadas desplazadas
        ctx.fillStyle = rgba('#22d3ee', 0.5)
        const off = Math.sin(t * 40) * 6
        ctx.fillRect(x + off, y + 3, p.w, 3)
        ctx.fillRect(x - off, y + p.h - 6, p.w, 3)
      }
      break
    }
    case 'checkpoint': {
      const flagX = x + p.w - 26
      ctx.strokeStyle = '#d1d5db'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(flagX, y)
      ctx.lineTo(flagX, y - 44)
      ctx.stroke()
      ctx.fillStyle = p.used ? '#4ade80' : e.accent
      ctx.beginPath()
      ctx.moveTo(flagX, y - 44)
      ctx.lineTo(flagX + 24, y - 37)
      ctx.lineTo(flagX, y - 30)
      ctx.fill()
      break
    }
    case 'ground': {
      ctx.fillStyle = '#3d2b1a'
      ctx.fillRect(x, y + p.h, p.w, 400)
      ctx.fillStyle = '#4d7c3a'
      for (let i = 0; i < p.w; i += 22) {
        ctx.beginPath()
        ctx.moveTo(x + i, y)
        ctx.lineTo(x + i + 5, y - 8)
        ctx.lineTo(x + i + 10, y)
        ctx.fill()
      }
      break
    }
    default:
      break
  }

  // adornos por era
  if (p.era === 0 && p.kind !== 'ground') {
    // vetas de corteza
    ctx.strokeStyle = 'rgba(0,0,0,0.28)'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    for (let i = 1; i <= 2; i++) {
      const bx = x + (p.w * i) / 3
      ctx.moveTo(bx, y + 4)
      ctx.quadraticCurveTo(bx + 3, y + p.h / 2, bx - 2, y + p.h - 2)
    }
    ctx.stroke()
    // gorro de musgo festoneado
    const scallops = Math.max(3, Math.round(p.w / 14))
    ctx.fillStyle = '#3f7d2e'
    for (let i = 0; i < scallops; i++) {
      const mx2 = x + ((i + 0.5) * p.w) / scallops
      ctx.beginPath()
      ctx.arc(mx2, y + 1.5, 6.5, Math.PI, 0)
      ctx.fill()
    }
    ctx.fillStyle = '#5da345'
    for (let i = 0; i < scallops; i++) {
      const mx2 = x + ((i + 0.5) * p.w) / scallops
      ctx.beginPath()
      ctx.arc(mx2 - 1, y + 0.5, 4.6, Math.PI, 0)
      ctx.fill()
    }
    // vides colgantes que se mecen
    ctx.strokeStyle = '#2f6b23'
    ctx.lineWidth = 2
    const vinN = p.w > 80 ? 2 : 1
    for (let i = 0; i < vinN; i++) {
      const vx = x + p.w * (i === 0 ? 0.22 : 0.78)
      const sway = Math.sin(t * 1.8 + p.phase * 7) * 4
      const vl = 16 + ((p.phase * 13) % 10)
      ctx.beginPath()
      ctx.moveTo(vx, y + p.h)
      ctx.quadraticCurveTo(vx + sway, y + p.h + vl * 0.6, vx + sway * 1.6, y + p.h + vl)
      ctx.stroke()
      ctx.fillStyle = '#3f7d2e'
      ctx.beginPath()
      ctx.ellipse(vx + sway * 1.6, y + p.h + vl + 2, 4, 2.4, 0.5, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (p.era === 3) {
    // veta de mármol
    ctx.strokeStyle = rgba('#64748b', 0.35)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x + 4, y + p.h - 3)
    ctx.quadraticCurveTo(x + p.w / 2, y + 4, x + p.w - 4, y + p.h - 3)
    ctx.stroke()
  } else if (p.era === 9) {
    // remaches industriales
    ctx.fillStyle = rgba('#000000', 0.4)
    for (const rx of [x + 8, x + p.w - 8]) {
      ctx.beginPath()
      ctx.arc(rx, y + 8, 2, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (p.era === 12) {
    ctx.strokeStyle = rgba('#b18cd9', 0.85)
    ctx.lineWidth = 2
    ctx.shadowColor = '#b18cd9'
    ctx.shadowBlur = 12
    roundRect(ctx, x, y, p.w, p.h, 7)
    ctx.stroke()
    ctx.shadowBlur = 0
  }
  ctx.restore()
}

// ── ítems ───────────────────────────────────────────────────────────────────
// ── el brebaje de la era (nada de cervezas anacrónicas, manda huevos) ───────
function eraOfY(y: number): number {
  return Math.max(0, Math.min(ERAS.length - 1, Math.floor(-y / PX_PER_M / ERA_HEIGHT_M)))
}

function drawDrink(ctx: CanvasRenderingContext2D, x: number, y: number, era: number, t: number): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(Math.sin(t * 5.5) * 0.09) // aliento etílico
  const fizz = (t * 0.9) % 1 // burbuja que sube
  switch (era) {
    case 0: { // 🍇 Mioceno — racimo de uvas fermentadas
      ctx.shadowColor = '#a855f7'
      ctx.shadowBlur = 10
      ctx.fillStyle = '#4ade80' // hojita
      ctx.beginPath()
      ctx.ellipse(3, -10, 4.6, 2.2, -0.65, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#6d28d9'
      const uvas: Array<[number, number]> = [[-5, -4], [1, -5], [6, -3], [-2, 1], [4, 1], [1, 7]]
      for (const [ux, uy] of uvas) {
        ctx.beginPath()
        ctx.arc(ux, uy, 4.5, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.shadowBlur = 0
      ctx.fillStyle = 'rgba(233,213,255,0.9)' // brillos
      ctx.beginPath()
      ctx.arc(-6.4, -5.2, 1.5, 0, Math.PI * 2)
      ctx.arc(2.6, -6.6, 1.4, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = rgba('#e9d5ff', 0.9 * (1 - fizz)) // fermentación
      ctx.beginPath()
      ctx.arc(9.5, -1 - fizz * 9, 1.6, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 1: { // 🏺 Neolítico — cerveza de barro (cántaro con espuma)
      ctx.shadowColor = '#fbbf24'
      ctx.shadowBlur = 8
      ctx.fillStyle = '#8a4a12'
      ctx.beginPath()
      ctx.ellipse(0, 3, 9, 9, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillRect(-4.5, -7, 9, 7)
      ctx.shadowBlur = 0
      ctx.strokeStyle = '#d9a971' // bandas pintadas
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.moveTo(-8.2, 1)
      ctx.lineTo(8.2, 1)
      ctx.moveTo(-7.2, 6)
      ctx.lineTo(7.2, 6)
      ctx.stroke()
      ctx.fillStyle = '#fef3c7' // espuma
      ctx.beginPath()
      ctx.arc(-3, -8, 2.8, 0, Math.PI * 2)
      ctx.arc(2.6, -9, 3.6, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 2: { // 🏜️ Egipto — copa dorada de vino de dátiles
      ctx.shadowColor = '#f4c542'
      ctx.shadowBlur = 10
      ctx.fillStyle = '#f4c542'
      ctx.beginPath() // cuenco
      ctx.moveTo(-8, -7.5)
      ctx.lineTo(8, -7.5)
      ctx.lineTo(8, -6)
      ctx.quadraticCurveTo(0, -1, -8, -6)
      ctx.closePath()
      ctx.fill()
      ctx.fillRect(-1.4, -6, 2.8, 10) // tallo
      ctx.beginPath() // pie
      ctx.ellipse(0, 6.5, 6, 2, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.fillStyle = '#b34a0c' // vino de dátil
      ctx.beginPath()
      ctx.moveTo(-6.6, -6.6)
      ctx.lineTo(6.6, -6.6)
      ctx.quadraticCurveTo(0, -2.6, -6.6, -6.6)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = 'rgba(255,237,213,0.55)'
      ctx.beginPath()
      ctx.ellipse(-3, -5.6, 1.8, 0.9, -0.4, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 3: { // 🏛️ Grecia — kylix de vino y ouzo
      ctx.shadowColor = '#93c5fd'
      ctx.shadowBlur = 8
      ctx.strokeStyle = '#b45309'
      ctx.lineWidth = 2.4
      ctx.beginPath() // asas
      ctx.arc(-10, -4, 3.2, Math.PI * 0.3, Math.PI * 1.7)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(10, -4, 3.2, -Math.PI * 0.7, Math.PI * 0.7)
      ctx.stroke()
      ctx.fillStyle = '#b45309' // cuenco ancho
      ctx.beginPath()
      ctx.moveTo(-9, -7)
      ctx.quadraticCurveTo(0, 3.5, 9, -7)
      ctx.closePath()
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.fillStyle = '#5b1a1a' // vino
      ctx.beginPath()
      ctx.ellipse(0, -6.1, 8.3, 1.7, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#f5d7a0' // meandro
      ctx.fillRect(-1, -2.6, 2, 1.6)
      break
    }
    case 4: { // 🍷 Roma — ánfora de vino
      ctx.shadowColor = '#e879a0'
      ctx.shadowBlur = 8
      ctx.fillStyle = '#c2611e'
      ctx.beginPath()
      ctx.moveTo(0, -9)
      ctx.bezierCurveTo(-9, -7, -9, 3, -5, 8)
      ctx.lineTo(5, 8)
      ctx.bezierCurveTo(9, 3, 9, -7, 0, -9)
      ctx.fill()
      ctx.beginPath() // punta
      ctx.moveTo(-3.2, 10.5)
      ctx.lineTo(3.2, 10.5)
      ctx.lineTo(2, 8)
      ctx.lineTo(-2, 8)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = '#a34712' // asas
      ctx.lineWidth = 2.2
      ctx.beginPath()
      ctx.moveTo(-3.2, -8)
      ctx.quadraticCurveTo(-10.5, -6, -7.5, 0.5)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(3.2, -8)
      ctx.quadraticCurveTo(10.5, -6, 7.5, 0.5)
      ctx.stroke()
      ctx.shadowBlur = 0
      ctx.fillStyle = '#7f1d1d' // banda de vino
      ctx.fillRect(-8, -1.5, 16, 3)
      ctx.fillStyle = 'rgba(255,255,255,0.28)'
      ctx.beginPath()
      ctx.ellipse(-4, -4.5, 1.6, 3, 0.2, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 5: { // 🏰 Edad Media — jarra de madera con aros (hidromiel y ale)
      ctx.shadowColor = '#f59e0b'
      ctx.shadowBlur = 9
      ctx.strokeStyle = '#5b3a1a' // asa
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(10, 1, 5, -Math.PI / 2, Math.PI / 2)
      ctx.stroke()
      ctx.fillStyle = '#8a5a33' // madera
      roundRect(ctx, -8, -8, 16, 17, 3)
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.strokeStyle = '#cbd5e1' // aros metálicos
      ctx.lineWidth = 1.6
      ctx.beginPath()
      ctx.moveTo(-8, -4)
      ctx.lineTo(8, -4)
      ctx.moveTo(-8, 5)
      ctx.lineTo(8, 5)
      ctx.stroke()
      ctx.fillStyle = '#fbbf24' // hidromiel dorado asomando
      ctx.fillRect(-8, -1.2, 16, 2.4)
      ctx.fillStyle = '#fef3c7' // espuma
      ctx.beginPath()
      ctx.arc(-3, -9, 2.8, 0, Math.PI * 2)
      ctx.arc(2.4, -9.8, 3.4, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 6: { // 🎨 Renacimiento — fiasco de Chianti
      ctx.shadowColor = '#fbbf24'
      ctx.shadowBlur = 8
      ctx.fillStyle = '#166534' // vidrio verde
      ctx.beginPath()
      ctx.ellipse(0, 3, 7, 8, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillRect(-2.6, -9, 5.2, 8) // cuello
      ctx.shadowBlur = 0
      ctx.fillStyle = '#d1a06a' // corcho
      ctx.fillRect(-2.6, -11.5, 5.2, 3)
      ctx.fillStyle = '#f5d7a0' // etiqueta
      ctx.beginPath()
      ctx.ellipse(0, 4, 4.4, 4.6, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#991b1b'
      ctx.fillRect(-4.2, 2.6, 8.4, 2)
      break
    }
    case 7: { // 🌀 Impresionismo — absenta (el Hada Verde)
      ctx.shadowColor = '#4ade80'
      ctx.shadowBlur = 14
      ctx.fillStyle = '#16a34a'
      roundRect(ctx, -6, -8, 12, 17, 2.5)
      ctx.fill()
      ctx.fillRect(-2.2, -13, 4.4, 6) // cuello largo
      ctx.shadowBlur = 0
      ctx.fillStyle = '#86efac' // líquido luminoso
      roundRect(ctx, -4.4, -5, 8.8, 12, 2)
      ctx.fill()
      ctx.fillStyle = '#d9f99d' // tapón
      ctx.fillRect(-2.2, -15.5, 4.4, 3)
      ctx.strokeStyle = 'rgba(236,252,203,0.95)' // destello del hada
      ctx.lineWidth = 1.4
      const tw = t * 2.4
      ctx.beginPath()
      ctx.moveTo(0, -2 - Math.sin(tw) * 1.5)
      ctx.lineTo(0, 6)
      ctx.moveTo(-3.4, 2)
      ctx.lineTo(3.4, 2)
      ctx.stroke()
      break
    }
    case 8: { // 🥃 La Prohibición — moonshine con etiqueta XXX
      ctx.shadowColor = '#f472b6'
      ctx.shadowBlur = 8
      ctx.fillStyle = 'rgba(226,232,240,0.35)' // vidrio
      roundRect(ctx, -7, -6, 14, 15, 3)
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.fillStyle = 'rgba(248,250,252,0.55)' // aguardiente
      roundRect(ctx, -5.6, -2, 11.2, 9.6, 2)
      ctx.fill()
      ctx.fillStyle = '#94a3b8' // tapa metálica
      roundRect(ctx, -5, -10, 10, 4.6, 1.6)
      ctx.fill()
      ctx.fillStyle = '#f8fafc' // etiqueta
      roundRect(ctx, -5, -1, 10, 6, 1.4)
      ctx.fill()
      ctx.fillStyle = '#1e293b'
      ctx.font = 'bold 5px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('XXX', 0, 3.4)
      break
    }
    case 9: { // ⚙️ Revolución Industrial — gin tonic con limón
      ctx.shadowColor = '#f97316'
      ctx.shadowBlur = 8
      ctx.fillStyle = 'rgba(226,232,240,0.4)' // vaso
      roundRect(ctx, -6, -9, 12, 19, 2)
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.fillStyle = 'rgba(186,230,253,0.65)' // tónica
      roundRect(ctx, -4.6, -5, 9.2, 13.5, 1.6)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.7)' // burbujas
      ctx.beginPath()
      ctx.arc(-2, 5 - fizz * 9, 1, 0, Math.PI * 2)
      ctx.arc(2, 7 - fizz * 9, 0.8, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fde047' // rodaja de limón
      ctx.beginPath()
      ctx.arc(6.5, -7.5, 3.6, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#ca8a04'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.arc(6.5, -7.5, 3.6, 0, Math.PI * 2)
      ctx.moveTo(3.9, -7.5)
      ctx.lineTo(9.1, -7.5)
      ctx.moveTo(6.5, -10.1)
      ctx.lineTo(6.5, -4.9)
      ctx.stroke()
      break
    }
    case 10: { // 🕶️ Años 80 — cóctel de neón (martini)
      const grad = ctx.createLinearGradient(0, -6, 0, 7)
      grad.addColorStop(0, '#f0abfc')
      grad.addColorStop(1, '#22d3ee')
      ctx.shadowColor = '#f0abfc'
      ctx.shadowBlur = 14
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.moveTo(-8, -6)
      ctx.lineTo(8, -6)
      ctx.lineTo(0, 7)
      ctx.closePath()
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.strokeStyle = 'rgba(240,171,252,0.9)' // copa
      ctx.lineWidth = 1.6
      ctx.beginPath()
      ctx.moveTo(-9, -7)
      ctx.lineTo(9, -7)
      ctx.moveTo(0, 7)
      ctx.lineTo(0, 11)
      ctx.moveTo(-5, 11.5)
      ctx.lineTo(5, 11.5)
      ctx.stroke()
      ctx.fillStyle = '#ef4444' // cereza
      ctx.beginPath()
      ctx.arc(4.5, -8.6, 2.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#16a34a'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(4.5, -10.6)
      ctx.lineTo(6.5, -12.5)
      ctx.stroke()
      break
    }
    case 11: { // 🌃 Cyberpunk 2099 — neon-vodka
      ctx.shadowColor = '#22d3ee'
      ctx.shadowBlur = 14
      ctx.fillStyle = 'rgba(8,145,178,0.55)'
      roundRect(ctx, -6.5, -8, 13, 17, 3)
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.fillStyle = '#22d3ee' // líquido brillante
      roundRect(ctx, -4.6, -4, 9.2, 11, 2)
      ctx.fill()
      ctx.fillStyle = '#e2e8f0' // tapa cromada
      roundRect(ctx, -3.4, -12, 6.8, 4, 1.4)
      ctx.fill()
      ctx.fillStyle = 'rgba(240,171,252,0.95)' // etiqueta glitch
      ctx.fillRect(-4.6, 0, 9.2, 1.6)
      ctx.fillStyle = 'rgba(34,211,238,0.9)'
      ctx.fillRect(-3, -9.6, 6, 1.2)
      break
    }
    default: { // 🚀 Era Espacial — lata de cerveza cuántica con átomo
      ctx.shadowColor = '#fde047'
      ctx.shadowBlur = 12
      const gq = ctx.createLinearGradient(-7, 0, 7, 0)
      gq.addColorStop(0, '#7c3aed')
      gq.addColorStop(0.5, '#a78bfa')
      gq.addColorStop(1, '#6d28d9')
      ctx.fillStyle = gq
      roundRect(ctx, -7, -9, 14, 19, 4)
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.fillStyle = '#fde047' // banda
      ctx.fillRect(-7, -2.5, 14, 4)
      ctx.fillStyle = '#0f172a'
      ctx.font = 'bold 5px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('Q', 0, 1.4)
      ctx.strokeStyle = 'rgba(253,224,71,0.9)' // órbita del átomo
      ctx.lineWidth = 1.2
      ctx.save()
      ctx.translate(0, -5.5)
      ctx.scale(1, 0.42)
      ctx.rotate(Math.sin(t * 3) * 0.5)
      ctx.beginPath()
      ctx.arc(0, 0, 7.5, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
      ctx.fillStyle = '#fef9c3' // núcleo
      ctx.beginPath()
      ctx.arc(0, -5.5, 1.6, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#cbd5e1' // tapa
      roundRect(ctx, -5.4, -11.5, 10.8, 3, 1.4)
      ctx.fill()
      break
    }
  }
  ctx.restore()
}

function drawItem(ctx: CanvasRenderingContext2D, it: Item, t: number, camTop: number): void {
  const bob = Math.sin(t * 3 + it.t) * 4
  const x = it.x
  const y = it.y - camTop + bob
  ctx.save()
  if (it.kind === 'gene') {
    ctx.strokeStyle = '#34d399'
    ctx.lineWidth = 2
    ctx.shadowColor = '#34d399'
    ctx.shadowBlur = 8
    ctx.beginPath()
    for (const ph of [0, Math.PI]) {
      for (let i = 0; i <= 10; i++) {
        const yy = y - 11 + (i / 10) * 22
        const xx = x + Math.sin(i / 10 * Math.PI * 2 + ph + t * 4) * 4.5
        if (i === 0) ctx.moveTo(xx, yy)
        else ctx.lineTo(xx, yy)
      }
    }
    ctx.stroke()
    ctx.lineWidth = 1.6
    ctx.beginPath()
    for (let i = 1; i < 4; i++) {
      const yy = y - 11 + (i / 4) * 22
      const off = Math.abs(Math.sin(i / 4 * Math.PI * 2 + t * 4)) * 4.5
      ctx.moveTo(x - off, yy)
      ctx.lineTo(x + off, yy)
    }
    ctx.stroke()
    ctx.shadowBlur = 0
  } else if (it.kind === 'bottle') {
    // halo de poción: cada brebaje destella con el color de su era
    const gl = glowSprite(ERAS[eraOfY(it.y)].accent)
    ctx.globalAlpha = 0.4 + Math.sin(t * 3 + it.t) * 0.14
    ctx.drawImage(gl, x - 26, y - 26, 52, 52)
    ctx.globalAlpha = 1
    // ¡el brebaje de la era, no una jarra anacrónica!
    drawDrink(ctx, x, y, eraOfY(it.y), t + it.t)
  } else if (it.kind === 'banana') {
    ctx.shadowColor = '#facc15'
    ctx.shadowBlur = 8
    ctx.strokeStyle = '#facc15'
    ctx.lineWidth = 6
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.arc(x, y + 6, 10, Math.PI * 1.15, Math.PI * 1.85)
    ctx.stroke()
    ctx.strokeStyle = '#65a30d'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(x + 9, y - 2)
    ctx.lineTo(x + 13, y - 6)
    ctx.stroke()
    ctx.shadowBlur = 0
  } else if (it.kind === 'phone') {
    // El Teléfono del Ex
    ctx.shadowColor = '#7dd3fc'
    ctx.shadowBlur = 12
    ctx.fillStyle = '#334155'
    roundRect(ctx, x - 7, y - 12, 14, 24, 3)
    ctx.fill()
    ctx.fillStyle = '#7dd3fc'
    roundRect(ctx, x - 5, y - 9, 10, 14, 2)
    ctx.fill()
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(x + 6, y - 12)
    ctx.lineTo(x + 11, y - 18)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(x + 12, y - 19, 2.2, 0, Math.PI * 2)
    ctx.stroke()
    ctx.shadowBlur = 0
  } else if (it.kind === 'kebab') {
    // El Kebab de la Sabiduría
    ctx.shadowColor = '#fbbf24'
    ctx.shadowBlur = 10
    ctx.strokeStyle = '#92400e'
    ctx.lineWidth = 2.6
    ctx.beginPath()
    ctx.moveTo(x - 13, y + 8)
    ctx.lineTo(x + 13, y - 8)
    ctx.stroke()
    ctx.fillStyle = '#d97706'
    for (let i = 0; i < 3; i++) {
      ctx.beginPath()
      ctx.ellipse(x - 7 + i * 7, y + 3 - i * 5, 5, 3.6, -0.6, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = '#fef3c7'
    ctx.beginPath()
    ctx.ellipse(x - 10, y + 7, 5.5, 4, -0.6, 0, Math.PI * 2)
    ctx.ellipse(x + 10, y - 7, 5.5, 4, -0.6, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
  } else {
    // El Plato de Tapas Volador
    ctx.shadowColor = '#fb923c'
    ctx.shadowBlur = 10
    ctx.fillStyle = '#f8fafc'
    ctx.beginPath()
    ctx.ellipse(x, y, 14, 5.5, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#e2e8f0'
    ctx.beginPath()
    ctx.ellipse(x, y + 2.5, 14, 5.5, 0, 0, Math.PI * 2)
    ctx.fill()
    const cols = ['#ef4444', '#f59e0b', '#22c55e', '#8b5cf6']
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = cols[i]
      ctx.beginPath()
      ctx.arc(x - 7 + i * 4.6, y - 2 - (i % 2) * 2, 2.4, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.shadowBlur = 0
  }
  ctx.restore()
}

// ── el mono disfrazado (nunca deja de ser mono) ─────────────────────────────
function drawMonkey(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  o: {
    face: number
    vx: number
    vy: number
    onGround: boolean
    drunk: number
    courage: boolean
    divine: boolean
    era: number
    invuln: number
    vip: boolean
    blackout: boolean
    t: number
  }
): void {
  const { face, onGround, drunk, divine, era, invuln, vip, blackout, t } = o
  ctx.save()
  if (invuln > 0 && Math.sin(t * 22) > 0) ctx.globalAlpha = 0.35

  const tilt = Math.max(-0.35, Math.min(0.35, o.vx / 1400)) + Math.sin(t * 5.2) * 0.2 * drunk
  ctx.translate(x, y)
  // squash & stretch de ilustración (solo presentación: la física no se entera)
  if (o.vy < -120) ctx.scale(0.91, 1.1)
  else if (o.vy > 420) ctx.scale(1.07, 0.93)
  if (blackout) ctx.rotate(Math.sin(t * 14) * 0.5) // ragdoll girando
  else ctx.rotate(tilt)
  if (face < 0) ctx.scale(-1, 1)

  const airFlail = onGround ? 0.25 : 1
  const swing = Math.sin(t * 13) * airFlail * (1 + drunk * 0.7)
  const swing2 = Math.sin(t * 13 + 2.2) * airFlail * (1 + drunk * 0.7)

  // aura de coraje / divino
  if (divine) {
    nebulaBlob(ctx, 0, 0, 46, rgba('#fde047', 0.3))
  } else if (o.courage) {
    nebulaBlob(ctx, 0, 0, 36, rgba('#fbbf24', 0.28))
  }

  // cola
  ctx.strokeStyle = '#7c4a21'
  ctx.lineWidth = 4.5
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-10, 8)
  ctx.quadraticCurveTo(-26, 6 + Math.sin(t * 4) * 7, -22, -8 + Math.sin(t * 4 + 1) * 8)
  ctx.stroke()

  // patas
  ctx.strokeStyle = '#6b4220'
  ctx.lineWidth = 5.5
  ctx.beginPath()
  ctx.moveTo(-6, 12)
  ctx.lineTo(-8 + swing * 6, 19)
  ctx.moveTo(6, 12)
  ctx.lineTo(8 - swing2 * 6, 19)
  ctx.stroke()

  // brazos
  ctx.strokeStyle = '#7c4a21'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(-8, -2)
  ctx.lineTo(-13 - swing * 5, 6 - Math.abs(swing) * 8)
  ctx.moveTo(8, -2)
  ctx.lineTo(13 + swing2 * 5, 6 - Math.abs(swing2) * 8)
  ctx.stroke()

  // cuerpo con volumen y contorno de tinta
  const bodyG = ctx.createLinearGradient(0, -6, 0, 19)
  bodyG.addColorStop(0, '#a86f45')
  bodyG.addColorStop(1, '#7a4d2a')
  ctx.fillStyle = bodyG
  ctx.beginPath()
  ctx.ellipse(0, 6, 12, 13, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#4a2c12'
  ctx.lineWidth = 1.6
  ctx.stroke()
  ctx.fillStyle = '#d9a971'
  ctx.beginPath()
  ctx.ellipse(1, 8, 7, 9, 0, 0, Math.PI * 2)
  ctx.fill()

  // cabeza
  const hy = -12 + Math.sin(t * 6) * 1.2
  // orejas
  ctx.fillStyle = '#92603a'
  ctx.beginPath()
  ctx.arc(-11, hy - 2, 5.5, 0, Math.PI * 2)
  ctx.arc(11, hy - 2, 5.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#4a2c12'
  ctx.lineWidth = 1.4
  ctx.stroke()
  ctx.fillStyle = '#d9a971'
  ctx.beginPath()
  ctx.arc(-11, hy - 2, 2.8, 0, Math.PI * 2)
  ctx.arc(11, hy - 2, 2.8, 0, Math.PI * 2)
  ctx.fill()
  // cráneo con volumen y contorno
  const headG = ctx.createLinearGradient(0, hy - 12, 0, hy + 12)
  headG.addColorStop(0, '#a86f45')
  headG.addColorStop(1, '#7a4d2a')
  ctx.fillStyle = headG
  ctx.beginPath()
  ctx.arc(0, hy, 12, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#4a2c12'
  ctx.lineWidth = 1.6
  ctx.stroke()
  // cara
  ctx.fillStyle = '#e8c393'
  ctx.beginPath()
  ctx.ellipse(1.5, hy + 2.5, 8.6, 7.6, 0, 0, Math.PI * 2)
  ctx.fill()

  // ojos
  const blink = t % 3.4 < 0.13
  if (blackout || drunk > 0.7) {
    // espirales de borrachera total
    ctx.strokeStyle = '#3f2a12'
    ctx.lineWidth = 1.6
    for (const ex of [-3.5, 6]) {
      ctx.beginPath()
      for (let a = 0; a < Math.PI * 3.6; a += 0.4) {
        const r = 0.6 + a * 0.75
        const px = ex + Math.cos(a + t * 5) * r * 0.55
        const py = hy - 2 + Math.sin(a + t * 5) * r * 0.55
        if (a === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.stroke()
    }
  } else if (blink) {
    ctx.strokeStyle = '#3f2a12'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(-6, hy - 2)
    ctx.lineTo(-1, hy - 2)
    ctx.moveTo(4, hy - 2)
    ctx.lineTo(9, hy - 2)
    ctx.stroke()
  } else {
    ctx.fillStyle = '#2f1d0a'
    ctx.beginPath()
    ctx.arc(-3, hy - 2, 2, 0, Math.PI * 2)
    ctx.arc(6.4, hy - 2, 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(-2.4, hy - 2.8, 0.7, 0, Math.PI * 2)
    ctx.arc(7, hy - 2.8, 0.7, 0, Math.PI * 2)
    ctx.fill()
  }

  // boca y mejillas
  ctx.strokeStyle = '#5f3a17'
  ctx.lineWidth = 1.4
  ctx.beginPath()
  if (drunk < 0.08) {
    // sobrio: cara de aburrido
    ctx.moveTo(0, hy + 5.5)
    ctx.lineTo(6, hy + 5.5)
  } else if (drunk > 0.4) {
    ctx.moveTo(-2, hy + 5.5)
    ctx.quadraticCurveTo(2, hy + 3.5 + Math.sin(t * 9) * 1.4, 6, hy + 5.5)
  } else {
    ctx.moveTo(-1, hy + 5)
    ctx.quadraticCurveTo(3, hy + 7.4, 7, hy + 4.4)
  }
  ctx.stroke()
  if (drunk > 0.25) {
    ctx.fillStyle = rgba('#f87171', 0.4 * drunk)
    ctx.beginPath()
    ctx.arc(-6, hy + 4, 2.6, 0, Math.PI * 2)
    ctx.arc(9, hy + 4, 2.6, 0, Math.PI * 2)
    ctx.fill()
  }

  // accesorio por era (Pilar 1: siempre mono, siempre disfrazado)
  switch (era) {
    case 0: // hoja
      ctx.fillStyle = '#15803d'
      ctx.beginPath()
      ctx.ellipse(2, hy - 12, 7, 3.4, -0.5, 0, Math.PI * 2)
      ctx.fill()
      break
    case 1: { // piel de bestia + colmillos
      ctx.strokeStyle = '#78513a'
      ctx.lineWidth = 5
      ctx.beginPath()
      ctx.arc(0, hy - 6, 10, Math.PI * 1.15, Math.PI * 1.85)
      ctx.stroke()
      ctx.fillStyle = '#f5f0e1'
      ctx.beginPath()
      ctx.moveTo(-4, 2)
      ctx.lineTo(-2.4, 7)
      ctx.lineTo(-0.8, 2)
      ctx.moveTo(2, 2)
      ctx.lineTo(3.6, 7)
      ctx.lineTo(5.2, 2)
      ctx.fill()
      break
    }
    case 2: // nemes faraónico
      ctx.fillStyle = '#f4c542'
      ctx.fillRect(-10, hy - 9, 21, 3.4)
      ctx.beginPath()
      ctx.moveTo(-2, hy - 9)
      ctx.lineTo(0, hy - 16)
      ctx.lineTo(2.4, hy - 9)
      ctx.fill()
      break
    case 3: { // corona de laurel
      ctx.strokeStyle = '#65a30d'
      ctx.lineWidth = 2.2
      ctx.beginPath()
      ctx.arc(1, hy - 3, 11, Math.PI * 1.1, Math.PI * 1.9)
      ctx.stroke()
      ctx.fillStyle = '#84cc16'
      for (let i = 0; i < 4; i++) {
        const a = Math.PI * 1.2 + i * 0.35
        ctx.beginPath()
        ctx.ellipse(1 + Math.cos(a) * 11, hy - 3 + Math.sin(a) * 11, 3, 1.6, a, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }
    case 4: // penacho centurión
      ctx.fillStyle = '#dc2626'
      ctx.beginPath()
      ctx.moveTo(-9, hy - 9)
      ctx.quadraticCurveTo(0, hy - 19, 9, hy - 9)
      ctx.quadraticCurveTo(0, hy - 14, -9, hy - 9)
      ctx.fill()
      break
    case 5: { // yelmo medieval
      ctx.fillStyle = '#6b7280'
      ctx.beginPath()
      ctx.arc(0, hy - 2, 12, Math.PI, 0)
      ctx.fill()
      ctx.fillRect(-12, hy - 3, 24, 4)
      ctx.fillStyle = '#374151'
      ctx.fillRect(1, hy - 3, 3, 8)
      ctx.fillStyle = '#dc2626'
      ctx.fillRect(-2, hy - 18, 4, 6)
      break
    }
    case 6: { // birrete de Da Vinci
      ctx.fillStyle = '#1c1917'
      ctx.beginPath()
      ctx.ellipse(0, hy - 10, 11, 4, 0, Math.PI, 0)
      ctx.fill()
      ctx.fillRect(-8, hy - 14, 16, 4.5)
      ctx.strokeStyle = '#1c1917'
      ctx.lineWidth = 1.6
      ctx.beginPath()
      ctx.moveTo(-8, hy - 10)
      ctx.lineTo(-13, hy - 5)
      ctx.stroke()
      break
    }
    case 7: { // sombrero de paja de Van Gogh
      ctx.fillStyle = '#eab308'
      ctx.beginPath()
      ctx.ellipse(0, hy - 10, 13, 3.4, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(0, hy - 14, 7.5, 5, 0, Math.PI, 0)
      ctx.fill()
      ctx.fillStyle = '#3f6212'
      ctx.fillRect(-7.5, hy - 12, 15, 2)
      break
    }
    case 8: // fedora de gánster
      ctx.fillStyle = '#1c1917'
      ctx.beginPath()
      ctx.ellipse(0, hy - 10, 12, 3, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillRect(-7, hy - 17, 14, 7)
      ctx.fillStyle = '#c9973f'
      ctx.fillRect(-7, hy - 12.5, 14, 2)
      break
    case 9: // gorra plana obrera
      ctx.fillStyle = '#374151'
      ctx.beginPath()
      ctx.ellipse(0, hy - 9, 10, 4.4, 0, Math.PI, 0)
      ctx.fill()
      ctx.fillRect(-2, hy - 9.5, 12, 2.4)
      break
    case 10: { // gafas de neón años 80
      ctx.fillStyle = 'rgba(240,171,252,0.85)'
      roundRect(ctx, -8, hy - 4, 17, 5.5, 2.5)
      ctx.fill()
      ctx.strokeStyle = '#f0abfc'
      ctx.lineWidth = 1.2
      ctx.stroke()
      ctx.fillStyle = '#7c3aed'
      ctx.beginPath()
      ctx.ellipse(0, hy - 12, 10, 4, 0, Math.PI, 0)
      ctx.fill()
      break
    }
    case 11: { // visor ciberpunk + antena
      ctx.fillStyle = 'rgba(34,211,238,0.75)'
      roundRect(ctx, -8, hy - 5, 17, 6, 2.5)
      ctx.fill()
      ctx.strokeStyle = '#22d3ee'
      ctx.lineWidth = 1.2
      ctx.stroke()
      ctx.strokeStyle = '#22d3ee'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(4, hy - 10)
      ctx.lineTo(8, hy - 18)
      ctx.stroke()
      ctx.fillStyle = '#fde047'
      ctx.beginPath()
      ctx.arc(8, hy - 19, 2.4, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    default: { // 12: casco espacial
      ctx.strokeStyle = 'rgba(226,232,240,0.95)'
      ctx.lineWidth = 2.6
      ctx.beginPath()
      ctx.arc(1, hy, 14.5, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = 'rgba(226,232,240,0.14)'
      ctx.fill()
      break
    }
  }

  // halo divino si alcanzó la ascensión
  if (divine) {
    ctx.strokeStyle = '#fde047'
    ctx.lineWidth = 2.6
    ctx.shadowColor = '#fde047'
    ctx.shadowBlur = 10
    ctx.beginPath()
    ctx.ellipse(1, hy - 20, 9, 3, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.shadowBlur = 0
  }

  // Tarjeta VIP del Borracho: monóculo + puro
  if (vip) {
    ctx.strokeStyle = '#fbbf24'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.arc(6.4, hy - 2, 3.4, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(6.4, hy + 1.4)
    ctx.lineTo(9, hy + 4)
    ctx.stroke()
    ctx.fillStyle = '#78350f'
    roundRect(ctx, 5, hy + 4.5, 9, 3.2, 1.6)
    ctx.fill()
    ctx.fillStyle = '#9ca3af'
    ctx.beginPath()
    ctx.arc(14, hy + 6, 1.2, 0, Math.PI * 2)
    ctx.fill()
    if (Math.random() < 0.3) {
      ctx.fillStyle = 'rgba(220,220,220,0.4)'
      ctx.beginPath()
      ctx.arc(15, hy + 3 - (t % 1) * 6, 1.6, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()
}

// ── jefes: guardianes de la sobriedad ───────────────────────────────────────
function drawBoss(ctx: CanvasRenderingContext2D, b: Boss, t: number, camTop: number, playerDrunk: number): void {
  const x = b.x
  const y = b.y - camTop
  ctx.save()
  ctx.translate(x, y)
  if (b.hurtT > 0) {
    ctx.globalAlpha = 0.85
  }
  const flash = b.hurtT > 0

  switch (b.type) {
    case 'mamut': {
      // mamut con bata de médico
      ctx.fillStyle = flash ? '#fff' : '#8a5a3a'
      ctx.beginPath()
      ctx.ellipse(0, 0, 34, 26, 0, 0, Math.PI * 2)
      ctx.fill()
      // cabeza
      ctx.beginPath()
      ctx.arc(30, -14, 16, 0, Math.PI * 2)
      ctx.fill()
      // trompa
      ctx.strokeStyle = flash ? '#fff' : '#8a5a3a'
      ctx.lineWidth = 7
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(38, -8)
      ctx.quadraticCurveTo(46, 6, 40, 20 + Math.sin(t * 3) * 3)
      ctx.stroke()
      // colmillos
      ctx.strokeStyle = '#f5f0e1'
      ctx.lineWidth = 3.4
      ctx.beginPath()
      ctx.moveTo(34, -4)
      ctx.quadraticCurveTo(44, 2, 46, 10)
      ctx.stroke()
      // espejillo de médico + cruz
      ctx.strokeStyle = '#e5e7eb'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(30, -26, 6, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = '#ef4444'
      ctx.fillRect(-14, -6, 4, 10)
      ctx.fillRect(-17, -3, 10, 4)
      // orejas
      ctx.fillStyle = flash ? '#fff' : '#6b4423'
      ctx.beginPath()
      ctx.ellipse(18, -22, 8, 11, -0.4, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'caballero': {
      // Sir Abstinence: armadura + escudo-botella de agua
      ctx.fillStyle = flash ? '#fff' : '#9ca3af'
      ctx.beginPath()
      ctx.ellipse(0, 4, 20, 24, 0, 0, Math.PI * 2)
      ctx.fill()
      // casco
      ctx.beginPath()
      ctx.arc(0, -22, 13, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#374151'
      ctx.fillRect(-9, -24, 18, 4)
      ctx.fillStyle = '#dc2626'
      ctx.beginPath()
      ctx.moveTo(-6, -33)
      ctx.quadraticCurveTo(0, -44, 6, -33)
      ctx.fill()
      // escudo: botella de agua
      ctx.fillStyle = '#93c5fd'
      roundRect(ctx, -34, -14, 13, 30, 6)
      ctx.fill()
      ctx.fillStyle = '#dbeafe'
      ctx.fillRect(-31, -20, 7, 8)
      // espada
      ctx.strokeStyle = '#e5e7eb'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(24, -10)
      ctx.lineTo(24, -34)
      ctx.stroke()
      ctx.fillStyle = '#78350f'
      ctx.fillRect(19, -12, 10, 4)
      break
    }
    case 'agente': {
      // dirigible con agente de la Ley Seca
      ctx.fillStyle = flash ? '#fff' : '#4b4453'
      ctx.beginPath()
      ctx.ellipse(0, 0, 52, 20, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(-50, -5)
      ctx.lineTo(-66, -14)
      ctx.lineTo(-66, 14)
      ctx.lineTo(-50, 5)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = flash ? '#fff' : '#5f586c'
      ctx.fillRect(-12, 20, 24, 12)
      // ventanilla + sombrero
      ctx.fillStyle = '#111827'
      ctx.fillRect(-6, 22, 12, 7)
      ctx.fillStyle = '#1c1917'
      ctx.fillRect(-7, 20, 14, 3)
      ctx.fillStyle = '#e5e7eb'
      ctx.font = 'bold 10px system-ui'
      ctx.textAlign = 'center'
      ctx.fillText('Ley Seca', 0, -2)
      break
    }
    case 'sober': {
      // SOBER-9000: cubo IA con ojo rojo
      const open = playerDrunk >= 0.5
      ctx.fillStyle = flash ? '#fff' : '#1e293b'
      roundRect(ctx, -30, -30, 60, 60, 10)
      ctx.fill()
      ctx.strokeStyle = '#22d3ee'
      ctx.lineWidth = 2
      roundRect(ctx, -30, -30, 60, 60, 10)
      ctx.stroke()
      // ojo
      ctx.fillStyle = open ? '#ef4444' : '#7f1d1d'
      ctx.beginPath()
      ctx.arc(0, 0, open ? 13 : 9, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#111'
      ctx.beginPath()
      ctx.arc(Math.sin(t * 2) * 4, 0, open ? 6 : 3, 0, Math.PI * 2)
      ctx.fill()
      if (open) {
        ctx.strokeStyle = 'rgba(239,68,68,0.5)'
        ctx.lineWidth = 1.6
        ctx.beginPath()
        ctx.arc(0, 0, 18 + Math.sin(t * 6) * 2, 0, Math.PI * 2)
        ctx.stroke()
      }
      // glitcheado
      ctx.fillStyle = rgba('#22d3ee', 0.35)
      ctx.fillRect(-30 + Math.sin(t * 20) * 4, -6, 60, 3)
      ctx.fillRect(-30, 14, 60, 2.4)
      break
    }
    default: {
      // Dios Simio Cósmico: simio gigante de luz
      ctx.save()
      ctx.translate(0, 0)
      const breathe = 1 + Math.sin(t * 0.9) * 0.05
      ctx.scale(breathe, 2 - breathe)
      ctx.fillStyle = flash ? '#fff' : 'rgba(253,224,71,0.85)'
      ctx.beginPath()
      ctx.ellipse(0, 16, 30, 34, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(0, -20, 19, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(-17, -24, 6, 0, Math.PI * 2)
      ctx.arc(17, -24, 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      ctx.beginPath()
      ctx.ellipse(0, -16, 11, 9, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      // halo + rayos
      ctx.strokeStyle = '#fde047'
      ctx.lineWidth = 3
      ctx.shadowColor = '#fde047'
      ctx.shadowBlur = 14
      ctx.beginPath()
      ctx.ellipse(0, -46, 22, 5, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.shadowBlur = 0
      nebulaBlob(ctx, 0, -8, 62, rgba('#fde047', 0.25))
      break
    }
  }
  ctx.restore()

  // barra de vida
  const bw = 70
  ctx.fillStyle = 'rgba(0,0,0,0.6)'
  roundRect(ctx, x - bw / 2, y - 52, bw, 7, 3.5)
  ctx.fill()
  ctx.fillStyle = '#ef4444'
  roundRect(ctx, x - bw / 2 + 1, y - 51, Math.max(0, ((bw - 2) * b.hp) / b.maxHp), 5, 2.5)
  ctx.fill()
}

function drawProjectile(ctx: CanvasRenderingContext2D, p: Projectile, t: number, camTop: number): void {
  const x = p.x
  const y = p.y - camTop
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(p.rot)
  switch (p.kind) {
    case 'ice':
      ctx.fillStyle = 'rgba(190,230,255,0.92)'
      roundRect(ctx, -8, -8, 16, 16, 3)
      ctx.fill()
      ctx.strokeStyle = '#e0f2fe'
      ctx.lineWidth = 1.4
      ctx.strokeRect(-4, -4, 8, 8)
      break
    case 'holy':
      ctx.shadowColor = '#fde047'
      ctx.shadowBlur = 12
      ctx.fillStyle = '#fde047'
      ctx.beginPath()
      ctx.arc(0, 0, 7, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(253,224,71,0.7)'
      ctx.lineWidth = 2
      for (let i = 0; i < 4; i++) {
        const a = t * 4 + (i * Math.PI) / 2
        ctx.beginPath()
        ctx.moveTo(Math.cos(a) * 8, Math.sin(a) * 8)
        ctx.lineTo(Math.cos(a) * 13, Math.sin(a) * 13)
        ctx.stroke()
      }
      break
    case 'cork':
      ctx.fillStyle = '#b45309'
      ctx.beginPath()
      ctx.ellipse(0, 0, 7, 5, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#92400e'
      ctx.fillRect(-7, -2, 14, 3)
      break
    case 'net':
      ctx.strokeStyle = '#a3e635'
      ctx.lineWidth = 1.6
      ctx.strokeRect(-10, -10, 20, 20)
      ctx.beginPath()
      ctx.moveTo(-10, -3)
      ctx.lineTo(10, -3)
      ctx.moveTo(-10, 3)
      ctx.lineTo(10, 3)
      ctx.moveTo(-3, -10)
      ctx.lineTo(-3, 10)
      ctx.moveTo(3, -10)
      ctx.lineTo(3, 10)
      ctx.stroke()
      break
    case 'planet':
      ctx.fillStyle = '#a78bfa'
      ctx.beginPath()
      ctx.arc(0, 0, 11, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#e2e8f0'
      ctx.lineWidth = 2
      ctx.save()
      ctx.scale(1, 0.35)
      ctx.beginPath()
      ctx.arc(0, 0, 16, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
      break
    default:
      // botella lanzada por el jugador: el brebaje de la era actual
      drawDrink(ctx, 0, 0, eraOfY(p.y), t)
      break
  }
  ctx.restore()
}

function drawCrow(ctx: CanvasRenderingContext2D, c: Crow, t: number, camTop: number): void {
  const x = c.x
  const y = c.y - camTop + Math.sin(c.t * 5) * 4
  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = '#111827'
  ctx.beginPath()
  ctx.ellipse(0, 0, 10, 7, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(8, -3, 5, 0, Math.PI * 2)
  ctx.fill()
  // pico
  ctx.fillStyle = '#f59e0b'
  ctx.beginPath()
  ctx.moveTo(12, -3)
  ctx.lineTo(18, -1)
  ctx.lineTo(12, 1)
  ctx.closePath()
  ctx.fill()
  // ala batiendo
  ctx.strokeStyle = '#111827'
  ctx.lineWidth = 3
  const flap = Math.sin(t * 12) * 6
  ctx.beginPath()
  ctx.moveTo(-2, -2)
  ctx.quadraticCurveTo(-6, -10 - flap, -14, -6 - flap)
  ctx.stroke()
  // ojo
  ctx.fillStyle = '#ef4444'
  ctx.beginPath()
  ctx.arc(9, -4, 1.4, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

// ── render principal del juego ──────────────────────────────────────────────
export function renderGame(ctx: CanvasRenderingContext2D, g: Engine): void {
  const t = g.time
  const camTop = g.camTop
  const camMidM = Math.max(0, -(camTop + H / 2) / PX_PER_M)
  const ciego = Math.max(0, Math.min(1, (g.drunk - 0.7) / 0.3))
  const alegre = g.drunk > 0.3 && g.drunk <= 0.7 ? 1 : 0

  ctx.save()
  // distorsión de ebriedad
  const dEff = g.drunk
  if (dEff > 0.02) {
    const a = Math.sin(t * 2.9) * 0.014 * dEff * dEff
    const s = 1 + Math.sin(t * 2.1) * 0.008 * dEff * dEff
    ctx.translate(W / 2, H / 2)
    ctx.rotate(a)
    ctx.scale(s, s)
    ctx.translate(-W / 2, -H / 2)
  }

  drawSky(ctx, camMidM, t)

  // parallax con mezcla de eras
  const { idx, idx2, blend } = skyMix(camMidM)
  drawEraLayers(ctx, idx, camTop, t, 1)
  if (blend > 0 && idx2 !== idx) drawEraLayers(ctx, idx2, camTop, t, blend)

  // suelo inicial
  if (camTop + H > 0) {
    const gy = -camTop
    ctx.fillStyle = '#2c1e12'
    ctx.fillRect(0, gy, W, H - gy + 10)
    ctx.fillStyle = '#3d2b1a'
    ctx.fillRect(0, gy, W, 8)
  }

  // línea de récord
  if (g.record > 0) {
    const ry = -g.record * PX_PER_M - camTop
    if (ry > -20 && ry < H + 20) {
      ctx.save()
      ctx.strokeStyle = rgba('#fde047', 0.75)
      ctx.setLineDash([10, 8])
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(0, ry)
      ctx.lineTo(W, ry)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.font = 'bold 13px system-ui, sans-serif'
      ctx.fillStyle = '#fde047'
      ctx.textAlign = 'right'
      ctx.fillText('🏆 RÉCORD ' + Math.round(g.record) + 'm', W - 12, ry - 7)
      ctx.restore()
    }
  }

  // puerta de la ascensión
  if (g.gateY !== null) {
    const gy = g.gateY - camTop
    if (gy > -260 && gy < H + 260) {
      ctx.save()
      ctx.translate(W / 2, gy)
      const pulse = 1 + Math.sin(t * 2.4) * 0.06
      nebulaBlob(ctx, 0, -40, 150 * pulse, rgba('#fde047', 0.3))
      ctx.fillStyle = '#fbbf24'
      ctx.shadowColor = '#fde047'
      ctx.shadowBlur = 16
      ctx.fillRect(-180, -60, 24, 120)
      ctx.fillRect(156, -60, 24, 120)
      ctx.beginPath()
      ctx.arc(0, -60, 180, Math.PI, 0)
      ctx.lineWidth = 14
      ctx.strokeStyle = '#fde047'
      ctx.stroke()
      ctx.shadowBlur = 0
      ctx.font = 'bold 20px system-ui, sans-serif'
      ctx.fillStyle = '#fde047'
      ctx.textAlign = 'center'
      ctx.fillText('✨ ASCENSIÓN ✨', 0, -90)
      ctx.restore()
    }
  }

  // plataformas (con doble visión de borrachera en estado Ciego)
  for (const p of g.platforms) {
    const sy = p.y - camTop
    if (sy < -420 || sy > H + 420) continue
    drawPlatform(ctx, p, t, camTop, ciego)
  }
  if (ciego > 0.1) {
    for (const dir of [-1, 1]) {
      ctx.save()
      ctx.globalAlpha = 0.16 * ciego
      ctx.translate(Math.sin(t * 1.7 + (dir > 0 ? 0 : 2)) * 11 * dir, Math.cos(t * 1.3) * 6)
      for (const p of g.platforms) {
        const sy = p.y - camTop
        if (sy < -100 || sy > H + 100) continue
        if (p.kind === 'hidden' && p.revealT <= 0) continue
        drawPlatform(ctx, p, t, camTop, ciego)
      }
      ctx.restore()
    }
  }

  for (const it of g.items) {
    const sy = it.y - camTop
    if (sy < -60 || sy > H + 60) continue
    drawItem(ctx, it, t, camTop)
  }

  // cuervos
  for (const c of g.crows) {
    const sy = c.y - camTop
    if (sy < -40 || sy > H + 40) continue
    drawCrow(ctx, c, t, camTop)
  }

  // telegrafía de jefes (columnas de luz / eructos)
  if (g.boss && !g.boss.dead && g.boss.telegraph) {
    const tg = g.boss.telegraph
    const bx = tg.x
    const col = g.boss.type === 'dios' ? '#c084fc' : '#fde047'
    ctx.save()
    if (tg.warn > 0) {
      ctx.strokeStyle = rgba(col, 0.4 + Math.sin(t * 20) * 0.2)
      ctx.setLineDash([8, 6])
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(bx, 0)
      ctx.lineTo(bx, H)
      ctx.stroke()
    } else {
      ctx.fillStyle = rgba(col, 0.55)
      ctx.fillRect(bx - 26, 0, 52, H)
      ctx.fillStyle = rgba('#ffffff', 0.3)
      ctx.fillRect(bx - 8, 0, 16, H)
    }
    ctx.restore()
  }

  // jefes y proyectiles
  if (g.boss && !g.boss.dead) {
    const sy = g.boss.y - camTop
    if (sy > -160 && sy < H + 160) drawBoss(ctx, g.boss, t, camTop, g.drunk)
  }
  for (const p of g.projectiles) {
    const sy = p.y - camTop
    if (sy < -40 || sy > H + 40) continue
    drawProjectile(ctx, p, t, camTop)
  }

  // plato de tapas orbitando
  if (g.plateT > 0) {
    const pp = { x: g.px + Math.cos(g.plateAng) * 44, y: g.py - 6 + Math.sin(g.plateAng) * 26 - camTop }
    ctx.save()
    ctx.translate(pp.x, pp.y)
    ctx.fillStyle = '#f8fafc'
    ctx.beginPath()
    ctx.ellipse(0, 0, 13, 5, 0, 0, Math.PI * 2)
    ctx.fill()
    const cols = ['#ef4444', '#f59e0b', '#22c55e']
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = cols[i]
      ctx.beginPath()
      ctx.arc(-5 + i * 5, -2, 2.2, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.strokeStyle = rgba('#fb923c', 0.5)
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.ellipse(0, 0, 17, 8, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }

  drawMonkey(ctx, g.px, g.py - camTop, {
    face: g.face,
    vx: g.vx,
    vy: g.vy,
    onGround: g.onGround,
    drunk: g.drunk,
    courage: g.courageT > 0,
    divine: g.divine,
    era: g.curEra,
    invuln: g.invuln,
    vip: g.vip,
    blackout: g.blackoutT > 0,
    t,
  })

  // burbuja del teléfono del ex
  if (g.phoneT > 0) {
    const bx = g.px + 24
    const by = g.py - camTop - 52
    ctx.save()
    ctx.fillStyle = 'rgba(226,232,240,0.95)'
    roundRect(ctx, bx, by, 30, 20, 6)
    ctx.fill()
    ctx.fillStyle = '#0ea5e9'
    ctx.font = 'bold 12px system-ui'
    ctx.textAlign = 'center'
    ctx.fillText('📞', bx + 15, by + 14)
    ctx.restore()
  }

  // partículas
  for (const p of g.particles) {
    const sy = p.y - camTop
    if (sy < -30 || sy > H + 30) continue
    const a = Math.max(0, p.life / p.maxLife)
    ctx.save()
    ctx.globalAlpha = a
    if (p.kind === 'bubble') {
      ctx.strokeStyle = p.color
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.arc(p.x, sy, p.size, 0, Math.PI * 2)
      ctx.stroke()
    } else if (p.kind === 'sparkle' || p.kind === 'star') {
      ctx.fillStyle = p.color
      ctx.translate(p.x, sy)
      ctx.rotate(p.rot)
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size)
    } else if (p.kind === 'confetti') {
      ctx.fillStyle = p.color
      ctx.translate(p.x, sy)
      ctx.rotate(p.rot)
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
    } else {
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, sy, p.size * (0.5 + a * 0.5), 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  // textos flotantes
  ctx.textAlign = 'center'
  for (const f of g.floats) {
    const sy = f.y - camTop
    ctx.save()
    ctx.globalAlpha = Math.min(1, f.life / (f.maxLife * 0.5))
    ctx.font = `bold ${f.size}px system-ui, sans-serif`
    ctx.strokeStyle = 'rgba(0,0,0,0.65)'
    ctx.lineWidth = 3
    ctx.strokeText(f.text, f.x, sy)
    ctx.fillStyle = f.color
    ctx.fillText(f.text, f.x, sy)
    ctx.restore()
  }

  // banner de era / jefe
  if (g.banner) {
    const b = g.banner
    const prog = Math.min(1, b.t / 0.35)
    const out = b.t > 2.1 ? 1 - (b.t - 2.1) / 0.5 : 1
    ctx.save()
    ctx.globalAlpha = Math.max(0, out)
    const e = ERAS[g.curEra]
    const bgB = ctx.createLinearGradient(0, H * 0.32, 0, H * 0.32 + 130)
    bgB.addColorStop(0, 'rgba(0,0,0,0)')
    bgB.addColorStop(0.18, 'rgba(0,0,0,0.6)')
    bgB.addColorStop(0.82, 'rgba(0,0,0,0.6)')
    bgB.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = bgB
    ctx.fillRect(0, H * 0.32, W, 130)
    ctx.fillStyle = rgba(e.accent, 0.65)
    ctx.fillRect(0, H * 0.32 + 18, W, 2)
    ctx.fillRect(0, H * 0.32 + 110, W, 2)
    ctx.translate(W / 2, H * 0.32 + 65)
    ctx.scale(0.8 + prog * 0.2, 0.8 + prog * 0.2)
    ctx.textAlign = 'center'
    ctx.font = 'bold 26px system-ui, sans-serif'
    ctx.fillStyle = e.accent
    ctx.strokeStyle = 'rgba(0,0,0,0.8)'
    ctx.lineWidth = 5
    ctx.strokeText(b.text, 0, -6)
    ctx.fillText(b.text, 0, -6)
    ctx.font = '15px system-ui, sans-serif'
    ctx.fillStyle = '#e5e7eb'
    ctx.fillText(b.sub, 0, 28)
    ctx.restore()
  }

  // viñeta
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 0.78)
  vg.addColorStop(0, 'rgba(0,0,0,0)')
  vg.addColorStop(1, 'rgba(0,0,0,0.4)')
  ctx.fillStyle = vg
  ctx.fillRect(0, 0, W, H)

  // colores saturados en estado Alegre (Pilar 2)
  if (alegre) {
    ctx.save()
    ctx.globalCompositeOperation = 'saturation'
    ctx.globalAlpha = 0.35
    ctx.fillStyle = 'hsl(45, 100%, 50%)'
    ctx.fillRect(0, 0, W, H)
    ctx.restore()
  }

  // halo de telepatía alcohólica en estado Ciego
  if (ciego > 0) {
    ctx.save()
    ctx.globalAlpha = 0.08 + Math.sin(t * 3) * 0.03
    ctx.fillStyle = '#f472b6'
    ctx.fillRect(0, 0, W, H)
    ctx.restore()
  }

  // líneas de velocidad al caer
  if (g.vy > 950) {
    ctx.save()
    ctx.strokeStyle = rgba('#ffffff', Math.min(0.3, (g.vy - 950) / 1800))
    ctx.lineWidth = 2
    for (let i = 0; i < 8; i++) {
      const x = ((i * 97 + ((t * 900) % 97)) % W)
      const y = (i * 211 + t * 2600) % H
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x, y + 70)
      ctx.stroke()
    }
    ctx.restore()
  }

  // BLACKOUT: todo se apaga (Pilar 2: física de la ebriedad)
  if (g.blackoutT > 0) {
    const a = Math.min(0.7, g.blackoutT * 0.4)
    ctx.fillStyle = `rgba(5,0,10,${a})`
    ctx.fillRect(0, 0, W, H)
    ctx.save()
    ctx.globalAlpha = Math.min(1, g.blackoutT)
    ctx.translate(W / 2 + Math.sin(t * 9) * 8, H / 2 + Math.cos(t * 7) * 6)
    ctx.rotate(Math.sin(t * 5) * 0.12)
    ctx.font = 'bold 42px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.strokeStyle = 'rgba(0,0,0,0.9)'
    ctx.lineWidth = 7
    ctx.strokeText('BLACKOUT', 0, 0)
    ctx.fillStyle = '#ef4444'
    ctx.fillText('BLACKOUT', 0, 0)
    ctx.restore()
  }

  // destello
  if (g.flashT > 0) {
    ctx.fillStyle = rgba('#ffffff', Math.min(0.75, g.flashT * 1.6))
    ctx.fillRect(0, 0, W, H)
  }

  // bruma dorada en modo divino
  if (g.divine) {
    ctx.fillStyle = rgba('#fde047', 0.05 + Math.sin(t * 2) * 0.02)
    ctx.fillRect(0, 0, W, H)
  }

  ctx.restore()
}

// ── fondo animado del menú ──────────────────────────────────────────────────
export function renderMenuBg(ctx: CanvasRenderingContext2D, t: number): void {
  const cycle = 7
  const total = ERAS.length
  const prog = (t / cycle) % total
  const idx = Math.floor(prog) % total
  const idx2 = (idx + 1) % total
  const blend = Math.max(0, Math.min(1, (prog % 1 - 0.82) / 0.18))
  const top = mixHex(ERAS[idx].sky[0], ERAS[idx2].sky[0], blend)
  const bot = mixHex(ERAS[idx].sky[1], ERAS[idx2].sky[1], blend)
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, top)
  g.addColorStop(1, bot)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  const fakeCam = -t * 22
  if (ERAS[idx].night || ERAS[idx2].night)
    starField(ctx, fakeCam, 0.12, 42, 26, t)
  drawEraLayers(ctx, idx, fakeCam, t, 1)
  if (blend > 0) drawEraLayers(ctx, idx2, fakeCam, t, blend)

  // rayos de sol cenitales (profundidad de jungla)
  ctx.save()
  ctx.globalAlpha = 0.07
  ctx.fillStyle = '#fff7d6'
  for (let i = 0; i < 5; i++) {
    const rx = 40 + i * 100 + Math.sin(t * 0.4 + i) * 12
    ctx.beginPath()
    ctx.moveTo(rx - 26, -20)
    ctx.lineTo(rx + 26, -20)
    ctx.lineTo(rx + 90, H)
    ctx.lineTo(rx + 20, H)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()

  // frutas flotantes (el sueño fermentado del simio)
  ctx.save()
  for (let i = 0; i < 5; i++) {
    const fy = H - (((t * 34 + i * 211) % (H + 160)) - 80)
    const fx = 34 + ((i * 113) % (W - 68)) + Math.sin(t * 1.2 + i * 2) * 10
    const fcols = ['#a855f7', '#facc15', '#fb7185', '#a855f7', '#fb923c']
    ctx.fillStyle = rgba(fcols[i], 0.75)
    ctx.beginPath()
    ctx.arc(fx, fy, 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = rgba('#4ade80', 0.8)
    ctx.beginPath()
    ctx.ellipse(fx + 4, fy - 7, 4, 2, -0.6, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()

  // plataformas flotantes decorativas
  ctx.save()
  const drift = (t * 26) % 220
  for (let i = 0; i < 4; i++) {
    const px = 60 + ((i * 137) % 340)
    const py = ((i * 260 - drift) % (H + 200)) - 100
    const e = ERAS[idx]
    ctx.fillStyle = rgba(e.platFill, 0.75)
    roundRect(ctx, px, H - py, 84, 14, 7)
    ctx.fill()
    ctx.fillStyle = rgba(e.platEdge, 0.9)
    roundRect(ctx, px, H - py, 84, 4, 2)
    ctx.fill()
  }
  ctx.restore()

  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75)
  vg.addColorStop(0, 'rgba(0,0,0,0)')
  vg.addColorStop(1, 'rgba(0,0,0,0.55)')
  ctx.fillStyle = vg
  ctx.fillRect(0, 0, W, H)
}

// mono del menú (idle)
export function renderMenuMonkey(ctx: CanvasRenderingContext2D, t: number, vip = false): void {
  drawMonkey(ctx, W / 2, H * 0.58 + Math.sin(t * 1.8) * 8, {
    face: 1,
    vx: 0,
    vy: 0,
    onGround: false,
    drunk: 0.25 + Math.sin(t * 0.7) * 0.2,
    courage: false,
    divine: false,
    era: Math.floor(t / 7) % ERAS.length,
    invuln: 0,
    vip,
    blackout: false,
    t,
  })
}

