/**
 * Public base URL: explicit NEXT_PUBLIC_APP_URL, else the production domain Vercel provides
 * automatically (VERCEL_PROJECT_PRODUCTION_URL / VERCEL_URL), else localhost for development.
 */
function appUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercelHost) return `https://${vercelHost}`;
  return "http://localhost:3000";
}

export const SITE = {
  name: "Vagou",
  tagline: "Estacionar ficou mais inteligente.",
  headline: "Descubra onde tem vaga no shopping",
  description: "A Vagou mostra quantas vagas cada shopping tem, quantas estão livres agora e a planta do estacionamento, piso por piso.",
  url: appUrl(),
};

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
