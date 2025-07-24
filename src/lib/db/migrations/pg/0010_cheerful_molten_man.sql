ALTER TABLE "document" ADD COLUMN "document_type" text DEFAULT 'file' NOT NULL;--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN "youtube_video_id" text;--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN "youtube_thumbnail" text;--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN "youtube_title" text;--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN "youtube_channel_name" text;--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN "youtube_duration" integer;--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN "youtube_url" text;