import Link from "next/link";
import { addMinutes } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isValidTimezone } from "@/lib/timezones";

type ConfirmationPageProps = {
  params: Promise<{ username: string; eventSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isValidDate(value: string) {
  return !Number.isNaN(new Date(value).getTime());
}

export default async function BookingConfirmationPage({
  params,
  searchParams,
}: ConfirmationPageProps) {
  const { username, eventSlug } = await params;
  const query = await searchParams;

  const startParam = getFirstParam(query.start) ?? "";
  const timezoneParam = getFirstParam(query.timezone) ?? "";
  const nameParam = getFirstParam(query.name)?.trim() ?? "";
  const emailParam = getFirstParam(query.email)?.trim() ?? "";
  const eventParam = getFirstParam(query.event)?.trim() ?? "";
  const durationParam = Number(getFirstParam(query.duration) ?? "");

  const startTime = isValidDate(startParam) ? new Date(startParam) : null;
  const timezone = isValidTimezone(timezoneParam) ? timezoneParam : "UTC";
  const durationInMinutes = Number.isFinite(durationParam) && durationParam > 0 ? durationParam : 30;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <Card className="border-0 ring-1 ring-zinc-200/80 dark:ring-zinc-800">
        <CardHeader className="space-y-3">
          <div className="inline-flex size-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <CheckCircle2 className="size-5" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl">Booking confirmed</CardTitle>
            <CardDescription>
              Your meeting has been scheduled successfully.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {startTime ? (
            <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900/50">
              <p>
                <span className="font-medium text-foreground">Event:</span>{" "}
                {eventParam || "Meeting"}
              </p>
              <p>
                <span className="font-medium text-foreground">Date:</span>{" "}
                {formatInTimeZone(startTime, timezone, "EEEE, MMMM d, yyyy")}
              </p>
              <p>
                <span className="font-medium text-foreground">Time:</span>{" "}
                {formatInTimeZone(startTime, timezone, "h:mm a")} -{" "}
                {formatInTimeZone(
                  addMinutes(startTime, durationInMinutes),
                  timezone,
                  "h:mm a"
                )}{" "}
                ({timezone})
              </p>
              {nameParam ? (
                <p>
                  <span className="font-medium text-foreground">Invitee:</span>{" "}
                  {nameParam}
                </p>
              ) : null}
              {emailParam ? (
                <p>
                  <span className="font-medium text-foreground">Email:</span>{" "}
                  {emailParam}
                </p>
              ) : null}
              <p>
                <span className="font-medium text-foreground">Host page:</span>{" "}
                @{username}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-muted-foreground dark:border-zinc-800 dark:bg-zinc-900/50">
              Booking details are unavailable for this confirmation.
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild className="sm:flex-1">
              <Link href={`/${username}/${eventSlug}`}>Book another meeting</Link>
            </Button>
            <Button asChild variant="outline" className="sm:flex-1">
              <Link href={`/${username}`}>Back to profile</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
