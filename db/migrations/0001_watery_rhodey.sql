CREATE TYPE "public"."bookingStatus" AS ENUM('confirmed', 'cancelled');--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"eventId" uuid NOT NULL,
	"clerkUserId" text NOT NULL,
	"inviteeName" text NOT NULL,
	"inviteeEmail" text NOT NULL,
	"startsAt" timestamp NOT NULL,
	"endsAt" timestamp NOT NULL,
	"timezone" text NOT NULL,
	"status" "bookingStatus" DEFAULT 'confirmed' NOT NULL,
	"cancelledAt" timestamp,
	"cancellationReason" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_start_before_end_check" CHECK ("bookings"."startsAt" < "bookings"."endsAt")
);
--> statement-breakpoint
DROP INDEX "clerkUserIdIndex";--> statement-breakpoint
DROP INDEX "scheduleIdIndex";--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "slug" text NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_eventId_events_id_fk" FOREIGN KEY ("eventId") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookings_eventId_idx" ON "bookings" USING btree ("eventId");--> statement-breakpoint
CREATE INDEX "bookings_startsAt_idx" ON "bookings" USING btree ("startsAt");--> statement-breakpoint
CREATE INDEX "bookings_clerkUserId_startsAt_idx" ON "bookings" USING btree ("clerkUserId","startsAt");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_event_slot_status_idx" ON "bookings" USING btree ("eventId","startsAt","status");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_host_slot_status_idx" ON "bookings" USING btree ("clerkUserId","startsAt","status");--> statement-breakpoint
CREATE INDEX "events_clerkUserId_idx" ON "events" USING btree ("clerkUserId");--> statement-breakpoint
CREATE UNIQUE INDEX "events_slug_idx" ON "events" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "scheduleAvailabilities_scheduleId_idx" ON "scheduleAvailabilities" USING btree ("scheduleId");--> statement-breakpoint
CREATE UNIQUE INDEX "scheduleAvailabilities_unique_slot_idx" ON "scheduleAvailabilities" USING btree ("scheduleId","dayOfWeek","startTime","endTime");--> statement-breakpoint
ALTER TABLE "scheduleAvailabilities" ADD CONSTRAINT "scheduleAvailabilities_start_before_end_check" CHECK ("scheduleAvailabilities"."startTime" < "scheduleAvailabilities"."endTime");