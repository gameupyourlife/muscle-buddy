CREATE TABLE "food_catalog" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"brand" text,
	"barcode" text,
	"serving_label" text DEFAULT '1 serving' NOT NULL,
	"serving_quantity" integer DEFAULT 1 NOT NULL,
	"calories" integer NOT NULL,
	"protein_grams" integer NOT NULL,
	"carbs_grams" integer NOT NULL,
	"fat_grams" integer NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_nutrition_goal" (
	"user_id" text PRIMARY KEY NOT NULL,
	"calories_target" integer NOT NULL,
	"protein_target" integer NOT NULL,
	"carbs_target" integer NOT NULL,
	"fat_target" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "food_log" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"catalog_food_id" text,
	"food_name" text NOT NULL,
	"meal_type" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"calories" integer NOT NULL,
	"protein_grams" integer NOT NULL,
	"carbs_grams" integer NOT NULL,
	"fat_grams" integer NOT NULL,
	"notes" text,
	"log_date" text NOT NULL,
	"logged_at" timestamp DEFAULT now() NOT NULL,
	"last_edited_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_template" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"meal_type" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_template_item" (
	"id" text PRIMARY KEY NOT NULL,
	"template_id" text NOT NULL,
	"catalog_food_id" text,
	"food_name" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"calories" integer NOT NULL,
	"protein_grams" integer NOT NULL,
	"carbs_grams" integer NOT NULL,
	"fat_grams" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nutrition_daily_xp" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"log_date" text NOT NULL,
	"awarded_xp" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "food_catalog" ADD CONSTRAINT "food_catalog_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_nutrition_goal" ADD CONSTRAINT "user_nutrition_goal_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "food_log" ADD CONSTRAINT "food_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "food_log" ADD CONSTRAINT "food_log_catalog_food_id_food_catalog_id_fk" FOREIGN KEY ("catalog_food_id") REFERENCES "public"."food_catalog"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "meal_template" ADD CONSTRAINT "meal_template_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "meal_template_item" ADD CONSTRAINT "meal_template_item_template_id_meal_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."meal_template"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "meal_template_item" ADD CONSTRAINT "meal_template_item_catalog_food_id_food_catalog_id_fk" FOREIGN KEY ("catalog_food_id") REFERENCES "public"."food_catalog"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "nutrition_daily_xp" ADD CONSTRAINT "nutrition_daily_xp_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "food_catalog_name_idx" ON "food_catalog" USING btree ("name");
--> statement-breakpoint
CREATE INDEX "food_catalog_user_idx" ON "food_catalog" USING btree ("created_by_user_id");
--> statement-breakpoint
CREATE INDEX "food_catalog_public_idx" ON "food_catalog" USING btree ("is_public");
--> statement-breakpoint
CREATE INDEX "food_catalog_barcode_idx" ON "food_catalog" USING btree ("barcode");
--> statement-breakpoint
CREATE INDEX "food_log_user_date_idx" ON "food_log" USING btree ("user_id","log_date");
--> statement-breakpoint
CREATE INDEX "food_log_user_logged_at_idx" ON "food_log" USING btree ("user_id","logged_at");
--> statement-breakpoint
CREATE INDEX "food_log_user_meal_type_idx" ON "food_log" USING btree ("user_id","meal_type");
--> statement-breakpoint
CREATE INDEX "meal_template_user_idx" ON "meal_template" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "meal_template_item_template_idx" ON "meal_template_item" USING btree ("template_id");
--> statement-breakpoint
CREATE INDEX "meal_template_item_food_idx" ON "meal_template_item" USING btree ("catalog_food_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "nutrition_daily_xp_user_date_unique" ON "nutrition_daily_xp" USING btree ("user_id","log_date");
--> statement-breakpoint
CREATE INDEX "nutrition_daily_xp_user_idx" ON "nutrition_daily_xp" USING btree ("user_id");
