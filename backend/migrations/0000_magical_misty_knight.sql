CREATE TABLE "analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"selected_deal_ids" jsonb NOT NULL,
	"deal_count" integer NOT NULL,
	"error_message" text,
	"error_step" varchar(50),
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" varchar(50) NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"instance_url" varchar(500),
	"token_expires_at" timestamp,
	"last_sync_at" timestamp,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deal_stage_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"stage_name" varchar(100) NOT NULL,
	"entered_at" timestamp NOT NULL,
	"exited_at" timestamp,
	"duration_days" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"crm_connection_id" uuid NOT NULL,
	"external_id" varchar(255) NOT NULL,
	"name" varchar(500) NOT NULL,
	"company_name" varchar(255),
	"amount" numeric(12, 2),
	"currency" varchar(3) DEFAULT 'USD',
	"close_date" date,
	"stage_name" varchar(100),
	"owner_name" varchar(255),
	"contact_name" varchar(255),
	"contact_title" varchar(255),
	"contact_email" varchar(255),
	"industry" varchar(100),
	"employee_count" integer,
	"description" text,
	"raw_data" jsonb,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enrichment_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" varchar(50) NOT NULL,
	"api_key" text NOT NULL,
	"is_valid" boolean DEFAULT false NOT NULL,
	"last_validated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid,
	"queue_name" varchar(100) NOT NULL,
	"job_id" varchar(255) NOT NULL,
	"status" varchar(20) NOT NULL,
	"attempt_number" integer DEFAULT 1 NOT NULL,
	"duration_ms" integer,
	"error_message" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patterns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid NOT NULL,
	"pain_points" jsonb NOT NULL,
	"winning_subjects" jsonb NOT NULL,
	"common_objections" jsonb NOT NULL,
	"avg_sales_cycle_days" integer,
	"champion_roles" jsonb NOT NULL,
	"industry_breakdown" jsonb,
	"deal_size_range" jsonb,
	"raw_llm_output" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "patterns_analysis_id_unique" UNIQUE("analysis_id")
);
--> statement-breakpoint
CREATE TABLE "playbooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid NOT NULL,
	"prospect_id" uuid NOT NULL,
	"cold_email" jsonb NOT NULL,
	"discovery_questions" jsonb NOT NULL,
	"pain_points" jsonb NOT NULL,
	"objection_handling" jsonb NOT NULL,
	"champion_persona" jsonb NOT NULL,
	"predicted_timeline" jsonb NOT NULL,
	"case_study_ref" jsonb NOT NULL,
	"quality_score" integer,
	"user_feedback" varchar(10),
	"raw_llm_output" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "playbooks_prospect_id_unique" UNIQUE("prospect_id")
);
--> statement-breakpoint
CREATE TABLE "prospects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"domain" varchar(255),
	"industry" varchar(100),
	"employee_count" integer,
	"revenue" varchar(50),
	"location" varchar(255),
	"tech_stack" jsonb,
	"match_score" integer,
	"match_reasons" jsonb,
	"contact_name" varchar(255),
	"contact_title" varchar(255),
	"contact_email" varchar(255),
	"contact_linkedin" varchar(500),
	"clay_enrichment_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"full_name" varchar(255),
	"company_name" varchar(255),
	"onboarding_step" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id")
);
--> statement-breakpoint
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_connections" ADD CONSTRAINT "crm_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_stage_history" ADD CONSTRAINT "deal_stage_history_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_crm_connection_id_crm_connections_id_fk" FOREIGN KEY ("crm_connection_id") REFERENCES "public"."crm_connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrichment_configs" ADD CONSTRAINT "enrichment_configs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_logs" ADD CONSTRAINT "job_logs_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patterns" ADD CONSTRAINT "patterns_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbooks" ADD CONSTRAINT "playbooks_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbooks" ADD CONSTRAINT "playbooks_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospects" ADD CONSTRAINT "prospects_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analyses_user_id_idx" ON "analyses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "analyses_status_idx" ON "analyses" USING btree ("status");--> statement-breakpoint
CREATE INDEX "crm_connections_user_id_idx" ON "crm_connections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "deal_stage_history_deal_id_idx" ON "deal_stage_history" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "deals_user_id_idx" ON "deals" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "deals_user_external_id_idx" ON "deals" USING btree ("user_id","external_id");--> statement-breakpoint
CREATE INDEX "enrichment_configs_user_id_idx" ON "enrichment_configs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "job_logs_analysis_id_idx" ON "job_logs" USING btree ("analysis_id");--> statement-breakpoint
CREATE INDEX "playbooks_analysis_id_idx" ON "playbooks" USING btree ("analysis_id");--> statement-breakpoint
CREATE INDEX "playbooks_prospect_id_idx" ON "playbooks" USING btree ("prospect_id");--> statement-breakpoint
CREATE INDEX "prospects_analysis_id_idx" ON "prospects" USING btree ("analysis_id");