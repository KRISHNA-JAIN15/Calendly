"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DAYS_OF_WEEK_IN_ORDER } from "@/data/constants";

type DayOfWeek = (typeof DAYS_OF_WEEK_IN_ORDER)[number];

type SlotInput = {
  id: string;
  startTime: string;
  endTime: string;
};

type TimezoneOption = {
  value: string;
  label: string;
};

type InitialSlot = {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
};

type SaveScheduleResult = {
  success?: boolean;
  error?: string;
};

type ScheduleFormProps = {
  action: (formData: FormData) => Promise<SaveScheduleResult>;
  defaultTimezone: string;
  timezoneOptions: TimezoneOption[];
  initialSlots: InitialSlot[];
};

function createSlotId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildInitialSlotsByDay(initialSlots: InitialSlot[]) {
  const emptyByDay = Object.fromEntries(
    DAYS_OF_WEEK_IN_ORDER.map((day) => [day, [] as SlotInput[]])
  ) as Record<DayOfWeek, SlotInput[]>;

  if (initialSlots.length > 0) {
    for (const slot of initialSlots) {
      emptyByDay[slot.dayOfWeek].push({
        id: createSlotId(),
        startTime: slot.startTime,
        endTime: slot.endTime,
      });
    }

    return emptyByDay;
  }

  for (const day of DAYS_OF_WEEK_IN_ORDER) {
    if (day === "Saturday" || day === "Sunday") {
      continue;
    }

    emptyByDay[day].push({
      id: createSlotId(),
      startTime: "09:00",
      endTime: "17:00",
    });
  }

  return emptyByDay;
}

export function ScheduleForm({ action, defaultTimezone, timezoneOptions, initialSlots }: ScheduleFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [timezone, setTimezone] = useState(defaultTimezone);
  const [slotsByDay, setSlotsByDay] = useState<Record<DayOfWeek, SlotInput[]>>(() =>
    buildInitialSlotsByDay(initialSlots)
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timeout = setTimeout(() => {
      setSuccessMessage("");
    }, 2200);

    return () => {
      clearTimeout(timeout);
    };
  }, [successMessage]);

  const addSlot = (day: DayOfWeek) => {
    setSlotsByDay((previous) => ({
      ...previous,
      [day]: [
        ...previous[day],
        {
          id: createSlotId(),
          startTime: "09:00",
          endTime: "17:00",
        },
      ],
    }));
  };

  const removeSlot = (day: DayOfWeek, slotId: string) => {
    setSlotsByDay((previous) => ({
      ...previous,
      [day]: previous[day].filter((slot) => slot.id !== slotId),
    }));
  };

  const updateSlot = (day: DayOfWeek, slotId: string, field: "startTime" | "endTime", value: string) => {
    setSlotsByDay((previous) => ({
      ...previous,
      [day]: previous[day].map((slot) =>
        slot.id === slotId
          ? {
              ...slot,
              [field]: value,
            }
          : slot
      ),
    }));
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const formData = new FormData();
    formData.set("timezone", timezone);

    for (const day of DAYS_OF_WEEK_IN_ORDER) {
      for (const slot of slotsByDay[day]) {
        formData.append("slotDay", day);
        formData.append("slotStart", slot.startTime);
        formData.append("slotEnd", slot.endTime);
      }
    }

    startTransition(async () => {
      const result = await action(formData);

      if (result?.error) {
        setErrorMessage(result.error);
        return;
      }

      setSuccessMessage("Schedule saved.");
      router.refresh();
    });
  };

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      {successMessage ? (
        <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {successMessage}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Weekly availability</CardTitle>
          <CardDescription>
            Add one or more slots per day. You can split morning and afternoon hours separately.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="timezone" className="text-sm font-medium">
              Time zone
            </label>
            <select
              id="timezone"
              name="timezone"
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {timezoneOptions.map((timezoneOption) => (
                <option key={timezoneOption.value} value={timezoneOption.value}>
                  {timezoneOption.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Available slots</p>
            <div className="space-y-3">
              {DAYS_OF_WEEK_IN_ORDER.map((day) => (
                <div
                  key={day}
                  className="space-y-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{day}</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addSlot(day)}
                      className="border-cyan-300 text-cyan-700 hover:bg-cyan-50 dark:border-cyan-700 dark:text-cyan-300 dark:hover:bg-cyan-900/40"
                    >
                      Add slot
                    </Button>
                  </div>

                  {slotsByDay[day].length === 0 ? (
                    <p className="text-xs text-muted-foreground">No slots for this day.</p>
                  ) : (
                    <div className="space-y-2">
                      {slotsByDay[day].map((slot) => (
                        <div key={slot.id} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                          <div className="space-y-1">
                            <label htmlFor={`${day}-${slot.id}-start`} className="text-xs text-muted-foreground">
                              Start
                            </label>
                            <Input
                              id={`${day}-${slot.id}-start`}
                              type="time"
                              value={slot.startTime}
                              onChange={(event) => updateSlot(day, slot.id, "startTime", event.target.value)}
                            />
                          </div>

                          <div className="space-y-1">
                            <label htmlFor={`${day}-${slot.id}-end`} className="text-xs text-muted-foreground">
                              End
                            </label>
                            <Input
                              id={`${day}-${slot.id}-end`}
                              type="time"
                              value={slot.endTime}
                              onChange={(event) => updateSlot(day, slot.id, "endTime", event.target.value)}
                            />
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSlot(day, slot.id)}
                            className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end mb-16">
        <Button
          type="submit"
          disabled={isPending}
          className="rounded-lg border border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700 dark:border-emerald-400 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400"
        >
          {isPending ? "Saving..." : "Save schedule"}
        </Button>
      </div>
    </form>
  );
}
