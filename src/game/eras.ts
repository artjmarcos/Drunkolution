export const ERAS = [
  { id: 1, name: "Mioceno", drink: "Frutas fermentadas", mechanic: "Lianas", tint: "#7dd3fc" },
  { id: 2, name: "Neolítico", drink: "Cerveza de barro", mechanic: "Plataformas que se desmoronan", tint: "#86efac" },
  { id: 3, name: "Egipto", drink: "Vino de dátiles", mechanic: "Plataformas móviles", tint: "#fbbf24" },
  { id: 4, name: "Antigua Grecia", drink: "Vino y Ouzo", mechanic: "Mármol resbaladizo", tint: "#f9a8d4" },
  { id: 5, name: "Imperio Romano", drink: "Vino de ánfora", mechanic: "Fuentes de vino", tint: "#fca5a5" },
  { id: 6, name: "Edad Media", drink: "Hidromiel", mechanic: "Púas y cuervos", tint: "#c4b5fd" },
  { id: 7, name: "Renacimiento", drink: "Vino Chianti", mechanic: "Ornitópteros", tint: "#fcd34d" },
  { id: 8, name: "Impresionismo", drink: "Absenta", mechanic: "Plataformas derretidas", tint: "#67e8f9" },
  { id: 9, name: "La Prohibición", drink: "Moonshine", mechanic: "Cajas falsas", tint: "#f97316" },
  { id: 10, name: "Revolución Industrial", drink: "Gin Tonic", mechanic: "Engranajes", tint: "#d8b4fe" },
  { id: 11, name: "Años 80", drink: "Cócteles de neón", mechanic: "Plataformas que parpadean", tint: "#f472b6" },
  { id: 12, name: "Cyberpunk 2099", drink: "Neon-Vodka", mechanic: "Hologramas", tint: "#22d3ee" },
  { id: 13, name: "Era Espacial", drink: "Cerveza Cuántica", mechanic: "Gravedad 0.4x", tint: "#38bdf8" },
] as const;

export type EraEntry = (typeof ERAS)[number];
