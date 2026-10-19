export function loadBestScore() {
  if (typeof window === "undefined") {
    return 0;
  }

  const raw = window.localStorage.getItem("drunkolution-best-score");
  return raw ? Number(raw) || 0 : 0;
}

export function saveBestScore(value: number) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem("drunkolution-best-score", String(value));
}
