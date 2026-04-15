import { eq } from "drizzle-orm";
import { db } from "@/db/db";
import { UserPublicProfileTable } from "@/db/schema";

function getDefaultPublicSlug(clerkUserId: string) {
  const slug = clerkUserId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "user";
}

export async function ensureUserPublicProfile(clerkUserId: string) {
  const existingProfiles = await db
    .select({
      clerkUserId: UserPublicProfileTable.clerkUserId,
      publicSlug: UserPublicProfileTable.publicSlug,
    })
    .from(UserPublicProfileTable)
    .where(eq(UserPublicProfileTable.clerkUserId, clerkUserId))
    .limit(1);

  const existingProfile = existingProfiles[0];
  if (existingProfile) {
    return existingProfile;
  }

  const publicSlug = getDefaultPublicSlug(clerkUserId);

  await db
    .insert(UserPublicProfileTable)
    .values({
      clerkUserId,
      publicSlug,
    })
    .onConflictDoNothing({ target: UserPublicProfileTable.clerkUserId });

  const createdProfiles = await db
    .select({
      clerkUserId: UserPublicProfileTable.clerkUserId,
      publicSlug: UserPublicProfileTable.publicSlug,
    })
    .from(UserPublicProfileTable)
    .where(eq(UserPublicProfileTable.clerkUserId, clerkUserId))
    .limit(1);

  return createdProfiles[0] ?? { clerkUserId, publicSlug };
}
