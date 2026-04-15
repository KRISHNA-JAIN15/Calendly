import "server-only";

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
  startTime: Date;
  guestNotes?: string | null;
  durationInMinutes: number;
  eventName: string;
};

export async function getCalendarEventTimes(
  clerkUserId: string,
  { start, end }: CalendarRange
): Promise<CalendarEventTime[]> {
  const oauthClient = await getOAuthClient(clerkUserId);

  const events = await google.calendar("v3").events.list({
    calendarId: "primary",
    eventTypes: ["default"],
    singleEvents: true,
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    maxResults: 2500,
    auth: oauthClient,
  });

  return (
    events.data.items
      ?.map((event) => {
        if (event.start?.date && event.end?.date) {
          return {
            start: startOfDay(new Date(event.start.date)),
            end: endOfDay(new Date(event.end.date)),
          };
        }

        if (event.start?.dateTime && event.end?.dateTime) {
          return {
            start: new Date(event.start.dateTime),
            end: new Date(event.end.dateTime),
          };
        }

        return null;
      })
      .filter((date): date is CalendarEventTime => date != null) ?? []
  );
}

export async function createCalendarEvent({
  clerkUserId,
  guestName,
  guestEmail,
  guests,
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

  const calendarEvent = await google.calendar("v3").events.insert({
    calendarId: "primary",
    auth: oauthClient,
    sendUpdates: "all",
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
    },
  });

  return calendarEvent.data;
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
