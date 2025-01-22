import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"

interface Portrait {
  id: bigint
  book_id: bigint
  style_id: bigint
  worker_id: bigint | null
  status: string
  image_key: string | null
  proof_status: string | null
  proof_feedback: string | null
  completed_at: string | null
  created_at: string
  recipients: {
    photo_key: string
    age: number
    gender: string
  }
  artist_styles: {
    prompt_template: string
    name: string
  }
}

interface PortraitResponse {
  id: number
  reference_photo_url: string
  recipient_age: number
  recipient_gender: string
  prompt_template: string
  style_name: string
}

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return new Response("Unauthorized", { status: 401 })
  }

  try {
    const supabase = createRouteHandlerClient({ cookies })

    const { data: portrait, error } = await supabase
      .from("portraits")
      .select(
        `
        *,
        recipients:books!inner(
          photo_key,
          age,
          gender
        ),
        artist_styles!inner(
          prompt_template,
          name
        )
      `
      )
      .eq("status", "P")
      .is("worker_id", null)
      .order("created_at", { ascending: true })
      .limit(1)
      .single()

    if (error) throw error

    if (!portrait) {
      return NextResponse.json(
        { message: "No portraits available" },
        { status: 404 }
      )
    }

    const response: PortraitResponse = {
      id: Number(portrait.id),
      reference_photo_url: portrait.recipients.photo_key,
      recipient_age: portrait.recipients.age,
      recipient_gender: portrait.recipients.gender,
      prompt_template: portrait.artist_styles.prompt_template,
      style_name: portrait.artist_styles.name
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error fetching portrait:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
