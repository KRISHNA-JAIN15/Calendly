import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
      description: EventTable.description,
      durationInMinutes: EventTable.durationInMinutes,
    })
    .from(EventTable)
    .where(and(eq(EventTable.clerkUserId, profile.clerkUserId), eq(EventTable.isActive, true)))
    .orderBy(desc(EventTable.createdAt));

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Public booking page</p>
        <h1 className="text-3xl font-semibold">@{profile.publicSlug}</h1>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No active event types</CardTitle>
            <CardDescription>This user has not published any event types yet.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4">
          {events.map((event) => (
            <Card key={event.id}>
              <CardHeader>
                <CardTitle>{event.name}</CardTitle>
                <CardDescription>{event.durationInMinutes} min</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{event.description || "No description"}</p>
                <Link
                  href={`/${profile.publicSlug}/${event.slug}`}
                  className="inline-flex text-sm font-medium text-foreground underline underline-offset-4"
                >
                  Open booking page
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
