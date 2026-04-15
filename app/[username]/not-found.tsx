import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PublicProfileNotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center px-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Booking page not found</CardTitle>
          <CardDescription>
            This username does not exist, or the booking page is no longer available.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <Button asChild className="w-full sm:w-auto">
            <Link href="/">Go to home</Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/sign-up">Create your own page</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
