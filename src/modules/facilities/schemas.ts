import { z } from "@/lib/zod";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$|^24:00$/, "Horário inválido");
export const toMinutes = (t: string) => (t === "24:00" ? 1440 : Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)));
export const fromMinutes = (m: number) => (m >= 1440 ? "24:00" : `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);

export const dayHoursSchema = z
  .object({ weekday: z.number().int().min(0).max(6), enabled: z.boolean(), open: time, close: time })
  .refine((d) => !d.enabled || toMinutes(d.open) < toMinutes(d.close), { message: "O fechamento deve ser depois da abertura.", path: ["close"] });

const optionalInt = (max: number) => z.number().int().min(0).max(max);

/** Facility registration/edition (validated on client for UX and on server as authority). */
export const facilityInputSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome do estacionamento.").max(120),
  kind: z.enum(["SHOPPING", "COMMERCIAL_BUILDING", "PARKING_LOT", "HOSPITAL", "EVENT_VENUE", "TRANSIT_HUB", "OTHER"]),
  description: z.string().trim().max(1500).default(""),
  addressLine: z.string().trim().min(5, "Informe rua e número.").max(160),
  neighborhood: z.string().trim().min(2, "Informe o bairro.").max(80),
  postalCode: z
    .string()
    .trim()
    .regex(/^(\d{5}-?\d{3})?$/, "CEP inválido.")
    .nullish()
    .transform((v) => v || null),
  lat: z.number({ message: "Marque a localização no mapa." }).min(-24.1).max(-23.2),
  lng: z.number({ message: "Marque a localização no mapa." }).min(-47.1).max(-46.2),
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(/^[0-9()+\-\s]*$/, "Telefone inválido.")
    .nullish()
    .transform((v) => v || null),
  declaredCapacity: optionalInt(20000),
  covered: z.boolean(),
  accessibleSpaces: optionalInt(2000),
  evChargers: optionalInt(2000),
  valet: z.boolean(),
  security24h: z.boolean(),
  maxHeightCm: z.number().int().min(150).max(500).nullable(),
  usefulInfo: z.string().trim().max(1000).default(""),
  vehicleTypes: z.array(z.enum(["CAR", "MOTORCYCLE", "VAN"])).min(1, "Selecione ao menos um tipo de veículo."),
  hours: z.array(dayHoursSchema).length(7),
  isPublished: z.boolean(),
});
export type FacilityInput = z.infer<typeof facilityInputSchema>;

export const entranceSchema = z.object({
  name: z.string().trim().min(2, "Dê um nome à entrada.").max(100),
  kind: z.enum(["VEHICLE_ENTRY", "VEHICLE_EXIT", "VEHICLE_BOTH", "PEDESTRIAN"]),
  addressLine: z.string().trim().max(160).nullable(),
  lat: z.number().min(-24.1).max(-23.2),
  lng: z.number().min(-47.1).max(-46.2),
  isPrimary: z.boolean(),
  notes: z.string().trim().max(200).nullable(),
});
export const entrancesInputSchema = z
  .object({ entrances: z.array(entranceSchema).max(10) })
  .refine((v) => v.entrances.filter((e) => e.isPrimary).length <= 1, { message: "Marque apenas uma entrada recomendada.", path: ["entrances"] });

export const floorSchema = z.object({ name: z.string().trim().min(1, "Informe o nome do piso.").max(30), level: z.number().int().min(-20).max(100) });
export const sectorSchema = z.object({ name: z.string().trim().min(1, "Informe o nome do setor.").max(30), color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida.") });

export const dataSourceInputSchema = z.object({ kind: z.enum(["SIMULATION", "MANUAL"]), granularity: z.enum(["SPACE", "AGGREGATE"]) });

export function defaultHours(): FacilityInput["hours"] {
  return [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, enabled: true, open: "07:00", close: "22:00" }));
}
