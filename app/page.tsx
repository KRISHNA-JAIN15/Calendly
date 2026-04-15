import Link from "next/link";
import { Dancing_Script } from "next/font/google";
import { auth } from "@clerk/nextjs/server";
import { Button } from "@/components/ui/button";

const brandFont = Dancing_Script({
  subsets: ["latin"],
  weight: ["700"],
});

export default async function Home() {
  const { userId } = await auth();

  return (
    <main className="relative isolate min-h-full flex-1 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-28 top-12 h-72 w-72 rounded-full bg-amber-200/35 blur-3xl" />
        <div className="absolute right-0 top-40 h-80 w-80 rounded-full bg-cyan-200/35 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-zinc-200/50 blur-3xl" />
      </div>

      <section className="mx-auto grid w-full max-w-5xl items-center gap-8 px-4 py-12 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10 lg:py-14">
        <div className="lg:col-span-2">
          <p
            className={`${brandFont.className} text-center text-5xl leading-none text-zinc-900 sm:text-6xl lg:text-7xl dark:text-zinc-50`}
          >
            Calendly
          </p>
        </div>

        <div className="space-y-6 text-center lg:text-left">
          <p className="inline-flex items-center rounded-full border border-zinc-300/80 bg-white/80 px-3 py-1 text-xs font-medium tracking-[0.14em] text-zinc-600 uppercase backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-300">
            Smart Scheduling
          </p>

          <div className="space-y-4">
            <h1 className="text-pretty text-4xl leading-tight font-semibold tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-50">
              Simple booking pages that stay in sync with your calendar.
            </h1>
            <p className="mx-auto max-w-xl text-base leading-7 text-zinc-600 sm:text-lg lg:mx-0 dark:text-zinc-300">
              Share one link, let people pick open slots, and automatically create calendar invites with meeting details.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <Button asChild size="lg">
              <Link href={userId ? "/events" : "/sign-up"}>
                {userId ? "Go to dashboard" : "Get started free"}
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href={userId ? "/meetings" : "/sign-in"}>
                {userId ? "View meetings" : "Sign in"}
              </Link>
            </Button>
          </div>
        </div>

        <div className="mx-auto w-full max-w-md rounded-2xl border border-zinc-300/70 bg-white/80 p-5 shadow-sm backdrop-blur sm:p-6 lg:mx-0 lg:max-w-none dark:border-zinc-700 dark:bg-zinc-900/70">
          <div className="space-y-4">
            <p className="text-xs font-medium tracking-[0.12em] text-zinc-500 uppercase dark:text-zinc-400">
              Next Available
            </p>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/80">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">30 min Intro Call</p>
              <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Friday, 2:30 PM
              </p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                Asia/Kolkata (GMT+5:30)
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Open Slots</p>
                <p className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">18</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Booked This Week</p>
                <p className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">9</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 pb-16 sm:pb-24">
        <div className="rounded-3xl border border-zinc-300/70 bg-white/80 p-5 shadow-sm backdrop-blur sm:p-7 dark:border-zinc-700 dark:bg-zinc-900/70">
          <div className="space-y-2 text-center sm:text-left">
            <p className="text-xs font-medium tracking-[0.12em] text-zinc-500 uppercase dark:text-zinc-400">
              How It Works
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
              Set up once. Share everywhere.
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-zinc-600 sm:text-base dark:text-zinc-300">
              In just a few steps, your booking page stays synced with your schedule and auto-creates meeting invites.
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/70">
              <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">Step 1</p>
              <p className="mt-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">Create event types</p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Choose duration, title, and booking rules for each meeting.</p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/70">
              <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">Step 2</p>
              <p className="mt-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">Set weekly schedule</p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Define available slots and timezone once, then let it run.</p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/70 sm:col-span-2 lg:col-span-1">
              <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">Step 3</p>
              <p className="mt-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">Share and get booked</p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Invitees pick open times and confirmations are created instantly.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
