CREATE TABLE IF NOT EXISTS "project_member" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"invited_by" uuid,
	"joined_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "project_invitation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"token" text NOT NULL,
	"invited_by" uuid NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"accepted_by" uuid,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "project_member" ADD CONSTRAINT "project_member_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "project_member" ADD CONSTRAINT "project_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "project_member" ADD CONSTRAINT "project_member_invited_by_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "project_invitation" ADD CONSTRAINT "project_invitation_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "project_invitation" ADD CONSTRAINT "project_invitation_invited_by_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "project_invitation" ADD CONSTRAINT "project_invitation_accepted_by_user_id_fk" FOREIGN KEY ("accepted_by") REFERENCES "user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create unique constraints
DO $$ BEGIN
 ALTER TABLE "project_member" ADD CONSTRAINT "project_member_unique" UNIQUE("project_id","user_id");
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "project_invitation" ADD CONSTRAINT "project_invitation_token_unique" UNIQUE("token");
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS "project_member_project_idx" ON "project_member" USING btree ("project_id");
CREATE INDEX IF NOT EXISTS "project_member_user_idx" ON "project_member" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "project_member_role_idx" ON "project_member" USING btree ("role");
CREATE INDEX IF NOT EXISTS "project_invitation_project_idx" ON "project_invitation" USING btree ("project_id");
CREATE INDEX IF NOT EXISTS "project_invitation_email_idx" ON "project_invitation" USING btree ("email");
CREATE INDEX IF NOT EXISTS "project_invitation_token_idx" ON "project_invitation" USING btree ("token");
CREATE INDEX IF NOT EXISTS "project_invitation_expires_idx" ON "project_invitation" USING btree ("expires_at");

-- Migrate existing projects to have owner members
INSERT INTO "project_member" ("project_id", "user_id", "role", "joined_at", "created_at")
SELECT 
    "id",
    "user_id", 
    'owner',
    "created_at",
    "created_at"
FROM "project"
WHERE NOT EXISTS (
    SELECT 1 FROM "project_member" 
    WHERE "project_member"."project_id" = "project"."id" 
    AND "project_member"."user_id" = "project"."user_id"
    AND "project_member"."role" = 'owner'
);
