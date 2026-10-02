import { z } from "@/lib/zod";

/** URL contract for the public search page (shareable, bookmarkable). */
export const searchParamsSchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  raio: z.coerce.number().int().min(300).max(30000).optional(),
  aberto: z.literal("1").optional(),
  comVagas: z.literal("1").optional(),
  acessivel: z.literal("1").optional(),
  ev: z.literal("1").optional(),
  coberto: z.literal("1").optional(),
  moto: z.literal("1").optional(),
  ordem: z.enum(["relevancia", "distancia", "vagas", "capacidade"]).optional(),
});

export type SearchParams = z.infer<typeof searchParamsSchema>;
