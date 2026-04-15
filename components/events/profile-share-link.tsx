"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ProfileShareLinkProps = {
  shareLink: string;
};

export function ProfileShareLink({ shareLink }: ProfileShareLinkProps) {
  const [copied, setCopied] = useState(false);

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <p className="text-sm font-medium">Share your booking page</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input readOnly value={shareLink} className="min-w-0 flex-1 font-mono text-xs md:text-sm" />
        <Button type="button" variant="outline" onClick={copyShareLink} className="w-full sm:w-auto">
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}
