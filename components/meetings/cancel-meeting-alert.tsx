"use client";

import { useState, useTransition } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type CancelMeetingResult = {
  error?: string;
};

type CancelMeetingAlertProps = {
  bookingId: string;
  action: (formData: FormData) => Promise<CancelMeetingResult | void>;
};

export function CancelMeetingAlert({ bookingId, action }: CancelMeetingAlertProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState("");

  const handleCancelMeeting = () => {
    const formData = new FormData();
    formData.set("bookingId", bookingId);

    setErrorMessage("");

    startTransition(async () => {
      const result = await action(formData);
      if (result?.error) {
        setErrorMessage(result.error);
      }
    });
  };

  return (
    <div className="space-y-2">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            size="sm"
            variant="destructive"
            className="border border-red-700 bg-red-600 text-white hover:bg-red-700 dark:border-red-400 dark:bg-red-500 dark:text-zinc-950 dark:hover:bg-red-400"
          >
            Cancel meeting
          </Button>
        </AlertDialogTrigger>

        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this meeting?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the event from your Google Calendar and remove it from meetings.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Keep meeting</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending}
              onClick={handleCancelMeeting}
            >
              {isPending ? "Cancelling..." : "Cancel meeting"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {errorMessage ? (
        <p className="text-xs text-red-600 dark:text-red-400">{errorMessage}</p>
      ) : null}
    </div>
  );
}
