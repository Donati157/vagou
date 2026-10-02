export const SITE = {
  name: "Vagou",
  tagline: "Estacionar ficou mais inteligente.",
  headline: "Descubra onde tem vaga no shopping",
  description: "A Vagou mostra quantas vagas cada shopping tem, quantas estão livres agora e a planta do estacionamento, piso por piso.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
};

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
