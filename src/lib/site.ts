export const SITE = {
  name: "Vagou",
  tagline: "Estacionar ficou mais inteligente.",
  headline: "Descubra onde tem vaga para estacionar",
  description: "A Vagou mostra no mapa os estacionamentos perto do seu destino e quantas vagas estão livres agora — com preços, horários, entradas e mapa de vagas por piso.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
};

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
