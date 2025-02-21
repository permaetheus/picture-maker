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
        order_items!inner(
          order_id,
          shopify_orders!inner(
            shopify_order_number
          )
        )
      `)
      .eq('id', portraitId)
      .single()

    console.log('Portrait query result:', JSON.stringify(portraitData, null, 2))

    if (portraitError || !portraitData) {
      console.error('Portrait query error:', portraitError)
      return { 
        isSuccess: false, 
        message: 'Failed to fetch portrait data'
      }
    }

    // Get the Shopify order number from the joined data - handle the nested array structure
    const shopifyOrderNumber = portraitData.order_items?.[0]?.shopify_orders?.[0]?.shopify_order_number ?? "unknown"
    console.log('Extracted Shopify order number:', shopifyOrderNumber)
    
    // Force .png extension regardless of input
    const filename = `${shopifyOrderNumber}_${portraitData.book_id}_${portraitData.id}_${worker?.id || 'unknown'}_${Date.now()}.png`
    console.log('Generated filename:', filename)

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