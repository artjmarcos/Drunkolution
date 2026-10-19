// ── Persistencia en localStorage (DRUNKOLUTION v3) ──────────────────────────
import { defaultUpgrades } from './eras'
import type { SaveData } from './types'

const KEY = 'drunkolution-v1'
const LEGACY_KEY = 'monos-borrachos-v2'

export function defaultSave(): SaveData {
  return {
    v: 3,
    record: 0,
    genes: 0,
    upgrades: defaultUpgrades(),
    stats: { runs: 0, bottles: 0, genesTotal: 0, falls: 0, distTotal: 0, cosmosWins: 0, adsWatched: 0, bosses: 0 },
    maxEra: 0,
    muted: false,
    boost2x: false,
    vip: false,
  }
}

function parse(partial: Partial<SaveData> | null): SaveData {
  const base = defaultSave()
  if (!partial) return base
  return {
    v: 3,
    record: Number(partial.record) || 0,
    genes: Number(partial.genes) || 0,
    upgrades: { ...base.upgrades, ...(partial.upgrades || {}) },
    stats: { ...base.stats, ...(partial.stats || {}) },
    maxEra: Number(partial.maxEra) || 0,
    muted: Boolean(partial.muted),
    boost2x: Boolean(partial.boost2x),
    vip: Boolean(partial.vip),
  }
}

export function loadSave(): SaveData {
  if (typeof window === 'undefined') return defaultSave()
  try {
    const raw = window.localStorage.getItem(KEY)
    if (raw) return parse(JSON.parse(raw) as Partial<SaveData>)
    // migración desde la era "Monos Borrachos" (respetamos su progreso)
    const legacy = window.localStorage.getItem(LEGACY_KEY)
    if (legacy) {
      const migrated = parse(JSON.parse(legacy) as Partial<SaveData>)
      persistSave(migrated)
      return migrated
    }
    return defaultSave()
  } catch {
    return defaultSave()
  }
}

export function persistSave(s: SaveData): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    // almacenamiento lleno o bloqueado: ignorar
  }
}
