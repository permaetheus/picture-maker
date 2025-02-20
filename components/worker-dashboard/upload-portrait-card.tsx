"use client"

import * as React from "react"
import { useRef, useState, useEffect } from "react"
import Image from "next/image"
import { Loader2, Upload } from "lucide-react"
import { toast } from "sonner"
import { uploadImageAction } from "@/actions/upload-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface UploadPortraitCardProps {
  onImageUpload?: (imageUrl: string) => Promise<void>
  userId?: string
  portraitId: number
}

export default function UploadPortraitCard({
  onImageUpload,
  userId,
  portraitId
}: UploadPortraitCardProps) {
  const [image, setImage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Check file size (10MB limit)
    const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB in bytes
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Please upload an image smaller than 10MB", {
        description: "File too large"
      })
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      return
    }

    if (file.type !== "image/png") {
      toast.error("Please upload a PNG file only", {
        description: "Wrong file type"
      })
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setImage(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const processPastedImage = (file: File) => {
    // Check file size (10MB limit)
    const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB in bytes
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Please upload an image smaller than 10MB", {
        description: "File too large"
      })
      return
    }

    if (file.type !== "image/png") {
      toast.error("Please paste a PNG image only.", {
        description: "Invalid file type"
      })
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setImage(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  // Handle paste events
  const handlePaste = (event: ClipboardEvent) => {
    const items = event.clipboardData?.items
    if (!items) return

    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile()
        if (file) {
          processPastedImage(file)
        }
        break
      }
    }
  }

  // Add and remove paste event listener
  useEffect(() => {
    document.addEventListener("paste", handlePaste)
    return () => {
      document.removeEventListener("paste", handlePaste)
    }
  }, [])

  const handleSubmit = async () => {
    if (!image || !onImageUpload) return

    try {
      setIsLoading(true)
      const result = await uploadImageAction(image, portraitId)
      if (!result.isSuccess || !result.data) {
        throw new Error(result.message)
      }
      await onImageUpload(result.data)
      setImage(null)
    } catch (error) {
      console.error("Error submitting image:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClear = () => {
    setImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Upload Generated Image</CardTitle>
          <span className="text-sm text-gray-500">
            Portrait ID: {portraitId}
          </span>
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-4 text-center">
          <Label htmlFor="image-upload" className="cursor-pointer">
            {image ? (
              <Image
                src={image}
                alt="Uploaded image"
                width={300}
                height={300}
                className="mx-auto rounded-lg"
                unoptimized
              />
            ) : (
              <div className="space-y-2 py-4">
                <Upload className="mx-auto size-8 text-gray-400" />
                <p>Drag and drop an image here, or click to select</p>
                <p className="text-sm text-gray-500">
                  You can paste an image anywhere on the page (Ctrl+V)
                </p>
              </div>
            )}
          </Label>
          <Input
            id="image-upload"
            type="file"
            accept="image/png"
            className="hidden"
            onChange={handleImageUpload}
            ref={fileInputRef}
          />
        </div>

        {image && (
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={handleClear}
              className="rounded px-4 py-2 text-gray-600 hover:bg-gray-100"
              disabled={isLoading}
            >
              Clear
            </button>
            <button
              onClick={handleSubmit}
              className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 inline size-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Upload"
              )}
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
