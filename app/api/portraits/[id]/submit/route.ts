import { NextRequest, NextResponse } from "next/server"
import { getAuth } from "@clerk/nextjs/server"
import { submitPortraitAction } from "@/actions/db/portraits-actions"
import { supabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const { userId } = await getAuth(request)
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  // Parse portraitId from URL
  const { pathname } = request.nextUrl
  // e.g. "/api/portraits/7/submit" => portraitId === 7
  const segments = pathname.split("/")
  const portraitId = Number(segments[segments.length - 2])

  // Get worker using Clerk ID from Supabase
  const { data: worker, error } = await supabase
    .from("workers")
    .select("id")
    .eq("clerk_id", userId)
    .single()

  if (error || !worker) {
    return NextResponse.json({ message: "Worker not found" }, { status: 404 })
  }

  const body = await request.json()
  const { midjourneyUrl } = body

  if (!midjourneyUrl) {
    return NextResponse.json(
      { message: "No midjourneyUrl provided" },
      { status: 400 }
    )
  }

  const submitResult = await submitPortraitAction(
    portraitId,
    worker.id,
    midjourneyUrl
  )
  if (!submitResult.isSuccess) {
    return NextResponse.json(
      { message: submitResult.message, success: false },
      { status: 400 }
    )
  }

  return NextResponse.json({ message: "Submitted", success: true })
}
