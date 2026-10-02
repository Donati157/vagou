/**
 * Demo seed — fictional facilities in São Paulo. No real personal data.
 * Usage: npm run db:seed   (stop `npm run dev` first when using the embedded database)
 */
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { loadEnv } from "./env";
import { runMigrations } from "./migrate";
import { renderSamplePlan } from "./lib/plan-image";
import { createDatabase, type Database } from "../src/server/db/create";
import * as s from "../src/server/db/schema";
import { hashPassword } from "../src/modules/auth/password";
import { standardLayout, STANDARD_SECTORS, spaceCode } from "../src/modules/floorplans/layout";
import { seededRng, simulateAggregate, targetOccupancy } from "../src/modules/occupancy/simulation";
import { addMinutes } from "../src/lib/time";

loadEnv();

if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "true") {
  console.error("✖ Seed de demonstração bloqueado em produção (defina ALLOW_DEMO_SEED=true para forçar).");
  process.exit(1);
}

export const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "Vagou@2026";
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
const ALWAYS: Hours = [{ days: [0, 1, 2, 3, 4, 5, 6], open: "00:00", close: "24:00" }];
const SHOPPING: Hours = [
  { days: [1, 2, 3, 4, 5, 6], open: "09:00", close: "23:00" },
  { days: [0], open: "11:00", close: "21:00" },
];
const BUSINESS: Hours = [
  { days: [1, 2, 3, 4, 5], open: "06:00", close: "22:00" },
  { days: [6], open: "07:00", close: "14:00" },
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
  rates: Array<{ label: string; vehicle?: "CAR" | "MOTORCYCLE"; first: number; firstMin?: number; extra?: number; daily?: number; notes?: string }>;
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
  estapark: { name: "EstaPark Estacionamentos", type: "PARKING_OPERATOR" as const },
  parkway: { name: "Parkway Garagens", type: "PARKING_OPERATOR" as const },
  santaclara: { name: "Hospital Santa Clara", type: "HOSPITAL" as const },
  arena: { name: "Arena Perdizes", type: "OTHER" as const },
  berrini: { name: "Berrini Office Park", type: "CORPORATE" as const },
  mobi: { name: "Mobi Terminais", type: "PARKING_OPERATOR" as const },
};

const FACILITIES: FacilitySpec[] = [
  {
    org: "aurora",
    name: "Aurora Shopping Anália Franco",
    kind: "SHOPPING",
    description: "Estacionamento coberto em três pisos com acesso direto ao shopping. Vagas identificadas por setor e mapa digital de cada piso.",
    address: "Avenida Regente Feijó, 1739",
    neighborhood: "Anália Franco",
    lat: -23.5623,
    lng: -46.5594,
    capacity: 300,
    hours: SHOPPING,
    rates: [
      { label: "Carro — até 1 hora", first: 1200, extra: 400, daily: 6000, notes: "Tolerância de 15 minutos." },
      { label: "Moto", vehicle: "MOTORCYCLE", first: 600, extra: 200, daily: 2500 },
    ],
    vehicles: ["CAR", "MOTORCYCLE"],
    accessibleSpaces: 9,
    evChargers: 4,
    valet: true,
    security24h: true,
    maxHeightCm: 210,
    usefulInfo: "Sinalização verde indica o setor com mais vagas livres. Elevadores no centro de cada piso.",
    entrances: [
      { name: "Portaria G — Av. Regente Feijó", kind: "VEHICLE_ENTRY", address: "Av. Regente Feijó, 1739", dLat: 0.0009, dLng: -0.0006, primary: true },
      { name: "Saída Rua Emília Marengo", kind: "VEHICLE_EXIT", address: "R. Emília Marengo, 300", dLat: -0.0008, dLng: 0.0007 },
      { name: "Acesso de pedestres — Praça Central", kind: "PEDESTRIAN", address: "Av. Regente Feijó, 1739", dLat: 0.0002, dLng: 0.0001 },
    ],
    source: { kind: "SIMULATION", granularity: "SPACE", demand: 1 },
    floors: [
      { name: "G1", level: -1, digit: 1, withPlan: true },
      { name: "G2", level: -2, digit: 2, withPlan: true },
      { name: "G3", level: -3, digit: 3, withPlan: true },
    ],
  },
  {
    org: "aurora",
    name: "Torre Aurora Faria Lima",
    kind: "COMMERCIAL_BUILDING",
    description: "Garagem do edifício corporativo com vagas rotativas abertas ao público em horário comercial.",
    address: "Avenida Brigadeiro Faria Lima, 3900",
    neighborhood: "Itaim Bibi",
    lat: -23.5869,
    lng: -46.6826,
    capacity: 180,
    hours: BUSINESS,
    rates: [{ label: "Carro — primeira hora", first: 1800, extra: 800, daily: 7500 }],
    vehicles: ["CAR"],
    accessibleSpaces: 4,
    evChargers: 6,
    security24h: true,
    maxHeightCm: 200,
    entrances: [{ name: "Entrada pela R. Leopoldo Couto de Magalhães Jr.", kind: "VEHICLE_BOTH", address: "R. Leopoldo Couto de Magalhães Júnior, 700", dLat: 0.0004, dLng: 0.0005, primary: true }],
    source: { kind: "SIMULATION", granularity: "AGGREGATE", demand: 0.95 },
    floors: [{ name: "Subsolo 1", level: -1, digit: 4, withPlan: false }],
  },
  {
    org: "estapark",
    name: "EstaPark República",
    kind: "PARKING_LOT",
    description: "Estacionamento 24 horas a dois minutos do metrô República, com manobristas.",
    address: "Rua Sete de Abril, 200",
    neighborhood: "República",
    lat: -23.5448,
    lng: -46.6413,
    capacity: 100,
    hours: ALWAYS,
    rates: [
      { label: "Carro — primeira hora", first: 1000, extra: 500, daily: 4500 },
      { label: "Moto", vehicle: "MOTORCYCLE", first: 500, extra: 300, daily: 2000 },
    ],
    vehicles: ["CAR", "MOTORCYCLE", "VAN"],
    accessibleSpaces: 3,
    valet: true,
    security24h: true,
    entrances: [{ name: "Entrada R. Sete de Abril", kind: "VEHICLE_BOTH", address: "R. Sete de Abril, 200", dLat: 0.0002, dLng: -0.0003, primary: true }],
    source: { kind: "SIMULATION", granularity: "SPACE", demand: 0.9 },
    floors: [{ name: "Térreo", level: 0, digit: 0, withPlan: true }],
  },
  {
    org: "estapark",
    name: "EstaPark Sé",
    kind: "PARKING_LOT",
    description: "Pátio descoberto ao lado da Praça da Sé. Ocupação atualizada manualmente pela equipe.",
    address: "Rua Roberto Simonsen, 80",
    neighborhood: "Sé",
    lat: -23.5491,
    lng: -46.6318,
    capacity: 60,
    hours: [{ days: [1, 2, 3, 4, 5, 6], open: "06:00", close: "22:00" }],
    rates: [{ label: "Carro — primeira hora", first: 900, extra: 500, daily: 3500 }],
    vehicles: ["CAR", "MOTORCYCLE"],
    covered: false,
    entrances: [{ name: "Portão principal", kind: "VEHICLE_BOTH", address: "R. Roberto Simonsen, 80", dLat: 0.0002, dLng: 0.0002, primary: true }],
    source: { kind: "MANUAL", granularity: "AGGREGATE" },
  },
  {
    org: "estapark",
    name: "EstaPark Liberdade",
    kind: "PARKING_LOT",
    description: "Garagem coberta a 300 m da estação Liberdade. Ideal para a feira de domingo.",
    address: "Rua Galvão Bueno, 520",
    neighborhood: "Liberdade",
    lat: -23.5597,
    lng: -46.6349,
    capacity: 70,
    hours: ALWAYS,
    rates: [{ label: "Carro — primeira hora", first: 800, extra: 400, daily: 3800 }],
    vehicles: ["CAR"],
    accessibleSpaces: 2,
    maxHeightCm: 200,
    entrances: [{ name: "Entrada R. Galvão Bueno", kind: "VEHICLE_BOTH", address: "R. Galvão Bueno, 520", dLat: 0.0002, dLng: 0.0002, primary: true }],
    source: { kind: "SIMULATION", granularity: "AGGREGATE", demand: 1.05 },
  },
  {
    org: "parkway",
    name: "Parkway Largo da Batata",
    kind: "PARKING_LOT",
    description: "Edifício-garagem ao lado do metrô Faria Lima, com seis carregadores para veículos elétricos.",
    address: "Rua Cardeal Arcoverde, 1450",
    neighborhood: "Pinheiros",
    lat: -23.5649,
    lng: -46.6895,
    capacity: 140,
    hours: [{ days: [0, 1, 2, 3, 4, 5, 6], open: "06:00", close: "24:00" }],
    rates: [{ label: "Carro — primeira hora", first: 1400, extra: 600, daily: 6500 }],
    vehicles: ["CAR", "MOTORCYCLE"],
    accessibleSpaces: 4,
    evChargers: 6,
    security24h: true,
    entrances: [{ name: "Entrada R. Cardeal Arcoverde", kind: "VEHICLE_BOTH", address: "R. Cardeal Arcoverde, 1450", dLat: 0.0002, dLng: 0.0003, primary: true }],
    source: { kind: "SIMULATION", granularity: "AGGREGATE", demand: 1 },
  },
  {
    org: "parkway",
    name: "Parkway Vila Madalena",
    kind: "PARKING_LOT",
    description: "Pátio próximo aos bares e restaurantes da Vila. Lota rápido nas noites de fim de semana.",
    address: "Rua Aspicuelta, 410",
    neighborhood: "Vila Madalena",
    lat: -23.5559,
    lng: -46.6906,
    capacity: 60,
    hours: [{ days: [0, 1, 2, 3, 4, 5, 6], open: "10:00", close: "24:00" }],
    rates: [{ label: "Carro — período de 3 horas", first: 3000, firstMin: 180, extra: 800, daily: 6000 }],
    vehicles: ["CAR"],
    covered: false,
    entrances: [{ name: "Portão R. Aspicuelta", kind: "VEHICLE_BOTH", address: "R. Aspicuelta, 410", dLat: 0.0002, dLng: 0.0002, primary: true }],
    source: { kind: "SIMULATION", granularity: "AGGREGATE", demand: 1.5 },
  },
  {
    org: "parkway",
    name: "Parkway Itaim Joaquim Floriano",
    kind: "PARKING_LOT",
    description: "Garagem coberta entre a Faria Lima e a Juscelino. Aceita veículos utilitários.",
    address: "Rua Joaquim Floriano, 300",
    neighborhood: "Itaim Bibi",
    lat: -23.5838,
    lng: -46.6772,
    capacity: 120,
    hours: BUSINESS,
    rates: [{ label: "Carro — primeira hora", first: 1600, extra: 700, daily: 7000 }],
    vehicles: ["CAR", "VAN"],
    accessibleSpaces: 3,
    evChargers: 2,
    entrances: [{ name: "Entrada R. Joaquim Floriano", kind: "VEHICLE_BOTH", address: "R. Joaquim Floriano, 300", dLat: 0.0002, dLng: 0.0002, primary: true }],
    source: { kind: "SIMULATION", granularity: "AGGREGATE", demand: 1 },
  },
  {
    org: "parkway",
    name: "Parkway Oscar Freire",
    kind: "PARKING_LOT",
    description: "Garagem com manobrista a uma quadra da Oscar Freire.",
    address: "Rua Haddock Lobo, 1300",
    neighborhood: "Jardins",
    lat: -23.5638,
    lng: -46.6694,
    capacity: 80,
    hours: SHOPPING,
    rates: [{ label: "Carro — primeira hora", first: 2000, extra: 1000, daily: 8000, notes: "Somente com manobrista." }],
    vehicles: ["CAR"],
    valet: true,
    entrances: [{ name: "Recepção do manobrista", kind: "VEHICLE_BOTH", address: "R. Haddock Lobo, 1300", dLat: 0.0002, dLng: 0.0002, primary: true }],
    source: { kind: "SIMULATION", granularity: "AGGREGATE", demand: 1.1 },
  },
  {
    org: "parkway",
    name: "Parkway Moema",
    kind: "PARKING_LOT",
    description: "Pátio a duas quadras do Parque Ibirapuera.",
    address: "Alameda dos Arapanés, 610",
    neighborhood: "Moema",
    lat: -23.6018,
    lng: -46.6657,
    capacity: 90,
    hours: [{ days: [0, 1, 2, 3, 4, 5, 6], open: "06:00", close: "22:00" }],
    rates: [{ label: "Carro — primeira hora", first: 1000, extra: 500, daily: 4000 }],
    vehicles: ["CAR", "MOTORCYCLE"],
    covered: false,
    accessibleSpaces: 2,
    entrances: [{ name: "Entrada Al. dos Arapanés", kind: "VEHICLE_BOTH", address: "Al. dos Arapanés, 610", dLat: 0.0002, dLng: 0.0002, primary: true }],
    source: { kind: "SIMULATION", granularity: "AGGREGATE", demand: 0.9 },
  },
  {
    org: "santaclara",
    name: "Hospital Santa Clara — Estacionamento",
    kind: "HOSPITAL",
    description: "Estacionamento de pacientes e visitantes. Vagas preferenciais próximas aos elevadores.",
    address: "Rua Tutóia, 1200",
    neighborhood: "Paraíso",
    lat: -23.5772,
    lng: -46.6476,
    capacity: 300,
    hours: ALWAYS,
    rates: [{ label: "Carro — primeira hora", first: 1500, extra: 500, daily: 5500, notes: "Desconto para acompanhantes de internação." }],
    vehicles: ["CAR", "MOTORCYCLE"],
    accessibleSpaces: 15,
    evChargers: 2,
    security24h: true,
    entrances: [{ name: "Entrada de visitantes — R. Tutóia", kind: "VEHICLE_BOTH", address: "R. Tutóia, 1200", dLat: 0.0003, dLng: 0.0002, primary: true }],
    source: { kind: "SIMULATION", granularity: "AGGREGATE", demand: 0.85 },
  },
  {
    org: "arena",
    name: "Arena Perdizes — Estacionamento Oficial",
    kind: "EVENT_VENUE",
    description: "Estacionamento oficial da arena. Em dias de evento, a tarifa é fixa por evento.",
    address: "Rua Palestra Itália, 200",
    neighborhood: "Perdizes",
    lat: -23.5276,
    lng: -46.6788,
    capacity: 400,
    hours: [{ days: [0, 1, 2, 3, 4, 5, 6], open: "07:00", close: "24:00" }],
    rates: [
      { label: "Dia comum — primeira hora", first: 1200, extra: 500, daily: 5000 },
      { label: "Dia de evento — valor fixo", first: 6000, firstMin: 1440, notes: "Pagamento na entrada." },
    ],
    vehicles: ["CAR", "MOTORCYCLE", "VAN"],
    covered: false,
    accessibleSpaces: 12,
    security24h: true,
    entrances: [
      { name: "Portão A — R. Palestra Itália", kind: "VEHICLE_ENTRY", address: "R. Palestra Itália, 200", dLat: 0.0006, dLng: -0.0004, primary: true },
      { name: "Portão C — Av. Francisco Matarazzo", kind: "VEHICLE_BOTH", address: "Av. Francisco Matarazzo, 1700", dLat: -0.0006, dLng: 0.0005 },
    ],
    source: { kind: "SIMULATION", granularity: "AGGREGATE", demand: 0.7 },
  },
  {
    org: "berrini",
    name: "Berrini Office Park",
    kind: "COMMERCIAL_BUILDING",
    description: "Garagem do complexo corporativo, aberta ao público em horário comercial.",
    address: "Avenida Engenheiro Luís Carlos Berrini, 1500",
    neighborhood: "Brooklin",
    lat: -23.6066,
    lng: -46.6955,
    capacity: 350,
    hours: BUSINESS,
    rates: [{ label: "Carro — primeira hora", first: 1500, extra: 600, daily: 6500 }],
    vehicles: ["CAR", "MOTORCYCLE"],
    accessibleSpaces: 8,
    evChargers: 10,
    security24h: true,
    entrances: [{ name: "Entrada Av. Berrini", kind: "VEHICLE_BOTH", address: "Av. Eng. Luís Carlos Berrini, 1500", dLat: 0.0003, dLng: 0.0002, primary: true }],
    source: { kind: "SIMULATION", granularity: "AGGREGATE", demand: 1 },
  },
  {
    org: "mobi",
    name: "Terminal Barra Funda — Estacionamento",
    kind: "TRANSIT_HUB",
    description: "Estacionamento integrado ao terminal intermodal (metrô, trem e ônibus).",
    address: "Rua Mário de Andrade, 664",
    neighborhood: "Barra Funda",
    lat: -23.5257,
    lng: -46.6671,
    capacity: 250,
    hours: [{ days: [0, 1, 2, 3, 4, 5, 6], open: "04:30", close: "24:00" }],
    rates: [{ label: "Carro — diária", first: 2800, firstMin: 1440, notes: "Valor único por dia." }],
    vehicles: ["CAR", "MOTORCYCLE"],
    covered: false,
    accessibleSpaces: 6,
    entrances: [{ name: "Entrada R. Mário de Andrade", kind: "VEHICLE_BOTH", address: "R. Mário de Andrade, 664", dLat: 0.0003, dLng: 0.0002, primary: true }],
    source: { kind: "SIMULATION", granularity: "AGGREGATE", demand: 0.95 },
  },
  {
    org: "mobi",
    name: "Garagem Consolação",
    kind: "PARKING_LOT",
    description: "Garagem coberta entre a Paulista e a Augusta. Ainda sem fonte de ocupação conectada.",
    address: "Rua Frei Caneca, 700",
    neighborhood: "Consolação",
    lat: -23.5537,
    lng: -46.6553,
    capacity: 110,
    hours: ALWAYS,
    rates: [{ label: "Carro — primeira hora", first: 1300, extra: 600, daily: 6000 }],
    vehicles: ["CAR"],
    accessibleSpaces: 2,
    entrances: [{ name: "Entrada R. Frei Caneca", kind: "VEHICLE_BOTH", address: "R. Frei Caneca, 700", dLat: 0.0002, dLng: 0.0002, primary: true }],
    source: { kind: null, granularity: "AGGREGATE" },
  },
  {
    org: "mobi",
    name: "Paulista 1500 — Garagem",
    kind: "COMMERCIAL_BUILDING",
    description: "Garagem de edifício comercial na Avenida Paulista, perto do MASP.",
    address: "Avenida Paulista, 1500",
    neighborhood: "Bela Vista",
    lat: -23.5617,
    lng: -46.6566,
    capacity: 220,
    hours: [{ days: [0, 1, 2, 3, 4, 5, 6], open: "06:00", close: "24:00" }],
    rates: [{ label: "Carro — primeira hora", first: 1700, extra: 700, daily: 7000 }],
    vehicles: ["CAR", "MOTORCYCLE"],
    accessibleSpaces: 5,
    evChargers: 3,
    security24h: true,
    entrances: [{ name: "Entrada Al. Santos", kind: "VEHICLE_BOTH", address: "Al. Santos, 1500", dLat: 0.0006, dLng: 0.0003, primary: true }],
    source: { kind: "SIMULATION", granularity: "AGGREGATE", demand: 1.05 },
  },
];

async function main() {
  const db = createDatabase();
  await runMigrations(db);
  console.log("• Limpando dados anteriores…");
  const res = await db.execute<{ tablename: string }>(sql`select tablename from pg_tables where schemaname = 'public'`);
  const names = ((res as unknown as { rows: Array<{ tablename: string }> }).rows ?? (res as unknown as Array<{ tablename: string }>)).map((t) => `"${t.tablename}"`);
  if (names.length) await db.execute(sql.raw(`TRUNCATE ${names.join(", ")} RESTART IDENTITY CASCADE`));

  const uploadsDir = process.env.UPLOADS_DIR ?? path.join(process.cwd(), ".data", "uploads");
  fs.rmSync(uploadsDir, { recursive: true, force: true });
  fs.mkdirSync(uploadsDir, { recursive: true });

  const now = new Date();
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  // ── Users ──
  console.log("• Usuários e empresas");
  type U = { id: string; email: string; role: (typeof s.userRole.enumValues)[number]; name: string; org?: keyof typeof ORGS };
  const users: U[] = [
    { id: randomUUID(), email: "motorista@vagou.demo", role: "DRIVER", name: "Marina Duarte" },
    { id: randomUUID(), email: "empresa@vagou.demo", role: "COMPANY_ADMIN", name: "Patrícia Lacerda", org: "aurora" },
    { id: randomUUID(), email: "admin@vagou.demo", role: "PLATFORM_ADMIN", name: "Equipe Vagou" },
    { id: randomUUID(), email: "operador@estapark.demo", role: "COMPANY_ADMIN", name: "Larissa Prado", org: "estapark" },
    { id: randomUUID(), email: "operacao@parkway.demo", role: "COMPANY_ADMIN", name: "Caio Sampaio", org: "parkway" },
    { id: randomUUID(), email: "facilities@santaclara.demo", role: "COMPANY_ADMIN", name: "Helena Tavares", org: "santaclara" },
    { id: randomUUID(), email: "operacao@arena.demo", role: "COMPANY_ADMIN", name: "Otávio Rezende", org: "arena" },
    { id: randomUUID(), email: "predial@berrini.demo", role: "COMPANY_ADMIN", name: "Lívia Queiroz", org: "berrini" },
    { id: randomUUID(), email: "operacao@mobi.demo", role: "COMPANY_ADMIN", name: "Renato Macedo", org: "mobi" },
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
  console.log("• Estacionamentos, tarifas, horários e entradas");
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
    await db.insert(s.parkingRates).values(
      f.rates.map((r, i) => ({ facilityId, label: r.label, vehicleType: r.vehicle ?? "CAR", firstPeriodMinutes: r.firstMin ?? 60, firstPeriodCents: r.first, additionalHourCents: r.extra ?? null, dailyMaxCents: r.daily ?? null, notes: r.notes ?? null, sortOrder: i })),
    );
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
      fs.mkdirSync(path.join(uploadsDir, path.dirname(key)), { recursive: true });
      fs.writeFileSync(path.join(uploadsDir, key), png);
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
    { userId: users[1].id, type: "PLAN_PENDING", title: "Torre Aurora sem mapa digital", body: "Importe a planta do Subsolo 1 para digitalizar o estacionamento.", link: "/company/estacionamentos" },
  ]);

  console.log(`\n✔ Seed concluído: ${FACILITIES.length} estacionamentos, ${meta.reduce((a, m) => a + m.spaceIds.length, 0)} vagas mapeadas.`);
  console.log(`  Contas demo (senha: ${DEMO_PASSWORD})`);
  for (const u of users.slice(0, 3)) console.log(`  ${u.role.padEnd(15)} ${u.email}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("✖ Falha no seed", err);
  process.exit(1);
});
