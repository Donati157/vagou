import { z } from "@/lib/zod";

const status = z.enum(["AVAILABLE", "OCCUPIED", "RESERVED", "UNAVAILABLE"]);
const type = z.enum(["COMMON", "PCD", "EV", "MOTO", "VIP"]);
const geometry = { x: z.number().min(0).max(1), y: z.number().min(0).max(1), w: z.number().positive().max(1), h: z.number().positive().max(1), rotation: z.number().min(-360).max(720) };
const code = z.string().trim().min(1, "Toda vaga precisa de um nome.").max(20, "Nome de vaga muito longo.");

export const editorChangesSchema = z.object({
  created: z.array(z.object({ code, type, status, sectorId: z.string().uuid().nullable(), ...geometry })).max(2000),
  updated: z.array(z.object({ id: z.string().uuid(), code, type, status, sectorId: z.string().uuid().nullable(), ...geometry })).max(2000),
  deleted: z.array(z.string().uuid()).max(2000),
});

export type EditorChanges = z.infer<typeof editorChangesSchema>;
