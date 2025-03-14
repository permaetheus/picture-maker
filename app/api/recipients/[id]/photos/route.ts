import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Extract and validate the recipient ID
    const recipientId = parseInt(params.id)

    if (isNaN(recipientId)) {
      return NextResponse.json(
        { isSuccess: false, message: "Invalid recipient ID" },
        { status: 400 }
      )
    }

    // Let's try an alternative approach to handle cookies properly in App Router
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({
      cookies: () => cookieStore
    })

    console.log(`Processing request for recipient ID: ${recipientId}`)

    // Query the recipient_photos table
    const { data, error } = await supabase
      .from("recipient_photos")
      .select("*")
      .eq("recipient_id", recipientId)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching recipient photos:", error)
      return NextResponse.json(
        { isSuccess: false, message: "Failed to fetch recipient photos" },
        { status: 500 }
      )
    }

    // Handle no photos case
    if (!data || data.length === 0) {
      return NextResponse.json({
        isSuccess: true,
        message: "No photos found for this recipient",
        data: []
      })
    }

    // Generate signed URLs for each photo
    const photosWithUrls = await Promise.all(
      data.map(async photo => {
        const { data: urlData } = await supabase.storage
          .from("photos") // Replace with your actual bucket name
          .createSignedUrl(photo.photo_key, 3600) // 1 hour expiry

        return {
          id: photo.id,
          photoKey: photo.photo_key,
          url: urlData?.signedUrl || "",
          createdAt: photo.created_at
        }
      })
    )

    const filteredPhotos = photosWithUrls.filter(photo => photo.url)

    // Log for debugging
    console.log(
      `Found ${filteredPhotos.length} photos for recipient ${recipientId}`
    )

    return NextResponse.json({
      isSuccess: true,
      message: "Recipient photos retrieved successfully",
      data: filteredPhotos
    })
  } catch (error) {
    console.error("Error retrieving recipient photos:", error)
    return NextResponse.json(
      { isSuccess: false, message: "Failed to retrieve recipient photos" },
      { status: 500 }
    )
  }
}
