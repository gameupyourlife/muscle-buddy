CREATE TABLE "exercise_catalog" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"muscle_group" text NOT NULL,
	"equipment" text,
	"is_compound" boolean DEFAULT false NOT NULL,
	"is_starter" boolean DEFAULT false NOT NULL,
	"created_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_template_exercise" (
	"id" text PRIMARY KEY NOT NULL,
	"template_id" text NOT NULL,
	"exercise_id" text NOT NULL,
	"day_of_week" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"target_sets" integer DEFAULT 3 NOT NULL,
	"target_reps" integer DEFAULT 10 NOT NULL,
	"target_weight" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_template" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"difficulty" text NOT NULL,
	"weekly_target" integer DEFAULT 3 NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "test_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"test" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_plan_exercise" (
	"id" text PRIMARY KEY NOT NULL,
	"plan_id" text NOT NULL,
	"exercise_id" text NOT NULL,
	"day_of_week" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"target_sets" integer DEFAULT 3 NOT NULL,
	"target_reps" integer DEFAULT 10 NOT NULL,
	"target_weight" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_plan" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"source_template_id" text,
	"weekly_target" integer DEFAULT 3 NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"time_zone" text DEFAULT 'UTC' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_gamification" (
	"user_id" text PRIMARY KEY NOT NULL,
	"total_xp" integer DEFAULT 0 NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"last_qualified_week_key" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weekly_progress" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"week_key" text NOT NULL,
	"weekly_target" integer NOT NULL,
	"completed_workouts" integer DEFAULT 0 NOT NULL,
	"qualified_at" timestamp,
	"bonus_xp_awarded" boolean DEFAULT false NOT NULL,
	"streak_extended" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_session_set" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"exercise_id" text NOT NULL,
	"set_number" integer NOT NULL,
	"reps" integer NOT NULL,
	"weight" integer NOT NULL,
	"is_warmup" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"plan_id" text,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"duration_minutes" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "xp_event" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"session_id" text,
	"week_key" text,
	"event_type" text NOT NULL,
	"base_xp" integer DEFAULT 0 NOT NULL,
	"buff_xp" integer DEFAULT 0 NOT NULL,
	"bonus_xp" integer DEFAULT 0 NOT NULL,
	"total_xp" integer NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
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
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "exercise_catalog" ADD CONSTRAINT "exercise_catalog_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_template_exercise" ADD CONSTRAINT "plan_template_exercise_template_id_plan_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."plan_template"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_template_exercise" ADD CONSTRAINT "plan_template_exercise_exercise_id_exercise_catalog_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercise_catalog"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_plan_exercise" ADD CONSTRAINT "training_plan_exercise_plan_id_training_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."training_plan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_plan_exercise" ADD CONSTRAINT "training_plan_exercise_exercise_id_exercise_catalog_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercise_catalog"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_plan" ADD CONSTRAINT "training_plan_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_plan" ADD CONSTRAINT "training_plan_source_template_id_plan_template_id_fk" FOREIGN KEY ("source_template_id") REFERENCES "public"."plan_template"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_gamification" ADD CONSTRAINT "user_gamification_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_progress" ADD CONSTRAINT "weekly_progress_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_session_set" ADD CONSTRAINT "workout_session_set_session_id_workout_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."workout_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_session_set" ADD CONSTRAINT "workout_session_set_exercise_id_exercise_catalog_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercise_catalog"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_session" ADD CONSTRAINT "workout_session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_session" ADD CONSTRAINT "workout_session_plan_id_training_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."training_plan"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xp_event" ADD CONSTRAINT "xp_event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xp_event" ADD CONSTRAINT "xp_event_session_id_workout_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."workout_session"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "exercise_catalog_slug_unique" ON "exercise_catalog" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "exercise_catalog_created_by_idx" ON "exercise_catalog" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "exercise_catalog_starter_idx" ON "exercise_catalog" USING btree ("is_starter");--> statement-breakpoint
CREATE INDEX "plan_template_exercise_template_idx" ON "plan_template_exercise" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "plan_template_exercise_exercise_idx" ON "plan_template_exercise" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX "plan_template_exercise_order_idx" ON "plan_template_exercise" USING btree ("template_id","sort_order");--> statement-breakpoint
CREATE INDEX "plan_template_published_idx" ON "plan_template" USING btree ("is_published");--> statement-breakpoint
CREATE INDEX "training_plan_exercise_plan_idx" ON "training_plan_exercise" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "training_plan_exercise_exercise_idx" ON "training_plan_exercise" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX "training_plan_exercise_order_idx" ON "training_plan_exercise" USING btree ("plan_id","sort_order");--> statement-breakpoint
CREATE INDEX "training_plan_user_idx" ON "training_plan" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "training_plan_active_idx" ON "training_plan" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "weekly_progress_user_week_unique" ON "weekly_progress" USING btree ("user_id","week_key");--> statement-breakpoint
CREATE INDEX "weekly_progress_user_idx" ON "weekly_progress" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "workout_session_set_session_idx" ON "workout_session_set" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "workout_session_set_exercise_idx" ON "workout_session_set" USING btree ("exercise_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workout_session_set_unique_order" ON "workout_session_set" USING btree ("session_id","set_number");--> statement-breakpoint
CREATE INDEX "workout_session_user_idx" ON "workout_session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "workout_session_plan_idx" ON "workout_session" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "workout_session_completed_idx" ON "workout_session" USING btree ("user_id","completed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "xp_event_idempotency_unique" ON "xp_event" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "xp_event_user_idx" ON "xp_event" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "xp_event_session_idx" ON "xp_event" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");