"use server"

import { supabase } from "@/lib/supabase"
import { ActionState } from "@/types"

export async function uploadImageAction(
  base64Image: string
): Promise<ActionState<string>> {
  try {
    // Convert base64 to blob
    const base64Response = await fetch(base64Image)
    const blob = await base64Response.blob()

    // Generate a unique filename
    const filename = `proof_${Date.now()}.${blob.type.split('/')[1]}`

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