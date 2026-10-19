import { ERAS } from "@/game/eras";
import { useMemo, useState } from "react";

export default function MonosGame() {
  const [eraIndex, setEraIndex] = useState(0);
  const era = ERAS[eraIndex];
  const nextEra = useMemo(() => ERAS[(eraIndex + 1) % ERAS.length], [eraIndex]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#3b2a68_0%,_#120f1d_45%,_#07090f_100%)] px-6 py-16 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 inline-flex items-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-violet-200 backdrop-blur-sm">
          🐒🍺 Drunkolution
        </div>

        <div className="grid items-center gap-10 lg:grid-cols-[1.3fr_0.7fr]">
          <section>
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.25em] text-violet-300">
              Endless jumper vertical
            </p>
            <h1 className="text-5xl font-black leading-tight md:text-6xl">
              Evoluciona
              <span className="block text-violet-400">de la resaca</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-slate-300">
              Un juego de plataformas donde cada salto, cada trago y cada era marcan la diferencia.
              La evolución no es lineal: es un impulso constante, caótico y con mucho estilo.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <button className="rounded-full bg-violet-500 px-6 py-3 font-semibold text-white transition hover:bg-violet-400">
                Empezar a jugar
              </button>
              <button
                type="button"
                className="rounded-full border border-white/15 bg-white/5 px-6 py-3 font-semibold text-slate-200 transition hover:bg-white/10"
                onClick={() => setEraIndex((prev) => (prev + 1) % ERAS.length)}
              >
                Ver eras
              </button>
            </div>
          </section>

          <aside className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-violet-950/40 backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm uppercase tracking-[0.2em] text-slate-400">Estado</span>
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                Alegre
              </span>
            </div>

            <div className="space-y-5">
              <div>
                <p className="text-sm text-slate-400">ADN acumulado</p>
                <p className="mt-1 text-3xl font-bold text-violet-300">12.480</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Era actual</p>
                <p className="mt-1 text-xl font-semibold text-white">{era.name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Siguiente era</p>
                <p className="mt-1 text-xl font-semibold text-white">{nextEra.name}</p>
              </div>
            </div>
          </aside>
        </div>

        <section className="mt-12 rounded-3xl border border-violet-500/20 bg-slate-950/40 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Era activa</p>
              <h2 className="mt-2 text-3xl font-bold text-white">{era.name}</h2>
            </div>
            <div
              className="h-16 w-16 rounded-2xl border border-white/10 shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${era.tint} 0%, #0f172a 100%)`,
              }}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-300">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Bebida: {era.drink}</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Mecánica: {era.mechanic}</span>
          </div>
        </section>
      </div>
    </main>
  );
}
