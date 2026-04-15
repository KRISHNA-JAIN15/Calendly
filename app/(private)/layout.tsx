import type { ReactNode } from "react";
import { auth } from "@clerk/nextjs/server";
import { and, eq, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db/db";
import { UserPublicProfileTable } from "@/db/schema";
import {
  getUserPublicProfile,
  isValidPublicSlug,
  normalizePublicSlug,
} from "@/lib/user-public-profile";
import { PublicSlugRequiredDialog } from "@/components/onboarding/public-slug-required-dialog";

type SavePublicSlugResult = {
  error?: string;
};

export default async function PrivateLayout({ children }: { children: ReactNode }) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const userProfile = await getUserPublicProfile(userId);

  async function savePublicSlug(formData: FormData): Promise<SavePublicSlugResult> {
    "use server";

    const { userId } = await auth();
    if (!userId) {
      return { error: "Your session expired. Please sign in again." };
    }

    const existingProfile = await getUserPublicProfile(userId);
    if (existingProfile) {
      return {};
    }

    const publicSlug = normalizePublicSlug(String(formData.get("publicSlug") ?? ""));

    if (!isValidPublicSlug(publicSlug)) {
      return {
        error: "Use 3-40 lowercase letters, numbers, and hyphens.",
      };
    }

    const slugConflicts = await db
      .select({ clerkUserId: UserPublicProfileTable.clerkUserId })
      .from(UserPublicProfileTable)
      .where(
        and(
          eq(UserPublicProfileTable.publicSlug, publicSlug),
          ne(UserPublicProfileTable.clerkUserId, userId)
        )
      )
      .limit(1);

    if (slugConflicts[0]) {
      return { error: "This slug is already taken. Try another one." };
    }

    try {
      await db.insert(UserPublicProfileTable).values({
        clerkUserId: userId,
        publicSlug,
      });
    } catch (error) {
      const maybeError = error as { code?: string } | null;
      if (maybeError?.code === "23505") {
        return { error: "This slug is already taken. Try another one." };
      }

      return { error: "Could not save slug right now. Please try again." };
    }

    return {};
  }

  return (
    <>
      {children}
      {!userProfile ? <PublicSlugRequiredDialog savePublicSlugAction={savePublicSlug} /> : null}
    </>
  );
}
