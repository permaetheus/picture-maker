import { NextRequest, NextResponse } from "next/server"
import { getAuth } from "@clerk/nextjs/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  const { userId } = getAuth(request)
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const { data, error } = await supabase
    .from("portraits")
    .select(
      `
      id,
      status,
      created_at,
      books:book_id (
        recipients:recipient_id (
          photo_key,
          age,
          gender
        )
      ),
      artist_styles:style_id (
        prompt_template_male,
        prompt_template_female,
        midjourney_mboard,
        character,
        stylize,
        aspect_ratio,
        repeat,
        midj_version,
        negative_prompts
      )
    `
    )
    .eq("status", "P")
    .is("worker_id", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .single()

  if (error) {
    return NextResponse.json(
      { isSuccess: false, error: error.message },
      { status: 500 }
    )
  }

  if (!data) {
    return NextResponse.json(
      { isSuccess: false, message: "No pending portraits" },
      { status: 404 }
    )
  }

  console.log("Raw data:", data)

  const firstBook = Array.isArray(data.books) ? data.books[0] : data.books
  const recipients = firstBook?.recipients
  const firstRecipient = Array.isArray(recipients) ? recipients[0] : recipients

  const firstStyle = Array.isArray(data.artist_styles)
    ? data.artist_styles[0]
    : data.artist_styles

  const transformedData = {
    id: data.id,
    status: data.status,
    created_at: data.created_at,
    prompt_template_male: firstStyle?.prompt_template_male,
    prompt_template_female: firstStyle?.prompt_template_female,
    midjourney_mboard: firstStyle?.midjourney_mboard,
    character: firstStyle?.character,
    stylize: firstStyle?.stylize,
    aspect_ratio: firstStyle?.aspect_ratio,
    repeat: firstStyle?.repeat,
    midj_version: firstStyle?.midj_version,
    negative_prompts: firstStyle?.negative_prompts,
    recipient_age: firstRecipient?.age,
    recipient_gender: firstRecipient?.gender,
    reference_photo_url: firstRecipient?.photo_key
  }
  console.log("Transformed data:", transformedData)

  return NextResponse.json({
    isSuccess: true,
    data: transformedData
  })
}
