CREATE TABLE "social_profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"experience_level" text DEFAULT 'beginner' NOT NULL,
	"training_goals" text DEFAULT '' NOT NULL,
	"preferred_days" text DEFAULT '' NOT NULL,
	"preferred_time_windows" text DEFAULT '' NOT NULL,
	"gender_preference" text DEFAULT 'any' NOT NULL,
	"gym_district" text NOT NULL,
	"city" text NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"bio" text,
	"is_discoverable" boolean DEFAULT true NOT NULL,
	"is_private_profile" boolean DEFAULT false NOT NULL,
	"search_radius_km" integer DEFAULT 10 NOT NULL,
	"area_lat_e5" integer,
	"area_lng_e5" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "buddy_request" (
	"id" text PRIMARY KEY NOT NULL,
	"from_user_id" text NOT NULL,
	"to_user_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"message" text,
	"responded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "buddy" (
	"id" text PRIMARY KEY NOT NULL,
	"user_a_id" text NOT NULL,
	"user_b_id" text NOT NULL,
	"connected_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_message" (
	"id" text PRIMARY KEY NOT NULL,
	"buddy_id" text NOT NULL,
	"sender_user_id" text NOT NULL,
	"body" text NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_recurring_availability" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_minute" integer NOT NULL,
	"end_minute" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_one_off_availability" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp NOT NULL,
	"status" text DEFAULT 'available' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_meetup_invite" (
	"id" text PRIMARY KEY NOT NULL,
	"sender_user_id" text NOT NULL,
	"receiver_user_id" text NOT NULL,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp NOT NULL,
	"gym_area" text NOT NULL,
	"note" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"responded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_notification" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"data" text,
	"status" text DEFAULT 'unread' NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_block" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"blocked_user_id" text NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_report" (
	"id" text PRIMARY KEY NOT NULL,
	"reporter_user_id" text NOT NULL,
	"reported_user_id" text NOT NULL,
	"category" text NOT NULL,
	"details" text,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "social_profile" ADD CONSTRAINT "social_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "buddy_request" ADD CONSTRAINT "buddy_request_from_user_id_user_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "buddy_request" ADD CONSTRAINT "buddy_request_to_user_id_user_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "buddy" ADD CONSTRAINT "buddy_user_a_id_user_id_fk" FOREIGN KEY ("user_a_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "buddy" ADD CONSTRAINT "buddy_user_b_id_user_id_fk" FOREIGN KEY ("user_b_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "social_message" ADD CONSTRAINT "social_message_buddy_id_buddy_id_fk" FOREIGN KEY ("buddy_id") REFERENCES "public"."buddy"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "social_message" ADD CONSTRAINT "social_message_sender_user_id_user_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "social_recurring_availability" ADD CONSTRAINT "social_recurring_availability_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "social_one_off_availability" ADD CONSTRAINT "social_one_off_availability_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "social_meetup_invite" ADD CONSTRAINT "social_meetup_invite_sender_user_id_user_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "social_meetup_invite" ADD CONSTRAINT "social_meetup_invite_receiver_user_id_user_id_fk" FOREIGN KEY ("receiver_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "social_notification" ADD CONSTRAINT "social_notification_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "social_block" ADD CONSTRAINT "social_block_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "social_block" ADD CONSTRAINT "social_block_blocked_user_id_user_id_fk" FOREIGN KEY ("blocked_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "social_report" ADD CONSTRAINT "social_report_reporter_user_id_user_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "social_report" ADD CONSTRAINT "social_report_reported_user_id_user_id_fk" FOREIGN KEY ("reported_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "buddy_request_pair_unique" ON "buddy_request" USING btree ("from_user_id","to_user_id");
--> statement-breakpoint
CREATE INDEX "buddy_request_to_status_idx" ON "buddy_request" USING btree ("to_user_id","status");
--> statement-breakpoint
CREATE INDEX "buddy_request_from_status_idx" ON "buddy_request" USING btree ("from_user_id","status");
--> statement-breakpoint
CREATE UNIQUE INDEX "buddy_pair_unique" ON "buddy" USING btree ("user_a_id","user_b_id");
--> statement-breakpoint
CREATE INDEX "buddy_user_a_idx" ON "buddy" USING btree ("user_a_id");
--> statement-breakpoint
CREATE INDEX "buddy_user_b_idx" ON "buddy" USING btree ("user_b_id");
--> statement-breakpoint
CREATE INDEX "social_message_buddy_created_idx" ON "social_message" USING btree ("buddy_id","created_at");
--> statement-breakpoint
CREATE INDEX "social_message_sender_idx" ON "social_message" USING btree ("sender_user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "social_recurring_availability_unique_slot" ON "social_recurring_availability" USING btree ("user_id","day_of_week","start_minute","end_minute");
--> statement-breakpoint
CREATE INDEX "social_recurring_availability_user_idx" ON "social_recurring_availability" USING btree ("user_id","day_of_week");
--> statement-breakpoint
CREATE INDEX "social_one_off_availability_user_starts_idx" ON "social_one_off_availability" USING btree ("user_id","starts_at");
--> statement-breakpoint
CREATE INDEX "social_one_off_availability_user_status_idx" ON "social_one_off_availability" USING btree ("user_id","status");
--> statement-breakpoint
CREATE INDEX "social_meetup_invite_receiver_status_idx" ON "social_meetup_invite" USING btree ("receiver_user_id","status");
--> statement-breakpoint
CREATE INDEX "social_meetup_invite_sender_status_idx" ON "social_meetup_invite" USING btree ("sender_user_id","status");
--> statement-breakpoint
CREATE INDEX "social_notification_user_status_idx" ON "social_notification" USING btree ("user_id","status");
--> statement-breakpoint
CREATE INDEX "social_notification_user_created_idx" ON "social_notification" USING btree ("user_id","created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "social_block_pair_unique" ON "social_block" USING btree ("user_id","blocked_user_id");
--> statement-breakpoint
CREATE INDEX "social_block_user_idx" ON "social_block" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "social_block_blocked_user_idx" ON "social_block" USING btree ("blocked_user_id");
--> statement-breakpoint
CREATE INDEX "social_report_reported_status_idx" ON "social_report" USING btree ("reported_user_id","status");
--> statement-breakpoint
CREATE INDEX "social_report_reporter_idx" ON "social_report" USING btree ("reporter_user_id");
--> statement-breakpoint
CREATE INDEX "social_profile_discoverable_idx" ON "social_profile" USING btree ("is_discoverable");
--> statement-breakpoint
CREATE INDEX "social_profile_location_idx" ON "social_profile" USING btree ("city","gym_district");
--> statement-breakpoint
CREATE INDEX "social_profile_radius_idx" ON "social_profile" USING btree ("search_radius_km");
