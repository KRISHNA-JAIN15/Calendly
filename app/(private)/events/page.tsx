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

	const totalEvents = events.length;
	const activeEvents = events.filter((event) => event.isActive).length;
	const inactiveEvents = totalEvents - activeEvents;

	return (
		<div className="space-y-8">
			<section className="space-y-4">
				<div className="flex flex-wrap items-end justify-between gap-3">
					<div className="space-y-1">
						<h1 className="text-3xl font-semibold tracking-tight">Events</h1>
						<p className="text-sm text-muted-foreground">
							Manage your event types and keep booking links up to date.
						</p>
					</div>
					<Button
						asChild
						className="w-full rounded-lg border border-sky-700 bg-sky-600 text-white transition-colors hover:bg-sky-700 hover:text-white sm:w-auto dark:border-sky-400 dark:bg-sky-500 dark:text-zinc-950 dark:hover:bg-sky-400 dark:hover:text-zinc-950"
					>
						<Link href="/events/new" className="w-full text-center">
							New event
						</Link>
					</Button>
				</div>

				<div className="grid gap-3 sm:grid-cols-3">
					<div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
						<p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Total events</p>
						<p className="mt-1 text-2xl font-semibold tracking-tight">{totalEvents}</p>
					</div>
					<div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
						<p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Active</p>
						<p className="mt-1 text-2xl font-semibold tracking-tight">{activeEvents}</p>
					</div>
					<div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
						<p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Inactive</p>
						<p className="mt-1 text-2xl font-semibold tracking-tight">{inactiveEvents}</p>
					</div>
				</div>

				<ProfileShareLink shareLink={profileShareLink} />
			</section>

			{events.length === 0 ? (
				<Card className="border-zinc-200/80 dark:border-zinc-800">
					<CardHeader>
						<CardTitle>No events yet</CardTitle>
						<CardDescription>Create your first event type to start sharing booking links.</CardDescription>
					</CardHeader>
				</Card>
			) : (
				<div className="grid gap-4 md:grid-cols-2">
					{events.map((event) => {
						const eventPublicPath = userProfile?.publicSlug
							? `/${userProfile.publicSlug}/${event.slug}`
							: `/${event.slug}`;

						return (
							<Card key={event.id} className="border-zinc-200/80 dark:border-zinc-800">
								<CardHeader className="space-y-3">
									<div className="flex items-start justify-between gap-3">
										<div className="space-y-1">
											<CardTitle className="text-lg">{event.name}</CardTitle>
											<CardDescription>{event.durationInMinutes} min</CardDescription>
										</div>
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

									<p className="break-all rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 font-mono text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
										{eventPublicPath}
									</p>
								</CardHeader>
								<CardContent className="space-y-4">
									<p className="text-sm text-muted-foreground">
										{event.description || "No description"}
									</p>
									<div className="flex flex-wrap items-center gap-2 pt-1">
										<Button
											asChild
											size="sm"
											variant="outline"
											className="border-sky-300 text-sky-700 hover:bg-sky-50 dark:border-sky-700 dark:text-sky-300 dark:hover:bg-sky-900/40"
										>
											<Link href={`/events/${event.id}/edit`}>Edit</Link>
										</Button>
										<DeleteEventAlert eventId={event.id} action={deleteEvent} />
									</div>
								</CardContent>
							</Card>
						);
					})}
				</div>
			)}
		</div>
	);
}
