CREATE TYPE "public"."account_status" AS ENUM('ONBOARDING_INCOMPLETE', 'PENDING_GUARDIAN_CONSENT', 'ACTIVE', 'SUSPENDED');--> statement-breakpoint
CREATE TYPE "public"."study_style" AS ENUM('EARLY_BIRD', 'NIGHT_OWL', 'IRREGULAR');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "birth_date" date;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "study_style" "study_style";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "account_status" "account_status" DEFAULT 'ONBOARDING_INCOMPLETE' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "guardian_email" text;--> statement-breakpoint
CREATE INDEX "pending_consent_idx" ON "users" USING btree ("account_status") WHERE "users"."account_status" = 'PENDING_GUARDIAN_CONSENT';