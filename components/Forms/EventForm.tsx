"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type EventFormProps = {
	action: (
		formData: FormData
	) =>
		| { error?: string }
		| void
		| Promise<{ error?: string } | void>;
	initialValues?: {
		name: string;
		slug: string;
		durationInMinutes: number;
		description?: string | null;
		isActive: boolean;
	};
	submitLabel?: string;
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

export function EventForm({ action, initialValues, submitLabel = "Save event" }: EventFormProps) {
	const [isPending, startTransition] = useTransition();
	const [serverError, setServerError] = useState("");
	const [slugPreview, setSlugPreview] = useState(initialValues?.slug ?? "");

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<EventFormInput, unknown, EventFormValues>({
		resolver: zodResolver(eventFormSchema),
		defaultValues: {
			name: initialValues?.name ?? "",
			slug: initialValues?.slug ?? "",
			durationInMinutes: initialValues?.durationInMinutes ?? 30,
			description: initialValues?.description ?? "",
			isActive: initialValues?.isActive ?? true,
		},
	});

	const onSubmit = (values: EventFormValues) => {
		setServerError("");

		const formData = new FormData();
		formData.set("name", values.name.trim());
		formData.set("slug", values.slug.trim().toLowerCase());
		formData.set("durationInMinutes", String(values.durationInMinutes));
		formData.set("description", values.description?.trim() ?? "");

		if (values.isActive) {
			formData.set("isActive", "on");
		}

		startTransition(async () => {
			const result = await action(formData);

			if (result && typeof result === "object" && result.error) {
				setServerError(result.error);
			}
		});
	};

	return (
		<form
			className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-6"
			noValidate
			onSubmit={handleSubmit(onSubmit)}
		>
			<div className="space-y-1">
				<h2 className="text-lg font-semibold tracking-tight">Event details</h2>
				<p className="text-sm text-muted-foreground">
					Create a clean booking link and define how long this event should be.
				</p>
			</div>

			{serverError ? (
				<p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
					{serverError}
				</p>
			) : null}

			<div className="grid gap-4 md:grid-cols-[1.4fr_0.6fr]">
				<div className="space-y-2">
					<label htmlFor="name" className="block text-sm font-medium">
						Event name
					</label>
					<Input
						id="name"
						type="text"
						placeholder="30-min intro call"
						aria-invalid={!!errors.name}
						{...register("name")}
					/>
					{errors.name?.message ? (
						<p className="text-sm font-medium text-red-600 dark:text-red-400">{errors.name.message}</p>
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
						className={errors.durationInMinutes ? "border-red-600 focus-visible:border-red-600 focus-visible:ring-red-500/20" : undefined}
						{...register("durationInMinutes")}
					/>
					{errors.durationInMinutes?.message ? (
						<p className="text-sm font-medium text-red-600 dark:text-red-400">{errors.durationInMinutes.message}</p>
					) : null}
				</div>
			</div>

			<div className="space-y-2">
				<label htmlFor="slug" className="block text-sm font-medium">
					URL slug
				</label>
				<Input
					id="slug"
					type="text"
					placeholder="intro-call"
					aria-invalid={!!errors.slug}
					{...register("slug", {
						onChange: (event) => {
							setSlugPreview(String(event.target.value ?? ""));
						},
					})}
				/>
				<p className="text-xs text-muted-foreground">This will be used in your public booking URL.</p>
				<p className="inline-flex rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 font-mono text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
					/{slugPreview.trim() ? slugPreview.trim().toLowerCase() : "event-name"}
				</p>
				{errors.slug?.message ? (
					<p className="text-sm font-medium text-red-600 dark:text-red-400">{errors.slug.message}</p>
				) : null}
			</div>

			<div className="space-y-2">
				<label htmlFor="description" className="block text-sm font-medium">
					Description
				</label>
				<Textarea
					id="description"
					rows={4}
					placeholder="What should invitees know before booking this meeting?"
					aria-invalid={!!errors.description}
					{...register("description")}
				/>
				{errors.description?.message ? (
					<p className="text-sm font-medium text-red-600 dark:text-red-400">{errors.description.message}</p>
				) : null}
			</div>

			<div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/60">
				<div>
					<p className="text-sm font-medium">Active event</p>
					<p className="text-xs text-muted-foreground">Inactive events will not appear on your public page.</p>
				</div>
				<label htmlFor="isActive" className="relative inline-flex cursor-pointer items-center">
					<input id="isActive" type="checkbox" className="peer sr-only" {...register("isActive")} />
					<span className="h-6 w-11 rounded-full bg-zinc-300 transition-colors peer-checked:bg-zinc-900 dark:bg-zinc-700 dark:peer-checked:bg-zinc-100" />
					<span className="pointer-events-none absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5 dark:bg-zinc-900 dark:peer-checked:bg-zinc-800" />
				</label>
			</div>

			<div className="flex items-center justify-end gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
				<Button asChild variant="outline" type="button">
					<Link href="/events">Cancel</Link>
				</Button>
				<Button
					type="submit"
					disabled={isPending}
					className="rounded-lg border border-sky-700 bg-sky-600 text-white hover:bg-sky-700 dark:border-sky-400 dark:bg-sky-500 dark:text-zinc-950 dark:hover:bg-sky-400"
				>
					{isPending ? "Saving..." : submitLabel}
				</Button>
			</div>
		</form>
	);
}
