"use server"

import { supabase } from "@/lib/supabase"
import { ActionState } from "@/types"

// Retrieve the oldest pending portrait (status = 'P') that has no assigned worker
export async function getNextPortraitAction(): Promise<ActionState<any>> {
  try {
    // Temporarily replace the RPC call with a raw .from() query:
    const { data, error } = await supabase
      .from("portraits")
      .select(`
        id, book_id, style_id, worker_id, status, image_key,
        proof_status, proof_feedback, completed_at, created_at
      `)
      .eq("status", "P")
      .is("worker_id", null)
      .order("created_at", { ascending: true })
      .limit(1)

    if (error) {
      return { isSuccess: false, message: error.message }
    }
    if (!data || data.length < 1) {
      return { isSuccess: false, message: "No portraits available" }
    }
    return {
      isSuccess: true,
      message: "Success",
      data: data[0]
    }
  } catch (err: any) {
    return { isSuccess: false, message: err.message }
  }
}

// Mark a portrait as complete, assign the worker, and store the image_key
export async function submitPortraitAction(
  portraitId: number,
  workerId: number,
  midjourneyUrl: string
): Promise<ActionState<void>> {
  try {
    const { error } = await supabase
      .from("portraits")
      .update({
        status: "C",
        worker_id: workerId,
        image_key: midjourneyUrl,
        completed_at: new Date().toISOString()
      })
      .eq("id", portraitId)

    if (error) {
      return { isSuccess: false, message: error.message }
    }

    return {
      isSuccess: true,
      message: "Portrait submitted successfully",
      data: undefined
    }
  } catch (err: any) {
    return { isSuccess: false, message: err.message }
  }
} 