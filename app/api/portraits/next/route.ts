"use server"

import { NextRequest, NextResponse } from "next/server"
import { getNextPortraitAction } from "@/actions/db/portraits-actions"
import { getAuth } from "@clerk/nextjs/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  const { userId } = getAuth(request)
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  // Select columns from portraits, and join to recipients (book_id) & artist_styles (style_id).
  const { data, error } = await supabase
    .from("portraits")
    .select(
      `
      status,
      created_at,
      books!book_id (
        recipients!recipient_id (
          photo_key,
          age,
          gender
        )
      ),
      artist_styles:style_id (
        prompt_template
      )
    `
    )
    .eq("status", "P")
    .is("worker_id", null)
    .order("created_at", { ascending: true })
    .limit(1)

  console.log("Portraits query result:", { data, error })

  if (error) {
    return NextResponse.json(
      { isSuccess: false, error: error.message },
      { status: 500 }
    )
  }

  if (!data || data.length === 0) {
    return NextResponse.json(
      { isSuccess: false, message: "No pending portraits" },
      { status: 404 }
    )
  }

  // Return the single portrait object
  return NextResponse.json({
    isSuccess: true,
    portrait: data[0]
  })
}
