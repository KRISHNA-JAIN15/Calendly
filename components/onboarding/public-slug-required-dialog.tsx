"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type SavePublicSlugResult = {
  error?: string;
};

type PublicSlugRequiredDialogProps = {
  savePublicSlugAction: (formData: FormData) => Promise<SavePublicSlugResult>;
};

export function PublicSlugRequiredDialog({ savePublicSlugAction }: PublicSlugRequiredDialogProps) {
  const router = useRouter();
  const [publicSlug, setPublicSlug] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const formData = new FormData();
    formData.set("publicSlug", publicSlug);

    startTransition(async () => {
      const result = await savePublicSlugAction(formData);

      if (result?.error) {
        setError(result.error);
        return;
      }

      router.refresh();
    });
  };

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-black/15 p-4 backdrop-blur-[1px] dark:bg-black/45">
      <Card className="w-full max-w-md border-zinc-200/80 shadow-xl dark:border-zinc-800">
        <CardHeader>
          <CardTitle>Choose your public URL</CardTitle>
          <CardDescription>
            Before continuing, set a unique profile slug. Your booking page will use this URL.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <label htmlFor="publicSlug" className="block text-sm font-medium">
                Public slug
              </label>
              <Input
                id="publicSlug"
                type="text"
                value={publicSlug}
                onChange={(event) => {
                  setPublicSlug(event.target.value);
                  if (error) {
                    setError("");
                  }
                }}
                placeholder="your-name"
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground">Allowed: lowercase letters, numbers, hyphens.</p>
              <p className="text-xs text-muted-foreground">Your URL: /{publicSlug.trim().toLowerCase() || "your-name"}</p>
              {error ? <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p> : null}
            </div>

            <Button type="submit" disabled={isPending || publicSlug.trim().length === 0}>
              {isPending ? "Saving..." : "Save and continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
