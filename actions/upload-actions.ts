"use server"

import { supabase } from "@/lib/supabase"
import { ActionState } from "@/types"
import { auth } from "@clerk/nextjs/server"

export async function uploadImageAction(
  base64Image: string,
  portraitId: number
): Promise<ActionState<string>> {
  try {
    // Validate PNG format
    if (!base64Image.startsWith('data:image/png;base64,')) {
      return {
        isSuccess: false,
        message: 'Only PNG images are allowed'
      }
    }

    // Get worker ID first
    const { userId } = await auth()
    const { data: worker } = await supabase
      .from("workers")
      .select("id")
      .eq("clerk_id", userId)
      .single()

    // Then get portrait data
    const { data: portraitData, error: portraitError } = await supabase
      .from("portraits")
      .select(`
        id,
        book_id,
        books:book_id (
          id,
          order_items (
            order_id,
            order:order_id (
              shopify_order_number
            )
          )
        )
      `)
      .eq('id', portraitId)
      .single()

    if (portraitError || !portraitData) {
      return { 
        isSuccess: false, 
        message: 'Failed to fetch portrait data'
      }
    }

    // Safely pick the first book
    const firstBook = portraitData.books?.[0]

    // Then the first order_item from that book
    const firstItem = firstBook?.order_items?.[0]

    // If "order" is returned as an array, pick the first element.
    const singleOrder = Array.isArray(firstItem?.order)
      ? firstItem.order[0]
      : firstItem?.order

    // Finally, get the shopify_order_number
    const shopifyOrderNumber = singleOrder?.shopify_order_number ?? "unknown"
    
    // Force .png extension regardless of input
    const filename = `${shopifyOrderNumber}_${portraitData.book_id}_${portraitData.id}_${worker?.id || 'unknown'}_${Date.now()}.png`

    // Convert base64 to blob
    const base64Response = await fetch(base64Image)
    const blob = await base64Response.blob()

    // Upload to Supabase
    const { data, error } = await supabase.storage
      .from('proofing-images')
      .upload(filename, blob, {
        contentType: blob.type,
        cacheControl: '3600'
      })

    if (error) {
      return { 
        isSuccess: false, 
        message: 'Failed to upload image to Supabase' 
      }
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('proofing-images')
      .getPublicUrl(filename)

    return {
      isSuccess: true,
      message: "Image uploaded successfully",
      data: publicUrl
    }
  } catch (error) {
    console.error("Error uploading image:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to upload image"
    }
  }
} 