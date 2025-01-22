import { NextRequest, NextResponse } from "next/server"
import { getAuth } from "@clerk/nextjs/server"
import { submitPortraitAction } from "@/actions/db/portraits-actions"

interface Params {
  params: { id: string }
}

export async function POST(request: NextRequest, { params }: Params) {
  const { userId } = getAuth(request)
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  // Note: you'd map the Clerk user to a worker_id you have stored
  // For now, we assume workerId is the same as userId (or you fetch from your DB)
  const workerId = Number(userId)
  const portraitId = Number(params.id)

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
    workerId,
    midjourneyUrl
  )
  if (!submitResult.isSuccess) {
    return NextResponse.json({ message: submitResult.message }, { status: 400 })
  }

  return NextResponse.json({ message: "Submitted" })
}
