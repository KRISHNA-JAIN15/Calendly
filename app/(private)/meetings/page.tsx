import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { formatInTimeZone } from "date-fns-tz";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CancelMeetingAlert } from "@/components/meetings/cancel-meeting-alert";
import { db } from "@/db/db";
import { BookingTable, EventTable, bookingStatusEnum } from "@/db/schema";
import { deleteCalendarEventForBooking } from "@/lib/google-calendar";
import { isValidTimezone } from "@/lib/timezones";

type CancelMeetingResult = {
  error?: string;
};

type MeetingRow = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  inviteeName: string;
  inviteeEmail: string;
  eventName: string;
};

function formatMeetingDateTime(
  startsAt: Date,
  endsAt: Date,
  timezone: string
): { date: string; time: string } {
  const validTimezone = isValidTimezone(timezone) ? timezone : "UTC";

  return {
    date: formatInTimeZone(startsAt, validTimezone, "EEEE, MMMM d, yyyy"),
    time: `${formatInTimeZone(startsAt, validTimezone, "h:mm a")} - ${formatInTimeZone(
      endsAt,
      validTimezone,
      "h:mm a"
    )} (${validTimezone})`,
  };
}

export default async function MeetingsPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  async function cancelMeeting(formData: FormData): Promise<CancelMeetingResult | void> {
    "use server";

    const { userId } = await auth();
    if (!userId) {
      return { error: "Your session expired. Please sign in again." };
    }

    const bookingId = String(formData.get("bookingId") ?? "").trim();
    if (!bookingId) {
      return { error: "Invalid meeting selected." };
    }

    const meetingRows = await db
      .select({
        id: BookingTable.id,
        startsAt: BookingTable.startsAt,
        endsAt: BookingTable.endsAt,
        inviteeEmail: BookingTable.inviteeEmail,
        eventName: EventTable.name,
      })
      .from(BookingTable)
      .innerJoin(EventTable, eq(BookingTable.eventId, EventTable.id))
      .where(
        and(
          eq(BookingTable.id, bookingId),
          eq(BookingTable.clerkUserId, userId),
          eq(BookingTable.status, "confirmed")
        )
      )
      .limit(1);

    const meeting = meetingRows[0];
    if (!meeting) {
      return { error: "Meeting not found." };
    }

    try {
      await deleteCalendarEventForBooking({
        clerkUserId: userId,
        bookingId: meeting.id,
        startTime: meeting.startsAt,
        endTime: meeting.endsAt,
        inviteeEmail: meeting.inviteeEmail,
        eventName: meeting.eventName,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";

      if (message.toLowerCase().includes("google account is not connected")) {
        return {
          error:
            "Google account is disconnected. Reconnect Google and retry cancellation.",
        };
      }

      return {
        error:
          "Could not delete this meeting from Google Calendar. Please reconnect Google and try again.",
      };
    }

    await db
      .delete(BookingTable)
      .where(and(eq(BookingTable.id, bookingId), eq(BookingTable.clerkUserId, userId)));

    revalidatePath("/meetings");
  }

  const confirmedStatus: (typeof bookingStatusEnum.enumValues)[number] = "confirmed";

  const meetings = await db
    .select({
      id: BookingTable.id,
      startsAt: BookingTable.startsAt,
      endsAt: BookingTable.endsAt,
      timezone: BookingTable.timezone,
      inviteeName: BookingTable.inviteeName,
      inviteeEmail: BookingTable.inviteeEmail,
      eventName: EventTable.name,
    })
    .from(BookingTable)
    .innerJoin(EventTable, eq(BookingTable.eventId, EventTable.id))
    .where(
      and(
        eq(BookingTable.clerkUserId, userId),
        eq(BookingTable.status, confirmedStatus)
      )
    )
    .orderBy(desc(BookingTable.startsAt));

  const now = new Date();

  const upcomingMeetings: MeetingRow[] = meetings.filter(
    (meeting) => meeting.startsAt >= now
  );
  const pastMeetings: MeetingRow[] = meetings.filter((meeting) => meeting.startsAt < now);

  const renderMeetingList = (items: MeetingRow[], listType: "upcoming" | "past") => {
    if (items.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>
              {listType === "upcoming" ? "No upcoming meetings" : "No past meetings"}
            </CardTitle>
            <CardDescription>
              {listType === "upcoming"
                ? "New bookings will appear here."
                : "Past meetings will appear here after they end."}
            </CardDescription>
          </CardHeader>
        </Card>
      );
    }

    return (
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((meeting) => {
          const dateTime = formatMeetingDateTime(
            meeting.startsAt,
            meeting.endsAt,
            meeting.timezone
          );

          return (
            <Card key={meeting.id}>
              <CardHeader>
                <CardTitle>{meeting.eventName}</CardTitle>
                <CardDescription>{dateTime.date}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{dateTime.time}</p>
                <p className="text-sm">
                  <span className="font-medium">Invitee:</span> {meeting.inviteeName}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Email:</span> {meeting.inviteeEmail}
                </p>
                {listType === "upcoming" ? (
                  <CancelMeetingAlert bookingId={meeting.id} action={cancelMeeting} />
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Meetings</h1>
        <p className="text-sm text-muted-foreground">
          View upcoming and past meetings, and cancel upcoming meetings.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Upcoming meetings</h2>
        {renderMeetingList(upcomingMeetings, "upcoming")}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Past meetings</h2>
        {renderMeetingList(pastMeetings, "past")}
      </section>
    </div>
  );
}
