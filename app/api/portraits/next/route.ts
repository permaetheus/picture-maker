import { NextRequest, NextResponse } from "next/server"
import { getNextPortraitAction } from "@/actions/db/portraits-actions"
import { getAuth } from "@clerk/nextjs/server"

export async function GET(request: NextRequest) {
  const { userId } = getAuth(request)
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const portraitResult = await getNextPortraitAction()
  if (!portraitResult.isSuccess) {
    return NextResponse.json(
      { message: portraitResult.message },
      { status: 404 }
    )
  }

  return NextResponse.json(portraitResult.data)
}
