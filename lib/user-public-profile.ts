import { eq } from "drizzle-orm";
import { db } from "@/db/db";
import { UserPublicProfileTable } from "@/db/schema";

export const PUBLIC_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizePublicSlug(rawValue: string) {
  return rawValue.trim().toLowerCase();
}

export function isValidPublicSlug(publicSlug: string) {
  return publicSlug.length >= 3 && publicSlug.length <= 40 && PUBLIC_SLUG_REGEX.test(publicSlug);
}

export async function getUserPublicProfile(clerkUserId: string) {
  const profiles = await db
    .select({
      clerkUserId: UserPublicProfileTable.clerkUserId,
      publicSlug: UserPublicProfileTable.publicSlug,
    })
    .from(UserPublicProfileTable)
    .where(eq(UserPublicProfileTable.clerkUserId, clerkUserId))
    .limit(1);

  return profiles[0] ?? null;
}
