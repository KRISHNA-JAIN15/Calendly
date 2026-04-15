import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { ScheduleForm } from "@/components/schedule/schedule-form";
import { db } from "@/db/db";
import { DAYS_OF_WEEK_IN_ORDER } from "@/data/constants";
import { ScheduleAvailabilityTable, ScheduleTable } from "@/db/schema";
import { ensureScheduleWithDefaults } from "@/lib/schedule-defaults";

const TIMEZONE_OPTIONS = [
  "Asia/Kolkata",
  "UTC",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
  "Australia/Sydney",
];

function getGmtOffsetLabel(timezone: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "shortOffset",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date());

    const offset = parts.find((part) => part.type === "timeZoneName")?.value;
    if (!offset) {
      return "GMT";
    }

    return offset.replace("UTC", "GMT");
  } catch {
    return "GMT";
  }
}

function formatTimezoneLabel(timezone: string) {
  const gmtOffset = getGmtOffsetLabel(timezone);
  const readableTimezone = timezone.replace(/_/g, " ");
  return `${readableTimezone} (${gmtOffset})`;
}

type SchedulePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type DayOfWeek = (typeof DAYS_OF_WEEK_IN_ORDER)[number];

type SaveScheduleResult = {
  success?: boolean;
  error?: string;
};

function isDayOfWeek(value: string): value is DayOfWeek {
  return (DAYS_OF_WEEK_IN_ORDER as readonly string[]).includes(value);
}

export default async function SchedulePage({ searchParams }: SchedulePageProps) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  await searchParams;

  const { schedule, availabilities: existingAvailabilities } =
    await ensureScheduleWithDefaults(userId);

  const defaultTimezone = schedule?.timezone ?? "Asia/Kolkata";
  const timezoneOptions = (TIMEZONE_OPTIONS as readonly string[]).includes(defaultTimezone)
    ? TIMEZONE_OPTIONS
    : [defaultTimezone, ...TIMEZONE_OPTIONS];
  const timezoneOptionLabels = timezoneOptions.map((timezone) => ({
    value: timezone,
    label: formatTimezoneLabel(timezone),
  }));

  async function saveSchedule(formData: FormData): Promise<SaveScheduleResult> {
    "use server";

    const { userId } = await auth();
    if (!userId) {
      redirect("/sign-in");
    }

    const timezone = String(formData.get("timezone") ?? "").trim();
    const slotDays = formData.getAll("slotDay").map((value) => String(value));
    const slotStarts = formData.getAll("slotStart").map((value) => String(value));
    const slotEnds = formData.getAll("slotEnd").map((value) => String(value));

    if (!timezone) {
      return { error: "Please select a timezone." };
    }

    if (slotDays.length === 0) {
      return { error: "Add at least one available time slot." };
    }

    if (slotDays.length !== slotStarts.length || slotDays.length !== slotEnds.length) {
      return { error: "Invalid schedule payload. Please try again." };
    }

    const availabilitiesToSave: Array<{
      dayOfWeek: DayOfWeek;
      startTime: string;
      endTime: string;
    }> = [];

    for (let index = 0; index < slotDays.length; index += 1) {
      const dayRaw = slotDays[index];
      const startTime = slotStarts[index]?.trim() ?? "";
      const endTime = slotEnds[index]?.trim() ?? "";

      if (!isDayOfWeek(dayRaw)) {
        return { error: "Invalid day selected." };
      }

      if (!startTime || !endTime) {
        return { error: `Please set both start and end time for ${dayRaw}.` };
      }

      if (!startTime || !endTime || startTime >= endTime) {
        return { error: `End time must be after start time for ${dayRaw}.` };
      }

      availabilitiesToSave.push({ dayOfWeek: dayRaw, startTime, endTime });
    }

    for (const dayOfWeek of DAYS_OF_WEEK_IN_ORDER) {
      const daySlots = availabilitiesToSave
        .filter((slot) => slot.dayOfWeek === dayOfWeek)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

      for (let index = 1; index < daySlots.length; index += 1) {
        const previousSlot = daySlots[index - 1];
        const currentSlot = daySlots[index];

        if (currentSlot.startTime < previousSlot.endTime) {
          return { error: `Available slots overlap on ${dayOfWeek}.` };
        }
      }
    }

    const schedules = await db
      .select({
        id: ScheduleTable.id,
      })
      .from(ScheduleTable)
      .where(eq(ScheduleTable.clerkUserId, userId))
      .limit(1);

    let scheduleId = schedules[0]?.id;

    if (scheduleId) {
      await db
        .update(ScheduleTable)
        .set({ timezone })
        .where(eq(ScheduleTable.id, scheduleId));
    } else {
      const inserted = await db
        .insert(ScheduleTable)
        .values({
          clerkUserId: userId,
          timezone,
        })
        .returning({ id: ScheduleTable.id });

      scheduleId = inserted[0]?.id;
    }

    if (!scheduleId) {
      return { error: "Could not save schedule. Please try again." };
    }

    await db
      .delete(ScheduleAvailabilityTable)
      .where(eq(ScheduleAvailabilityTable.scheduleId, scheduleId));

    await db.insert(ScheduleAvailabilityTable).values(
      availabilitiesToSave.map(({ dayOfWeek, startTime, endTime }) => ({
        scheduleId,
        dayOfWeek,
        startTime,
        endTime,
      }))
    );

    revalidatePath("/schedule");
    return { success: true };
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Schedule</h1>
        <p className="text-sm text-muted-foreground">
          Weekly availability form. Schedule will be used to show available time slots on the booking page based on the event duration and existing bookings.
        </p>
      </div>

      <ScheduleForm
        action={saveSchedule}
        defaultTimezone={defaultTimezone}
        timezoneOptions={timezoneOptionLabels}
        initialSlots={existingAvailabilities}
      />
    </div>
  );
}