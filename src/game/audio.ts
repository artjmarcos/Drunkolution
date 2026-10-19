// ── DRUNKOLUTION: SFX sintetizados + música procedural por era ──────────────

type Wave = OscillatorType

class Sfx {
  private ctx: AudioContext | null = null
  muted = false

  private ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return null
      this.ctx = new AC()
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return this.ctx
  }

  unlock(): void {
    this.ensure()
  }

  get context(): AudioContext | null {
    return this.ensure()
  }

  private tone(
    freq: number,
    dur: number,
    opts: { type?: Wave; gain?: number; slide?: number; delay?: number } = {}
  ): void {
    if (this.muted) return
    const ctx = this.ensure()
    if (!ctx) return
    const t0 = ctx.currentTime + (opts.delay || 0)
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = opts.type || 'square'
    osc.frequency.setValueAtTime(freq, t0)
    if (opts.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, opts.slide), t0 + dur)
    const vol = (opts.gain || 0.12) * 0.9
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    osc.connect(g).connect(ctx.destination)
    osc.start(t0)
    osc.stop(t0 + dur + 0.05)
  }

  jump(): void {
    this.tone(300, 0.14, { type: 'square', slide: 560, gain: 0.07 })
  }
  airJump(): void {
    this.tone(420, 0.14, { type: 'square', slide: 760, gain: 0.07 })
  }
  bounce(): void {
    this.tone(180, 0.22, { type: 'sine', slide: 720, gain: 0.14 })
  }
  gene(): void {
    this.tone(880, 0.07, { type: 'triangle', gain: 0.09 })
    this.tone(1318, 0.09, { type: 'triangle', gain: 0.08, delay: 0.06 })
  }
  bottle(): void {
    // glug glug glug
    this.tone(520, 0.09, { type: 'sine', slide: 300, gain: 0.12 })
    this.tone(430, 0.09, { type: 'sine', slide: 250, gain: 0.12, delay: 0.1 })
    this.tone(340, 0.12, { type: 'sine', slide: 180, gain: 0.12, delay: 0.2 })
    this.tone(720, 0.18, { type: 'triangle', slide: 980, gain: 0.08, delay: 0.32 })
  }
  banana(): void {
    this.tone(660, 0.08, { type: 'triangle', gain: 0.1 })
    this.tone(880, 0.12, { type: 'triangle', gain: 0.1, delay: 0.07 })
  }
  crumble(): void {
    this.tone(160, 0.24, { type: 'sawtooth', slide: 60, gain: 0.1 })
  }
  fall(): void {
    this.tone(420, 0.6, { type: 'sawtooth', slide: 80, gain: 0.12 })
  }
  land(): void {
    this.tone(150, 0.06, { type: 'sine', gain: 0.06 })
  }
  era(): void {
    ;[523, 659, 784].forEach((f, i) =>
      this.tone(f, 0.16, { type: 'triangle', gain: 0.1, delay: i * 0.09 })
    )
  }
  cosmos(): void {
    ;[523, 659, 784, 1046, 1318, 1568].forEach((f, i) =>
      this.tone(f, 0.3, { type: 'triangle', gain: 0.11, delay: i * 0.11 })
    )
  }
  gameover(): void {
    ;[392, 330, 262, 196].forEach((f, i) =>
      this.tone(f, 0.3, { type: 'sawtooth', gain: 0.09, delay: i * 0.18 })
    )
  }
  buy(): void {
    this.tone(660, 0.08, { type: 'triangle', gain: 0.1 })
    this.tone(990, 0.14, { type: 'triangle', gain: 0.1, delay: 0.07 })
  }
  click(): void {
    this.tone(440, 0.05, { type: 'square', gain: 0.05 })
  }
  checkpoint(): void {
    this.tone(587, 0.1, { type: 'triangle', gain: 0.09 })
    this.tone(880, 0.16, { type: 'triangle', gain: 0.09, delay: 0.08 })
  }

  // ── DRUNKOLUTION: nuevos sonidos ──────────────────────────────────────────
  hiccup(): void {
    // ¡HIPO! — "hic" cómico y saltarín
    this.tone(240, 0.08, { type: 'square', slide: 620, gain: 0.13 })
    this.tone(620, 0.06, { type: 'square', slide: 990, gain: 0.09, delay: 0.07 })
  }
  blackout(): void {
    // caída en ragdoll: wobble grave descendente
    ;[220, 190, 160, 120, 90].forEach((f, i) =>
      this.tone(f, 0.22, { type: 'sawtooth', slide: f * 0.6, gain: 0.11, delay: i * 0.16 })
    )
  }
  throwBottle(): void {
    this.tone(340, 0.1, { type: 'square', slide: 720, gain: 0.08 })
    this.tone(990, 0.07, { type: 'sine', gain: 0.06, delay: 0.06 })
  }
  bossHit(): void {
    this.tone(180, 0.14, { type: 'sawtooth', slide: 60, gain: 0.14 })
    this.tone(560, 0.1, { type: 'square', slide: 220, gain: 0.09, delay: 0.05 })
  }
  bossRoar(): void {
    this.tone(110, 0.5, { type: 'sawtooth', slide: 65, gain: 0.16 })
    this.tone(165, 0.5, { type: 'square', slide: 90, gain: 0.1, delay: 0.12 })
  }
  bossDefeat(): void {
    ;[660, 880, 1100, 1320].forEach((f, i) =>
      this.tone(f, 0.24, { type: 'triangle', gain: 0.12, delay: i * 0.13 })
    )
  }
  quack(): void {
    this.tone(300, 0.1, { type: 'sawtooth', slide: 190, gain: 0.12 })
    this.tone(260, 0.08, { type: 'sawtooth', slide: 170, gain: 0.1, delay: 0.09 })
  }
  spike(): void {
    this.tone(700, 0.09, { type: 'sawtooth', slide: 120, gain: 0.12 })
  }
  cure(): void {
    // resaca curada: arpegio refrescante
    ;[523, 659, 784, 1046].forEach((f, i) =>
      this.tone(f, 0.14, { type: 'sine', gain: 0.1, delay: i * 0.08 })
    )
  }
  hangoverFail(): void {
    this.tone(200, 0.3, { type: 'sawtooth', slide: 90, gain: 0.13 })
    this.tone(150, 0.4, { type: 'sawtooth', slide: 70, gain: 0.12, delay: 0.2 })
  }
  phone(): void {
    // ring ring del teléfono del ex
    for (let i = 0; i < 2; i++) {
      this.tone(1200, 0.09, { type: 'sine', gain: 0.08, delay: i * 0.22 })
      this.tone(1500, 0.09, { type: 'sine', gain: 0.07, delay: 0.1 + i * 0.22 })
    }
  }
  kebab(): void {
    this.tone(320, 0.1, { type: 'triangle', gain: 0.11 })
    this.tone(420, 0.12, { type: 'triangle', gain: 0.1, delay: 0.09 })
    this.tone(560, 0.16, { type: 'triangle', gain: 0.1, delay: 0.19 })
  }
  tapas(): void {
    // plato girando: trino rápido
    for (let i = 0; i < 6; i++)
      this.tone(900 + (i % 2) * 180, 0.05, { type: 'sine', gain: 0.06, delay: i * 0.05 })
  }
  vip(): void {
    // fanfarria del monóculo
    ;[523, 659, 784, 1046, 784, 1046].forEach((f, i) =>
      this.tone(f, 0.18, { type: 'square', gain: 0.08, delay: i * 0.11 })
    )
  }
}

export const sfx = new Sfx()

// ── Música procedural por era ───────────────────────────────────────────────
// 16 pasos por compás; el filtro de ebriedad desafina el tono y añade eco
// cuando el simio está CIEGO (71-99%).

interface EraMusic {
  bpm: number
  bassWave: Wave
  leadWave: Wave
  base: number // frecuencia base (Hz)
  bass: number[] // semitonos por paso (-1 = silencio)
  lead: number[]
}

const P = (...steps: number[]): number[] => {
  const out = new Array(16).fill(-1)
  steps.forEach((s, i) => (out[i] = s))
  return out
}
const RP = (pattern: number[]): number[] => {
  // patrón de 16 que se repite con variación: los pares suenan
  const out = new Array(16).fill(-1)
  for (let i = 0; i < 16; i++) if (pattern[i % pattern.length] >= 0) out[i] = pattern[i % pattern.length]
  return out
}

// M: 0 = tónica. Patrones cortos y cómicos por era.
const MUSIC: EraMusic[] = [
  // 0 Mioceno: tambores tribales + marimba pentatónica
  { bpm: 92, bassWave: 'sine', leadWave: 'triangle', base: 220,
    bass: P(0, -1, -1, 0, -1, -1, 0, -1, -1, 0, -1, -1, 0, -1, 3, -1),
    lead: P(-1, -1, 7, -1, 10, -1, -1, 7, -1, -1, 12, -1, 10, -1, 7, -1) },
  // 1 Neolítico: flauta de hueso lenta
  { bpm: 76, bassWave: 'sine', leadWave: 'sine', base: 196,
    bass: P(0, -1, -1, -1, -1, -1, 0, -1, -2, -1, -1, -1, -1, -1, -1, -1),
    lead: P(7, -1, -1, 10, -1, -1, 8, -1, -1, 5, -1, -1, 3, -1, -1, -1) },
  // 2 Egipto: dórico hipnótico (encantador de simios)
  { bpm: 100, bassWave: 'sine', leadWave: 'sine', base: 233,
    bass: P(0, -1, -1, 0, -1, -1, 1, -1, 0, -1, -1, 0, -1, -1, -4, -1),
    lead: RP([5, -1, 6, -1, 7, -1, 6, -1, 5, -1, 1, -1, 0, -1, 1, -1]) },
  // 3 Grecia: lira doriana
  { bpm: 108, bassWave: 'triangle', leadWave: 'triangle', base: 262,
    bass: P(0, -1, 7, -1, 5, -1, 7, -1, 0, -1, 7, -1, 5, -1, 3, -1),
    lead: P(12, -1, 14, -1, 15, -1, 14, 12, -1, 10, -1, 9, -1, 7, -1, -1) },
  // 4 Roma: marcha de cuernos
  { bpm: 96, bassWave: 'sawtooth', leadWave: 'square', base: 175,
    bass: P(0, 0, -1, 0, -1, -1, 0, -1, 3, 3, -1, 3, -1, -1, 5, -1),
    lead: P(0, -1, 4, -1, 7, -1, 4, -1, 5, -1, 9, -1, 7, -1, 4, -1) },
  // 5 Edad Media: laúd medieval saltarín
  { bpm: 116, bassWave: 'triangle', leadWave: 'square', base: 196,
    bass: P(0, -1, -1, 4, -1, -1, 5, -1, 0, -1, -1, 4, -1, -1, 2, -1),
    lead: RP([7, 9, 10, 12, 10, 9, 7, 5, 7, 9, 10, 12, 14, 12, 10, 9]) },
  // 6 Renacimiento: clavecín de Da Vinci
  { bpm: 124, bassWave: 'triangle', leadWave: 'square', base: 262,
    bass: P(0, -1, 7, -1, 4, -1, 7, -1, 2, -1, 9, -1, 4, -1, 7, -1),
    lead: RP([12, -1, 11, 12, 16, -1, 14, -1, 12, -1, 11, 12, 9, -1, 7, -1]) },
  // 7 Impresionismo: absenta onírica (séptimas flotantes)
  { bpm: 72, bassWave: 'sine', leadWave: 'sine', base: 220,
    bass: P(0, -1, -1, -1, 7, -1, -1, -1, 5, -1, -1, -1, 9, -1, -1, -1),
    lead: P(14, -1, 17, -1, -1, 21, -1, -1, 16, -1, 19, -1, -1, 14, -1, -1) },
  // 8 Prohibición: jazz de bar clandestino (swing)
  { bpm: 132, bassWave: 'sine', leadWave: 'square', base: 185,
    bass: P(0, -1, 4, -1, 7, -1, 4, -1, 0, -1, 4, -1, 7, 6, 4, 2),
    lead: RP([10, -1, 12, 13, -1, 12, 10, -1, 7, -1, 10, 12, -1, 10, 7, 5]) },
  // 9 Industrial: golpes metálicos + gin
  { bpm: 120, bassWave: 'sawtooth', leadWave: 'square', base: 147,
    bass: P(0, -1, 0, -1, 0, -1, 0, 3, 0, -1, 0, -1, 0, -1, -2, -1),
    lead: P(12, -1, -1, 10, -1, -1, 12, -1, -1, 15, -1, -1, 10, -1, -1, -1) },
  // 10 Años 80: synthwave de neón
  { bpm: 118, bassWave: 'sawtooth', leadWave: 'sawtooth', base: 220,
    bass: RP([0, 0, 7, 0, 0, 7, 0, 0, 5, 5, 0, 5, 3, 3, 7, 7]),
    lead: P(19, -1, 17, -1, 14, -1, 17, -1, 19, -1, 21, -1, 19, 17, 14, -1) },
  // 11 Cyberpunk 2099: arpegio oscuro y glitcheado
  { bpm: 138, bassWave: 'square', leadWave: 'square', base: 165,
    bass: RP([0, 0, -1, 0, 3, -1, 0, 0, 5, -1, 0, 0, 7, -1, 6, -1]),
    lead: RP([12, 15, 19, 15, 12, 15, 19, 22, 12, 15, 19, 15, 12, 10, 7, 10]) },
  // 12 Espacio: pads flotantes de cerveza cuántica
  { bpm: 64, bassWave: 'sine', leadWave: 'sine', base: 175,
    bass: P(0, -1, -1, -1, -1, -1, -1, -1, 5, -1, -1, -1, -1, -1, -1, -1),
    lead: P(12, -1, -1, -1, 19, -1, -1, -1, 17, -1, -1, -1, 24, -1, -1, -1) },
]

const semi = (base: number, s: number): number => base * Math.pow(2, s / 12)

class Music {
  private timer: ReturnType<typeof setInterval> | null = null
  private step = 0
  private nextT = 0
  private era = 0
  private drunk = 0
  private master: GainNode | null = null
  private wet: GainNode | null = null
  muted = false

  start(era = 0): void {
    const ctx = sfx.context
    if (!ctx) return
    this.stop()
    this.era = era
    this.step = 0
    this.nextT = ctx.currentTime + 0.1
    if (!this.master) {
      this.master = ctx.createGain()
      this.master.gain.value = 0.16
      this.master.connect(ctx.destination)
      // eco "borracho"
      const delay = ctx.createDelay(0.6)
      delay.delayTime.value = 0.27
      const fb = ctx.createGain()
      fb.gain.value = 0.34
      this.wet = ctx.createGain()
      this.wet.gain.value = 0.05
      this.master.connect(delay)
      delay.connect(fb)
      fb.connect(delay)
      delay.connect(this.wet)
      this.wet.connect(ctx.destination)
    }
    this.timer = setInterval(this.tick, 55)
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  setEra(era: number): void {
    this.era = Math.max(0, Math.min(MUSIC.length - 1, era))
    this.step = 0
  }

  setDrunk(d: number): void {
    this.drunk = d
    if (this.wet) this.wet.gain.value = 0.05 + d * d * 0.35
  }

  private tick = (): void => {
    if (this.muted || sfx.muted) return
    const ctx = sfx.context
    const master = this.master
    if (!ctx || !master) return
    const m = MUSIC[this.era]
    const stepDur = 60 / m.bpm / 4 // semicorcheas
    while (this.nextT < ctx.currentTime + 0.18) {
      const t0 = this.nextT
      const st = this.step % 16
      // filtro de ebriedad: desafinar cuando está ciego
      const wob = this.drunk > 0.7 ? Math.sin(t0 * 4.2) * 0.075 * (this.drunk - 0.7) / 0.3 : 0
      const b = m.bass[st]
      if (b >= 0) this.note(semi(m.base, b) * (1 + wob * 0.5), t0, stepDur * 2.4, m.bassWave, 0.5)
      const l = m.lead[st]
      if (l >= 0) this.note(semi(m.base * 2, l) * (1 + wob), t0, stepDur * 1.6, m.leadWave, 0.32)
      // percusión tribal en eras bajas, hats en altas
      if (st % 4 === 0 && this.era <= 1) this.noise(t0, 0.08, 0.25)
      if (st % 2 === 1 && this.era >= 9) this.noise(t0, 0.03, 0.08)
      this.step++
      this.nextT += stepDur
    }
  }

  private note(freq: number, t0: number, dur: number, wave: Wave, gain: number): void {
    const ctx = sfx.context
    if (!ctx || !this.master) return
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = wave
    osc.frequency.setValueAtTime(freq, t0)
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    osc.connect(g).connect(this.master)
    osc.start(t0)
    osc.stop(t0 + dur + 0.05)
  }

  private noise(t0: number, dur: number, gain: number): void {
    const ctx = sfx.context
    if (!ctx || !this.master) return
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur))
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len)
    const src = ctx.createBufferSource()
    src.buffer = buf
    const g = ctx.createGain()
    g.gain.value = gain
    src.connect(g).connect(this.master)
    src.start(t0)
  }
}

export const music = new Music()
