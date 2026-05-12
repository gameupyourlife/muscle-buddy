ALTER TABLE "user_gamification" ADD COLUMN "character_gender" text DEFAULT 'male' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_gamification" ADD COLUMN "equipped_head_item" text DEFAULT 'headband' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_gamification" ADD COLUMN "equipped_top_item" text DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_gamification" ADD COLUMN "equipped_pants_item" text DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_gamification" ADD COLUMN "equipped_shoes_item" text DEFAULT 'standard' NOT NULL;--> statement-breakpoint
UPDATE "user_gamification"
SET "level" = CASE
	WHEN "total_xp" >= 450 THEN 3
	WHEN "total_xp" >= 200 THEN 2
	ELSE 1
END;
