import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db/db";
import { EventTable, UserPublicProfileTable } from "@/db/schema";
import {
  buildCandidateTimesForDate,
  formatTimeInTimezone,
  getValidTimesFromSchedule,
} from "@/lib/booking-availability";
import { formatInTimeZone } from "date-fns-tz";
import { ensureScheduleWithDefaults } from "@/lib/schedule-defaults";

type PublicEventPageProps = {
  params: Promise<{ username: string; eventSlug: string }>;
  searchParams: Promise<{ date?: string }>;
};

function isDateISO(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export default async function PublicEventPage({
  params,
  searchParams,
}: PublicEventPageProps) {
  const { username, eventSlug } = await params;
  const { date } = await searchParams;
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
  const timezone = schedule.timezone;
  const todayInTimezone = formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
  const selectedDate = date && isDateISO(date) ? date : todayInTimezone;

  const candidateTimes = buildCandidateTimesForDate(selectedDate, timezone, 15);

  const validTimes = await getValidTimesFromSchedule(candidateTimes, {
    clerkUserId: profile.clerkUserId,
    durationInMinutes: event.durationInMinutes,
  });

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          <Link href={`/${profile.publicSlug}`} className="underline underline-offset-4">
            @{profile.publicSlug}
          </Link>
        </p>
        <h1 className="text-3xl font-semibold">{event.name}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{event.durationInMinutes} minute meeting</CardTitle>
          <CardDescription>{event.description || "No description"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="space-y-2" method="get">
            <label htmlFor="date" className="block text-sm font-medium">
              Select date
            </label>
            <input
              id="date"
              name="date"
              type="date"
              defaultValue={selectedDate}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <button
              type="submit"
              className="inline-flex h-8 items-center rounded-lg border border-zinc-200 px-3 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            >
              Check availability
            </button>
          </form>

          {validTimes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No available slots for this date.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium">Available times ({timezone})</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {validTimes.map((time) => (
                  <button
                    key={time.toISOString()}
                    type="button"
                    className="h-9 rounded-lg border border-zinc-200 px-3 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                  >
                    {formatTimeInTimezone(time, timezone)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
