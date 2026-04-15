import { addDays, addMinutes } from "date-fns";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db/db";
import { BookingTable, EventTable, UserPublicProfileTable } from "@/db/schema";
import { PublicEventBooking } from "@/components/public/public-event-booking";
import {
  buildCandidateTimesForDate,
  getValidTimesFromSchedule,
} from "@/lib/booking-availability";
import { formatInTimeZone } from "date-fns-tz";
import { createCalendarEvent } from "@/lib/google-calendar";
import {
  parseBookingFormData,
  parseGuestEmails,
  type BookMeetingResult,
} from "@/lib/meeting-booking";
import { ensureScheduleWithDefaults } from "@/lib/schedule-defaults";
import { getTimezoneOptions } from "@/lib/timezones";

type PublicEventPageProps = {
  params: Promise<{ username: string; eventSlug: string }>;
};

const AVAILABILITY_WINDOW_DAYS = 60;

export default async function PublicEventPage({
  params,
}: PublicEventPageProps) {
  const { username, eventSlug } = await params;
  const normalizedUsername = username.trim().toLowerCase();
  const normalizedEventSlug = eventSlug.trim().toLowerCase();

  const profiles = await db
    .select({
      clerkUserId: UserPublicProfileTable.clerkUserId,
      publicSlug: UserPublicProfileTable.publicSlug,
    })
    .from(UserPublicProfileTable)
    .where(eq(UserPublicProfileTable.publicSlug, normalizedUsername))
    .limit(1);

  const profile = profiles[0];
  if (!profile) {
    notFound();
  }

  const events = await db
    .select({
      id: EventTable.id,
      name: EventTable.name,
      slug: EventTable.slug,
      description: EventTable.description,
      durationInMinutes: EventTable.durationInMinutes,
    })
    .from(EventTable)
    .where(
      and(
        eq(EventTable.clerkUserId, profile.clerkUserId),
        eq(EventTable.slug, normalizedEventSlug),
        eq(EventTable.isActive, true)
      )
    )
    .limit(1);

  const event = events[0];
  if (!event) {
    notFound();
  }

  const { schedule } = await ensureScheduleWithDefaults(profile.clerkUserId);

  const availabilityDateKeys = Array.from(
    new Set(
      Array.from({ length: AVAILABILITY_WINDOW_DAYS }, (_, index) =>
        formatInTimeZone(addDays(new Date(), index), schedule.timezone, "yyyy-MM-dd")
      )
    )
  ).sort();

  const candidateTimes = availabilityDateKeys.flatMap((dateKey) =>
    buildCandidateTimesForDate(dateKey, schedule.timezone, 15)
  );

  const now = new Date();
  const futureCandidateTimes = candidateTimes.filter((time) => time.getTime() > now.getTime());

  const validTimes = await getValidTimesFromSchedule(futureCandidateTimes, {
    clerkUserId: profile.clerkUserId,
    durationInMinutes: event.durationInMinutes,
  });

  const availableStartTimesISO = validTimes.map((time) => time.toISOString());

  const timezoneOptions = getTimezoneOptions([schedule.timezone]);

  async function createMeeting(formData: FormData): Promise<BookMeetingResult> {
    "use server";

    const parsedPayload = parseBookingFormData(formData);
    if (!parsedPayload.success) {
      return {
        error:
          parsedPayload.error.issues[0]?.message ??
          "Please review your booking details and try again.",
      };
    }

    const payload = parsedPayload.data;

    if (
      payload.profileSlug !== normalizedUsername ||
      payload.eventSlug !== normalizedEventSlug
    ) {
      return {
        error: "Invalid booking link. Please refresh and try again.",
      };
    }

    const profiles = await db
      .select({
        clerkUserId: UserPublicProfileTable.clerkUserId,
      })
      .from(UserPublicProfileTable)
      .where(eq(UserPublicProfileTable.publicSlug, payload.profileSlug))
      .limit(1);

    const profile = profiles[0];
    if (!profile) {
      return { error: "This booking page is no longer available." };
    }

    const events = await db
      .select({
        id: EventTable.id,
        name: EventTable.name,
        slug: EventTable.slug,
        durationInMinutes: EventTable.durationInMinutes,
        clerkUserId: EventTable.clerkUserId,
      })
      .from(EventTable)
      .where(
        and(
          eq(EventTable.clerkUserId, profile.clerkUserId),
          eq(EventTable.slug, payload.eventSlug),
          eq(EventTable.isActive, true)
        )
      )
      .limit(1);

    const event = events[0];
    if (!event) {
      return { error: "This event type is no longer available." };
    }

    const requestedStartTime = new Date(payload.startTimeISO);
    if (Number.isNaN(requestedStartTime.getTime()) || requestedStartTime <= new Date()) {
      return { error: "Please pick a future time slot." };
    }

    const { schedule } = await ensureScheduleWithDefaults(event.clerkUserId);
    const bookingDate = formatInTimeZone(
      requestedStartTime,
      schedule.timezone,
      "yyyy-MM-dd"
    );

    const bookingDayCandidates = buildCandidateTimesForDate(
      bookingDate,
      schedule.timezone,
      15
    );

    const bookingDayValidTimes = await getValidTimesFromSchedule(bookingDayCandidates, {
      clerkUserId: event.clerkUserId,
      durationInMinutes: event.durationInMinutes,
    });

    const isTimeStillAvailable = bookingDayValidTimes.some(
      (time) => time.getTime() === requestedStartTime.getTime()
    );

    if (!isTimeStillAvailable) {
      return { error: "That time was just booked. Please choose another slot." };
    }

    const additionalGuestEmails = parseGuestEmails(payload.additionalGuests);
    const endsAt = addMinutes(requestedStartTime, event.durationInMinutes);

    let bookingId: string | undefined;
    try {
      const insertedBookings = await db
        .insert(BookingTable)
        .values({
          eventId: event.id,
          clerkUserId: event.clerkUserId,
          inviteeName: payload.inviteeName,
          inviteeEmail: payload.inviteeEmail,
          startsAt: requestedStartTime,
          endsAt,
          timezone: payload.inviteeTimezone,
        })
        .returning({ id: BookingTable.id });

      bookingId = insertedBookings[0]?.id;
    } catch (error) {
      const maybeDatabaseError = error as { code?: string } | null;
      if (maybeDatabaseError?.code === "23505") {
        return { error: "That time was just booked. Please choose another slot." };
      }

      return { error: "Could not save this booking. Please try again." };
    }

    try {
      await createCalendarEvent({
        clerkUserId: event.clerkUserId,
        guestName: payload.inviteeName,
        guestEmail: payload.inviteeEmail,
        guests: additionalGuestEmails.map((email) => ({ email })),
        startTime: requestedStartTime,
        guestNotes: payload.guestNotes,
        durationInMinutes: event.durationInMinutes,
        eventName: event.name,
      });
    } catch (error) {
      if (bookingId) {
        await db.delete(BookingTable).where(eq(BookingTable.id, bookingId));
      }

      const message = error instanceof Error ? error.message : "";
      if (message.includes("Google account is not connected")) {
        return {
          error:
            "This host has not connected Google Calendar yet. Please try again later.",
        };
      }

      return {
        error: "Could not create the calendar invite. Please pick another slot.",
      };
    }

    return {
      success: true,
      confirmation: {
        inviteeName: payload.inviteeName,
        inviteeEmail: payload.inviteeEmail,
        startTimeISO: requestedStartTime.toISOString(),
        inviteeTimezone: payload.inviteeTimezone,
      },
    };
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <PublicEventBooking
        profileSlug={profile.publicSlug}
        eventSlug={event.slug}
        eventName={event.name}
        eventDescription={event.description}
        durationInMinutes={event.durationInMinutes}
        hostTimezone={schedule.timezone}
        timezoneOptions={timezoneOptions}
        availableStartTimesISO={availableStartTimesISO}
        createMeetingAction={createMeeting}
      />
    </div>
  );
}
