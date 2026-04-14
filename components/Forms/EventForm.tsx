"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type EventFormProps = {
	action: (formData: FormData) => void | Promise<void>;
};

const eventFormSchema = z.object({
	name: z.string().trim().min(2, "Event name is required"),
	slug: z
		.string()
		.trim()
		.min(2, "URL slug is required")
		.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens"),
	durationInMinutes: z.coerce.number().int().min(5, "Minimum duration is 5 minutes"),
	description: z.string().trim().optional(),
	isActive: z.boolean(),
});

type EventFormInput = z.input<typeof eventFormSchema>;
type EventFormValues = z.output<typeof eventFormSchema>;

export function EventForm({ action }: EventFormProps) {
	const [isPending, startTransition] = useTransition();

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<EventFormInput, unknown, EventFormValues>({
		resolver: zodResolver(eventFormSchema),
		defaultValues: {
			name: "",
			slug: "",
			durationInMinutes: 30,
			description: "",
			isActive: true,
		},
	});

	const onSubmit = (values: EventFormValues) => {
		const formData = new FormData();
		formData.set("name", values.name.trim());
		formData.set("slug", values.slug.trim().toLowerCase());
		formData.set("durationInMinutes", String(values.durationInMinutes));
		formData.set("description", values.description?.trim() ?? "");

		if (values.isActive) {
			formData.set("isActive", "on");
		}

		startTransition(async () => {
			await action(formData);
		});
	};

	return (
		<form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
			<div className="space-y-2">
				<label htmlFor="name" className="block text-sm font-medium">
					Event name
				</label>
				<Input
					id="name"
					type="text"
					placeholder="Event name"
					aria-invalid={!!errors.name}
					{...register("name")}
				/>
				{errors.name?.message ? (
					<p className="text-sm font-medium text-red-600 dark:text-red-400">{errors.name.message}</p>
				) : null}
			</div>

			<div className="space-y-2">
				<label htmlFor="slug" className="block text-sm font-medium">
					URL slug
				</label>
				<Input
					id="slug"
					type="text"
					placeholder="event-name"
					aria-invalid={!!errors.slug}
					{...register("slug")}
				/>
				<p className="text-xs text-muted-foreground">This will be used in your public booking URL.</p>
				{errors.slug?.message ? (
					<p className="text-sm font-medium text-red-600 dark:text-red-400">{errors.slug.message}</p>
				) : null}
			</div>

			<div className="space-y-2">
				<label htmlFor="durationInMinutes" className="block text-sm font-medium">
					Duration (minutes)
				</label>
				<Input
					id="durationInMinutes"
					type="number"
					min={5}
					step={5}
					aria-invalid={!!errors.durationInMinutes}
					{...register("durationInMinutes")}
				/>
				{errors.durationInMinutes?.message ? (
					<p className="text-sm font-medium text-red-600 dark:text-red-400">{errors.durationInMinutes.message}</p>
				) : null}
			</div>

			<div className="space-y-2">
				<label htmlFor="description" className="block text-sm font-medium">
					Description
				</label>
				<Textarea
					id="description"
					rows={4}
					placeholder="Short details shown to invitees"
					aria-invalid={!!errors.description}
					{...register("description")}
				/>
				{errors.description?.message ? (
					<p className="text-sm font-medium text-red-600 dark:text-red-400">{errors.description.message}</p>
				) : null}
			</div>

			<div className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
				<div>
					<p className="text-sm font-medium">Active</p>
					<p className="text-xs text-muted-foreground">Inactive events will not appear on your public page.</p>
				</div>
				<label htmlFor="isActive" className="relative inline-flex cursor-pointer items-center">
					<input id="isActive" type="checkbox" className="peer sr-only" {...register("isActive")} />
					<span className="h-6 w-11 rounded-full bg-zinc-300 transition-colors peer-checked:bg-zinc-900 dark:bg-zinc-700 dark:peer-checked:bg-zinc-100" />
					<span className="pointer-events-none absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5 dark:bg-zinc-900 dark:peer-checked:bg-zinc-800" />
				</label>
			</div>

			<div className="flex items-center justify-end gap-2 pt-2">
				<Button asChild variant="outline" type="button">
					<Link href="/events">Cancel</Link>
				</Button>
				<Button type="submit" disabled={isPending}>
					{isPending ? "Saving..." : "Save event"}
				</Button>
			</div>
		</form>
	);
}
