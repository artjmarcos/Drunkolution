'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Pause,
  Play,
  Volume2,
  VolumeX,
  RotateCcw,
  Home,
  FlaskConical,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  Skull,
  Clock,
  Crown,
} from 'lucide-react'
import { Engine } from '@/game/engine'
import { renderGame, renderMenuBg, renderMenuMonkey } from '@/game/render'
import { loadSave, persistSave, defaultSave } from '@/game/storage'
import { sfx, music } from '@/game/audio'
import {
  ERAS,
  UPGRADES,
  upgradeCost,
  W,
  H,
  MAX_LIVES,
  START_LIVES,
  ERA_HEIGHT_M,
  ERA_COUNT,
  eraStartM,
  drunkStateOf,
} from '@/game/eras'
import type { SaveData, RunSummary, HudData, UpgradeKey, HangoverData } from '@/game/types'

type Screen = 'menu' | 'game' | 'over' | 'lab' | 'how'

function fmtTime(s: number): string {
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}

function fmtNum(n: number): string {
  return n.toLocaleString('es-CL')
}

// ── Anuncios (simulados, con humor según la biblia) ────────────────────────
type AdKind = 'continue' | 'life' | 'skip' | 'boost' | 'double'

const AD_COPY: Record<AdKind, { title: string; reward: string }> = {
  continue: {
    title: 'La Cura Milagrosa',
    reward: 'Revives en tu checkpoint, cayendo del cielo en un kebab volador 🥙',
  },
  life: { title: 'Vida extra', reward: '+1 vida ahora mismo' },
  skip: { title: 'Teletransporte evolutivo', reward: 'Saltar al inicio de la siguiente era' },
  boost: { title: 'Suero evolutivo', reward: 'Genes ×2 durante tu próxima partida' },
  double: { title: 'El Bar de la Esquina', reward: 'Duplicar el ADN ganado en esta partida 🍸' },
}

function AdModal({
  kind,
  onReward,
  onClose,
}: {
  kind: AdKind
  onReward: () => void
  onClose: () => void
}) {
  const [t, setT] = useState(5)
  useEffect(() => {
    const iv = setInterval(() => setT(v => Math.max(0, Math.round((v - 0.1) * 10) / 10)), 100)
    return () => clearInterval(iv)
  }, [])
  const done = t <= 0
  return (
    <div className="absolute inset-0 z-20 bg-black/85 backdrop-blur-sm flex items-center justify-center px-6">
      <div className="w-full max-w-[320px] rounded-2xl border border-amber-400/30 bg-[#0d0a14]/95 p-5 text-center space-y-3">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-gray-400">
          <span className="rounded bg-amber-400/20 text-amber-300 px-2 py-0.5">Anuncio · demo</span>
          <button onClick={onClose} className="hover:text-gray-200 transition-colors" aria-label="Cerrar anuncio">
            ✕ Cerrar
          </button>
        </div>
        <div className="text-xs font-black text-amber-300 uppercase tracking-wider">{AD_COPY[kind].title}</div>
        <div className="relative rounded-xl h-44 bg-gradient-to-br from-purple-900 via-indigo-900 to-emerald-900 flex flex-col items-center justify-center gap-2 overflow-hidden">
          <div className="text-4xl animate-bounce">🐒🍇</div>
          <div className="text-[11px] font-bold text-white/85 px-5 leading-tight">
            “Un científico loco le dio uvas fermentadas a un mono… ¡y esto fue lo que pasó!”
          </div>
          <div className="absolute bottom-0 inset-x-0 h-1.5 bg-white/15">
            <div
              className="h-full bg-amber-400 transition-[width] duration-100"
              style={{ width: `${((5 - t) / 5) * 100}%` }}
            />
          </div>
        </div>
        <div>
          <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Recompensa</div>
          <div className="text-sm font-black text-amber-300 mt-0.5">{AD_COPY[kind].reward}</div>
        </div>
        <button
          onClick={done ? onReward : undefined}
          disabled={!done}
          className={`w-full rounded-xl px-4 py-3 font-black uppercase tracking-wide transition-all ${
            done
              ? 'bg-gradient-to-b from-amber-400 to-orange-600 text-orange-950 active:scale-[0.98]'
              : 'bg-white/10 text-gray-500 cursor-not-allowed'
          }`}
        >
          {done ? '🎁 Reclamar recompensa' : `Recompensa en ${t.toFixed(1)}s…`}
        </button>
      </div>
    </div>
  )
}

// ── Minijuego de Resaca: transición entre eras ──────────────────────────────
const RESACA_ICONS = ['💧', '💊', '☕', '🥛']
const RESACA_NAMES: Record<string, string> = {
  '💧': 'Agua',
  '💊': 'Aspirina',
  '☕': 'Café',
  '🥛': 'Vaso de leche',
}

function HangoverOverlay({
  h,
  onTap,
}: {
  h: HangoverData
  onTap: (icon: string) => void
}) {
  const pct = Math.max(0, Math.min(1, h.t / 6.5))
  return (
    <div className="absolute inset-0 z-20 bg-black/80 backdrop-blur-[6px] flex items-center justify-center px-6">
      <div className="w-full max-w-[320px] rounded-2xl border border-rose-400/30 bg-[#140a10]/95 p-5 text-center space-y-3 animate-pulse-none">
        <div className="text-4xl">🤢</div>
        <h2 className="text-xl font-black text-rose-300 uppercase tracking-wide">
          ¡Resaca evolutiva!
        </h2>
        <p className="text-[12px] text-gray-300 leading-snug">
          Entraste a <span className="font-black" style={{ color: ERAS[h.eraIdx].accent }}>{ERAS[h.eraIdx].name}</span>.
          Toca la secuencia ANTES de que la cruda gane:
        </p>
        <div className="flex items-center justify-center gap-2">
          {h.seq.map((ic, i) => (
            <div
              key={i}
              className={`h-11 w-11 rounded-xl border-2 flex items-center justify-center text-xl transition-all ${
                i < h.idx
                  ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                  : i === h.idx
                    ? 'bg-amber-400/20 border-amber-300 text-amber-100 animate-pulse scale-110'
                    : 'bg-white/5 border-white/15 text-white/40'
              }`}
            >
              {i < h.idx ? '✓' : ic}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {RESACA_ICONS.map(ic => (
            <button
              key={ic}
              onClick={() => onTap(ic)}
              className="rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 border border-white/15 py-2.5 text-2xl transition-all"
              aria-label={RESACA_NAMES[ic]}
            >
              {ic}
            </button>
          ))}
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-400 transition-[width] duration-100"
            style={{ width: `${pct * 100}%` }}
          />
        </div>
        {h.sponsor ? (
          <div className="rounded-lg bg-white/8 border border-white/10 px-3 py-2">
            <div className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">AD · Patrocinio de la evolución</div>
            <div className="text-[11px] font-bold text-gray-200 leading-tight mt-0.5">
              La transición a {ERAS[h.eraIdx].name} es patrocinada por: <span className="text-amber-300">{h.sponsor}</span>
            </div>
          </div>
        ) : (
          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
            👑 VIP: sin patrocinios, solo cruda
          </div>
        )}
      </div>
    </div>
  )
}

// ── Tarjeta VIP del Borracho (compra simulada) ──────────────────────────────
function VipModal({
  onBuy,
  onClose,
}: {
  onBuy: () => void
  onClose: () => void
}) {
  return (
    <div className="absolute inset-0 z-20 bg-black/85 backdrop-blur-sm flex items-center justify-center px-6">
      <div className="w-full max-w-[320px] rounded-2xl border border-yellow-300/40 bg-[#141008]/95 p-5 text-center space-y-3">
        <div className="text-4xl">👑🐒</div>
        <h2 className="text-lg font-black text-yellow-300 uppercase">Tarjeta VIP del Borracho</h2>
        <div className="text-3xl font-black text-white">$2.99</div>
        <ul className="text-[12px] text-gray-300 space-y-1 text-left list-none">
          <li>🚫 Sin anuncios forzosos (los camuflados también)</li>
          <li>🧐 Monóculo + puro para tu simio</li>
          <li>🐒 +1 vida al empezar cada partida</li>
          <li>✨ Insignia VIP en el menú</li>
        </ul>
        <p className="text-[10px] text-gray-500">Pago 100% simulado: aquí no hay IAP real (todavía).</p>
        <button
          onClick={onBuy}
          className="w-full rounded-xl bg-gradient-to-b from-yellow-300 to-amber-500 px-4 py-3 font-black text-amber-950 uppercase active:scale-[0.98]"
        >
          💳 Comprar (simulado)
        </button>
        <button
          onClick={onClose}
          className="w-full rounded-xl bg-white/10 border border-white/15 px-4 py-2.5 font-bold text-gray-200 text-sm"
        >
          Prefiero seguir pobre pero sobrio
        </button>
      </div>
    </div>
  )
}

// ── fisheye para el estado Ciego: barrel distortion por franjas ─────────────
function fisheyeBlit(
  ctx: CanvasRenderingContext2D,
  off: HTMLCanvasElement,
  amt: number,
  t: number
): void {
  const strips = 26
  const hh = H / strips
  const wob = Math.sin(t * 1.9) * 4 * amt
  for (let i = 0; i < strips; i++) {
    const y0 = i * hh
    const dy = (y0 + hh / 2 - H / 2) / (H / 2)
    const sx = 1 + 0.17 * amt * dy * dy
    ctx.drawImage(off, 0, y0, W, hh, (W - W * sx) / 2 + wob * dy, y0, W * sx, hh + 0.7)
  }
}

export default function MonosGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<Engine | null>(null)
  const screenRef = useRef<Screen>('menu')
  const pausedRef = useRef(false)
  const saveRef = useRef<SaveData>(defaultSave())
  const hudTimeRef = useRef(0)

  const [screen, setScreenState] = useState<Screen>('menu')
  const [paused, setPaused] = useState(false)
  const [muted, setMuted] = useState(false)
  const [save, setSave] = useState<SaveData>(defaultSave())
  const [hud, setHud] = useState<HudData | null>(null)
  const [summary, setSummary] = useState<RunSummary | null>(null)
  const [isTouch, setIsTouch] = useState(false)
  const [adKind, setAdKind] = useState<AdKind | null>(null)
  const [boostActive, setBoostActive] = useState(false)
  const [vipOpen, setVipOpen] = useState(false)
  const [doubled, setDoubled] = useState(false)
  const adOpenRef = useRef(false)
  const adsContinue = useRef(0)
  const adsLife = useRef(0)
  const adsSkip = useRef(0)

  const setScreen = useCallback((s: Screen) => {
    screenRef.current = s
    setScreenState(s)
  }, [])

  // ── init ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      const s = loadSave()
      saveRef.current = s
      setSave(s)
      setMuted(s.muted)
      sfx.muted = s.muted
      music.muted = s.muted
      setIsTouch(window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window)
    }, 0)
    return () => clearTimeout(t)
  }, [])

  // hook de desarrollo (?dev=1): teletransporte y estados para pruebas/capturas
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!window.location.search.includes('dev=1')) return
    const w = window as unknown as Record<string, unknown>
    w.__drunkolution = {
      skipToEra: (i: number) => engineRef.current?.devTeleport(i),
      setDrunk: (v: number) => engineRef.current?.devSetDrunk(v),
      giveBottles: (n = 5) => {
        const e = engineRef.current
        if (e) e.bottles += n
      },
      cure: () => {
        const e = engineRef.current
        if (e?.hangover) e.cureHangover(e.hangover.seq[e.hangover.idx])
      },
      engine: () => engineRef.current,
    }
  }, [])

  // ── bucle principal ─────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = W * dpr
    canvas.height = H * dpr
    // canvas offscreen para el fisheye del estado Ciego
    const off = document.createElement('canvas')
    off.width = W
    off.height = H
    const octx = off.getContext('2d')

    let last = performance.now()
    let raf = 0
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000)
      last = now
      ctx.save()
      ctx.scale(dpr, dpr)
      const scr = screenRef.current
      const eng = engineRef.current
      if (scr === 'game' && eng) {
        if (!pausedRef.current) eng.update(dt)
        const ciegoAmt = Math.max(0, Math.min(1, (eng.drunk - 0.7) / 0.3))
        if (ciegoAmt > 0.03 && octx) {
          renderGame(octx, eng)
          fisheyeBlit(ctx, off, ciegoAmt, now / 1000)
        } else {
          renderGame(ctx, eng)
        }
        music.setDrunk(eng.drunk)
        if (now - hudTimeRef.current > 90) {
          hudTimeRef.current = now
          setHud(eng.hud())
        }
      } else {
        const t = now / 1000
        renderMenuBg(ctx, t)
        if (scr === 'menu') renderMenuMonkey(ctx, t, saveRef.current.vip)
      }
      ctx.restore()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  // ── acciones ────────────────────────────────────────────────────────────
  const startRun = useCallback(() => {
    sfx.unlock()
    sfx.click()
    const s = saveRef.current
    const boost = s.boost2x
    if (boost) {
      const consumed = { ...s, boost2x: false }
      saveRef.current = consumed
      persistSave(consumed)
      setSave(consumed)
    }
    const eng = new Engine(s.upgrades, s.record)
    eng.geneBoost = boost ? 2 : 1
    eng.vip = s.vip
    if (s.vip) eng.lives = Math.min(MAX_LIVES, START_LIVES + 1) // perk VIP
    eng.events.onEra = idx => {
      music.setEra(idx)
    }
    eng.events.onGameOver = sum => {
      const cur = saveRef.current
      const dGenes = sum.genesRun - eng.bankedGenes
      const dBottles = sum.bottles - eng.bankedBottles
      const dFalls = sum.falls - eng.bankedFalls
      const dAlt = Math.max(0, sum.altitude - eng.bankedAlt)
      eng.bankedGenes = sum.genesRun
      eng.bankedBottles = sum.bottles
      eng.bankedFalls = sum.falls
      eng.bankedAlt = sum.altitude
      const next: SaveData = {
        ...cur,
        record: Math.max(cur.record, sum.altitude),
        genes: cur.genes + dGenes,
        stats: {
          ...cur.stats,
          runs: cur.stats.runs + 1,
          bottles: cur.stats.bottles + dBottles,
          genesTotal: cur.stats.genesTotal + dGenes,
          falls: cur.stats.falls + dFalls,
          distTotal: cur.stats.distTotal + dAlt,
          cosmosWins: cur.stats.cosmosWins + (sum.cosmos ? 1 : 0),
          bosses: cur.stats.bosses + (sum.bosses - (eng.bankedBosses ?? 0)),
        },
        maxEra: Math.max(cur.maxEra, sum.eras),
      }
      eng.bankedBosses = sum.bosses
      saveRef.current = next
      persistSave(next)
      setSave(next)
      setSummary(sum)
      music.stop()
      sfx.gameover()
      setScreen('over')
    }
    engineRef.current = eng
    adsContinue.current = 0
    adsLife.current = 0
    adsSkip.current = 0
    setBoostActive(boost)
    adOpenRef.current = false
    setAdKind(null)
    setSummary(null)
    setHud(null)
    setDoubled(false)
    pausedRef.current = false
    setPaused(false)
    music.start(0)
    setScreen('game')
  }, [setScreen])

  const goMenu = useCallback(() => {
    sfx.click()
    engineRef.current = null
    pausedRef.current = false
    setPaused(false)
    adOpenRef.current = false
    setAdKind(null)
    music.stop()
    setScreen('menu')
  }, [setScreen])

  // ── anuncios recompensados (simulados) ─────────────────────────────────
  const openAd = useCallback((kind: AdKind) => {
    sfx.click()
    adOpenRef.current = true
    setAdKind(kind)
  }, [])

  const closeAd = useCallback(() => {
    sfx.click()
    adOpenRef.current = false
    setAdKind(null)
  }, [])

  const grantReward = useCallback(
    (kind: AdKind) => {
      adOpenRef.current = false
      setAdKind(null)
      const s = saveRef.current
      if (kind === 'boost') {
        const next = { ...s, boost2x: true, stats: { ...s.stats, adsWatched: s.stats.adsWatched + 1 } }
        saveRef.current = next
        persistSave(next)
        setSave(next)
        sfx.checkpoint()
        return
      }
      if (kind === 'double') {
        const sum = summary
        if (sum && !doubled) {
          const next = {
            ...s,
            genes: s.genes + sum.genesRun,
            stats: {
              ...s.stats,
              adsWatched: s.stats.adsWatched + 1,
              genesTotal: s.stats.genesTotal + sum.genesRun,
            },
          }
          saveRef.current = next
          persistSave(next)
          setSave(next)
          setDoubled(true)
          sfx.cosmos()
        }
        return
      }
      const eng = engineRef.current
      if (!eng) return
      if (kind === 'continue') {
        adsContinue.current += 1
        eng.continueRun(3)
        setSummary(null)
        pausedRef.current = false
        setPaused(false)
        setScreen('game')
        music.start(eng.curEra)
        sfx.checkpoint()
      } else if (kind === 'life') {
        adsLife.current += 1
        eng.lives = Math.min(MAX_LIVES, eng.lives + 1)
        sfx.checkpoint()
      } else if (kind === 'skip') {
        adsSkip.current += 1
        eng.skipToEra(eng.curEra + 1)
        pausedRef.current = false
        setPaused(false)
        sfx.checkpoint()
      }
      const next = { ...s, stats: { ...s.stats, adsWatched: s.stats.adsWatched + 1 } }
      saveRef.current = next
      persistSave(next)
      setSave(next)
    },
    [setScreen, summary, doubled],
  )

  const buyVip = useCallback(() => {
    const s = saveRef.current
    const next = { ...s, vip: true }
    saveRef.current = next
    persistSave(next)
    setSave(next)
    setVipOpen(false)
    sfx.vip()
  }, [])

  const togglePause = useCallback(() => {
    if (screenRef.current !== 'game') return
    pausedRef.current = !pausedRef.current
    setPaused(pausedRef.current)
    sfx.click()
    if (pausedRef.current) music.stop()
    else music.start(engineRef.current?.curEra ?? 0)
  }, [])

  const toggleMute = useCallback(() => {
    const m = !sfx.muted
    sfx.muted = m
    music.muted = m
    setMuted(m)
    const next = { ...saveRef.current, muted: m }
    saveRef.current = next
    persistSave(next)
    if (!m) sfx.click()
  }, [])

  const buy = useCallback((key: UpgradeKey) => {
    const def = UPGRADES.find(u => u.key === key)
    if (!def) return
    const s = saveRef.current
    const lvl = s.upgrades[key]
    if (lvl >= def.max) return
    const cost = upgradeCost(def, lvl)
    if (s.genes < cost) return
    const next: SaveData = {
      ...s,
      genes: s.genes - cost,
      upgrades: { ...s.upgrades, [key]: lvl + 1 },
    }
    saveRef.current = next
    persistSave(next)
    setSave(next)
    sfx.buy()
  }, [])

  // ── teclado ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const eng = engineRef.current
      const k = e.key.toLowerCase()
      if (screenRef.current === 'game' && eng && !adOpenRef.current) {
        if (k === 'arrowleft' || k === 'a') eng.input.left = true
        if (k === 'arrowright' || k === 'd') eng.input.right = true
        if (k === ' ' || k === 'arrowup' || k === 'w') {
          e.preventDefault()
          eng.jumpPressed = true
        }
        if (k === 'f') eng.throwBottle()
        if (k === 'p' || k === 'escape') togglePause()
      }
      if (k === 'm') toggleMute()
      if ((k === ' ' || k === 'enter') && screenRef.current === 'over' && !adOpenRef.current) {
        e.preventDefault()
        startRun()
      }
    }
    const up = (e: KeyboardEvent) => {
      const eng = engineRef.current
      if (!eng) return
      const k = e.key.toLowerCase()
      if (k === 'arrowleft' || k === 'a') eng.input.left = false
      if (k === 'arrowright' || k === 'd') eng.input.right = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [startRun, togglePause, toggleMute])

  // ── controles táctiles ──────────────────────────────────────────────────
  const hold = (side: 'left' | 'right', on: boolean) => {
    const eng = engineRef.current
    if (eng) eng.input[side] = on
  }

  // HUD que miente en estado Ciego (los números bailan)
  const ciegoAmt = hud && hud.drunk > 0.7 ? (hud.drunk - 0.7) / 0.3 : 0
  const lie = (v: number, amt: number) => Math.round(v + (Math.random() - 0.5) * 2 * amt)
  const shownAlt = hud ? (ciegoAmt > 0 ? lie(hud.altitude, 24 * ciegoAmt) : hud.altitude) : 0
  const shownGenes = hud ? (ciegoAmt > 0 ? lie(hud.genesRun, 6 * ciegoAmt) : hud.genesRun) : 0
  const drunkShown = hud
    ? ciegoAmt > 0
      ? Math.max(0, Math.min(1, hud.drunk + (Math.random() - 0.5) * 0.08))
      : hud.drunk
    : 0

  const era = hud ? ERAS[hud.eraIdx] : ERAS[0]
  const eraStart = hud ? eraStartM(hud.eraIdx) : 0
  const eraProg = hud ? Math.min(1, (hud.altitude - eraStart) / ERA_HEIGHT_M) : 0
  const ds = hud ? drunkStateOf(hud.drunk) : null
  const cosmosDone = save.stats.cosmosWins > 0

  return (
    <div className="min-h-[100dvh] w-full bg-black flex items-center justify-center overflow-hidden select-none">
      <div
        className="relative overflow-hidden bg-[#0a0f0a] shadow-[0_0_80px_rgba(251,191,36,0.12)]"
        style={{
          width: 'min(100vw, calc(100dvh * 0.6))',
          height: 'min(100dvh, calc(100vw / 0.6))',
        }}
      >
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

        {/* ══ MENÚ ══ */}
        {screen === 'menu' && (
          <div className="absolute inset-0 overflow-y-auto flex flex-col items-center justify-center gap-3 px-5 py-6 text-center">
            <div className="text-5xl animate-floaty drop-shadow-[0_6px_10px_rgba(0,0,0,0.5)]">🐒🍇</div>
            <div className="relative -rotate-2">
              <span
                aria-hidden
                className="absolute inset-0 text-[2.75rem] leading-none font-black tracking-tighter uppercase italic text-transparent"
                style={{ WebkitTextStroke: '9px #2d1503' }}
              >
                Drunkolution
              </span>
              <span
                className="relative text-[2.75rem] leading-none font-black tracking-tighter uppercase italic text-transparent bg-clip-text"
                style={{
                  backgroundImage: 'linear-gradient(180deg,#fef9c3 5%,#fde047 30%,#f59e0b 60%,#b45309 95%)',
                  filter: 'drop-shadow(0 3px 0 rgba(45,21,3,0.9)) drop-shadow(0 9px 16px rgba(0,0,0,0.5))',
                }}
              >
                Drunkolution
              </span>
            </div>
            <div className="-mt-1.5 -rotate-1 rounded-md bg-[#0d2b20]/90 border-y-2 border-emerald-300/80 px-4 py-1 shadow-lg shadow-black/40">
              <p className="text-emerald-100 font-bold tracking-[0.22em] text-[12px] uppercase italic">
                The Drunken Ape Theory
              </p>
            </div>
            <p className="text-amber-200/90 font-black tracking-[0.3em] text-[11px] uppercase">
              Bebe · Evoluciona · Ascende ↑
            </p>
            <p className="text-gray-300/90 italic text-[12.5px] max-w-[310px] leading-snug">
              Según Robert Dudley, comimos fruta fermentada y evolucionamos. Este juego es esa tesis,
              pero con más estilo: 13 eras, 5 jefes anti-sobriedad y un simio que nunca deja de ser simio.
            </p>

            <div className="grid grid-cols-2 gap-2 w-full max-w-[310px] mt-1">
              <div className="rounded-xl bg-black/45 backdrop-blur px-3 py-2 text-left border border-amber-400/20">
                <div className="text-[10px] uppercase tracking-wider text-amber-300/80 font-bold">🎯 Meta</div>
                <div className="text-gray-200 text-xs leading-tight mt-0.5">13 eras · 19.500m · Ascensión</div>
              </div>
              <div className="rounded-xl bg-black/45 backdrop-blur px-3 py-2 text-left border border-rose-400/20">
                <div className="text-[10px] uppercase tracking-wider text-rose-300/80 font-bold">😵 4 estados</div>
                <div className="text-gray-200 text-xs leading-tight mt-0.5">Sobrio · Alegre · Ciego · Blackout</div>
              </div>
              <div className="rounded-xl bg-black/45 backdrop-blur px-3 py-2 text-left border border-yellow-400/20">
                <div className="text-[10px] uppercase tracking-wider text-yellow-300/80 font-bold">🍺 Bebe</div>
                <div className="text-gray-200 text-xs leading-tight mt-0.5">×2.5 ADN Ciego · revela lo oculto</div>
              </div>
              <div className="rounded-xl bg-black/45 backdrop-blur px-3 py-2 text-left border border-purple-400/20">
                <div className="text-[10px] uppercase tracking-wider text-purple-300/80 font-bold">👹 5 jefes</div>
                <div className="text-gray-200 text-xs leading-tight mt-0.5">Lánzales botellas (tecla F)</div>
              </div>
            </div>

            <button
              onClick={startRun}
              className="mt-2 w-full max-w-[310px] rounded-2xl bg-gradient-to-b from-amber-300 via-amber-400 to-orange-500 px-6 py-4 text-xl font-black text-orange-950 uppercase tracking-wide transition-all hover:brightness-110 active:translate-y-1 active:shadow-none -rotate-1"
              style={{
                boxShadow: '0 6px 0 #7c2d12, 0 12px 26px rgba(0,0,0,0.45), inset 0 2px 0 rgba(255,255,255,0.55)',
                textShadow: '0 1px 0 rgba(255,255,255,0.4)',
              }}
            >
              🍇 Empezar a evolucionar
            </button>

            <button
              onClick={() => openAd('boost')}
              disabled={save.boost2x}
              className={`w-full max-w-[310px] rounded-xl border px-4 py-2.5 text-[13px] font-black transition-all ${
                save.boost2x
                  ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300 cursor-default'
                  : 'bg-gradient-to-b from-yellow-300 to-amber-500 border-amber-300 text-amber-950 hover:from-yellow-200 hover:to-amber-400 active:scale-[0.98] shadow-lg shadow-amber-900/30'
              }`}
            >
              {save.boost2x
                ? '✓ Genes ×2 activos para tu próxima partida'
                : '🎬 Ver anuncio → Genes ×2 en tu próxima partida'}
            </button>

            {save.vip ? (
              <div className="w-full max-w-[310px] rounded-xl border border-yellow-300/50 bg-yellow-300/10 px-4 py-2.5 text-[13px] font-black text-yellow-300 flex items-center justify-center gap-2">
                <Crown className="h-4 w-4" /> VIP activo: monóculo, puro y cero anuncios forzosos
              </div>
            ) : (
              <button
                onClick={() => {
                  sfx.click()
                  setVipOpen(true)
                }}
                className="w-full max-w-[310px] rounded-xl border border-yellow-300/40 bg-gradient-to-b from-yellow-400/20 to-amber-700/20 px-4 py-2.5 text-[13px] font-black text-yellow-200 hover:from-yellow-400/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Crown className="h-4 w-4" /> 👑 Tarjeta VIP del Borracho — $2.99
              </button>
            )}

            <div className="flex gap-2 w-full max-w-[310px]">
              <button
                onClick={() => {
                  sfx.click()
                  setScreen('lab')
                }}
                className="flex-1 rounded-xl bg-black/50 hover:bg-black/70 border border-white/15 px-3 py-2.5 text-sm font-bold text-emerald-300 transition-colors"
              >
                🧬 Lab
              </button>
              <button
                onClick={() => {
                  sfx.click()
                  setScreen('how')
                }}
                className="flex-1 rounded-xl bg-black/50 hover:bg-black/70 border border-white/15 px-3 py-2.5 text-sm font-bold text-gray-200 transition-colors"
              >
                ❓ Cómo jugar
              </button>
              <button
                onClick={toggleMute}
                className="rounded-xl bg-black/50 hover:bg-black/70 border border-white/15 px-3 py-2.5 text-gray-300 transition-colors"
                aria-label={muted ? 'Activar sonido' : 'Silenciar'}
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
            </div>

            <div className="mt-1 space-y-1 text-xs text-gray-300/90">
              <div className="flex items-center justify-center gap-2">
                <span>🏆 Récord: {fmtNum(save.record)}m</span>
                <span className="text-gray-500">·</span>
                <span>{ERAS[Math.min(save.maxEra, ERAS.length - 1)].emoji} {ERAS[Math.min(save.maxEra, ERAS.length - 1)].name}</span>
              </div>
              {cosmosDone && (
                <div className="text-amber-300 font-bold">✨ Ascensión alcanzada — dios entre simios</div>
              )}
              <div className="text-[11px] text-gray-400/80">
                {save.stats.runs} partidas · {save.stats.bottles} botellas · {fmtNum(save.stats.genesTotal)} ADN · 👹 {save.stats.bosses} jefes
              </div>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-200/70">
              13 eras · 13 formas de evolucionar
            </p>
            <p className="text-[11px] italic text-gray-300/70 -mt-1">Misma idea... más borracha 🧬</p>
          </div>
        )}

        {/* ══ HUD ══ */}
        {screen === 'game' && hud && (
          <>
            {/* medidor de ebriedad estilo póster: arriba al centro, con % */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-40 pointer-events-none">
              <div className="rounded-2xl bg-black/55 backdrop-blur-md px-3 py-1.5 border border-white/15 shadow-lg shadow-black/35">
                <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-gray-200">
                  <span className="truncate">{era.emoji} {ds ? ds.name : 'Sobrio'}</span>
                  <span className="tabular-nums" style={{ color: ds && ds.mult > 1 ? ds.color : '#e5e7eb' }}>
                    {Math.round(drunkShown * 100)}%
                  </span>
                </div>
                <div className="mt-1 h-2.5 rounded-full bg-black/45 overflow-hidden border border-white/10">
                  <div
                    className="h-full rounded-full transition-[width] duration-150"
                    style={{
                      width: `${drunkShown * 100}%`,
                      background:
                        hud.drunk > 0.7
                          ? 'linear-gradient(90deg,#f472b6,#ef4444)'
                          : hud.drunk > 0.3
                            ? 'linear-gradient(90deg,#fbbf24,#f97316)'
                            : 'linear-gradient(90deg,#4ade80,#a3e635)',
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="absolute top-0 inset-x-0 p-2.5 flex items-start justify-between gap-2 pointer-events-none">
              <div className="pointer-events-auto">
                <div className="rounded-xl bg-black/55 backdrop-blur-md px-2.5 py-1.5 border border-white/15 shadow-lg shadow-black/30">
                  <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: era.accent }}>
                    {era.emoji} {era.name}
                  </div>
                  <div className="text-xl font-black text-white leading-none mt-0.5 tabular-nums">
                    {fmtNum(shownAlt)}
                    <span className="text-xs text-gray-400 font-bold"> m</span>
                  </div>
                  <div className="mt-1 h-1 w-24 rounded-full bg-white/15 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-[width] duration-200"
                      style={{ width: `${eraProg * 100}%`, background: era.accent }}
                    />
                  </div>
                  <div className="text-[9px] font-bold uppercase tracking-wide text-gray-300/90 mt-1">
                    Brebaje: <span style={{ color: era.accent }}>{era.drink}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 pointer-events-auto">
                <div className="flex gap-1.5">
                  <button
                    onClick={togglePause}
                    className="rounded-full bg-black/55 backdrop-blur-md border border-white/20 p-2 text-gray-200 hover:bg-black/75 shadow-lg shadow-black/30 transition-transform active:scale-90"
                    aria-label="Pausa"
                  >
                    {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={toggleMute}
                    className="rounded-full bg-black/55 backdrop-blur-md border border-white/20 p-2 text-gray-200 hover:bg-black/75 shadow-lg shadow-black/30 transition-transform active:scale-90"
                    aria-label={muted ? 'Activar sonido' : 'Silenciar'}
                  >
                    {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </button>
                </div>
                <div className="rounded-full bg-black/55 backdrop-blur-md px-3 py-1 border border-emerald-300/30 text-sm font-black text-emerald-300 tabular-nums shadow-lg shadow-black/30">
                  🧬 {fmtNum(shownGenes)}
                </div>
                <div className="rounded-lg bg-black/55 backdrop-blur px-2.5 py-1 border border-white/10 text-sm font-bold">
                  {Array.from({ length: MAX_LIVES }).map((_, i) => (
                    <span key={i} className={i < hud.lives ? '' : 'opacity-25 grayscale'}>
                      🐒
                    </span>
                  ))}
                </div>
                {ds && !hud.boss && (
                  <div
                    className="rounded-lg px-2 py-0.5 text-[10px] font-black uppercase tracking-wider"
                    style={{ background: `${ds.color}22`, color: ds.color, border: `1px solid ${ds.color}55` }}
                  >
                    {era.emoji} {ds.name}{ds.mult > 1 ? ` · ADN ×${ds.mult}` : ''}
                  </div>
                )}
                {hud.stagnated && (
                  <div className="rounded-lg bg-gray-400/90 px-2 py-0.5 text-[10px] font-black text-gray-900 uppercase animate-pulse">
                    ⚠ ADN congelado: ¡BEBE!
                  </div>
                )}
                {hud.blackout > 0 && (
                  <div className="rounded-lg bg-red-600/90 px-2 py-0.5 text-[10px] font-black text-white uppercase animate-pulse">
                    😵 BLACKOUT
                  </div>
                )}
                {hud.invert && (
                  <div className="rounded-lg bg-yellow-300/90 px-2 py-0.5 text-[10px] font-black text-yellow-950 uppercase">
                    🔄 Controles invertidos
                  </div>
                )}
                {hud.slow && (
                  <div className="rounded-lg bg-sky-300/90 px-2 py-0.5 text-[10px] font-black text-sky-950 uppercase">
                    🧊 Congelado
                  </div>
                )}
                {hud.netted && (
                  <div className="rounded-lg bg-lime-400/90 px-2 py-0.5 text-[10px] font-black text-lime-950 uppercase">
                    🕸️ ¡Red!
                  </div>
                )}
                {hud.shield && (
                  <div className="rounded-lg bg-amber-400/90 px-2 py-0.5 text-[10px] font-black text-amber-950 uppercase">
                    🥙 Escudo de grasa
                  </div>
                )}
                {hud.plate && (
                  <div className="rounded-lg bg-orange-400/90 px-2 py-0.5 text-[10px] font-black text-orange-950 uppercase">
                    🫓 Tapas voladoras
                  </div>
                )}
                {hud.phone && (
                  <div className="rounded-lg bg-sky-400/90 px-2 py-0.5 text-[10px] font-black text-sky-950 uppercase">
                    📞 Contestando al ex…
                  </div>
                )}
                {hud.newRecord && (
                  <div className="rounded-lg bg-amber-400/90 px-2 py-0.5 text-[10px] font-black text-amber-950 uppercase animate-pulse">
                    🏆 ¡Récord!
                  </div>
                )}
                {hud.courage && (
                  <div className="rounded-lg bg-orange-500/85 px-2 py-0.5 text-[10px] font-black text-white uppercase">
                    🔥 Coraje líquido
                  </div>
                )}
                {hud.divine && (
                  <div className="rounded-lg bg-yellow-300/90 px-2 py-0.5 text-[10px] font-black text-yellow-950 uppercase">
                    ✨ Modo divino
                  </div>
                )}
                {boostActive && (
                  <div className="rounded-lg bg-emerald-400/90 px-2 py-0.5 text-[10px] font-black text-emerald-950 uppercase">
                    🧬 ×2 genes
                  </div>
                )}
                {save.vip && (
                  <div className="rounded-lg bg-yellow-300/25 border border-yellow-300/50 px-2 py-0.5 text-[10px] font-black text-yellow-200 uppercase">
                    👑 VIP
                  </div>
                )}
              </div>
            </div>

            {/* barra del jefe */}
            {hud.boss && (
              <div className="absolute top-[86px] left-1/2 -translate-x-1/2 w-[240px] pointer-events-none">
                <div className="rounded-xl bg-black/65 backdrop-blur px-3 py-2 border border-rose-400/30 text-center">
                  <div className="text-[11px] font-black text-rose-300 uppercase tracking-wider truncate">
                    👹 {hud.boss.name}
                  </div>
                  <div className="mt-1 h-2.5 rounded-full bg-white/15 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-rose-600 to-rose-400 transition-[width] duration-200"
                      style={{ width: `${(hud.boss.hp / hud.boss.maxHp) * 100}%` }}
                    />
                  </div>
                  <div className="mt-1 text-[10px] font-bold text-amber-300 tabular-nums">
                    {era.emoji} munición: {hud.ammo} · lanza con F / botón
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* controles táctiles */}
        {screen === 'game' && !hud?.hangover && (
          <div className={`absolute bottom-0 inset-x-0 p-4 flex justify-between items-end ${isTouch ? '' : 'hidden md:hidden'}`}>
            <div className="flex gap-3">
              {(['left', 'right'] as const).map(side => (
                <button
                  key={side}
                  className="h-20 w-20 rounded-full bg-white/10 border-2 border-white/25 backdrop-blur-md text-white/90 flex items-center justify-center transition-all active:scale-90 active:bg-white/30 touch-none"
                  style={{
                    boxShadow:
                      'inset 0 3px 12px rgba(255,255,255,0.22), inset 0 -4px 10px rgba(0,0,0,0.25), 0 5px 16px rgba(0,0,0,0.4)',
                  }}
                  onPointerDown={e => {
                    e.preventDefault()
                    hold(side, true)
                  }}
                  onPointerUp={() => hold(side, false)}
                  onPointerLeave={() => hold(side, false)}
                  onPointerCancel={() => hold(side, false)}
                  aria-label={side === 'left' ? 'Izquierda' : 'Derecha'}
                >
                  {side === 'left' ? (
                    <ChevronLeft className="h-9 w-9" strokeWidth={3.2} />
                  ) : (
                    <ChevronRight className="h-9 w-9" strokeWidth={3.2} />
                  )}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2 items-end">
              {hud?.boss && (
                <button
                  className="h-16 w-20 rounded-full bg-rose-500/50 border-2 border-rose-300/60 backdrop-blur-md text-[11px] font-black text-rose-50 uppercase transition-all active:scale-90 active:bg-rose-500/70 touch-none shadow-lg shadow-black/30"
                  onPointerDown={e => {
                    e.preventDefault()
                    engineRef.current?.throwBottle()
                  }}
                  aria-label="Lanzar botella"
                >
                  {era.emoji} Lanzar
                </button>
              )}
              <button
                className="h-20 w-20 rounded-full bg-gradient-to-b from-amber-300 to-orange-500 border-2 border-amber-200/70 text-orange-950 flex items-center justify-center font-black uppercase text-[11px] tracking-wide transition-all active:scale-90 active:brightness-95 touch-none"
                style={{
                  boxShadow: '0 6px 0 #7c2d12, inset 0 2px 6px rgba(255,255,255,0.5), 0 10px 20px rgba(0,0,0,0.4)',
                }}
                onPointerDown={e => {
                  e.preventDefault()
                  const eng = engineRef.current
                  if (eng) eng.jumpPressed = true
                }}
                aria-label="Saltar"
              >
                <span className="flex flex-col items-center leading-none">
                  <ArrowUp className="h-6 w-6" strokeWidth={3.2} />
                  Salto
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ══ MINIJUEGO DE RESACA ══ */}
        {screen === 'game' && hud?.hangover && (
          <HangoverOverlay
            h={hud.hangover}
            onTap={icon => engineRef.current?.cureHangover(icon)}
          />
        )}

        {/* ══ PAUSA ══ */}
        {screen === 'game' && paused && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center">
            <div className="w-[260px] rounded-2xl border border-white/15 bg-[#111208]/95 p-5 text-center space-y-3">
              <h2 className="text-xl font-black text-amber-300 uppercase">Pausa 🍺</h2>
              <p className="text-xs text-gray-400">El simio aprovecha de respirar...</p>
              <button
                onClick={togglePause}
                className="w-full rounded-xl bg-gradient-to-b from-amber-400 to-orange-600 px-4 py-2.5 font-black text-orange-950 uppercase text-sm"
              >
                ▶ Continuar
              </button>
              <button
                onClick={startRun}
                className="w-full rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 px-4 py-2.5 font-bold text-gray-100 text-sm flex items-center justify-center gap-2"
              >
                <RotateCcw className="h-4 w-4" /> Reiniciar partida
              </button>
              {adsLife.current < 1 && hud && hud.lives < MAX_LIVES && (
                <button
                  onClick={() => openAd('life')}
                  className="w-full rounded-xl bg-gradient-to-b from-yellow-300 to-amber-500 px-4 py-2.5 font-black text-amber-950 text-sm active:scale-[0.98]"
                >
                  🎬 Ver anuncio → +1 vida
                </button>
              )}
              {adsSkip.current < 2 && hud && hud.eraIdx < ERA_COUNT - 1 && (
                <button
                  onClick={() => openAd('skip')}
                  className="w-full rounded-xl bg-gradient-to-b from-yellow-300 to-amber-500 px-4 py-2.5 font-black text-amber-950 text-sm active:scale-[0.98]"
                >
                  🎬 Anuncio → Saltar a {ERAS[Math.min(hud.eraIdx + 1, ERA_COUNT - 1)].emoji}{' '}
                  {ERAS[Math.min(hud.eraIdx + 1, ERA_COUNT - 1)].name}
                </button>
              )}
              <button
                onClick={goMenu}
                className="w-full rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 px-4 py-2.5 font-bold text-gray-100 text-sm flex items-center justify-center gap-2"
              >
                <Home className="h-4 w-4" /> Menú principal
              </button>
            </div>
          </div>
        )}

        {/* ══ GAME OVER ══ */}
        {screen === 'over' && summary && (
          <div className="absolute inset-0 bg-black/72 backdrop-blur-[3px] flex items-center justify-center px-6">
            <div className="w-full max-w-[320px] rounded-2xl border border-white/15 bg-[#141008]/95 p-5 text-center space-y-3">
              <div className="text-4xl">{summary.cosmos ? '✨🐒' : '😵'}</div>
              <h2 className="text-2xl font-black text-amber-300 uppercase">
                {summary.newRecord ? '¡Nuevo récord!' : 'Resaca terminal'}
              </h2>
              <div className="rounded-xl bg-black/50 border border-white/10 p-3 space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-300">
                  <span>Altura final</span>
                  <span className="font-black text-white">{fmtNum(summary.altitude)} m</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Era alcanzada</span>
                  <span className="font-bold" style={{ color: ERAS[summary.eras].accent }}>
                    {ERAS[summary.eras].emoji} {ERAS[summary.eras].name}
                  </span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>ADN ganado</span>
                  <span className="font-black text-emerald-300">+{fmtNum(Math.round(summary.genesRun))} 🧬</span>
                </div>
                <div className="flex justify-between text-gray-400 text-xs">
                  <span>👹 Jefes derrotados</span>
                  <span className="font-bold text-rose-300">{summary.bosses}</span>
                </div>
                <div className="flex justify-between text-gray-400 text-xs">
                  <span className="flex items-center gap-1"><Skull className="h-3.5 w-3.5" /> Caídas</span>
                  <span>{summary.falls}</span>
                </div>
                <div className="flex justify-between text-gray-400 text-xs">
                  <span>🍺 Botellas</span>
                  <span>{summary.bottles}</span>
                </div>
                <div className="flex justify-between text-gray-400 text-xs">
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Duración</span>
                  <span>{fmtTime(summary.duration)}</span>
                </div>
              </div>
              {summary.cosmos && (
                <div className="rounded-xl border border-yellow-300/40 bg-yellow-300/10 px-3 py-2 text-xs font-bold text-yellow-200">
                  ✨ Tocaste la Ascensión — eres un dios entre simios
                </div>
              )}
              <div className="text-xs text-gray-400">
                Banco total: <span className="font-black text-emerald-300">🧬 {fmtNum(save.genes)}</span>
              </div>
              {!summary.cosmos && adsContinue.current < 2 && (
                <button
                  onClick={() => openAd('continue')}
                  className="w-full rounded-xl bg-gradient-to-b from-yellow-300 to-amber-500 px-4 py-3 font-black text-amber-950 uppercase tracking-wide shadow-lg shadow-amber-900/40 active:scale-[0.98]"
                >
                  🎬 La Cura Milagrosa → Continuar
                  <span className="block text-[10px] font-bold normal-case tracking-normal">
                    Revive en {ERAS[summary.eras].name} con 3 vidas · quedan {2 - adsContinue.current}
                  </span>
                </button>
              )}
              {!doubled && summary.genesRun > 0 && (
                <button
                  onClick={() => openAd('double')}
                  className={`w-full rounded-xl border px-4 py-2.5 font-black text-sm active:scale-[0.98] transition-all ${
                    doubled
                      ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300 cursor-default'
                      : 'bg-gradient-to-b from-yellow-300 to-amber-500 border-amber-300 text-amber-950'
                  }`}
                >
                  🍸 El Bar de la Esquina → ADN ×2
                  <span className="block text-[10px] font-bold normal-case tracking-normal">
                    {doubled ? '✓ ADN duplicado esta partida' : `Duplicar los ${fmtNum(Math.round(summary.genesRun))} genes de esta partida`}
                  </span>
                </button>
              )}
              <button
                onClick={startRun}
                className="w-full rounded-xl bg-gradient-to-b from-amber-400 to-orange-600 px-4 py-3 font-black text-orange-950 uppercase tracking-wide"
              >
                🔁 Otra vuelta (Espacio)
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    sfx.click()
                    setScreen('lab')
                  }}
                  className="flex-1 rounded-xl bg-emerald-500/15 border border-emerald-400/30 px-3 py-2 font-bold text-emerald-300 text-sm"
                >
                  🧬 Lab
                </button>
                <button
                  onClick={goMenu}
                  className="flex-1 rounded-xl bg-white/10 border border-white/15 px-3 py-2 font-bold text-gray-200 text-sm"
                >
                  🏠 Menú
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══ LABORATORIO ══ */}
        {screen === 'lab' && (
          <div className="absolute inset-0 bg-[#0b0f0a]/97 backdrop-blur-sm overflow-y-auto">
            <div className="min-h-full flex flex-col px-4 py-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    sfx.click()
                    setScreen(screenRef.current === 'lab' ? 'menu' : 'over')
                  }}
                  className="rounded-lg bg-white/10 border border-white/15 p-2 text-gray-200 hover:bg-white/20"
                  aria-label="Volver"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <h2 className="text-xl font-black text-emerald-300 uppercase flex items-center gap-2">
                  <FlaskConical className="h-5 w-5" /> Lab Evolutivo
                </h2>
                <div className="rounded-lg bg-emerald-500/15 border border-emerald-400/30 px-3 py-1.5 text-sm font-black text-emerald-300 tabular-nums">
                  🧬 {fmtNum(save.genes)}
                </div>
              </div>
              <p className="text-center text-[11px] text-gray-400 mt-2 mb-3">
                Mejoras permanentes de ADN. Se aplican en tu próxima partida.
              </p>
              <div className="grid grid-cols-1 gap-2 pb-4">
                {UPGRADES.map(u => {
                  const lvl = save.upgrades[u.key]
                  const maxed = lvl >= u.max
                  const cost = upgradeCost(u, lvl)
                  const afford = save.genes >= cost
                  return (
                    <div
                      key={u.key}
                      className="rounded-xl border border-white/10 bg-black/45 p-3 flex items-center gap-3"
                    >
                      <div className="text-3xl shrink-0">{u.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-gray-100 text-sm truncate">{u.name}</span>
                          <span className="text-[10px] font-bold text-gray-400">
                            {lvl}/{u.max}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-400 leading-tight">{u.desc}</div>
                        <div className="text-[11px] font-bold text-amber-300 mt-0.5">
                          {lvl > 0 ? u.effect(lvl) : 'sin mejoras'}
                          {!maxed && <span className="text-gray-500 font-normal"> → {u.effect(lvl + 1)}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => buy(u.key)}
                        disabled={maxed || !afford}
                        className={`shrink-0 rounded-lg px-3 py-2 text-xs font-black transition-all ${
                          maxed
                            ? 'bg-emerald-500/20 text-emerald-300 cursor-default'
                            : afford
                              ? 'bg-emerald-500 hover:bg-emerald-400 text-emerald-950 active:scale-95'
                              : 'bg-white/10 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {maxed ? '✓ MÁX' : `🧬 ${cost}`}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ══ CÓMO JUGAR ══ */}
        {screen === 'how' && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <div className="min-h-full flex flex-col px-5 py-5 gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    sfx.click()
                    setScreen('menu')
                  }}
                  className="rounded-lg bg-white/10 border border-white/15 p-2 text-gray-200 hover:bg-white/20"
                  aria-label="Volver"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <h2 className="text-xl font-black text-amber-300 uppercase flex items-center gap-2">
                  <HelpCircle className="h-5 w-5" /> Cómo jugar
                </h2>
              </div>
              <div className="space-y-2 text-sm text-gray-200 leading-relaxed">
                {[
                  ['🎯', 'Objetivo', 'Escala las 13 eras de la evolución etílica (0 → 19.500m): del Mioceno a la Era Espacial. Cada era tiene su bebida, su mundo y sus trampas. Al final te espera la Ascensión Simia.'],
                  ['🍺', 'El Motor de Ebriedad', 'SOBRIO (0-30%): control perfecto, pero si te estancas 8s el ADN deja de contar. ALEGRE (31-70%): ADN ×1.5, salto más alto y colores saturados. CIEGO (71-99%): ADN ×2.5, inercia brutal, doble visión, HUD que miente y plataformas falsas delatadas.'],
                  ['😵', 'Blackout', 'Al 100% de ebriedad: 2 segundos de ragdoll sin control. Si estás en el aire cuando despiertas… reza (o pierdes una vida). El hipo también te da saltitos automáticos.'],
                  ['🤢', 'Resaca entre eras', 'Al cambiar de era: minijuego exprés — toca la secuencia de Agua, Aspirina y Café para curarte (+25 ADN). Si fallas, sigues hecho papilla. La transición viene "patrocinada" (los VIP están a salvo).'],
                  ['👹', 'Los 5 Jefes', 'Guardianes de la Sobriedad al final de Neolítico, Edad Media, Prohibición, Cyberpunk y Espacio. Recoge botellas y lánzaselas (tecla F o botón). Pistas: a Sir Abstinence hay que mojarle el visor (bebe antes), y SOBER-9000 solo abre su núcleo si estás medianamente esponado.'],
                  ['🎁', 'Power-ups cómicos', '📞 Teléfono del Ex: te congelas 5s invulnerable, +1 vida, pero bajas altura. 🥙 Kebab de la Sabiduría: baja la ebriedad a 20% y escudo de grasa (si estás muy ciego puedes comerte una botella por error). 🫓 Plato de Tapas: orbita destruyendo proyectiles; a la 5ª tapa explota en ADN.'],
                  ['💀', 'Caídas', 'Tienes 3 vidas (VIP: 4) y +1 por era nueva (máx. 5). Caer te devuelve al checkpoint de la era. Pinchos y cuervos medievales no matan, pero humillan.'],
                  ['🧬', 'Genes y Lab', 'Gasta ADN en el Laboratorio: salto, equilibrio, hígado, visión, botas e imán. Mejoras permanentes entre partidas.'],
                  ['🎬', 'Anuncios y VIP', 'Anuncio simulado (5s) para: La Cura Milagrosa (revivir), +1 vida, saltar era, ADN ×2 o duplicar el ADN al morir (El Bar de la Esquina). 👑 Tarjeta VIP del Borracho ($2.99 simulados): sin anuncios forzosos, monóculo, puro y +1 vida inicial.'],
                ].map(([emoji, title, body]) => (
                  <div key={title} className="rounded-xl border border-white/10 bg-black/45 p-3">
                    <div className="font-black text-amber-300">
                      {emoji} {title}
                    </div>
                    <div className="text-[13px] text-gray-300">{body}</div>
                  </div>
                ))}
              <div className="rounded-xl border border-white/10 bg-black/45 p-3">
                  <div className="font-black text-amber-300 mb-1">🗺️ Las 13 eras (y su brebaje)</div>
                  <div className="grid grid-cols-1 gap-1">
                    {ERAS.map((er, i) => (
                      <div key={er.name} className="flex items-center gap-2 text-[12px] text-gray-300">
                        <span className="w-5 text-right font-black text-gray-500">{i + 1}.</span>
                        <span>{er.emoji}</span>
                        <span className="font-bold text-gray-100">{er.name}</span>
                        <span className="text-gray-400">· {er.drink}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/45 p-3">
                  <div className="font-black text-amber-300">🎮 Controles</div>
                  <div className="text-[13px] text-gray-300">
                    Teclado: ← → o A/D para moverte · Espacio / ↑ / W para saltar · F para lanzar botella · P
                    para pausa · M silencio. En móvil usa los botones en pantalla.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ MODALES ══ */}
        {adKind && <AdModal kind={adKind} onReward={() => grantReward(adKind)} onClose={closeAd} />}
        {vipOpen && <VipModal onBuy={buyVip} onClose={() => setVipOpen(false)} />}
      </div>
    </div>
  )
}
