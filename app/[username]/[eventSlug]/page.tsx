import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db/db";
import { EventTable, UserPublicProfileTable } from "@/db/schema";

type PublicEventPageProps = {
  params: Promise<{ username: string; eventSlug: string }>;
};

export default async function PublicEventPage({ params }: PublicEventPageProps) {
  const { username, eventSlug } = await params;
  const normalizedUsername = username.trim().toLowerCase();
  const normalizedEventSlug = eventSlug.trim().toLowerCase();

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
      description: EventTable.description,
      durationInMinutes: EventTable.durationInMinutes,
    })
    .from(EventTable)
    .where(
      and(
        eq(EventTable.clerkUserId, profile.clerkUserId),
        eq(EventTable.slug, normalizedEventSlug),
        eq(EventTable.isActive, true)
      )
    )
    .limit(1);

  const event = events[0];
  if (!event) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          <Link href={`/${profile.publicSlug}`} className="underline underline-offset-4">
            @{profile.publicSlug}
          </Link>
        </p>
        <h1 className="text-3xl font-semibold">{event.name}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{event.durationInMinutes} minute meeting</CardTitle>
          <CardDescription>{event.description || "No description"}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Booking availability UI will be shown here next.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
