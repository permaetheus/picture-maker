import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    // Get recipient ID from request body instead of URL param
    const body = await request.json()
    const { recipientId } = body

    if (!recipientId || isNaN(parseInt(recipientId))) {
      return NextResponse.json(
        { isSuccess: false, message: "Invalid or missing recipient ID" },
        { status: 400 }
      )
    }

    // Create Supabase client with the correct pattern for Next.js App Router
    const supabase = createRouteHandlerClient(
      {
        cookies: () => cookies()
      },
      {
        supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    )

    console.log(`Processing request for recipient ID: ${recipientId}`)

    // Query the recipient_photos table
    console.log(
      `Querying recipient_photos table for recipient_id: ${recipientId}`
    )
    const { data, error } = await supabase
      .from("recipient_photos")
      .select("*")
      .eq("recipient_id", recipientId)
      .order("created_at", { ascending: true })

    console.log("Database query result RAW:", JSON.stringify(data, null, 2))

    if (error) {
      console.error("Error fetching recipient photos:", error)
      return NextResponse.json(
        { isSuccess: false, message: "Failed to fetch recipient photos" },
        { status: 500 }
      )
    }

    // Handle no photos case
    if (!data || data.length === 0) {
      console.log("No photos found for recipient ID:", recipientId)
      return NextResponse.json({
        isSuccess: true,
        message: "No photos found for this recipient",
        data: []
      })
    }

    // Generate signed URLs for each photo
    console.log(`Found ${data.length} photos, generating signed URLs...`)

    // Print each photo detail for debugging
    data.forEach((photo, i) => {
      console.log(`Photo ${i + 1}:`, {
        id: photo.id,
        recipient_id: photo.recipient_id,
        photo_key: photo.photo_key
      })
    })

    const photosWithUrls = await Promise.all(
      data.map(async (photo, index) => {
        console.log(
          `Processing photo ${index + 1}/${data.length}, key: ${photo.photo_key}`
        )

        // Check if photo_key is already a URL
        const isUrl =
          photo.photo_key.startsWith("http://") ||
          photo.photo_key.startsWith("https://")

        if (isUrl) {
          console.log(
            `Photo key is already a URL, using directly: ${photo.photo_key}`
          )
          return {
            id: photo.id,
            photoKey: photo.photo_key,
            url: photo.photo_key,
            createdAt: photo.created_at
          }
        }

        // If not a URL, treat as Supabase storage key
        try {
          const bucketName = "photos"
          const { data: urlData, error: urlError } = await supabase.storage
            .from(bucketName)
            .createSignedUrl(photo.photo_key, 3600) // 1 hour expiry

          if (urlError) {
            console.error(
              `Error creating signed URL for photo key ${photo.photo_key}:`,
              urlError
            )
            return null
          }

          console.log(
            `Generated URL for photo ${index + 1}: ${urlData?.signedUrl ? "Success" : "Failed"}`
          )

          return {
            id: photo.id,
            photoKey: photo.photo_key,
            url: urlData?.signedUrl || "",
            createdAt: photo.created_at
          }
        } catch (err) {
          console.error(
            `Exception generating URL for photo key ${photo.photo_key}:`,
            err
          )
          return null
        }
      })
    )

    const filteredPhotos = photosWithUrls.filter(photo => photo && photo.url)

    // Log for debugging
    console.log(
      `Found ${filteredPhotos.length} valid photos for recipient ${recipientId}`
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
