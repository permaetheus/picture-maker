"use server"

import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getNextPortraitAction } from "@/actions/db/portraits-actions"
import WorkerClientPage from "./worker-client-page"

export default async function WorkerPage() {
  const { userId } = await auth()
  if (!userId) {
    return redirect("/login")
  }

  const result = await getNextPortraitAction()
  return <WorkerClientPage initialPortraitResult={result} />
}
