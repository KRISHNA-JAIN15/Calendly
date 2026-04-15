import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { formatInTimeZone } from "date-fns-tz";
import { CalendarCheck2, Clock4, History } from "lucide-react";
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

  const totalMeetings = meetings.length;
  const upcomingCount = upcomingMeetings.length;
  const pastCount = pastMeetings.length;

  const renderMeetingList = (items: MeetingRow[], listType: "upcoming" | "past") => {
    if (items.length === 0) {
      return (
        <Card className="border-zinc-200/80 dark:border-zinc-800">
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

          const meetingStatusLabel = listType === "upcoming" ? "Upcoming" : "Completed";
          const meetingStatusClassName =
            listType === "upcoming"
              ? "bg-cyan-100 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-300"
              : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";

          return (
            <Card key={meeting.id} className="border-zinc-200/80 dark:border-zinc-800">
              <CardHeader className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{meeting.eventName}</CardTitle>
                    <CardDescription>{dateTime.date}</CardDescription>
                  </div>
                  <span
                    className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-medium ${meetingStatusClassName}`}
                  >
                    {meetingStatusLabel}
                  </span>
                </div>

                <p className="break-words rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                  {dateTime.time}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Invitee:</span> {meeting.inviteeName}
                </p>
                <p className="text-sm text-muted-foreground break-all">
                  <span className="font-medium text-foreground">Email:</span> {meeting.inviteeEmail}
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
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 pt-6 pb-8 sm:px-6">
      <section className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Meetings</h1>
          <p className="text-sm text-muted-foreground">
            View upcoming and past meetings, and cancel upcoming meetings.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
            <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              <CalendarCheck2 className="size-3.5" />
              Total meetings
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{totalMeetings}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
            <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              <Clock4 className="size-3.5" />
              Upcoming
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{upcomingCount}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
            <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              <History className="size-3.5" />
              Past
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{pastCount}</p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight sm:text-xl">Upcoming meetings</h2>
        {renderMeetingList(upcomingMeetings, "upcoming")}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight sm:text-xl">Past meetings</h2>
        {renderMeetingList(pastMeetings, "past")}
      </section>
    </div>
  );
}
