import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { ReactNode } from "react"

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const { userId } = await auth()
  if (userId != null) redirect("/events")

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-md sm:max-w-lg">
        {children}
      </div>
    </div>
  )
}