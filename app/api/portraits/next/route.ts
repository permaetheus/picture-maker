import { NextRequest, NextResponse } from "next/server"
import { getAuth } from "@clerk/nextjs/server"
import { supabase } from "@/lib/supabase"

// Define types for our data structure
interface ArtistStyle {
  prompt_template: string
  midjourney_mboard?: string
  character?: string
  aspect_ratio?: string
}

interface Recipient {
  photo_key: string
  age: number
  gender: string
}

interface Portrait {
  id: number
  status: string
  created_at: string
  books:
    | {
        recipients: Recipient | Recipient[]
      }
    | {
        recipients: Recipient | Recipient[]
      }[]
  artist_styles: ArtistStyle | ArtistStyle[]
}

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
        prompt_template,
        midjourney_mboard,
        character,
        aspect_ratio
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
      { message: "Failed to fetch portrait", error },
      { status: 500 }
    )
  }

  if (!data) {
    return NextResponse.json(
      { message: "No pending portraits found" },
      { status: 404 }
    )
  }

  const portraitData = data as Portrait

  console.log("Raw data:", portraitData)

  if (portraitData.artist_styles) {
    // Get the first style from the array
    const firstStyle = Array.isArray(portraitData.artist_styles)
      ? portraitData.artist_styles[0]
      : portraitData.artist_styles

    if (firstStyle) {
      // Update the prompt template with concatenated fields
      firstStyle.prompt_template = [
        firstStyle.prompt_template?.trim(),
        firstStyle.midjourney_mboard?.trim(),
        firstStyle.character?.trim(),
        firstStyle.aspect_ratio?.trim()
      ]
        .filter(Boolean)
        .join(" ")
    }
  }

  const firstBook = Array.isArray(portraitData.books)
    ? portraitData.books[0]
    : portraitData.books
  const recipients = firstBook?.recipients
  const firstRecipient = Array.isArray(recipients) ? recipients[0] : recipients

  const transformedData = {
    id: portraitData.id,
    status: portraitData.status,
    created_at: portraitData.created_at,
    prompt_template: Array.isArray(portraitData.artist_styles)
      ? portraitData.artist_styles[0]?.prompt_template
      : portraitData.artist_styles?.prompt_template,
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
