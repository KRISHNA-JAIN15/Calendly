import Link from "next/link";
import { Button } from "@/components/ui/button";

type EventFormProps = {
	action: (formData: FormData) => void | Promise<void>;
};

export function EventForm({ action }: EventFormProps) {
	return (
		<form className="space-y-5" action={action}>
			<div className="space-y-2">
				<label htmlFor="name" className="block text-sm font-medium">
					Event name
				</label>
				<input
					id="name"
					name="name"
					type="text"
					required
					placeholder="30 minute intro"
					className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none transition focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900"
				/>
			</div>

			<div className="space-y-2">
				<label htmlFor="slug" className="block text-sm font-medium">
					URL slug
				</label>
				<input
					id="slug"
					name="slug"
					type="text"
					required
					placeholder="30-min-intro"
					className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none transition focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900"
				/>
			</div>

			<div className="space-y-2">
				<label htmlFor="durationInMinutes" className="block text-sm font-medium">
					Duration (minutes)
				</label>
				<input
					id="durationInMinutes"
					name="durationInMinutes"
					type="number"
					min={5}
					step={5}
					required
					defaultValue={30}
					className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none transition focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900"
				/>
			</div>

			<div className="space-y-2">
				<label htmlFor="description" className="block text-sm font-medium">
					Description
				</label>
				<textarea
					id="description"
					name="description"
					rows={4}
					placeholder="Short details shown to invitees"
					className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900"
				/>
			</div>

			<label className="flex items-center gap-2 text-sm">
				<input id="isActive" name="isActive" type="checkbox" defaultChecked className="size-4" />
				<span>Active</span>
			</label>

			<div className="flex items-center justify-end gap-2 pt-2">
				<Button asChild variant="outline" type="button">
					<Link href="/events">Cancel</Link>
				</Button>
				<Button type="submit">Save event</Button>
			</div>
		</form>
	);
}
