"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Show, UserButton } from "@clerk/nextjs";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const APP_LINKS = [
  { href: "/events", label: "Events" },
  { href: "/schedule", label: "Schedule" },
  { href: "/meetings", label: "Meetings" },
];

export function AppNavbar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const isActiveLink = (href: string) =>
    pathname === href || (pathname?.startsWith(`${href}/`) ?? false);

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto w-full max-w-5xl px-4">
        <div className="flex h-14 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              onClick={closeMobileMenu}
              className="truncate text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
            >
              Calendly
            </Link>

            <Show when="signed-in">
              <nav className="hidden items-center gap-1 md:flex">
                {APP_LINKS.map((link) => (
                  <Button
                    key={link.href}
                    asChild
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100",
                      isActiveLink(link.href)
                        ? "bg-zinc-900 text-white hover:bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-100"
                        : ""
                    )}
                  >
                    <Link href={link.href} onClick={closeMobileMenu}>
                      {link.label}
                    </Link>
                  </Button>
                ))}
              </nav>
            </Show>
          </div>

          <div className="flex items-center gap-2">
            <Show when="signed-out">
              <div className="hidden items-center gap-2 md:flex">
                <Button asChild variant="outline" size="sm">
                  <Link href="/sign-in" onClick={closeMobileMenu}>
                    Sign in
                  </Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/sign-up" onClick={closeMobileMenu}>
                    Sign up
                  </Link>
                </Button>
              </div>
            </Show>

            <Show when="signed-in">
              <UserButton />
            </Show>

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="md:hidden"
              aria-label="Toggle menu"
              aria-expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen((previous) => !previous)}
            >
              {isMobileMenuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </Button>
          </div>
        </div>

        <div
          className={cn(
            "overflow-hidden border-t border-zinc-200/80 transition-all duration-200 md:hidden dark:border-zinc-800",
            isMobileMenuOpen ? "max-h-80 py-3 opacity-100" : "max-h-0 py-0 opacity-0"
          )}
        >
          <Show when="signed-in">
            <nav className="grid gap-1">
              {APP_LINKS.map((link) => (
                <Button
                  key={link.href}
                  asChild
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "w-full justify-start",
                    isActiveLink(link.href)
                      ? "bg-zinc-900 text-white hover:bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-100"
                      : ""
                  )}
                >
                  <Link href={link.href} onClick={closeMobileMenu}>
                    {link.label}
                  </Link>
                </Button>
              ))}
            </nav>
          </Show>

          <Show when="signed-out">
            <div className="grid grid-cols-2 gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/sign-in" onClick={closeMobileMenu}>
                  Sign in
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/sign-up" onClick={closeMobileMenu}>
                  Sign up
                </Link>
              </Button>
            </div>
          </Show>
        </div>
      </div>
    </header>
  );
}