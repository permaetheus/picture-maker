"use server"

import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  const { data, error } = await supabase.from("workers").select("*")

  if (error) {
    return NextResponse.json(
      { isSuccess: false, error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ isSuccess: true, data }, { status: 200 })
}
