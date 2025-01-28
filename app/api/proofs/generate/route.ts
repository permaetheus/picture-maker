import { NextRequest, NextResponse } from "next/server"
import { getAuth } from "@clerk/nextjs/server"

if (!process.env.PIPEDREAM_PROOF_TRIGGER_KEY) {
  throw new Error("Missing PIPEDREAM_PROOF_TRIGGER_KEY environment variable")
}

export async function POST(request: NextRequest) {
  const { userId } = await getAuth(request)
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { bookId } = body

  if (!bookId) {
    return NextResponse.json({ message: "bookId is required" }, { status: 400 })
  }

  try {
    const response = await fetch("https://eofibx6zqx4lerg.m.pipedream.net", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.PIPEDREAM_PROOF_TRIGGER_KEY}`
      },
      body: JSON.stringify({ bookId })
    })

    if (!response.ok) {
      throw new Error(`Proof service returned ${response.status}`)
    }

    return NextResponse.json({
      message: "Proof generation triggered successfully",
      success: true
    })
  } catch (error) {
    console.error("Failed to trigger proof generation:", error)
    return NextResponse.json(
      { message: "Failed to trigger proof generation" },
      { status: 500 }
    )
  }
}
