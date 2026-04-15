import { z } from "zod";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const meetingDetailsSchema = z.object({
  inviteeName: z.string().trim().min(2, "Please enter your name.").max(100),
  inviteeEmail: z
    .string()
    .trim()
    .email("Please enter a valid email address.")
    .max(320),
  additionalGuests: z
    .string()
    .optional()
    .refine(
      (value) =>
        parseGuestEmails(value).every(
          (email) => z.email().safeParse(email).success
        ),
      "Add valid guest emails separated by commas."
    ),
  guestNotes: z.string().trim().max(2000).optional(),
});

export const meetingBookingSchema = meetingDetailsSchema.extend({
  profileSlug: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .regex(slugPattern, "Invalid profile link."),
  eventSlug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(slugPattern, "Invalid event link."),
  startTimeISO: z
    .string()
    .trim()
    .refine((value) => !Number.isNaN(new Date(value).getTime()), "Invalid time slot."),
  inviteeTimezone: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .refine((value) => isValidTimezone(value), "Invalid timezone."),
});

export type MeetingDetailsInput = z.infer<typeof meetingDetailsSchema>;
export type MeetingBookingInput = z.infer<typeof meetingBookingSchema>;

export type BookMeetingResult = {
  success?: boolean;
  error?: string;
  confirmation?: {
    inviteeName: string;
    inviteeEmail: string;
    startTimeISO: string;
    inviteeTimezone: string;
  };
};

export function parseBookingFormData(formData: FormData) {
  return meetingBookingSchema.safeParse({
    profileSlug: String(formData.get("profileSlug") ?? ""),
    eventSlug: String(formData.get("eventSlug") ?? ""),
    startTimeISO: String(formData.get("startTimeISO") ?? ""),
    inviteeTimezone: String(formData.get("inviteeTimezone") ?? ""),
    inviteeName: String(formData.get("inviteeName") ?? ""),
    inviteeEmail: String(formData.get("inviteeEmail") ?? ""),
    additionalGuests: String(formData.get("additionalGuests") ?? ""),
    guestNotes: String(formData.get("guestNotes") ?? ""),
  });
}

export function parseGuestEmails(value?: string | null): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(/[\n,;]+/)
    .map((email) => email.trim())
    .filter(Boolean);
}

function isValidTimezone(timezone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}
