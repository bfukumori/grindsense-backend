CREATE TYPE "public"."device_status" AS ENUM('PROVISIONED', 'ACTIVE', 'REVOKED');--> statement-breakpoint
CREATE TYPE "public"."mood" AS ENUM('EXCITED', 'NEUTRAL', 'TIRED', 'STRESSED');--> statement-breakpoint
CREATE TYPE "public"."readiness_mode" AS ENUM('HIGH_FOCUS', 'LIGHT', 'RECOVERY');--> statement-breakpoint
CREATE TYPE "public"."task_category" AS ENUM('STUDY', 'WORK', 'HEALTH', 'REST');--> statement-breakpoint
CREATE TYPE "public"."task_difficulty" AS ENUM('EASY', 'MEDIUM', 'HARD');--> statement-breakpoint
CREATE TYPE "public"."theme_preference" AS ENUM('DARK', 'LIGHT', 'SYSTEM');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_checkins" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"date_string" text NOT NULL,
	"mood" "mood" NOT NULL,
	"subjective_sleep_quality" integer NOT NULL,
	"available_hours" integer NOT NULL,
	"readiness_score" integer,
	"readiness_mode" "readiness_mode",
	"ai_summary" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "heart_rate_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"device_id" text,
	"measured_at" timestamp with time zone NOT NULL,
	"bpm" integer NOT NULL,
	"spo2" integer,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hourly_health_metrics" (
	"user_id" text,
	"bucket_hour" timestamp with time zone,
	"avg_bpm" integer,
	"avg_spo2" integer
);
--> statement-breakpoint
CREATE TABLE "iot_devices" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"mac_address" varchar(17) NOT NULL,
	"secret" text NOT NULL,
	"device_type" text NOT NULL,
	"status" "device_status" DEFAULT 'PROVISIONED' NOT NULL,
	"last_ping_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "iot_devices_macAddress_unique" UNIQUE("mac_address")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "sleep_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"date_string" text NOT NULL,
	"duration_minutes" integer NOT NULL,
	"efficiency" integer,
	"source" text DEFAULT 'GOOGLE_FIT',
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"check_in_id" text,
	"title" text NOT NULL,
	"category" "task_category" DEFAULT 'WORK' NOT NULL,
	"difficulty" "task_difficulty" DEFAULT 'MEDIUM' NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"xp_reward" integer DEFAULT 0 NOT NULL,
	"target_date" date NOT NULL,
	"estimated_minutes" integer DEFAULT 30,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"total_xp" integer DEFAULT 0 NOT NULL,
	"theme_preference" "theme_preference" DEFAULT 'DARK' NOT NULL,
	"push_notifications" boolean DEFAULT true NOT NULL,
	"is_private_profile" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_checkins" ADD CONSTRAINT "daily_checkins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heart_rate_logs" ADD CONSTRAINT "heart_rate_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heart_rate_logs" ADD CONSTRAINT "heart_rate_logs_device_id_iot_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."iot_devices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iot_devices" ADD CONSTRAINT "iot_devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sleep_logs" ADD CONSTRAINT "sleep_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_check_in_id_daily_checkins_id_fk" FOREIGN KEY ("check_in_id") REFERENCES "public"."daily_checkins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "daily_checkins_unq" ON "daily_checkins" USING btree ("user_id","date_string");--> statement-breakpoint
CREATE UNIQUE INDEX "heart_rate_logs_idempotency_idx" ON "heart_rate_logs" USING btree ("device_id","measured_at");--> statement-breakpoint
CREATE INDEX "heart_rate_logs_user_measured_at_idx" ON "heart_rate_logs" USING btree ("user_id","measured_at");--> statement-breakpoint
CREATE UNIQUE INDEX "hourly_health_metrics_unq" ON "hourly_health_metrics" USING btree ("user_id","bucket_hour");--> statement-breakpoint
CREATE INDEX "hourly_health_metrics_user_hour_idx" ON "hourly_health_metrics" USING btree ("user_id","bucket_hour");--> statement-breakpoint
CREATE INDEX "iot_devices_user_id_idx" ON "iot_devices" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "iot_devices_mac_address_idx" ON "iot_devices" USING btree ("mac_address");--> statement-breakpoint
CREATE UNIQUE INDEX "sleep_logs_unq" ON "sleep_logs" USING btree ("user_id","date_string");--> statement-breakpoint
CREATE INDEX "sleep_logs_user_date_idx" ON "sleep_logs" USING btree ("user_id","date_string");--> statement-breakpoint
CREATE INDEX "tasks_user_date_idx" ON "tasks" USING btree ("user_id","target_date");--> statement-breakpoint
CREATE INDEX "leaderboard_idx" ON "users" USING btree ("is_private_profile","total_xp");