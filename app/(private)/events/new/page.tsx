import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db/db";
import { EventTable } from "@/db/schema";
import { EventForm } from "@/components/Forms/EventForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ensureUserPublicProfile } from "@/lib/user-public-profile";

async function createEvent(formData: FormData) {
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
		return;
	}

	await ensureUserPublicProfile(userId);

	await db.insert(EventTable).values({
		name,
		slug,
		description: description || null,
		durationInMinutes,
		clerkUserId: userId,
		isActive,
	});

	redirect("/events");
}

export default function NewEventPage() {
	return (
		<div className="mx-auto w-full max-w-2xl">
			<Card>
				<CardHeader>
					<CardTitle>Create event type</CardTitle>
					<CardDescription>
						Set up a new booking link with duration and availability details.
					</CardDescription>
				</CardHeader>
				<CardContent>
						<EventForm action={createEvent} />
				</CardContent>
			</Card>
		</div>
	);
}
