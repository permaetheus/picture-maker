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

    if (!worker?.id) {
      return {
        isSuccess: false,
        message: 'Worker not found'
      }
    }

    // Then get portrait data with all required relationships
    const { data: portraitData, error: portraitError } = await supabase
      .from("portraits")
      .select(`
        id,
        book_id,
        books:book_id (
          id,
          order_items (
            order_id,
            shopify_orders!order_id (
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

    // Safely navigate the relationship chain
    const firstBook = Array.isArray(portraitData.books) ? portraitData.books[0] : portraitData.books
    const firstOrderItem = firstBook?.order_items?.[0]
    const shopifyOrder = Array.isArray(firstOrderItem?.shopify_orders) 
      ? firstOrderItem?.shopify_orders[0] 
      : firstOrderItem?.shopify_orders

    if (!shopifyOrder?.shopify_order_number) {
      console.log('Debug data:', {
        portraitData,
        firstBook,
        firstOrderItem,
        shopifyOrder
      })
      return {
        isSuccess: false,
        message: 'Failed to find Shopify order number'
      }
    }

    // Format: shopifyOrderNumber_bookId_portraitId_workerId_timestamp.png
    const filename = `${shopifyOrder.shopify_order_number}_${portraitData.book_id}_${portraitData.id}_${worker.id}_${Date.now()}.png`

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