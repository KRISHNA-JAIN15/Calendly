const DEFAULT_TIMEZONE_OPTIONS = [
  "Asia/Kolkata",
  "UTC",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
] as const;

type TimezoneOption = {
  value: string;
  label: string;
};

export function getTimezoneOptions(preferredTimezones: string[] = []): TimezoneOption[] {
  const merged = Array.from(new Set([...preferredTimezones, ...DEFAULT_TIMEZONE_OPTIONS]));

  return merged.map((timezone) => ({
    value: timezone,
    label: formatTimezoneLabel(timezone),
  }));
}

export function formatTimezoneLabel(timezone: string) {
  const gmtOffset = getGmtOffsetLabel(timezone);
  const readableTimezone = timezone.replace(/_/g, " ");
  return `${readableTimezone} (${gmtOffset})`;
}

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
