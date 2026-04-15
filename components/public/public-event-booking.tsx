"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addMinutes, areIntervalsOverlapping } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon, Clock3, Globe2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  meetingDetailsSchema,
  type BookMeetingResult,
} from "@/lib/meeting-booking";

type MeetingDetailsFormInput = z.input<typeof meetingDetailsSchema>;
type MeetingDetailsFormValues = z.output<typeof meetingDetailsSchema>;

type TimezoneOption = {
  value: string;
  label: string;
};

type PublicEventBookingProps = {
  profileSlug: string;
  eventSlug: string;
  eventName: string;
  eventDescription: string | null;
  durationInMinutes: number;
  hostTimezone: string;
  timezoneOptions: TimezoneOption[];
  availableStartTimesISO: string[];
  createMeetingAction: (formData: FormData) => Promise<BookMeetingResult>;
};

export function PublicEventBooking({
  profileSlug,
  eventSlug,
  eventName,
  eventDescription,
  durationInMinutes,
  hostTimezone,
  timezoneOptions,
  availableStartTimesISO,
  createMeetingAction,
}: PublicEventBookingProps) {
  const router = useRouter();

  const browserTimezone =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : undefined;

  const defaultInviteeTimezone =
    browserTimezone && timezoneOptions.some((option) => option.value === browserTimezone)
      ? browserTimezone
      : hostTimezone;

  const [selectedTimezone, setSelectedTimezone] = useState(defaultInviteeTimezone);
  const [step, setStep] = useState<"slot" | "details">("slot");
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [selectedStartTimeISO, setSelectedStartTimeISO] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>(() => [
    ...availableStartTimesISO,
  ]);
  const [serverError, setServerError] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setAvailableSlots(availableStartTimesISO);
  }, [availableStartTimesISO]);

  const slotsByDateKey = useMemo(() => {
    const grouped = new Map<string, string[]>();

    for (const slotIso of availableSlots) {
      const key = toCalendarDateKey(new Date(slotIso));
      const slots = grouped.get(key) ?? [];
      slots.push(slotIso);
      grouped.set(key, slots);
    }

    for (const [key, values] of grouped) {
      grouped.set(
        key,
        [...values].sort(
          (left, right) => new Date(left).getTime() - new Date(right).getTime()
        )
      );
    }

    return grouped;
  }, [availableSlots]);

  const availableDateKeys = useMemo(
    () => Array.from(slotsByDateKey.keys()).sort(),
    [slotsByDateKey]
  );
  const availableDateSet = useMemo(
    () => new Set(availableDateKeys),
    [availableDateKeys]
  );

  useEffect(() => {
    if (!selectedDateKey && availableDateKeys[0]) {
      setSelectedDateKey(availableDateKeys[0]);
      return;
    }

    if (selectedDateKey && !availableDateSet.has(selectedDateKey)) {
      setSelectedDateKey(availableDateKeys[0] ?? null);
      setSelectedStartTimeISO(null);
    }
  }, [availableDateKeys, availableDateSet, selectedDateKey]);

  const selectedSlots = selectedDateKey ? slotsByDateKey.get(selectedDateKey) ?? [] : [];

  const selectedDate = selectedDateKey ? parseCalendarDateKey(selectedDateKey) : undefined;

  const selectedTimeLabel = selectedStartTimeISO
    ? formatInTimeZone(new Date(selectedStartTimeISO), selectedTimezone, "h:mm a")
    : "";

  const selectedDateLabel = selectedStartTimeISO
    ? formatInTimeZone(new Date(selectedStartTimeISO), selectedTimezone, "EEEE, MMMM d")
    : selectedDate
      ? formatInTimeZone(selectedDate, selectedTimezone, "EEEE, MMMM d")
      : "";

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MeetingDetailsFormInput, unknown, MeetingDetailsFormValues>({
    resolver: zodResolver(meetingDetailsSchema),
    defaultValues: {
      inviteeName: "",
      inviteeEmail: "",
      additionalGuests: "",
      guestNotes: "",
    },
  });

  const onSubmit = (values: MeetingDetailsFormValues) => {
    if (!selectedStartTimeISO) {
      setServerError("Select a time slot before continuing.");
      setStep("slot");
      return;
    }

    setServerError("");

    const formData = new FormData();
    formData.set("profileSlug", profileSlug);
    formData.set("eventSlug", eventSlug);
    formData.set("startTimeISO", selectedStartTimeISO);
    formData.set("inviteeTimezone", selectedTimezone);
    formData.set("inviteeName", values.inviteeName);
    formData.set("inviteeEmail", values.inviteeEmail);
    formData.set("additionalGuests", values.additionalGuests ?? "");
    formData.set("guestNotes", values.guestNotes ?? "");
    const bookingStartTimeISO = selectedStartTimeISO;

    startTransition(async () => {
      const result = await createMeetingAction(formData);

      if (result.error) {
        setServerError(result.error);
        return;
      }

      if (result.success && result.confirmation) {
        const bookedStartTime = new Date(bookingStartTimeISO);
        const bookedEndTime = addMinutes(bookedStartTime, durationInMinutes);

        setAvailableSlots((previousSlots) =>
          previousSlots.filter((slotIso) => {
            const candidateStart = new Date(slotIso);
            const candidateEnd = addMinutes(candidateStart, durationInMinutes);

            return !areIntervalsOverlapping(
              { start: candidateStart, end: candidateEnd },
              { start: bookedStartTime, end: bookedEndTime }
            );
          })
        );
        const confirmationQuery = new URLSearchParams({
          start: result.confirmation.startTimeISO,
          timezone: result.confirmation.inviteeTimezone,
          name: result.confirmation.inviteeName,
          email: result.confirmation.inviteeEmail,
          duration: String(durationInMinutes),
          event: eventName,
        });

        reset();
        router.push(`/${profileSlug}/${eventSlug}/confirmation?${confirmationQuery.toString()}`);
        return;
      }

      setServerError("Could not schedule this meeting. Please try again.");
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <Card className="h-fit border-0 bg-gradient-to-b from-zinc-50 to-white ring-1 ring-zinc-200/80 dark:from-zinc-950 dark:to-zinc-950 dark:ring-zinc-800">
        <CardHeader className="space-y-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Book with</p>
            <CardTitle className="text-2xl">{eventName}</CardTitle>
            <CardDescription className="text-sm">
              <Link
                href={`/${profileSlug}`}
                className="font-medium text-foreground underline underline-offset-4"
              >
                @{profileSlug}
              </Link>
            </CardDescription>
          </div>
          {eventDescription ? (
            <p className="text-sm leading-6 text-muted-foreground">{eventDescription}</p>
          ) : null}
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-900">
            <Clock3 className="size-4 text-muted-foreground" />
            <span>{durationInMinutes} minutes</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-900">
            <Globe2 className="size-4 text-muted-foreground" />
            <span>{selectedTimezone}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 ring-1 ring-zinc-200/80 dark:ring-zinc-800">
        {step === "slot" ? (
          <>
            <CardHeader>
              <CardTitle>Select a date and time</CardTitle>
              <CardDescription>
                Choose a slot. Unavailable days are disabled automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="inviteeTimezone" className="text-sm font-medium">
                  Time zone
                </label>
                <select
                  id="inviteeTimezone"
                  value={selectedTimezone}
                  onChange={(event) => setSelectedTimezone(event.target.value)}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {timezoneOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {availableDateKeys.length === 0 ? (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-6 text-sm text-muted-foreground dark:border-zinc-800 dark:bg-zinc-900/40">
                  No slots are currently available for this event.
                </div>
              ) : (
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:items-start">
                  <div className="rounded-lg border border-zinc-200 p-2 dark:border-zinc-800">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(value) => {
                        if (!value) {
                          return;
                        }

                        const key = toCalendarDateKey(value);
                        if (!availableDateSet.has(key)) {
                          return;
                        }

                        setSelectedDateKey(key);
                        setSelectedStartTimeISO(null);
                      }}
                      disabled={(value) => !availableDateSet.has(toCalendarDateKey(value))}
                      className="mx-auto"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <CalendarIcon className="size-4 text-muted-foreground" />
                      <span>{selectedDateLabel || "Select a date"}</span>
                    </div>

                    {selectedSlots.length === 0 ? (
                      <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-4 text-sm text-muted-foreground dark:border-zinc-800 dark:bg-zinc-900/40">
                        No slots available for this day.
                      </p>
                    ) : (
                      <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto pr-1">
                        {selectedSlots.map((slotIso) => {
                          const isActive = selectedStartTimeISO === slotIso;

                          return (
                            <button
                              key={slotIso}
                              type="button"
                              onClick={() => {
                                setSelectedStartTimeISO(slotIso);
                                setServerError("");
                              }}
                              className={cn(
                                "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                                isActive
                                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                                  : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                              )}
                            >
                              {formatInTimeZone(new Date(slotIso), selectedTimezone, "h:mm a")}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <Button
                      type="button"
                      disabled={!selectedStartTimeISO}
                      onClick={() => {
                        if (!selectedStartTimeISO) {
                          return;
                        }

                        setStep("details");
                        setServerError("");
                      }}
                      className="w-full"
                    >
                      Continue
                    </Button>
                  </div>
                </div>
              )}

              {serverError ? (
                <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {serverError}
                </p>
              ) : null}
            </CardContent>
          </>
        ) : null}

        {step === "details" ? (
          <>
            <CardHeader>
              <CardTitle>Enter your details</CardTitle>
              <CardDescription>
                {selectedDateLabel} at {selectedTimeLabel} ({selectedTimezone})
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <button
                type="button"
                onClick={() => {
                  setStep("slot");
                  setServerError("");
                }}
                className="inline-flex items-center text-sm font-medium text-muted-foreground underline underline-offset-4"
              >
                Change date or time
              </button>

              <form className="space-y-4" noValidate onSubmit={handleSubmit(onSubmit)}>
                <div className="space-y-2">
                  <label htmlFor="inviteeName" className="text-sm font-medium">
                    Name
                  </label>
                  <Input
                    id="inviteeName"
                    placeholder="Your full name"
                    aria-invalid={!!errors.inviteeName}
                    {...register("inviteeName")}
                  />
                  {errors.inviteeName?.message ? (
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">
                      {errors.inviteeName.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label htmlFor="inviteeEmail" className="text-sm font-medium">
                    Email
                  </label>
                  <Input
                    id="inviteeEmail"
                    type="email"
                    placeholder="you@example.com"
                    aria-invalid={!!errors.inviteeEmail}
                    {...register("inviteeEmail")}
                  />
                  {errors.inviteeEmail?.message ? (
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">
                      {errors.inviteeEmail.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label htmlFor="additionalGuests" className="text-sm font-medium">
                    Additional guests (optional)
                  </label>
                  <Input
                    id="additionalGuests"
                    placeholder="guest1@example.com, guest2@example.com"
                    aria-invalid={!!errors.additionalGuests}
                    {...register("additionalGuests")}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use commas to invite multiple attendees.
                  </p>
                  {errors.additionalGuests?.message ? (
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">
                      {errors.additionalGuests.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label htmlFor="guestNotes" className="text-sm font-medium">
                    Share anything else (optional)
                  </label>
                  <Textarea
                    id="guestNotes"
                    rows={4}
                    placeholder="Agenda, context, or relevant links"
                    aria-invalid={!!errors.guestNotes}
                    {...register("guestNotes")}
                  />
                  {errors.guestNotes?.message ? (
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">
                      {errors.guestNotes.message}
                    </p>
                  ) : null}
                </div>

                {serverError ? (
                  <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {serverError}
                  </p>
                ) : null}

                <Button type="submit" disabled={isPending} className="w-full">
                  {isPending ? "Scheduling..." : "Schedule meeting"}
                </Button>
              </form>
            </CardContent>
          </>
        ) : null}

      </Card>
    </div>
  );
}

function toCalendarDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseCalendarDateKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  if (!year || !month || !day) {
    return undefined;
  }

  return new Date(year, month - 1, day);
}
