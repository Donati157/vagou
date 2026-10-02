import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/*
 * Vagou data model — parking DISCOVERY & availability (see docs/PRODUCT.md).
 * Organization → Facility → Floor → Sector → ParkingSpace, plus floor plans, occupancy
 * (events + snapshots), rates, operating hours, entrances and data sources.
 */

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const createdAt = () => ts("created_at").notNull().defaultNow();
const updatedAt = () => ts("updated_at").notNull().defaultNow();

// ───────────────────────────── Enums ─────────────────────────────

export const userRole = pgEnum("user_role", ["DRIVER", "COMPANY_ADMIN", "PLATFORM_ADMIN"]);
export const userStatus = pgEnum("user_status", ["ACTIVE", "SUSPENDED"]);
export const orgType = pgEnum("organization_type", ["SHOPPING", "CORPORATE", "PARKING_OPERATOR", "HOSPITAL", "CONDOMINIUM", "OTHER"]);
export const orgMemberRole = pgEnum("organization_member_role", ["OWNER", "ADMIN", "OPERATOR"]);
export const recordStatus = pgEnum("record_status", ["ACTIVE", "INACTIVE"]);
export const facilityKind = pgEnum("facility_kind", ["SHOPPING", "COMMERCIAL_BUILDING", "PARKING_LOT", "HOSPITAL", "EVENT_VENUE", "TRANSIT_HUB", "OTHER"]);
export const spaceType = pgEnum("space_type", ["COMMON", "PCD", "EV", "MOTO", "VIP"]);
export const spaceOpStatus = pgEnum("space_op_status", ["AVAILABLE", "OCCUPIED", "RESERVED", "UNAVAILABLE"]);
export const dataSourceKind = pgEnum("data_source_kind", ["SIMULATION", "MANUAL", "CAMERA", "SENSOR", "GATE", "PARKING_MANAGEMENT", "API"]);
export const dataSourceGranularity = pgEnum("data_source_granularity", ["SPACE", "AGGREGATE"]);
export const dataSourceStatus = pgEnum("data_source_status", ["ACTIVE", "INACTIVE", "ERROR"]);
export const vehicleType = pgEnum("vehicle_type", ["CAR", "MOTORCYCLE", "VAN"]);
export const entranceKind = pgEnum("entrance_kind", ["VEHICLE_ENTRY", "VEHICLE_EXIT", "VEHICLE_BOTH", "PEDESTRIAN"]);
export const floorPlanStatus = pgEnum("floor_plan_status", ["UPLOADED", "PROCESSING", "ANALYZED", "FAILED", "PUBLISHED", "SUPERSEDED"]);
export const floorPlanElementKind = pgEnum("floor_plan_element_kind", ["ENTRANCE", "EXIT", "CIRCULATION", "RAMP", "ELEVATOR"]);

// ───────────────────────────── Identity ─────────────────────────────

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRole("role").notNull().default("DRIVER"),
    status: userStatus("status").notNull().default("ACTIVE"),
    lastLoginAt: ts("last_login_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: ts("deleted_at"),
  },
  (t) => [uniqueIndex("users_email_lower_uq").on(sql`lower(${t.email})`), index("users_role_idx").on(t.role)],
);

/** Private personal data, kept apart from the account record (LGPD: minimization + separation). */
export const profiles = pgTable("profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  city: text("city"),
  updatedAt: updatedAt(),
});

export const sessions = pgTable(
  "sessions",
  {
    /** SHA-256 of the session token. The raw token only lives in the httpOnly cookie. */
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: ts("expires_at").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const passwordResetTokens = pgTable("password_reset_tokens", {
  tokenHash: text("token_hash").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: ts("expires_at").notNull(),
  usedAt: ts("used_at"),
  createdAt: createdAt(),
});

// ───────────────────────────── Organizations ─────────────────────────────

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  type: orgType("type").notNull().default("OTHER"),
  status: recordStatus("status").notNull().default("ACTIVE"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const organizationMembers = pgTable(
  "organization_members",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: orgMemberRole("role").notNull().default("ADMIN"),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.organizationId, t.userId] }), index("org_members_user_idx").on(t.userId)],
);

// ───────────────────────────── Facilities ─────────────────────────────

export const facilities = pgTable(
  "facilities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    kind: facilityKind("kind").notNull().default("PARKING_LOT"),
    description: text("description").notNull().default(""),
    addressLine: text("address_line").notNull(),
    neighborhood: text("neighborhood"),
    city: text("city").notNull().default("São Paulo"),
    state: text("state").notNull().default("SP"),
    postalCode: text("postal_code"),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    phone: text("phone"),
    /** Declared capacity; used when the facility has no digital map (aggregate data only). */
    declaredCapacity: integer("declared_capacity").notNull().default(0),
    covered: boolean("covered").notNull().default(true),
    accessible: boolean("accessible").notNull().default(false),
    accessibleSpaces: integer("accessible_spaces").notNull().default(0),
    evChargers: integer("ev_chargers").notNull().default(0),
    valet: boolean("valet").notNull().default(false),
    security24h: boolean("security_24h").notNull().default(false),
    maxHeightCm: smallint("max_height_cm"),
    usefulInfo: text("useful_info").notNull().default(""),
    /** Visible in the public search when true. */
    isPublished: boolean("is_published").notNull().default(false),
    status: recordStatus("status").notNull().default("ACTIVE"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("facilities_org_idx").on(t.organizationId),
    index("facilities_geo_idx").on(t.isPublished, t.lat, t.lng),
    check("facilities_capacity", sql`${t.declaredCapacity} >= 0 and ${t.accessibleSpaces} >= 0 and ${t.evChargers} >= 0`),
  ],
);

export const facilityVehicleTypes = pgTable(
  "facility_vehicle_types",
  {
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => facilities.id, { onDelete: "cascade" }),
    vehicleType: vehicleType("vehicle_type").notNull(),
  },
  (t) => [primaryKey({ columns: [t.facilityId, t.vehicleType] })],
);

/** Weekly opening windows in São Paulo local time (one row per window). */
export const operatingHours = pgTable(
  "operating_hours",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => facilities.id, { onDelete: "cascade" }),
    weekday: smallint("weekday").notNull(),
    opensMinute: smallint("opens_minute").notNull(),
    closesMinute: smallint("closes_minute").notNull(),
  },
  (t) => [
    check("hours_weekday", sql`${t.weekday} between 0 and 6`),
    check("hours_minutes", sql`${t.opensMinute} >= 0 and ${t.closesMinute} <= 1440 and ${t.opensMinute} < ${t.closesMinute}`),
    index("hours_facility_idx").on(t.facilityId),
  ],
);

/** Published price table (informational — Vagou does not charge drivers). */
export const parkingRates = pgTable(
  "parking_rates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => facilities.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    vehicleType: vehicleType("vehicle_type").notNull().default("CAR"),
    firstPeriodMinutes: smallint("first_period_minutes").notNull().default(60),
    firstPeriodCents: integer("first_period_cents").notNull(),
    additionalHourCents: integer("additional_hour_cents"),
    dailyMaxCents: integer("daily_max_cents"),
    notes: text("notes"),
    sortOrder: smallint("sort_order").notNull().default(0),
  },
  (t) => [
    check("rates_positive", sql`${t.firstPeriodCents} >= 0 and ${t.firstPeriodMinutes} > 0`),
    index("rates_facility_idx").on(t.facilityId),
  ],
);

export const facilityEntrances = pgTable(
  "facility_entrances",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => facilities.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    kind: entranceKind("kind").notNull().default("VEHICLE_BOTH"),
    addressLine: text("address_line"),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    isPrimary: boolean("is_primary").notNull().default(false),
    notes: text("notes"),
  },
  (t) => [index("entrances_facility_idx").on(t.facilityId)],
);

/**
 * Where a facility's occupancy comes from. SIMULATION is the demo fallback and must always be
 * labeled as such in every interface. Config holds non-secret settings only (credentials go to env/secret store).
 */
export const dataSources = pgTable(
  "data_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => facilities.id, { onDelete: "cascade" }),
    kind: dataSourceKind("kind").notNull(),
    granularity: dataSourceGranularity("granularity").notNull().default("SPACE"),
    name: text("name").notNull(),
    status: dataSourceStatus("status").notNull().default("ACTIVE"),
    lastSyncAt: ts("last_sync_at"),
    lastError: text("last_error"),
    config: jsonb("config").$type<Record<string, string | number | boolean>>(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    // one active source per facility drives its public availability
    uniqueIndex("data_sources_active_uq").on(t.facilityId).where(sql`${t.status} = 'ACTIVE'`),
  ],
);

export const floors = pgTable(
  "floors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => facilities.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    level: smallint("level").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("floors_facility_name_uq").on(t.facilityId, t.name)],
);

export const sectors = pgTable(
  "sectors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    floorId: uuid("floor_id")
      .notNull()
      .references(() => floors.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").notNull().default("#3B82F6"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("sectors_floor_name_uq").on(t.floorId, t.name)],
);

/** A physical space. Map coordinates are relative (0..1) to the floor plan image. */
export const parkingSpaces = pgTable(
  "parking_spaces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => facilities.id, { onDelete: "cascade" }),
    floorId: uuid("floor_id")
      .notNull()
      .references(() => floors.id, { onDelete: "cascade" }),
    sectorId: uuid("sector_id").references(() => sectors.id, { onDelete: "set null" }),
    code: text("code").notNull(),
    type: spaceType("type").notNull().default("COMMON"),
    opStatus: spaceOpStatus("op_status").notNull().default("AVAILABLE"),
    opStatusSource: dataSourceKind("op_status_source").notNull().default("MANUAL"),
    opStatusUpdatedAt: ts("op_status_updated_at").notNull().defaultNow(),
    /** Identifier of this space in an external system (sensor id, camera zone…). */
    externalRef: text("external_ref"),
    x: real("x").notNull().default(0),
    y: real("y").notNull().default(0),
    w: real("w").notNull().default(0.03),
    h: real("h").notNull().default(0.06),
    rotation: real("rotation").notNull().default(0),
    archivedAt: ts("archived_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("parking_spaces_coords", sql`${t.x} >= 0 and ${t.x} <= 1 and ${t.y} >= 0 and ${t.y} <= 1 and ${t.w} > 0 and ${t.h} > 0`),
    uniqueIndex("parking_spaces_facility_code_uq").on(t.facilityId, t.code).where(sql`${t.archivedAt} is null`),
    index("parking_spaces_floor_idx").on(t.floorId),
    index("parking_spaces_facility_status_idx").on(t.facilityId, t.opStatus),
  ],
);

// ───────────────────────────── Floor plans ─────────────────────────────

export const floorPlans = pgTable(
  "floor_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    floorId: uuid("floor_id")
      .notNull()
      .references(() => floors.id, { onDelete: "cascade" }),
    originalKey: text("original_key").notNull(),
    originalName: text("original_name").notNull(),
    originalMime: text("original_mime").notNull(),
    originalSize: integer("original_size").notNull(),
    /** Raster image used as map background (same as original for PNG/JPG; rendered first page for PDF). */
    previewKey: text("preview_key"),
    widthPx: integer("width_px"),
    heightPx: integer("height_px"),
    status: floorPlanStatus("status").notNull().default("UPLOADED"),
    analyzer: text("analyzer"),
    confidence: real("confidence"),
    analysisError: text("analysis_error"),
    uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),
    analyzedAt: ts("analyzed_at"),
    publishedAt: ts("published_at"),
    createdAt: createdAt(),
  },
  (t) => [index("floor_plans_floor_idx").on(t.floorId, t.createdAt)],
);

export const floorPlanElements = pgTable(
  "floor_plan_elements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    floorPlanId: uuid("floor_plan_id")
      .notNull()
      .references(() => floorPlans.id, { onDelete: "cascade" }),
    kind: floorPlanElementKind("kind").notNull(),
    label: text("label"),
    x: real("x").notNull(),
    y: real("y").notNull(),
    w: real("w").notNull(),
    h: real("h").notNull(),
    rotation: real("rotation").notNull().default(0),
    confidence: real("confidence"),
  },
  (t) => [index("floor_plan_elements_plan_idx").on(t.floorPlanId)],
);

// ───────────────────────────── Occupancy ─────────────────────────────

/** Status change of one space, as reported by a data source (append-only). */
export const occupancyEvents = pgTable(
  "occupancy_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => facilities.id, { onDelete: "cascade" }),
    parkingSpaceId: uuid("parking_space_id")
      .notNull()
      .references(() => parkingSpaces.id, { onDelete: "cascade" }),
    fromStatus: spaceOpStatus("from_status"),
    toStatus: spaceOpStatus("to_status").notNull(),
    source: dataSourceKind("source").notNull(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    observedAt: ts("observed_at").notNull().defaultNow(),
  },
  (t) => [index("occupancy_events_facility_time_idx").on(t.facilityId, t.observedAt), index("occupancy_events_space_idx").on(t.parkingSpaceId, t.observedAt)],
);

/** Point-in-time facility (and optionally floor) totals — powers public counts for aggregate sources and analytics. */
export const occupancySnapshots = pgTable(
  "occupancy_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => facilities.id, { onDelete: "cascade" }),
    floorId: uuid("floor_id").references(() => floors.id, { onDelete: "cascade" }),
    capturedAt: ts("captured_at").notNull(),
    source: dataSourceKind("source").notNull(),
    total: integer("total").notNull(),
    available: integer("available").notNull(),
    occupied: integer("occupied").notNull(),
    reserved: integer("reserved").notNull(),
    unavailable: integer("unavailable").notNull(),
  },
  (t) => [
    index("occupancy_facility_time_idx").on(t.facilityId, t.capturedAt),
    check("snapshot_totals", sql`${t.available} + ${t.occupied} + ${t.reserved} + ${t.unavailable} = ${t.total}`),
  ],
);

// ───────────────────────────── Platform ─────────────────────────────

export const favorites = pgTable(
  "favorites",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => facilities.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.facilityId] })],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    /** Small, non-sensitive context only. */
    metadata: jsonb("metadata").$type<Record<string, string | number | boolean | null>>(),
    createdAt: createdAt(),
  },
  (t) => [index("audit_entity_idx").on(t.entityType, t.entityId), index("audit_created_idx").on(t.createdAt)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    link: text("link"),
    readAt: ts("read_at"),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.createdAt)],
);
