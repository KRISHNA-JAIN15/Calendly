import type { ReactNode } from "react";

export default function PrivateEventsLayout({
	children,
}: {
	children: ReactNode;
}) {
	return (
		<div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</div>
	);
}
