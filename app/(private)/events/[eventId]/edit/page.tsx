import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/db";
import { EventTable } from "@/db/schema";
import { EventForm } from "@/components/Forms/EventForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type EditEventPageProps = {
	params: Promise<{ eventId: string }>;
};

type SaveEventResult = {
	error?: string;
};

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export default async function EditEventPage({ params }: EditEventPageProps) {
	const { userId } = await auth();
	if (!userId) {
		redirect("/sign-in");
	}

	const { eventId } = await params;

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
		.where(and(eq(EventTable.id, eventId), eq(EventTable.clerkUserId, userId)))
		.limit(1);

	const event = events[0];
	if (!event) {
		redirect("/events");
	}

	async function updateEvent(formData: FormData): Promise<SaveEventResult | void> {
		"use server";

		const { userId } = await auth();
		if (!userId) {
			redirect("/sign-in");
		}

		const name = String(formData.get("name") ?? "").trim();
		const slug = String(formData.get("slug") ?? "")
			.trim()
			.toLowerCase();
		const description = String(formData.get("description") ?? "").trim();
		const durationInMinutes = Number(formData.get("durationInMinutes"));
		const isActive = formData.get("isActive") === "on";

		if (!name || !slug || !Number.isFinite(durationInMinutes) || durationInMinutes <= 0) {
			return { error: "Please fill all required fields correctly." };
		}

		if (!slugPattern.test(slug)) {
			return { error: "Use lowercase letters, numbers, and hyphens in URL slug." };
		}

		try {
			await db
				.update(EventTable)
				.set({
					name,
					slug,
					description: description || null,
					durationInMinutes,
					isActive,
				})
				.where(and(eq(EventTable.id, eventId), eq(EventTable.clerkUserId, userId)));
		} catch (error) {
			const maybeDatabaseError = error as { code?: string } | null;

			if (maybeDatabaseError?.code === "23505") {
				return { error: "You already have an event with this URL slug." };
			}

			return { error: "Could not update event right now. Please try again." };
		}

		redirect("/events");
	}

	return (
		<div className="mx-auto w-full max-w-2xl">
			<Card>
				<CardHeader>
					<CardTitle>Edit event type</CardTitle>
					<CardDescription>Update this event and save your changes.</CardDescription>
				</CardHeader>
				<CardContent>
					<EventForm
						action={updateEvent}
						submitLabel="Save changes"
						initialValues={{
							name: event.name,
							slug: event.slug,
							description: event.description,
							durationInMinutes: event.durationInMinutes,
							isActive: event.isActive,
						}}
					/>
				</CardContent>
			</Card>
		</div>
	);
}