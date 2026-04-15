import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db/db";
import { EventTable, UserPublicProfileTable } from "@/db/schema";

type PublicUserPageProps = {
  params: Promise<{ username: string }>;
};

export default async function PublicUserPage({ params }: PublicUserPageProps) {
  const { username } = await params;
  const normalizedUsername = username.trim().toLowerCase();

  const profiles = await db
    .select({
      clerkUserId: UserPublicProfileTable.clerkUserId,
      publicSlug: UserPublicProfileTable.publicSlug,
    })
    .from(UserPublicProfileTable)
    .where(eq(UserPublicProfileTable.publicSlug, normalizedUsername))
    .limit(1);

  const profile = profiles[0];
  if (!profile) {
    notFound();
  }

  const events = await db
    .select({
      id: EventTable.id,
      name: EventTable.name,
      slug: EventTable.slug,
    })
    .from(EventTable)
    .where(and(eq(EventTable.clerkUserId, profile.clerkUserId), eq(EventTable.isActive, true)))
    .orderBy(desc(EventTable.createdAt));

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Public booking page</p>
        <h1 className="text-3xl font-semibold">@{profile.publicSlug}</h1>
        <p className="text-sm text-muted-foreground">Select an event</p>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No active event types</CardTitle>
            <CardDescription>This user has not published any event types yet.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/${profile.publicSlug}/${event.slug}`}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-4 text-base font-medium text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
            >
              {event.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
