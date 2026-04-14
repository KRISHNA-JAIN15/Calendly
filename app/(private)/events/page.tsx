import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db/db";
import { EventTable } from "@/db/schema";

export default async function EventsPage() {
	const { userId } = await auth();
	if (!userId) {
		return null;
	}

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
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">Events</h1>
				<Button asChild>
					<Link href="/events/new">New event</Link>
				</Button>
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
									<span className="text-xs text-muted-foreground">
										{event.isActive ? "Active" : "Inactive"}
									</span>
								</div>
								<CardDescription>/{event.slug}</CardDescription>
							</CardHeader>
							<CardContent className="space-y-2">
								<p className="text-sm text-muted-foreground">
									{event.description || "No description"}
								</p>
								<p className="text-sm">Duration: {event.durationInMinutes} min</p>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
