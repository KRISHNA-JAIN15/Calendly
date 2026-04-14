import { Show, UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center p-6">
      <div className="flex items-center gap-3">
        <Show when="signed-out">
          <Link
            href="/sign-in"
            className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-white/20 dark:text-zinc-100 dark:hover:bg-zinc-900"
          >
            Sign in
          </Link>
        </Show>
        <Show when="signed-out">
          <Link
            href="/sign-up"
            className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-white/20 dark:text-zinc-100 dark:hover:bg-zinc-900"
          >
            Sign up
          </Link>
        </Show>
        <Show when="signed-in">
          <UserButton />
        </Show>
      </div>
    </main>
  );
}
