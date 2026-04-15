import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { and, desc, eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteEventAlert } from "@/components/events/delete-event-alert";
import { ProfileShareLink } from "@/components/events/profile-share-link";
import { db } from "@/db/db";
import { EventTable } from "@/db/schema";
import { getUserPublicProfile } from "@/lib/user-public-profile";

async function toggleEventActive(formData: FormData) {
	"use server";

	const { userId } = await auth();
	if (!userId) {
		return;
	}

	const eventId = String(formData.get("eventId") ?? "");
	const nextIsActive = String(formData.get("nextIsActive") ?? "") === "true";

	if (!eventId) {
		return;
	}

	await db
		.update(EventTable)
		.set({ isActive: nextIsActive })
		.where(and(eq(EventTable.id, eventId), eq(EventTable.clerkUserId, userId)));

	revalidatePath("/events");
}

async function deleteEvent(formData: FormData) {
	"use server";

	const { userId } = await auth();
	if (!userId) {
		return;
	}

	const eventId = String(formData.get("eventId") ?? "");
	if (!eventId) {
		return;
	}

	await db
		.delete(EventTable)
		.where(and(eq(EventTable.id, eventId), eq(EventTable.clerkUserId, userId)));

	revalidatePath("/events");
}

export default async function EventsPage() {
	const { userId } = await auth();
	if (!userId) {
		return null;
	}

	const userProfile = await getUserPublicProfile(userId);
	const usernamePath = `/${userProfile?.publicSlug ?? "your-slug"}`;
	const requestHeaders = await headers();
	const envAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
	const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
	const protocol =
		requestHeaders.get("x-forwarded-proto") ??
		(host?.startsWith("localhost") || host?.startsWith("127.0.0.1") ? "http" : "https");
	const origin = envAppUrl || (host ? `${protocol}://${host}` : "");
	const profileShareLink = origin ? `${origin}${usernamePath}` : usernamePath;

	const events = await db
		.select({
			id: EventTable.id,
			name: EventTable.name,
			slug: EventTable.slug,
			description: EventTable.description,
			durationInMinutes: EventTable.durationInMinutes,
			isActive: EventTable.isActive,
		})
		.from(EventTable)
		.where(eq(EventTable.clerkUserId, userId))
		.orderBy(desc(EventTable.createdAt));

	return (
		<div className="space-y-6">
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-semibold">Events</h1>
					<Button asChild>
						<Link href="/events/new">New event</Link>
					</Button>
				</div>
				<ProfileShareLink shareLink={profileShareLink} />
			</div>

			{events.length === 0 ? (
				<Card>
					<CardHeader>
						<CardTitle>No events yet</CardTitle>
						<CardDescription>Create your first event type to start sharing booking links.</CardDescription>
					</CardHeader>
				</Card>
			) : (
				<div className="grid gap-4">
					{events.map((event) => (
						<Card key={event.id}>
							<CardHeader>
								<div className="flex items-center justify-between gap-3">
									<CardTitle>{event.name}</CardTitle>
									<form action={toggleEventActive}>
										<input type="hidden" name="eventId" value={event.id} />
										<input type="hidden" name="nextIsActive" value={String(!event.isActive)} />
										<button
											type="submit"
											className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
												event.isActive
													? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300"
													: "bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-300"
											}`}
										>
											<span
												className={`size-2 rounded-full ${event.isActive ? "bg-emerald-600" : "bg-zinc-500"}`}
											/>
											{event.isActive ? "Active" : "Inactive"}
										</button>
									</form>
								</div>
								<CardDescription>{event.durationInMinutes} min</CardDescription>
							</CardHeader>
							<CardContent className="space-y-2">
								<p className="text-sm text-muted-foreground">
									{event.description || "No description"}
								</p>
								<div className="flex items-center gap-2 pt-2">
									<Button asChild size="sm" variant="outline">
										<Link href={`/events/${event.id}/edit`}>Edit</Link>
									</Button>
									<DeleteEventAlert eventId={event.id} action={deleteEvent} />
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
