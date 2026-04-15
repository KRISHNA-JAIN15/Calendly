import { addMinutes, areIntervalsOverlapping, isWithinInterval, setHours, setMinutes } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { and, eq, gt, lt } from "drizzle-orm";
import { db } from "@/db/db";
import { DAYS_OF_WEEK_IN_ORDER } from "@/data/constants";
import { BookingTable, bookingStatusEnum } from "@/db/schema";
import { getCalendarEventTimes } from "@/lib/google-calendar";
import { ensureScheduleWithDefaults } from "@/lib/schedule-defaults";

type DayOfWeek = (typeof DAYS_OF_WEEK_IN_ORDER)[number];
type ScheduleAvailability = {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
};

type EventInterval = {
  start: Date;
  end: Date;
};

type ValidTimesInput = {
  clerkUserId: string;
  durationInMinutes: number;
};

export async function getValidTimesFromSchedule(
  timesInOrder: Date[],
  event: ValidTimesInput
): Promise<Date[]> {
  const start = timesInOrder[0];
  const end = timesInOrder.at(-1);

  if (!start || !end) {
    return [];
  }

  const { schedule, availabilities } = await ensureScheduleWithDefaults(
    event.clerkUserId
  );

  const groupedAvailabilities = availabilities.reduce<
    Partial<Record<DayOfWeek, ScheduleAvailability[]>>
  >((grouped, availability) => {
    const day = availability.dayOfWeek;

    if (!grouped[day]) {
      grouped[day] = [];
    }

    grouped[day]!.push(availability);
    return grouped;
  }, {});

  const bookingIntervals = await getExistingBookingTimes(event.clerkUserId, start, end);
  const googleIntervals = await getGoogleEventTimesSafe(event.clerkUserId, start, end);
  const blockedIntervals = [...bookingIntervals, ...googleIntervals];

  return timesInOrder.filter((intervalDate) => {
    const availabilityIntervals = getAvailabilitiesForDate(
      groupedAvailabilities,
      intervalDate,
      schedule.timezone
    );

    const eventInterval = {
      start: intervalDate,
      end: addMinutes(intervalDate, event.durationInMinutes),
    };

    const hasOverlap = blockedIntervals.some((blockedInterval) =>
      areIntervalsOverlapping(blockedInterval, eventInterval)
    );

    const isInsideAvailability = availabilityIntervals.some((availabilityInterval) => {
      return (
        isWithinInterval(eventInterval.start, availabilityInterval) &&
        isWithinInterval(eventInterval.end, availabilityInterval)
      );
    });

    return !hasOverlap && isInsideAvailability;
  });
}

export function buildCandidateTimesForDate(
  dateISO: string,
  timezone: string,
  intervalMinutes = 15
): Date[] {
  const [year, month, day] = dateISO.split("-").map(Number);
  if (!year || !month || !day) {
    return [];
  }

  const zonedDayStart = new Date(year, month - 1, day, 0, 0, 0, 0);
  const zonedDayEnd = new Date(year, month - 1, day, 23, 59, 59, 999);

  const startUtc = fromZonedTime(zonedDayStart, timezone);
  const endUtc = fromZonedTime(zonedDayEnd, timezone);

  const times: Date[] = [];
  for (
    let cursor = new Date(startUtc);
    cursor <= endUtc;
    cursor = addMinutes(cursor, intervalMinutes)
  ) {
    times.push(new Date(cursor));
  }

  return times;
}

export function formatTimeInTimezone(date: Date, timezone: string) {
  return formatInTimeZone(date, timezone, "hh:mm a");
}

async function getExistingBookingTimes(
  clerkUserId: string,
  start: Date,
  end: Date
): Promise<EventInterval[]> {
  const confirmedStatus: (typeof bookingStatusEnum.enumValues)[number] = "confirmed";

  const existingBookings = await db
    .select({
      startsAt: BookingTable.startsAt,
      endsAt: BookingTable.endsAt,
    })
    .from(BookingTable)
    .where(
      and(
        eq(BookingTable.clerkUserId, clerkUserId),
        eq(BookingTable.status, confirmedStatus),
        lt(BookingTable.startsAt, end),
        gt(BookingTable.endsAt, start)
      )
    );

  return existingBookings.map((booking) => ({
    start: booking.startsAt,
    end: booking.endsAt,
  }));
}

async function getGoogleEventTimesSafe(
  clerkUserId: string,
  start: Date,
  end: Date
): Promise<EventInterval[]> {
  try {
    return await getCalendarEventTimes(clerkUserId, { start, end });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message.includes("Google account is not connected")) {
      return [];
    }

    // If we cannot verify busy windows, block the entire range to avoid double-booking.
    return [{ start, end }];
  }
}

function getAvailabilitiesForDate(
  groupedAvailabilities: Partial<Record<DayOfWeek, ScheduleAvailability[]>>,
  dateUtc: Date,
  timezone: string
): EventInterval[] {
  const zonedDate = toZonedTime(dateUtc, timezone);
  const dayIndex = (zonedDate.getDay() + 6) % 7;
  const dayOfWeek = DAYS_OF_WEEK_IN_ORDER[dayIndex] as DayOfWeek;
  const availabilities = groupedAvailabilities[dayOfWeek];

  if (!availabilities || availabilities.length === 0) {
    return [];
  }

  return availabilities.map(({ startTime, endTime }) => {
    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);

    const zonedStart = setMinutes(setHours(zonedDate, startHour), startMinute);
    const zonedEnd = setMinutes(setHours(zonedDate, endHour), endMinute);

    return {
      start: fromZonedTime(zonedStart, timezone),
      end: fromZonedTime(zonedEnd, timezone),
    };
  });
}
