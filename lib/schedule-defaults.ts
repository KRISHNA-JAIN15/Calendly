import { eq } from "drizzle-orm";
import { db } from "@/db/db";
import { DAYS_OF_WEEK_IN_ORDER } from "@/data/constants";
import { ScheduleAvailabilityTable, ScheduleTable } from "@/db/schema";

type DayOfWeek = (typeof DAYS_OF_WEEK_IN_ORDER)[number];

type ScheduleAvailability = {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
};

export const DEFAULT_SCHEDULE_TIMEZONE = "Asia/Kolkata";

const DEFAULT_SCHEDULE_AVAILABILITIES: Array<{
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
}> = DAYS_OF_WEEK_IN_ORDER.filter(
  (day) => day !== "Saturday" && day !== "Sunday"
).map((day) => ({
  dayOfWeek: day,
  startTime: "09:00",
  endTime: "17:00",
}));

export async function ensureScheduleWithDefaults(clerkUserId: string): Promise<{
  schedule: {
    id: string;
    timezone: string;
  };
  availabilities: ScheduleAvailability[];
}> {
  let schedules = await db
    .select({
      id: ScheduleTable.id,
      timezone: ScheduleTable.timezone,
    })
    .from(ScheduleTable)
    .where(eq(ScheduleTable.clerkUserId, clerkUserId))
    .limit(1);

  if (!schedules[0]) {
    await db
      .insert(ScheduleTable)
      .values({
        clerkUserId,
        timezone: DEFAULT_SCHEDULE_TIMEZONE,
      })
      .onConflictDoNothing({ target: ScheduleTable.clerkUserId });

    schedules = await db
      .select({
        id: ScheduleTable.id,
        timezone: ScheduleTable.timezone,
      })
      .from(ScheduleTable)
      .where(eq(ScheduleTable.clerkUserId, clerkUserId))
      .limit(1);
  }

  const schedule = schedules[0];
  if (!schedule) {
    throw new Error("Could not initialize schedule");
  }

  let availabilities = await db
    .select({
      dayOfWeek: ScheduleAvailabilityTable.dayOfWeek,
      startTime: ScheduleAvailabilityTable.startTime,
      endTime: ScheduleAvailabilityTable.endTime,
    })
    .from(ScheduleAvailabilityTable)
    .where(eq(ScheduleAvailabilityTable.scheduleId, schedule.id));

  if (availabilities.length === 0) {
    await db.insert(ScheduleAvailabilityTable).values(
      DEFAULT_SCHEDULE_AVAILABILITIES.map((availability) => ({
        scheduleId: schedule.id,
        dayOfWeek: availability.dayOfWeek,
        startTime: availability.startTime,
        endTime: availability.endTime,
      }))
    );

    availabilities = await db
      .select({
        dayOfWeek: ScheduleAvailabilityTable.dayOfWeek,
        startTime: ScheduleAvailabilityTable.startTime,
        endTime: ScheduleAvailabilityTable.endTime,
      })
      .from(ScheduleAvailabilityTable)
      .where(eq(ScheduleAvailabilityTable.scheduleId, schedule.id));
  }

  return {
    schedule,
    availabilities,
  };
}
