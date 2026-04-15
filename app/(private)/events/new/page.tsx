import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db/db";
import { EventTable } from "@/db/schema";
import { EventForm } from "@/components/Forms/EventForm";

type SaveEventResult = {
	error?: string;
};

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function createEvent(formData: FormData): Promise<SaveEventResult | void> {
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
		await db.insert(EventTable).values({
			name,
			slug,
			description: description || null,
			durationInMinutes,
			clerkUserId: userId,
			isActive,
		});
	} catch (error) {
		const maybeDatabaseError = error as { code?: string } | null;

		if (maybeDatabaseError?.code === "23505") {
			return { error: "You already have an event with this URL slug." };
		}

		return { error: "Could not create event right now. Please try again." };
	}

	redirect("/events");
}

export default function NewEventPage() {
	return (
		<div className="mx-auto w-full max-w-3xl space-y-4">
			<div className="space-y-1">
				<h1 className="text-2xl font-semibold tracking-tight">Create event type</h1>
				<p className="text-sm text-muted-foreground">
					Set up a new booking link with duration and event details.
				</p>
			</div>

			<EventForm action={createEvent} />
		</div>
	);
}
