CREATE TABLE "chart_generation_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"datasource_id" uuid NOT NULL,
	"original_query" text NOT NULL,
	"selected_tables" json NOT NULL,
	"generated_sql" text NOT NULL,
	"sql_success" boolean NOT NULL,
	"error_message" text,
	"retry_count" integer DEFAULT 0,
	"final_chart_id" uuid,
	"ai_provider" text NOT NULL,
	"ai_model" text NOT NULL,
	"execution_time" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chart" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"user_id" uuid NOT NULL,
	"datasource_id" uuid NOT NULL,
	"sql_query" text NOT NULL,
	"chart_type" text NOT NULL,
	"chart_config" json NOT NULL,
	"data_cache" json,
	"data_mode" text DEFAULT 'static' NOT NULL,
	"refresh_interval" integer,
	"tags" json DEFAULT '[]'::json,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboard_chart" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dashboard_id" uuid NOT NULL,
	"chart_id" uuid NOT NULL,
	"grid_position" json NOT NULL,
	"auto_refresh_enabled" boolean DEFAULT true NOT NULL,
	"refresh_interval" integer DEFAULT 60,
	"last_refresh" timestamp,
	"refresh_error_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "dashboard_chart_unique" UNIQUE("dashboard_id","chart_id")
);
--> statement-breakpoint
CREATE TABLE "dashboard" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"user_id" uuid NOT NULL,
	"layout" json NOT NULL,
	"refresh_config" json DEFAULT '{}'::json,
	"is_public" boolean DEFAULT false NOT NULL,
	"tags" json DEFAULT '[]'::json,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "datasource_connection_test" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"datasource_id" uuid NOT NULL,
	"success" boolean NOT NULL,
	"error_message" text,
	"response_time" integer,
	"metadata" json DEFAULT '{}'::json,
	"tested_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "datasource" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"user_id" uuid NOT NULL,
	"connection_config" json NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_connection_test" timestamp,
	"metadata" json DEFAULT '{}'::json,
	"tags" json DEFAULT '[]'::json,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "datasource_name_user_unique" UNIQUE("user_id","name")
);
--> statement-breakpoint
CREATE TABLE "studio_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_name" text DEFAULT 'New Sheet' NOT NULL,
	"selected_datasource_id" uuid,
	"selected_database" text,
	"selected_schema" text,
	"selected_tables" json DEFAULT '[]'::json,
	"expanded_sidebar" boolean DEFAULT true NOT NULL,
	"session_metadata" json DEFAULT '{}'::json,
	"chart_cards" json DEFAULT '[]'::json,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN "web_url" text;--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN "web_title" text;--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN "web_favicon" text;--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN "web_extracted_at" timestamp;--> statement-breakpoint
ALTER TABLE "chart_generation_history" ADD CONSTRAINT "chart_generation_history_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chart_generation_history" ADD CONSTRAINT "chart_generation_history_datasource_id_datasource_id_fk" FOREIGN KEY ("datasource_id") REFERENCES "public"."datasource"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chart_generation_history" ADD CONSTRAINT "chart_generation_history_final_chart_id_chart_id_fk" FOREIGN KEY ("final_chart_id") REFERENCES "public"."chart"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chart" ADD CONSTRAINT "chart_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chart" ADD CONSTRAINT "chart_datasource_id_datasource_id_fk" FOREIGN KEY ("datasource_id") REFERENCES "public"."datasource"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_chart" ADD CONSTRAINT "dashboard_chart_dashboard_id_dashboard_id_fk" FOREIGN KEY ("dashboard_id") REFERENCES "public"."dashboard"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_chart" ADD CONSTRAINT "dashboard_chart_chart_id_chart_id_fk" FOREIGN KEY ("chart_id") REFERENCES "public"."chart"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard" ADD CONSTRAINT "dashboard_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "datasource_connection_test" ADD CONSTRAINT "datasource_connection_test_datasource_id_datasource_id_fk" FOREIGN KEY ("datasource_id") REFERENCES "public"."datasource"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "datasource" ADD CONSTRAINT "datasource_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_session" ADD CONSTRAINT "studio_session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_session" ADD CONSTRAINT "studio_session_selected_datasource_id_datasource_id_fk" FOREIGN KEY ("selected_datasource_id") REFERENCES "public"."datasource"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chart_generation_user_idx" ON "chart_generation_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "chart_generation_datasource_idx" ON "chart_generation_history" USING btree ("datasource_id");--> statement-breakpoint
CREATE INDEX "chart_generation_success_idx" ON "chart_generation_history" USING btree ("sql_success");--> statement-breakpoint
CREATE INDEX "chart_user_id_idx" ON "chart" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "chart_datasource_id_idx" ON "chart" USING btree ("datasource_id");--> statement-breakpoint
CREATE INDEX "chart_type_idx" ON "chart" USING btree ("chart_type");--> statement-breakpoint
CREATE INDEX "chart_pinned_idx" ON "chart" USING btree ("is_pinned");--> statement-breakpoint
CREATE INDEX "dashboard_chart_dashboard_idx" ON "dashboard_chart" USING btree ("dashboard_id");--> statement-breakpoint
CREATE INDEX "dashboard_chart_chart_idx" ON "dashboard_chart" USING btree ("chart_id");--> statement-breakpoint
CREATE INDEX "dashboard_user_id_idx" ON "dashboard" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "dashboard_public_idx" ON "dashboard" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX "connection_test_datasource_idx" ON "datasource_connection_test" USING btree ("datasource_id");--> statement-breakpoint
CREATE INDEX "connection_test_success_idx" ON "datasource_connection_test" USING btree ("success");--> statement-breakpoint
CREATE INDEX "datasource_user_id_idx" ON "datasource" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "datasource_type_idx" ON "datasource" USING btree ("type");--> statement-breakpoint
CREATE INDEX "studio_session_user_idx" ON "studio_session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "studio_session_datasource_idx" ON "studio_session" USING btree ("selected_datasource_id");--> statement-breakpoint
CREATE INDEX "studio_session_user_active_idx" ON "studio_session" USING btree ("user_id","is_active");