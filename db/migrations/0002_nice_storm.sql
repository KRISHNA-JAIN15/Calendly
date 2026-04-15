CREATE TABLE "userPublicProfiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerkUserId" text NOT NULL,
	"publicSlug" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "userPublicProfiles_clerkUserId_unique" UNIQUE("clerkUserId")
);
--> statement-breakpoint
DROP INDEX "events_slug_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "userPublicProfiles_publicSlug_idx" ON "userPublicProfiles" USING btree ("publicSlug");--> statement-breakpoint
CREATE UNIQUE INDEX "events_clerkUserId_slug_idx" ON "events" USING btree ("clerkUserId","slug");