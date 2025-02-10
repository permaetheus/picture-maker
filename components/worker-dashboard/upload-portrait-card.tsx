"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Upload, X } from "lucide-react"
import Image from "next/image"
import { uploadImageAction } from "@/actions/upload-actions"

interface UploadPortraitCardProps {
  onImageUpload?: (imageUrl: string) => Promise<void>
}

export default function UploadPortraitCard({
  onImageUpload
}: UploadPortraitCardProps) {
  const [image, setImage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = e => {
        setImage(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handlePaste = (event: React.ClipboardEvent) => {
    const items = event.clipboardData?.items
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile()
          if (blob) {
            const reader = new FileReader()
            reader.onload = e => {
              setImage(e.target?.result as string)
            }
            reader.readAsDataURL(blob)
          }
        }
      }
    }
  }

  const handleSubmit = async () => {
    if (!image || !onImageUpload) return

    setIsLoading(true)
    try {
      const result = await uploadImageAction(image)
      if (!result.isSuccess) {
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
        <CardTitle>Upload Reference Photo</CardTitle>
      </CardHeader>

      <CardContent>
        <div
          className="rounded-lg border-2 border-dashed border-gray-300 p-4 text-center"
          onPaste={handlePaste}
        >
          <Label htmlFor="image-upload" className="cursor-pointer">
            {image ? (
              <Image
                src={image}
                alt="Uploaded image"
                width={300}
                height={300}
                className="mx-auto rounded-lg"
              />
            ) : (
              <div className="space-y-2 py-4">
                <Upload className="mx-auto size-8 text-gray-400" />
                <p>Drag and drop an image here, or click to select</p>
                <p className="text-sm text-gray-500">
                  You can also paste an image
                </p>
              </div>
            )}
          </Label>
          <Input
            id="image-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
            ref={fileInputRef}
          />
        </div>
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button
          onClick={handleClear}
          variant="outline"
          disabled={!image || isLoading}
        >
          <X className="mr-2 size-4" />
          Clear
        </Button>
        <Button onClick={handleSubmit} disabled={!image || isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 size-4" />
              Upload
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
