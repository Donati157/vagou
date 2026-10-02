CREATE TYPE "public"."data_source_granularity" AS ENUM('SPACE', 'AGGREGATE');--> statement-breakpoint
CREATE TYPE "public"."data_source_kind" AS ENUM('SIMULATION', 'MANUAL', 'CAMERA', 'SENSOR', 'GATE', 'PARKING_MANAGEMENT', 'API');--> statement-breakpoint
CREATE TYPE "public"."data_source_status" AS ENUM('ACTIVE', 'INACTIVE', 'ERROR');--> statement-breakpoint
CREATE TYPE "public"."entrance_kind" AS ENUM('VEHICLE_ENTRY', 'VEHICLE_EXIT', 'VEHICLE_BOTH', 'PEDESTRIAN');--> statement-breakpoint
CREATE TYPE "public"."facility_kind" AS ENUM('SHOPPING', 'COMMERCIAL_BUILDING', 'PARKING_LOT', 'HOSPITAL', 'EVENT_VENUE', 'TRANSIT_HUB', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."floor_plan_element_kind" AS ENUM('ENTRANCE', 'EXIT', 'CIRCULATION', 'RAMP', 'ELEVATOR');--> statement-breakpoint
CREATE TYPE "public"."floor_plan_status" AS ENUM('UPLOADED', 'PROCESSING', 'ANALYZED', 'FAILED', 'PUBLISHED', 'SUPERSEDED');--> statement-breakpoint
CREATE TYPE "public"."organization_member_role" AS ENUM('OWNER', 'ADMIN', 'OPERATOR');--> statement-breakpoint
CREATE TYPE "public"."organization_type" AS ENUM('SHOPPING', 'CORPORATE', 'PARKING_OPERATOR', 'HOSPITAL', 'CONDOMINIUM', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."record_status" AS ENUM('ACTIVE', 'INACTIVE');--> statement-breakpoint
CREATE TYPE "public"."space_op_status" AS ENUM('AVAILABLE', 'OCCUPIED', 'RESERVED', 'UNAVAILABLE');--> statement-breakpoint
CREATE TYPE "public"."space_type" AS ENUM('COMMON', 'PCD', 'EV', 'MOTO', 'VIP');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('DRIVER', 'COMPANY_ADMIN', 'PLATFORM_ADMIN');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('ACTIVE', 'SUSPENDED');--> statement-breakpoint
CREATE TYPE "public"."vehicle_type" AS ENUM('CAR', 'MOTORCYCLE', 'VAN');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"kind" "data_source_kind" NOT NULL,
	"granularity" "data_source_granularity" DEFAULT 'SPACE' NOT NULL,
	"name" text NOT NULL,
	"status" "data_source_status" DEFAULT 'ACTIVE' NOT NULL,
	"last_sync_at" timestamp with time zone,
	"last_error" text,
	"config" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "facilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"kind" "facility_kind" DEFAULT 'PARKING_LOT' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"address_line" text NOT NULL,
	"neighborhood" text,
	"city" text DEFAULT 'São Paulo' NOT NULL,
	"state" text DEFAULT 'SP' NOT NULL,
	"postal_code" text,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"phone" text,
	"declared_capacity" integer DEFAULT 0 NOT NULL,
	"covered" boolean DEFAULT true NOT NULL,
	"accessible" boolean DEFAULT false NOT NULL,
	"accessible_spaces" integer DEFAULT 0 NOT NULL,
	"ev_chargers" integer DEFAULT 0 NOT NULL,
	"valet" boolean DEFAULT false NOT NULL,
	"security_24h" boolean DEFAULT false NOT NULL,
	"max_height_cm" smallint,
	"useful_info" text DEFAULT '' NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"status" "record_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "facilities_slug_unique" UNIQUE("slug"),
	CONSTRAINT "facilities_capacity" CHECK ("facilities"."declared_capacity" >= 0 and "facilities"."accessible_spaces" >= 0 and "facilities"."ev_chargers" >= 0)
);
--> statement-breakpoint
CREATE TABLE "facility_entrances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" "entrance_kind" DEFAULT 'VEHICLE_BOTH' NOT NULL,
	"address_line" text,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "facility_vehicle_types" (
	"facility_id" uuid NOT NULL,
	"vehicle_type" "vehicle_type" NOT NULL,
	CONSTRAINT "facility_vehicle_types_facility_id_vehicle_type_pk" PRIMARY KEY("facility_id","vehicle_type")
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"user_id" uuid NOT NULL,
	"facility_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favorites_user_id_facility_id_pk" PRIMARY KEY("user_id","facility_id")
);
--> statement-breakpoint
CREATE TABLE "floor_plan_elements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"floor_plan_id" uuid NOT NULL,
	"kind" "floor_plan_element_kind" NOT NULL,
	"label" text,
	"x" real NOT NULL,
	"y" real NOT NULL,
	"w" real NOT NULL,
	"h" real NOT NULL,
	"rotation" real DEFAULT 0 NOT NULL,
	"confidence" real
);
--> statement-breakpoint
CREATE TABLE "floor_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"floor_id" uuid NOT NULL,
	"original_key" text NOT NULL,
	"original_name" text NOT NULL,
	"original_mime" text NOT NULL,
	"original_size" integer NOT NULL,
	"preview_key" text,
	"width_px" integer,
	"height_px" integer,
	"status" "floor_plan_status" DEFAULT 'UPLOADED' NOT NULL,
	"analyzer" text,
	"confidence" real,
	"analysis_error" text,
	"uploaded_by" uuid,
	"analyzed_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "floors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"name" text NOT NULL,
	"level" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"link" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "occupancy_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"parking_space_id" uuid NOT NULL,
	"from_status" "space_op_status",
	"to_status" "space_op_status" NOT NULL,
	"source" "data_source_kind" NOT NULL,
	"actor_id" uuid,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "occupancy_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"floor_id" uuid,
	"captured_at" timestamp with time zone NOT NULL,
	"source" "data_source_kind" NOT NULL,
	"total" integer NOT NULL,
	"available" integer NOT NULL,
	"occupied" integer NOT NULL,
	"reserved" integer NOT NULL,
	"unavailable" integer NOT NULL,
	CONSTRAINT "snapshot_totals" CHECK ("occupancy_snapshots"."available" + "occupancy_snapshots"."occupied" + "occupancy_snapshots"."reserved" + "occupancy_snapshots"."unavailable" = "occupancy_snapshots"."total")
);
--> statement-breakpoint
CREATE TABLE "operating_hours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"weekday" smallint NOT NULL,
	"opens_minute" smallint NOT NULL,
	"closes_minute" smallint NOT NULL,
	CONSTRAINT "hours_weekday" CHECK ("operating_hours"."weekday" between 0 and 6),
	CONSTRAINT "hours_minutes" CHECK ("operating_hours"."opens_minute" >= 0 and "operating_hours"."closes_minute" <= 1440 and "operating_hours"."opens_minute" < "operating_hours"."closes_minute")
);
--> statement-breakpoint
CREATE TABLE "organization_members" (
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "organization_member_role" DEFAULT 'ADMIN' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_members_organization_id_user_id_pk" PRIMARY KEY("organization_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"type" "organization_type" DEFAULT 'OTHER' NOT NULL,
	"status" "record_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "parking_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"label" text NOT NULL,
	"vehicle_type" "vehicle_type" DEFAULT 'CAR' NOT NULL,
	"first_period_minutes" smallint DEFAULT 60 NOT NULL,
	"first_period_cents" integer NOT NULL,
	"additional_hour_cents" integer,
	"daily_max_cents" integer,
	"notes" text,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "rates_positive" CHECK ("parking_rates"."first_period_cents" >= 0 and "parking_rates"."first_period_minutes" > 0)
);
--> statement-breakpoint
CREATE TABLE "parking_spaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"floor_id" uuid NOT NULL,
	"sector_id" uuid,
	"code" text NOT NULL,
	"type" "space_type" DEFAULT 'COMMON' NOT NULL,
	"op_status" "space_op_status" DEFAULT 'AVAILABLE' NOT NULL,
	"op_status_source" "data_source_kind" DEFAULT 'MANUAL' NOT NULL,
	"op_status_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"external_ref" text,
	"x" real DEFAULT 0 NOT NULL,
	"y" real DEFAULT 0 NOT NULL,
	"w" real DEFAULT 0.03 NOT NULL,
	"h" real DEFAULT 0.06 NOT NULL,
	"rotation" real DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "parking_spaces_coords" CHECK ("parking_spaces"."x" >= 0 and "parking_spaces"."x" <= 1 and "parking_spaces"."y" >= 0 and "parking_spaces"."y" <= 1 and "parking_spaces"."w" > 0 and "parking_spaces"."h" > 0)
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"phone" text,
	"city" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sectors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"floor_id" uuid NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#3B82F6' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'DRIVER' NOT NULL,
	"status" "user_status" DEFAULT 'ACTIVE' NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_sources" ADD CONSTRAINT "data_sources_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facility_entrances" ADD CONSTRAINT "facility_entrances_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facility_vehicle_types" ADD CONSTRAINT "facility_vehicle_types_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "floor_plan_elements" ADD CONSTRAINT "floor_plan_elements_floor_plan_id_floor_plans_id_fk" FOREIGN KEY ("floor_plan_id") REFERENCES "public"."floor_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "floor_plans" ADD CONSTRAINT "floor_plans_floor_id_floors_id_fk" FOREIGN KEY ("floor_id") REFERENCES "public"."floors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "floor_plans" ADD CONSTRAINT "floor_plans_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "floors" ADD CONSTRAINT "floors_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "occupancy_events" ADD CONSTRAINT "occupancy_events_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "occupancy_events" ADD CONSTRAINT "occupancy_events_parking_space_id_parking_spaces_id_fk" FOREIGN KEY ("parking_space_id") REFERENCES "public"."parking_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "occupancy_events" ADD CONSTRAINT "occupancy_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "occupancy_snapshots" ADD CONSTRAINT "occupancy_snapshots_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "occupancy_snapshots" ADD CONSTRAINT "occupancy_snapshots_floor_id_floors_id_fk" FOREIGN KEY ("floor_id") REFERENCES "public"."floors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operating_hours" ADD CONSTRAINT "operating_hours_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parking_rates" ADD CONSTRAINT "parking_rates_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parking_spaces" ADD CONSTRAINT "parking_spaces_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parking_spaces" ADD CONSTRAINT "parking_spaces_floor_id_floors_id_fk" FOREIGN KEY ("floor_id") REFERENCES "public"."floors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parking_spaces" ADD CONSTRAINT "parking_spaces_sector_id_sectors_id_fk" FOREIGN KEY ("sector_id") REFERENCES "public"."sectors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sectors" ADD CONSTRAINT "sectors_floor_id_floors_id_fk" FOREIGN KEY ("floor_id") REFERENCES "public"."floors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "data_sources_active_uq" ON "data_sources" USING btree ("facility_id") WHERE "data_sources"."status" = 'ACTIVE';--> statement-breakpoint
CREATE INDEX "facilities_org_idx" ON "facilities" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "facilities_geo_idx" ON "facilities" USING btree ("is_published","lat","lng");--> statement-breakpoint
CREATE INDEX "entrances_facility_idx" ON "facility_entrances" USING btree ("facility_id");--> statement-breakpoint
CREATE INDEX "floor_plan_elements_plan_idx" ON "floor_plan_elements" USING btree ("floor_plan_id");--> statement-breakpoint
CREATE INDEX "floor_plans_floor_idx" ON "floor_plans" USING btree ("floor_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "floors_facility_name_uq" ON "floors" USING btree ("facility_id","name");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "occupancy_events_facility_time_idx" ON "occupancy_events" USING btree ("facility_id","observed_at");--> statement-breakpoint
CREATE INDEX "occupancy_events_space_idx" ON "occupancy_events" USING btree ("parking_space_id","observed_at");--> statement-breakpoint
CREATE INDEX "occupancy_facility_time_idx" ON "occupancy_snapshots" USING btree ("facility_id","captured_at");--> statement-breakpoint
CREATE INDEX "hours_facility_idx" ON "operating_hours" USING btree ("facility_id");--> statement-breakpoint
CREATE INDEX "org_members_user_idx" ON "organization_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "rates_facility_idx" ON "parking_rates" USING btree ("facility_id");--> statement-breakpoint
CREATE UNIQUE INDEX "parking_spaces_facility_code_uq" ON "parking_spaces" USING btree ("facility_id","code") WHERE "parking_spaces"."archived_at" is null;--> statement-breakpoint
CREATE INDEX "parking_spaces_floor_idx" ON "parking_spaces" USING btree ("floor_id");--> statement-breakpoint
CREATE INDEX "parking_spaces_facility_status_idx" ON "parking_spaces" USING btree ("facility_id","op_status");--> statement-breakpoint
CREATE UNIQUE INDEX "sectors_floor_name_uq" ON "sectors" USING btree ("floor_id","name");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_lower_uq" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");