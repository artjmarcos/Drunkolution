export function renderScene(canvas: HTMLCanvasElement | null, label: string) {
  if (!canvas) {
    return;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#a78bfa";
  ctx.fillRect(40, height - 110, width - 80, 40);

  ctx.fillStyle = "#f8fafc";
  ctx.font = "700 28px sans-serif";
  ctx.fillText(label, 48, 60);
}
