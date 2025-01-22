import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"

interface SubmitRequest {
  midjourneyUrl: string
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth()

  if (!userId) {
    return new Response("Unauthorized", { status: 401 })
  }

  try {
    const { id } = params
    const { midjourneyUrl }: SubmitRequest = await req.json()

    const supabase = createRouteHandlerClient({ cookies })

    // First get the worker's ID from the workers table using clerk_id
    const { data: worker, error: workerError } = await supabase
      .from("workers")
      .select("id")
      .eq("clerk_id", userId)
      .single()

    if (workerError || !worker) {
      throw new Error("Worker not found")
    }

    const { error } = await supabase
      .from("portraits")
      .update({
        status: "C",
        worker_id: worker.id,
        image_key: midjourneyUrl,
        completed_at: new Date().toISOString()
      })
      .eq("id", id)
      .eq("status", "P")
      .is("worker_id", null)

    if (error) throw error

    return NextResponse.json({ message: "Portrait submitted successfully" })
  } catch (error) {
    console.error("Error submitting portrait:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
