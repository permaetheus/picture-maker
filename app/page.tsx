import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import WorkerDashboard from "@/components/WorkerDashboard"

export default async function Home() {
  const { userId, redirectToSignIn } = await auth()

  if (!userId) {
    return redirectToSignIn()
  }

  return <WorkerDashboard />
}
