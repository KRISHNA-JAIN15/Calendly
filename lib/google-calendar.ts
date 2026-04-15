import "server-only";

import { randomUUID } from "node:crypto";
import { clerkClient } from "@clerk/nextjs/server";
import { google } from "googleapis";
import { addMinutes, endOfDay, startOfDay } from "date-fns";

type CalendarEventTime = {
  start: Date;
  end: Date;
};

type CalendarRange = {
  start: Date;
  end: Date;
};

type CalendarGuest = {
  email: string;
  name?: string | null;
};

type CreateCalendarEventInput = {
  clerkUserId: string;
  guestName?: string;
  guestEmail?: string;
  guests?: CalendarGuest[];
  bookingId?: string;
  startTime: Date;
  guestNotes?: string | null;
  durationInMinutes: number;
  eventName: string;
};

type DeleteCalendarEventForBookingInput = {
  clerkUserId: string;
  bookingId: string;
  startTime?: Date;
  endTime?: Date;
  inviteeEmail?: string;
  eventName?: string;
};

type GoogleApiErrorResponse = {
  error?: {
    message?: string;
    errors?: Array<{
      reason?: string;
      message?: string;
    }>;
  };
};

export async function getCalendarEventTimes(
  clerkUserId: string,
  { start, end }: CalendarRange
): Promise<CalendarEventTime[]> {
  const oauthClient = await getOAuthClient(clerkUserId);
  const calendarClient = google.calendar("v3");
  const calendarIds = await getCalendarIdsForFreeBusy(calendarClient, oauthClient);
  const uniqueBusyIntervals = new Map<string, CalendarEventTime>();

  for (const calendarIdChunk of chunkArray(calendarIds, 50)) {
    let freeBusy;

    try {
      freeBusy = await calendarClient.freebusy.query({
        auth: oauthClient,
        requestBody: {
          timeMin: start.toISOString(),
          timeMax: end.toISOString(),
          items: calendarIdChunk.map((calendarId) => ({ id: calendarId })),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";

      if (message.includes("insufficient") || message.includes("forbidden")) {
        return getCalendarEventTimesFromEventsApi(calendarClient, oauthClient, {
          start,
          end,
        });
      }

      throw error;
    }

    const calendars = freeBusy.data.calendars ?? {};

    for (const calendar of Object.values(calendars)) {
      for (const busyInterval of calendar.busy ?? []) {
        if (!busyInterval.start || !busyInterval.end) {
          continue;
        }

        const busyStart = new Date(busyInterval.start);
        const busyEnd = new Date(busyInterval.end);

        if (
          Number.isNaN(busyStart.getTime()) ||
          Number.isNaN(busyEnd.getTime()) ||
          busyStart >= busyEnd
        ) {
          continue;
        }

        const intervalKey = `${busyStart.toISOString()}_${busyEnd.toISOString()}`;
        uniqueBusyIntervals.set(intervalKey, {
          start: busyStart,
          end: busyEnd,
        });
      }
    }
  }

  return Array.from(uniqueBusyIntervals.values()).sort(
    (left, right) => left.start.getTime() - right.start.getTime()
  );
}

async function getCalendarEventTimesFromEventsApi(
  calendarClient: ReturnType<typeof google.calendar>,
  oauthClient: Awaited<ReturnType<typeof getOAuthClient>>,
  { start, end }: CalendarRange
) {
  let pageToken: string | undefined;
  const busyIntervals: CalendarEventTime[] = [];

  do {
    const events = await calendarClient.events.list({
      calendarId: "primary",
      auth: oauthClient,
      eventTypes: ["default"],
      singleEvents: true,
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      maxResults: 2500,
      pageToken,
    });

    for (const event of events.data.items ?? []) {
      if (event.start?.date && event.end?.date) {
        busyIntervals.push({
          start: startOfDay(new Date(event.start.date)),
          end: endOfDay(new Date(event.end.date)),
        });
        continue;
      }

      if (event.start?.dateTime && event.end?.dateTime) {
        busyIntervals.push({
          start: new Date(event.start.dateTime),
          end: new Date(event.end.dateTime),
        });
      }
    }

    pageToken = events.data.nextPageToken ?? undefined;
  } while (pageToken);

  return busyIntervals.sort(
    (left, right) => left.start.getTime() - right.start.getTime()
  );
}

async function getCalendarIdsForFreeBusy(
  calendarClient: ReturnType<typeof google.calendar>,
  oauthClient: Awaited<ReturnType<typeof getOAuthClient>>
) {
  const calendarIds = new Set<string>();
  let pageToken: string | undefined;

  try {
    do {
      const calendarList = await calendarClient.calendarList.list({
        auth: oauthClient,
        pageToken,
        maxResults: 250,
        minAccessRole: "reader",
        showHidden: false,
      });

      for (const calendar of calendarList.data.items ?? []) {
        const calendarId = calendar.id;
        if (!calendarId) {
          continue;
        }

        if (calendar.selected === false) {
          continue;
        }

        calendarIds.add(calendarId);
      }

      pageToken = calendarList.data.nextPageToken ?? undefined;
    } while (pageToken);
  } catch {
    return ["primary"];
  }

  if (calendarIds.size === 0) {
    return ["primary"];
  }

  return Array.from(calendarIds);
}

function chunkArray<T>(items: T[], chunkSize: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }

  return chunks;
}

export async function createCalendarEvent({
  clerkUserId,
  guestName,
  guestEmail,
  guests,
  bookingId,
  startTime,
  guestNotes,
  durationInMinutes,
  eventName,
}: CreateCalendarEventInput) {
  const oauthClient = await getOAuthClient(clerkUserId);
  const client = await clerkClient();
  const calendarUser = await client.users.getUser(clerkUserId);

  const hostEmail = calendarUser.primaryEmailAddress?.emailAddress;
  if (!hostEmail) {
    throw new Error("Clerk user has no primary email");
  }

  const hostName = calendarUser.fullName || hostEmail;
  const normalizedGuests = normalizeGuests({ guestName, guestEmail, guests });

  if (normalizedGuests.length === 0) {
    throw new Error("At least one guest email is required");
  }

  const primaryGuestDisplay =
    normalizedGuests[0].name?.trim() || normalizedGuests[0].email;

  let calendarEvent;

  try {
    calendarEvent = await google.calendar("v3").events.insert({
      calendarId: "primary",
      auth: oauthClient,
      sendUpdates: "all",
      conferenceDataVersion: 1,
      requestBody: {
        attendees: [
          ...normalizedGuests.map((guest) => ({
            email: guest.email,
            displayName: guest.name?.trim() || undefined,
          })),
          {
            email: hostEmail,
            displayName: hostName,
            responseStatus: "accepted",
          },
        ],
        description: guestNotes ? `Additional Details: ${guestNotes}` : undefined,
        start: {
          dateTime: startTime.toISOString(),
        },
        end: {
          dateTime: addMinutes(startTime, durationInMinutes).toISOString(),
        },
        summary: `${primaryGuestDisplay} + ${hostName}: ${eventName}`,
        extendedProperties: bookingId
          ? {
              private: {
                bookingId,
              },
            }
          : undefined,
        conferenceData: {
          createRequest: {
            requestId: randomUUID(),
            conferenceSolutionKey: {
              type: "hangoutsMeet",
            },
          },
        },
      },
    });
  } catch (error) {
    const details = getGoogleApiErrorDetails(error);
    const statusPrefix = details.status ? `[${details.status}] ` : "";
    const reasonSuffix = details.reason ? ` (${details.reason})` : "";

    throw new Error(`${statusPrefix}${details.message}${reasonSuffix}`);
  }

  return calendarEvent.data;
}

export async function deleteCalendarEventForBooking({
  clerkUserId,
  bookingId,
  startTime,
  endTime,
  inviteeEmail,
  eventName,
}: DeleteCalendarEventForBookingInput) {
  const oauthClient = await getOAuthClient(clerkUserId);
  const calendarClient = google.calendar("v3");

  const eventIdsToDelete = new Set<string>();

  try {
    const linkedEvents = await calendarClient.events.list({
      calendarId: "primary",
      auth: oauthClient,
      privateExtendedProperty: [`bookingId=${bookingId}`],
      singleEvents: true,
      maxResults: 50,
    });

    for (const event of linkedEvents.data.items ?? []) {
      if (event.id) {
        eventIdsToDelete.add(event.id);
      }
    }
  } catch {
    // Fall back to time-range matching below.
  }

  if (eventIdsToDelete.size === 0 && startTime && endTime) {
    const fallbackEvents = await calendarClient.events.list({
      calendarId: "primary",
      auth: oauthClient,
      eventTypes: ["default"],
      singleEvents: true,
      timeMin: new Date(startTime.getTime() - 60 * 60 * 1000).toISOString(),
      timeMax: new Date(endTime.getTime() + 60 * 60 * 1000).toISOString(),
      maxResults: 100,
    });

    for (const event of fallbackEvents.data.items ?? []) {
      if (!event.id || !event.start?.dateTime || !event.end?.dateTime) {
        continue;
      }

      const eventStart = new Date(event.start.dateTime);
      const eventEnd = new Date(event.end.dateTime);

      const startMatches = Math.abs(eventStart.getTime() - startTime.getTime()) < 60_000;
      const endMatches = Math.abs(eventEnd.getTime() - endTime.getTime()) < 60_000;

      const attendeeMatches = inviteeEmail
        ?
          event.attendees?.some(
            (attendee) => attendee.email?.toLowerCase() === inviteeEmail.toLowerCase()
          ) ?? false
        : true;

      const summaryMatches = eventName
        ? event.summary?.toLowerCase().includes(eventName.toLowerCase()) ?? false
        : true;

      if (startMatches && endMatches && attendeeMatches && summaryMatches) {
        eventIdsToDelete.add(event.id);
      }
    }
  }

  for (const eventId of eventIdsToDelete) {
    try {
      await calendarClient.events.delete({
        calendarId: "primary",
        auth: oauthClient,
        eventId,
        sendUpdates: "all",
      });
    } catch (error) {
      const details = getGoogleApiErrorDetails(error);
      const statusPrefix = details.status ? `[${details.status}] ` : "";
      const reasonSuffix = details.reason ? ` (${details.reason})` : "";

      throw new Error(`${statusPrefix}${details.message}${reasonSuffix}`);
    }
  }
}

async function getOAuthClient(clerkUserId: string) {
  const client = await clerkClient();
  const tokenResponse = await client.users.getUserOauthAccessToken(
    clerkUserId,
    "google"
  );

  const accessToken = tokenResponse.data[0]?.token;
  if (!accessToken) {
    throw new Error("Google account is not connected for this user");
  }

  const oAuthClientId =
    process.env.GOOGLE_OAUTH_CLIENT_ID ?? process.env.OAUTH_CLIENT_ID;
  const oAuthClientSecret =
    process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? process.env.OAUTH_CLIENT_SECRET;
  const oAuthRedirectUrl =
    process.env.GOOGLE_OAUTH_REDIRECT_URL ?? process.env.OAUTH_REDIRECT_URI;

  if (!oAuthClientId || !oAuthClientSecret || !oAuthRedirectUrl) {
    throw new Error("Missing Google OAuth environment variables");
  }

  const oAuthClient = new google.auth.OAuth2(
    oAuthClientId,
    oAuthClientSecret,
    oAuthRedirectUrl
  );

  oAuthClient.setCredentials({ access_token: accessToken });

  return oAuthClient;
}

function normalizeGuests({
  guestName,
  guestEmail,
  guests,
}: {
  guestName?: string;
  guestEmail?: string;
  guests?: CalendarGuest[];
}) {
  const guestList: CalendarGuest[] = [];

  const primaryGuestEmail = guestEmail?.trim();
  if (primaryGuestEmail) {
    guestList.push({
      email: primaryGuestEmail,
      name: guestName?.trim() || undefined,
    });
  }

  for (const guest of guests ?? []) {
    const email = guest.email?.trim();
    if (!email) {
      continue;
    }

    guestList.push({
      email,
      name: guest.name?.trim() || undefined,
    });
  }

  const dedupedGuests = new Map<string, CalendarGuest>();
  for (const guest of guestList) {
    const key = guest.email.toLowerCase();
    if (!dedupedGuests.has(key)) {
      dedupedGuests.set(key, guest);
    }
  }

  return Array.from(dedupedGuests.values());
}

function getGoogleApiErrorDetails(error: unknown) {
  const errorLike = error as {
    message?: string;
    response?: {
      status?: number;
      data?: GoogleApiErrorResponse;
    };
  };

  const responseError = errorLike.response?.data?.error;
  const reason = responseError?.errors?.[0]?.reason;
  const message =
    responseError?.message ??
    responseError?.errors?.[0]?.message ??
    errorLike.message ??
    "Unknown Google Calendar API error";

  return {
    status: errorLike.response?.status,
    message,
    reason,
  };
}
