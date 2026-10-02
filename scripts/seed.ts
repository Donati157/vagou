/**
 * Demo seed — fictional facilities in São Paulo. No real personal data.
 *
 *   npm run db:seed                        → resets the database and loads demo data (development)
 *   tsx scripts/seed.ts --if-empty --demo  → deploys: loads demo data only into an EMPTY database
 *                                            (never deletes anything) and keeps demo-account
 *                                            passwords in sync with DEMO_PASSWORD
 *
 * In production, demo accounts are created LOCKED (random undisclosed password) unless
 * DEMO_PASSWORD is set; setting it later and redeploying unlocks them.
 *
 * Stop `npm run dev` first when using the embedded database.
 */
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { loadEnv } from "./env";
import { runMigrations } from "./migrate";
import { renderSamplePlan } from "./lib/plan-image";
import { createDatabase, type Database } from "../src/server/db/create";
import * as s from "../src/server/db/schema";
import { hashPassword, randomToken } from "../src/modules/auth/password";
import { standardLayout, STANDARD_SECTORS, spaceCode } from "../src/modules/floorplans/layout";
import { seededRng, simulateAggregate, targetOccupancy } from "../src/modules/occupancy/simulation";
import { addMinutes } from "../src/lib/time";
import { createStorage, storageDriverName } from "../src/modules/storage/drivers";

loadEnv();

const IF_EMPTY = process.argv.includes("--if-empty");
const PRODUCTION = process.env.NODE_ENV === "production" || !!process.env.VERCEL;
/** Demo data in production is an explicit opt-in: `--demo` (versioned in vercel-build) or ALLOW_DEMO_SEED=true. */
const DEMO_ALLOWED = process.argv.includes("--demo") || process.env.ALLOW_DEMO_SEED === "true";

if (PRODUCTION && !DEMO_ALLOWED) {
  console.log("• Seed de demonstração não executado (use --demo ou ALLOW_DEMO_SEED=true).");
  process.exit(0);
}

const DEV_PASSWORD = "Vagou@2026";
const configuredPassword = process.env.DEMO_PASSWORD;
/** A public site never gets the documented development password. */
const PASSWORD_OK = !!configuredPassword && configuredPassword !== DEV_PASSWORD && configuredPassword.length >= 10;
export const DEMO_PASSWORD = PRODUCTION ? (PASSWORD_OK ? configuredPassword! : null) : (configuredPassword ?? DEV_PASSWORD);
const rnd = seededRng(20261002);
const slug = (t: string) =>
  t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

async function insertChunks(db: Database, table: Parameters<Database["insert"]>[0], rows: Record<string, unknown>[], size = 400) {
  for (let i = 0; i < rows.length; i += size) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.insert(table).values(rows.slice(i, i + size) as any);
  }
}

type Kind = (typeof s.facilityKind.enumValues)[number];
type Hours = Array<{ days: number[]; open: string; close: string }>;
const SHOPPING: Hours = [
  { days: [1, 2, 3, 4, 5, 6], open: "09:00", close: "23:00" },
  { days: [0], open: "11:00", close: "21:00" },
];
const toMin = (t: string) => (t === "24:00" ? 1440 : Number(t.slice(0, 2)) * 60 + Number(t.slice(3)));

type FacilitySpec = {
  org: string;
  name: string;
  kind: Kind;
  description: string;
  address: string;
  neighborhood: string;
  lat: number;
  lng: number;
  capacity: number;
  hours: Hours;
  vehicles: Array<"CAR" | "MOTORCYCLE" | "VAN">;
  covered?: boolean;
  accessibleSpaces?: number;
  evChargers?: number;
  valet?: boolean;
  security24h?: boolean;
  maxHeightCm?: number;
  usefulInfo?: string;
  entrances: Array<{ name: string; kind: (typeof s.entranceKind.enumValues)[number]; address: string; dLat: number; dLng: number; primary?: boolean; notes?: string }>;
  source: { kind: "SIMULATION" | "MANUAL" | null; granularity: "SPACE" | "AGGREGATE"; demand?: number };
  floors?: Array<{ name: string; level: number; digit: number; withPlan: boolean }>;
};

const ORGS = {
  aurora: { name: "Aurora Shoppings", type: "SHOPPING" as const },
  brisa: { name: "Grupo Brisa Shoppings", type: "SHOPPING" as const },
  rio: { name: "Rio Malls", type: "SHOPPING" as const },
};

const FACILITIES: FacilitySpec[] = [
  {
    org: "aurora",
    name: "Aurora Shopping Anália Franco",
    kind: "SHOPPING",
    description: "Estacionamento coberto em três pisos com acesso direto ao shopping. Vagas identificadas por setor e planta digital de cada piso.",
    address: "Avenida Regente Feijó, 1739",
    neighborhood: "Anália Franco",
    lat: -23.5623,
    lng: -46.5594,
    capacity: 300,
    hours: SHOPPING,
    vehicles: ["CAR", "MOTORCYCLE"],
    accessibleSpaces: 8,
    evChargers: 4,
    valet: true,
    security24h: true,
    maxHeightCm: 210,
    usefulInfo: "Sinalização verde indica o setor com mais vagas livres. Elevadores no centro de cada piso.",
    entrances: [
      { name: "Portaria G — Av. Regente Feijó", kind: "VEHICLE_ENTRY", address: "Av. Regente Feijó, 1739", dLat: 0.0009, dLng: -0.0006, primary: true },
      { name: "Saída de veículos", kind: "VEHICLE_EXIT", address: "Avenida Regente Feijó, 1739", dLat: -0.0009, dLng: 0.0006 },
      { name: "Acesso de pedestres", kind: "PEDESTRIAN", address: "Avenida Regente Feijó, 1739", dLat: 0.0002, dLng: 0.0001 },
    ],
    source: { kind: "SIMULATION", granularity: "SPACE", demand: 1.0 },
    floors: [
      { name: "G1", level: -1, digit: 1, withPlan: true },
      { name: "G2", level: -2, digit: 2, withPlan: true },
      { name: "G3", level: -3, digit: 3, withPlan: true },
    ],
  },
  {
    org: "aurora",
    name: "Aurora Shopping Paulista",
    kind: "SHOPPING",
    description: "Shopping na Avenida Paulista com dois subsolos de estacionamento e acesso pela Alameda Santos.",
    address: "Avenida Paulista, 1500",
    neighborhood: "Bela Vista",
    lat: -23.5617,
    lng: -46.6566,
    capacity: 200,
    hours: SHOPPING,
    vehicles: ["CAR", "MOTORCYCLE"],
    accessibleSpaces: 8,
    evChargers: 4,
    valet: true,
    security24h: true,
    maxHeightCm: 210,
    usefulInfo: "Acesso de veículos somente pela Alameda Santos.",
    entrances: [
      { name: "Entrada Al. Santos", kind: "VEHICLE_ENTRY", address: "Al. Santos, 1500", dLat: 0.0006, dLng: 0.0003, primary: true },
      { name: "Saída de veículos", kind: "VEHICLE_EXIT", address: "Avenida Paulista, 1500", dLat: -0.0006, dLng: -0.0003 },
      { name: "Acesso de pedestres", kind: "PEDESTRIAN", address: "Avenida Paulista, 1500", dLat: 0.0002, dLng: 0.0001 },
    ],
    source: { kind: "SIMULATION", granularity: "SPACE", demand: 1.1 },
    floors: [
      { name: "S1", level: -1, digit: 1, withPlan: true },
      { name: "S2", level: -2, digit: 2, withPlan: true },
    ],
  },
  {
    org: "aurora",
    name: "Aurora Shopping Moema",
    kind: "SHOPPING",
    description: "Shopping de bairro a duas quadras do Parque Ibirapuera. Novo piso G2 em fase de digitalização.",
    address: "Avenida Ibirapuera, 3100",
    neighborhood: "Moema",
    lat: -23.6011,
    lng: -46.6649,
    capacity: 100,
    hours: SHOPPING,
    vehicles: ["CAR", "MOTORCYCLE"],
    accessibleSpaces: 8,
    evChargers: 4,
    valet: true,
    security24h: true,
    maxHeightCm: 210,
    usefulInfo: "O piso G2 ainda não tem planta digital publicada.",
    entrances: [
      { name: "Entrada Av. Ibirapuera", kind: "VEHICLE_ENTRY", address: "Av. Ibirapuera, 3100", dLat: 0.0004, dLng: 0.0004, primary: true },
      { name: "Saída de veículos", kind: "VEHICLE_EXIT", address: "Avenida Ibirapuera, 3100", dLat: -0.0004, dLng: -0.0004 },
      { name: "Acesso de pedestres", kind: "PEDESTRIAN", address: "Avenida Ibirapuera, 3100", dLat: 0.0002, dLng: 0.0001 },
    ],
    source: { kind: "SIMULATION", granularity: "SPACE", demand: 0.9 },
    floors: [
      { name: "G1", level: -1, digit: 1, withPlan: true },
      { name: "G2", level: -2, digit: 2, withPlan: false },
    ],
  },
  {
    org: "brisa",
    name: "Shopping Brisa Tatuapé",
    kind: "SHOPPING",
    description: "Estacionamento em três pisos ao lado da estação Tatuapé do metrô.",
    address: "Rua Tuiuti, 2100",
    neighborhood: "Tatuapé",
    lat: -23.5405,
    lng: -46.5754,
    capacity: 300,
    hours: SHOPPING,
    vehicles: ["CAR", "MOTORCYCLE"],
    accessibleSpaces: 8,
    evChargers: 4,
    valet: true,
    security24h: true,
    maxHeightCm: 210,
    usefulInfo: "Integração direta com a estação Tatuapé pelo piso P1.",
    entrances: [
      { name: "Entrada R. Tuiuti", kind: "VEHICLE_ENTRY", address: "R. Tuiuti, 2100", dLat: 0.0004, dLng: 0.0003, primary: true },
      { name: "Saída de veículos", kind: "VEHICLE_EXIT", address: "Rua Tuiuti, 2100", dLat: -0.0004, dLng: -0.0003 },
      { name: "Acesso de pedestres", kind: "PEDESTRIAN", address: "Rua Tuiuti, 2100", dLat: 0.0002, dLng: 0.0001 },
    ],
    source: { kind: "SIMULATION", granularity: "SPACE", demand: 1.05 },
    floors: [
      { name: "P1", level: -1, digit: 1, withPlan: true },
      { name: "P2", level: -2, digit: 2, withPlan: true },
      { name: "P3", level: -3, digit: 3, withPlan: true },
    ],
  },
  {
    org: "brisa",
    name: "Shopping Brisa Santana",
    kind: "SHOPPING",
    description: "Shopping da Zona Norte com estacionamento coberto em dois pisos.",
    address: "Avenida Cruzeiro do Sul, 2600",
    neighborhood: "Santana",
    lat: -23.5022,
    lng: -46.6252,
    capacity: 200,
    hours: SHOPPING,
    vehicles: ["CAR", "MOTORCYCLE"],
    accessibleSpaces: 8,
    evChargers: 4,
    valet: true,
    security24h: true,
    maxHeightCm: 210,
    usefulInfo: "",
    entrances: [
      { name: "Entrada Av. Cruzeiro do Sul", kind: "VEHICLE_ENTRY", address: "Av. Cruzeiro do Sul, 2600", dLat: 0.0004, dLng: -0.0003, primary: true },
      { name: "Saída de veículos", kind: "VEHICLE_EXIT", address: "Avenida Cruzeiro do Sul, 2600", dLat: -0.0004, dLng: 0.0003 },
      { name: "Acesso de pedestres", kind: "PEDESTRIAN", address: "Avenida Cruzeiro do Sul, 2600", dLat: 0.0002, dLng: 0.0001 },
    ],
    source: { kind: "SIMULATION", granularity: "SPACE", demand: 0.95 },
    floors: [
      { name: "G1", level: -1, digit: 1, withPlan: true },
      { name: "G2", level: -2, digit: 2, withPlan: true },
    ],
  },
  {
    org: "rio",
    name: "Shopping Rio Pinheiros",
    kind: "SHOPPING",
    description: "Shopping ao lado do Largo da Batata, com carregadores para veículos elétricos em todos os pisos.",
    address: "Rua Cardeal Arcoverde, 1450",
    neighborhood: "Pinheiros",
    lat: -23.5649,
    lng: -46.6895,
    capacity: 200,
    hours: SHOPPING,
    vehicles: ["CAR", "MOTORCYCLE"],
    accessibleSpaces: 8,
    evChargers: 10,
    valet: true,
    security24h: true,
    maxHeightCm: 210,
    usefulInfo: "Carregadores EV no setor D de cada piso.",
    entrances: [
      { name: "Entrada R. Cardeal Arcoverde", kind: "VEHICLE_ENTRY", address: "R. Cardeal Arcoverde, 1450", dLat: 0.0002, dLng: 0.0003, primary: true },
      { name: "Saída de veículos", kind: "VEHICLE_EXIT", address: "Rua Cardeal Arcoverde, 1450", dLat: -0.0002, dLng: -0.0003 },
      { name: "Acesso de pedestres", kind: "PEDESTRIAN", address: "Rua Cardeal Arcoverde, 1450", dLat: 0.0002, dLng: 0.0001 },
    ],
    source: { kind: "SIMULATION", granularity: "SPACE", demand: 1.15 },
    floors: [
      { name: "E1", level: -1, digit: 1, withPlan: true },
      { name: "E2", level: -2, digit: 2, withPlan: true },
    ],
  },
  {
    org: "rio",
    name: "Shopping Jardim Europa",
    kind: "SHOPPING",
    description: "Shopping de alto padrão próximo à Faria Lima, com manobristas.",
    address: "Avenida Brigadeiro Faria Lima, 3900",
    neighborhood: "Itaim Bibi",
    lat: -23.5869,
    lng: -46.6826,
    capacity: 200,
    hours: SHOPPING,
    vehicles: ["CAR", "MOTORCYCLE"],
    accessibleSpaces: 8,
    evChargers: 4,
    valet: true,
    security24h: true,
    maxHeightCm: 210,
    usefulInfo: "Manobrista disponível na entrada principal.",
    entrances: [
      { name: "Entrada R. Leopoldo Couto de Magalhães Jr.", kind: "VEHICLE_ENTRY", address: "R. Leopoldo Couto de Magalhães Júnior, 700", dLat: 0.0004, dLng: 0.0005, primary: true },
      { name: "Saída de veículos", kind: "VEHICLE_EXIT", address: "Avenida Brigadeiro Faria Lima, 3900", dLat: -0.0004, dLng: -0.0005 },
      { name: "Acesso de pedestres", kind: "PEDESTRIAN", address: "Avenida Brigadeiro Faria Lima, 3900", dLat: 0.0002, dLng: 0.0001 },
    ],
    source: { kind: "SIMULATION", granularity: "SPACE", demand: 1.0 },
    floors: [
      { name: "G1", level: -1, digit: 1, withPlan: true },
      { name: "G2", level: -2, digit: 2, withPlan: true },
    ],
  },
  {
    org: "rio",
    name: "Shopping Lapa Central",
    kind: "SHOPPING",
    description: "Shopping da Zona Oeste próximo à estação Lapa. Ainda sem ocupação em tempo real.",
    address: "Rua Clélia, 1200",
    neighborhood: "Lapa",
    lat: -23.5225,
    lng: -46.7035,
    capacity: 100,
    hours: SHOPPING,
    vehicles: ["CAR", "MOTORCYCLE"],
    accessibleSpaces: 8,
    evChargers: 4,
    valet: true,
    security24h: true,
    maxHeightCm: 210,
    usefulInfo: "A ocupação em tempo real ainda não foi conectada.",
    entrances: [
      { name: "Entrada R. Clélia", kind: "VEHICLE_ENTRY", address: "R. Clélia, 1200", dLat: 0.0003, dLng: 0.0002, primary: true },
      { name: "Saída de veículos", kind: "VEHICLE_EXIT", address: "Rua Clélia, 1200", dLat: -0.0003, dLng: -0.0002 },
      { name: "Acesso de pedestres", kind: "PEDESTRIAN", address: "Rua Clélia, 1200", dLat: 0.0002, dLng: 0.0001 },
    ],
    source: { kind: null, granularity: "SPACE" },
    floors: [
      { name: "G1", level: -1, digit: 1, withPlan: true },
    ],
  }
];

async function main() {
  const db = createDatabase();
  await runMigrations(db);
  if (IF_EMPTY) {
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.users);
    if (n > 0) {
      console.log("• Banco já possui dados — seed ignorado.");
      if (DEMO_PASSWORD) {
        // Unlock / rotate the demo accounts (all fictional, under the .demo TLD).
        const hash = await hashPassword(DEMO_PASSWORD);
        await db.update(s.users).set({ passwordHash: hash, updatedAt: new Date() }).where(sql`${s.users.email} like '%.demo'`);
        console.log("• Senha das contas de demonstração sincronizada com DEMO_PASSWORD.");
      }
      process.exit(0);
    }
  } else {
    console.log("• Limpando dados anteriores…");
    const res = await db.execute<{ tablename: string }>(sql`select tablename from pg_tables where schemaname = 'public'`);
    const names = ((res as unknown as { rows: Array<{ tablename: string }> }).rows ?? (res as unknown as Array<{ tablename: string }>)).map((t) => `"${t.tablename}"`);
    if (names.length) await db.execute(sql.raw(`TRUNCATE ${names.join(", ")} RESTART IDENTITY CASCADE`));
  }
  const files = createStorage(db);
  if (storageDriverName() === "local" && !IF_EMPTY) {
    const { localUploadsDir } = await import("../src/modules/storage/drivers");
    fs.rmSync(localUploadsDir(), { recursive: true, force: true });
  }

  const now = new Date();
  // Locked accounts get a random password nobody knows until DEMO_PASSWORD is configured.
  const passwordHash = await hashPassword(DEMO_PASSWORD ?? randomToken(32));

  // ── Users ──
  console.log("• Usuários e empresas");
  type U = { id: string; email: string; role: (typeof s.userRole.enumValues)[number]; name: string; org?: keyof typeof ORGS };
  const users: U[] = [
    { id: randomUUID(), email: "motorista@vagou.demo", role: "DRIVER", name: "Marina Duarte" },
    { id: randomUUID(), email: "empresa@vagou.demo", role: "COMPANY_ADMIN", name: "Patrícia Lacerda", org: "aurora" },
    { id: randomUUID(), email: "admin@vagou.demo", role: "PLATFORM_ADMIN", name: "Equipe Vagou" },
    { id: randomUUID(), email: "operacao@brisa.demo", role: "COMPANY_ADMIN", name: "Larissa Prado", org: "brisa" },
    { id: randomUUID(), email: "operacao@riomalls.demo", role: "COMPANY_ADMIN", name: "Caio Sampaio", org: "rio" },
  ];
  const FIRST = ["Ana", "Bruno", "Carla", "Diego", "Elisa", "Fábio", "Gabriela", "Heitor", "Isabela", "João", "Karina", "Lucas", "Mariana", "Nicolas", "Olívia", "Pedro", "Sofia", "Tiago", "Yasmin", "Lorena"];
  const LAST = ["Andrade", "Barbosa", "Cardoso", "Esteves", "Fontes", "Guimarães", "Junqueira", "Nogueira", "Oliveira", "Valente"];
  for (let i = 0; i < 26; i++) users.push({ id: randomUUID(), email: `motorista${i + 2}@vagou.demo`, role: "DRIVER", name: `${FIRST[i % FIRST.length]} ${LAST[(i * 3) % LAST.length]}` });
  await insertChunks(db, s.users, users.map((u, i) => ({ id: u.id, email: u.email, passwordHash, role: u.role, createdAt: addMinutes(now, -(120 - i * 3) * 1440) })));
  await insertChunks(db, s.profiles, users.map((u) => ({ userId: u.id, fullName: u.name, city: "São Paulo" })));

  const orgIds = new Map<string, string>();
  for (const [key, o] of Object.entries(ORGS)) {
    const id = randomUUID();
    orgIds.set(key, id);
    await db.insert(s.organizations).values({ id, name: o.name, slug: slug(o.name), type: o.type, createdAt: addMinutes(now, -150 * 1440) });
  }
  await db.insert(s.organizationMembers).values(users.filter((u) => u.org).map((u) => ({ organizationId: orgIds.get(u.org!)!, userId: u.id, role: "OWNER" as const })));

  // ── Facilities ──
  console.log("• Shoppings, horários e entradas");
  const { spaces: layoutSpaces, elements: layoutElements } = standardLayout();
  const meta: Array<{ id: string; kind: Kind; capacity: number; source: FacilitySpec["source"]; spaceIds: string[]; floorSpaces: Map<string, string[]> }> = [];

  for (const [fi, f] of FACILITIES.entries()) {
    const facilityId = randomUUID();
    const orgId = orgIds.get(f.org)!;
    await db.insert(s.facilities).values({
      id: facilityId,
      organizationId: orgId,
      slug: slug(f.name),
      name: f.name,
      kind: f.kind,
      description: f.description,
      addressLine: f.address,
      neighborhood: f.neighborhood,
      lat: f.lat,
      lng: f.lng,
      declaredCapacity: f.capacity,
      covered: f.covered ?? true,
      accessible: (f.accessibleSpaces ?? 0) > 0,
      accessibleSpaces: f.accessibleSpaces ?? 0,
      evChargers: f.evChargers ?? 0,
      valet: f.valet ?? false,
      security24h: f.security24h ?? false,
      maxHeightCm: f.maxHeightCm ?? null,
      usefulInfo: f.usefulInfo ?? "",
      isPublished: true,
      createdAt: addMinutes(now, -(130 - fi) * 1440),
    });
    await db.insert(s.facilityVehicleTypes).values(f.vehicles.map((vehicleType) => ({ facilityId, vehicleType })));
    await db.insert(s.operatingHours).values(f.hours.flatMap((h) => h.days.map((weekday) => ({ facilityId, weekday, opensMinute: toMin(h.open), closesMinute: toMin(h.close) }))));
    await db.insert(s.facilityEntrances).values(f.entrances.map((e) => ({ facilityId, name: e.name, kind: e.kind, addressLine: e.address, lat: f.lat + e.dLat, lng: f.lng + e.dLng, isPrimary: e.primary ?? false, notes: e.notes ?? null })));

    const m = { id: facilityId, kind: f.kind, capacity: f.capacity, source: f.source, spaceIds: [] as string[], floorSpaces: new Map<string, string[]>() };
    for (const fl of f.floors ?? []) {
      const floorId = randomUUID();
      await db.insert(s.floors).values({ id: floorId, facilityId, name: fl.name, level: fl.level });
      if (!fl.withPlan) continue;
      const sectorIds = new Map<string, string>();
      for (const sec of STANDARD_SECTORS) {
        const id = randomUUID();
        sectorIds.set(sec.name, id);
        await db.insert(s.sectors).values({ id, floorId, name: sec.name, color: sec.color });
      }
      const planId = randomUUID();
      const key = `floorplans/${orgId}/${planId}.png`;
      const png = renderSamplePlan(1600, 1000, fl.digit % 2);
      await files.put(key, png, "image/png");
      const owner = users.find((u) => u.org === f.org)!;
      await db.insert(s.floorPlans).values({
        id: planId,
        floorId,
        originalKey: key,
        originalName: `planta-${slug(f.name)}-${slug(fl.name)}.png`,
        originalMime: "image/png",
        originalSize: png.length,
        previewKey: key,
        widthPx: 1600,
        heightPx: 1000,
        status: "PUBLISHED",
        analyzer: "mock-v1",
        confidence: 0.87,
        uploadedBy: owner.id,
        analyzedAt: addMinutes(now, -90 * 1440),
        publishedAt: addMinutes(now, -89 * 1440),
        createdAt: addMinutes(now, -90 * 1440),
      });
      await db.insert(s.floorPlanElements).values(layoutElements.map((e) => ({ floorPlanId: planId, kind: e.kind, label: e.label, x: e.x, y: e.y, w: e.w, h: e.h, confidence: 0.9 })));
      const ids: string[] = [];
      const rows = layoutSpaces.map((ls, idx) => {
        const id = randomUUID();
        ids.push(id);
        return {
          id,
          facilityId,
          floorId,
          sectorId: sectorIds.get(ls.sector)!,
          code: spaceCode(ls.sector, ls.index, fl.digit),
          type: ls.type,
          x: ls.x,
          y: ls.y,
          w: ls.w,
          h: ls.h,
          opStatus: (idx % 41 === 7 ? "UNAVAILABLE" : ls.type === "VIP" ? "RESERVED" : "AVAILABLE") as "UNAVAILABLE" | "RESERVED" | "AVAILABLE",
          opStatusSource: "SIMULATION" as const,
          externalRef: `${slug(fl.name)}-${ls.sector}${ls.index}`,
        };
      });
      await insertChunks(db, s.parkingSpaces, rows);
      m.spaceIds.push(...ids);
      m.floorSpaces.set(floorId, ids);
    }
    if (f.source.kind) {
      await db.insert(s.dataSources).values({
        facilityId,
        kind: f.source.kind,
        granularity: f.source.granularity,
        name: f.source.kind === "SIMULATION" ? "Simulação de demonstração" : "Contagem manual da equipe",
        status: "ACTIVE",
        lastSyncAt: f.source.kind === "MANUAL" ? addMinutes(now, -25) : now,
        config: f.source.demand ? { demand: f.source.demand } : null,
      });
    }
    meta.push(m);
  }

  // ── Current statuses + 30 days of hourly snapshots (SIMULATED) ──
  console.log("• Ocupação simulada (estado atual + 30 dias de histórico)");
  const snapshots: Record<string, unknown>[] = [];
  for (const m of meta) {
    if (!m.source.kind) continue;
    const demand = m.source.demand ?? 1;
    const capacity = m.spaceIds.length || m.capacity;
    for (let h = 30 * 24; h >= 0; h--) {
      const at = addMinutes(now, -h * 60);
      const target = targetOccupancy(m.kind, at, demand);
      const c = simulateAggregate(capacity, target, rnd);
      snapshots.push({ facilityId: m.id, capturedAt: at, source: m.source.kind, ...c });
    }
    if (m.spaceIds.length) {
      // current per-space state following the model (VIP stays operator-reserved, maintenance stays unavailable)
      const target = targetOccupancy(m.kind, now, demand);
      const occupiedIds: string[] = [];
      for (const [, ids] of m.floorSpaces) {
        const floorBias = m.floorSpaces.size > 1 ? (ids === [...m.floorSpaces.values()][m.floorSpaces.size - 1] ? 0.12 : -0.06) : 0;
        for (const id of ids) if (rnd() < Math.min(0.98, target + floorBias)) occupiedIds.push(id);
      }
      for (let i = 0; i < occupiedIds.length; i += 300) {
        await db.execute(
          sql`update parking_spaces set op_status = 'OCCUPIED' where op_status = 'AVAILABLE' and id in (${sql.join(occupiedIds.slice(i, i + 300).map((x) => sql`${x}::uuid`), sql`, `)})`,
        );
      }
    }
  }
  await insertChunks(db, s.occupancySnapshots, snapshots, 500);
  // live snapshot for space-level facilities must match the actual spaces
  await db.execute(sql`
    insert into occupancy_snapshots (facility_id, captured_at, source, total, available, occupied, reserved, unavailable)
    select facility_id, now(), 'SIMULATION', count(*)::int,
      count(*) filter (where op_status = 'AVAILABLE')::int, count(*) filter (where op_status = 'OCCUPIED')::int,
      count(*) filter (where op_status = 'RESERVED')::int, count(*) filter (where op_status = 'UNAVAILABLE')::int
    from parking_spaces where archived_at is null group by facility_id`);

  const driver = users[0];
  const slugs = FACILITIES.map((f) => slug(f.name));
  const favIds = await db.execute<{ id: string }>(sql`select id from facilities where slug in (${slugs[0]}, ${slugs[2]}, ${slugs[5]})`);
  const favRows = ((favIds as unknown as { rows: Array<{ id: string }> }).rows ?? []).map((r) => ({ userId: driver.id, facilityId: r.id }));
  if (favRows.length) await db.insert(s.favorites).values(favRows);
  await db.insert(s.notifications).values([
    { userId: users[1].id, type: "PLAN_PENDING", title: "Piso G2 do Aurora Moema sem planta", body: "Importe a planta do piso G2 para digitalizar as vagas.", link: "/company/estacionamentos" },
  ]);

  console.log(`\n✔ Seed concluído: ${FACILITIES.length} shoppings, ${meta.reduce((a, m) => a + m.spaceIds.length, 0)} vagas mapeadas.`);
  console.log(
    !PRODUCTION
      ? `  Contas demo (senha: ${DEMO_PASSWORD})`
      : DEMO_PASSWORD
        ? "  Contas demo criadas com a senha definida em DEMO_PASSWORD."
        : "  Contas demo criadas BLOQUEADAS. Defina DEMO_PASSWORD e faça um novo deploy para liberá-las.",
  );
  for (const u of users.slice(0, 3)) console.log(`  ${u.role.padEnd(15)} ${u.email}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("✖ Falha no seed", err);
  process.exit(1);
});
