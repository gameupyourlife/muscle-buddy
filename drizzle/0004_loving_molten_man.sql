ALTER TABLE "user" ADD COLUMN "social_experience_level" text DEFAULT 'beginner' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "social_training_goals" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "social_preferred_days" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "social_preferred_time_windows" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "social_gender_preference" text DEFAULT 'any' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "social_gym_district" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "social_city" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "social_language" text DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "social_bio" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "social_is_discoverable" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "social_is_private_profile" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "social_search_radius_km" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "social_area_lat_e5" integer;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "social_area_lng_e5" integer;--> statement-breakpoint
UPDATE "user" AS u
SET
	"social_experience_level" = sp."experience_level",
	"social_training_goals" = sp."training_goals",
	"social_preferred_days" = sp."preferred_days",
	"social_preferred_time_windows" = sp."preferred_time_windows",
	"social_gender_preference" = sp."gender_preference",
	"social_gym_district" = sp."gym_district",
	"social_city" = sp."city",
	"social_language" = sp."language",
	"social_bio" = sp."bio",
	"social_is_discoverable" = sp."is_discoverable",
	"social_is_private_profile" = sp."is_private_profile",
	"social_search_radius_km" = sp."search_radius_km",
	"social_area_lat_e5" = sp."area_lat_e5",
	"social_area_lng_e5" = sp."area_lng_e5"
FROM "social_profile" AS sp
WHERE u."id" = sp."user_id";--> statement-breakpoint
ALTER TABLE "social_profile" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "social_profile" CASCADE;--> statement-breakpoint
CREATE INDEX "user_social_discoverable_idx" ON "user" USING btree ("social_is_discoverable");--> statement-breakpoint
CREATE INDEX "user_social_location_idx" ON "user" USING btree ("social_city","social_gym_district");--> statement-breakpoint
CREATE INDEX "user_social_radius_idx" ON "user" USING btree ("social_search_radius_km");