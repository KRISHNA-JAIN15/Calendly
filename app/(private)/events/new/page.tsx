import { EventForm } from "@/components/Forms/EventForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
					<EventForm />
				</CardContent>
			</Card>
		</div>
	);
}
