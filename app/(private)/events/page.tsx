import { UserButton } from "@clerk/nextjs";

export default function EventsPage() {
	return (
		<main className="flex min-h-full flex-1 items-center justify-center">
			<div className="flex items-center gap-3">
				<h1>Hi</h1>
				<UserButton />
			</div>
		</main>
	);
}
