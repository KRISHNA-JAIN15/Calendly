import type { ReactNode } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

export default function PrivateEventsLayout({
	children,
}: {
	children: ReactNode;
}) {
	return (
		<div className="flex min-h-full flex-1 flex-col">
			<header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
				<div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
					<Link href="/events" className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
						Events
					</Link>
					<UserButton />
				</div>
			</header>
			<div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</div>
		</div>
	);
}
