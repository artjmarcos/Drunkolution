import type { DrunkState, EraDefinition } from "./types";

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function getDrunkState(level: number): DrunkState {
  const normalized = clamp(level, 0, 100);

  if (normalized < 30) {
    return { level: normalized, label: "Sobrio", multiplier: 1 };
  }

  if (normalized < 71) {
    return { level: normalized, label: "Alegre", multiplier: 1.5 };
  }

  if (normalized < 100) {
    return { level: normalized, label: "Ciego", multiplier: 2.5 };
  }

  return { level: 100, label: "Blackout", multiplier: 3 };
}

export function getEraPreview(era: EraDefinition) {
  return {
    id: era.id,
    name: era.name,
    tint: era.tint,
    state: getDrunkState(era.id * 9),
  };
}
