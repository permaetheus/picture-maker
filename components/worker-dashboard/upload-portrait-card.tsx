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
import { Upload, X } from "lucide-react"
import Image from "next/image"
import { uploadImageAction } from "@/actions/upload-actions"
import { useToast } from "@/components/ui/use-toast"

interface UploadPortraitCardProps {
  onImageUpload?: (imageUrl: string) => Promise<void>
  userId: string
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
  const { toast } = useToast()

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    console.log("File type:", file.type)

    if (file.type !== "image/png") {
      toast({
        variant: "destructive",
        title: "Wrong file type",
        description: "Please upload a PNG file only"
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

  const handlePaste = async (event: React.ClipboardEvent) => {
    const items = event.clipboardData?.items
    const imageItem = Array.from(items || []).find(
      item => item.type.indexOf("image") !== -1
    )

    if (imageItem) {
      const file = imageItem.getAsFile()
      if (!file) return

      if (file.type !== "image/png") {
        toast({
          variant: "destructive",
          title: "Invalid file type",
          description: "Please paste a PNG image only."
        })
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        setImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

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
          variant={image && !isLoading ? "destructive" : "outline"}
          disabled={!image || isLoading}
        >
          <X className="mr-2 size-4" />
          Clear
        </Button>
        <Button
          onClick={handleSubmit}
          variant={image && !isLoading ? "success" : "default"}
          disabled={!image || isLoading}
        >
          {isLoading ? "Uploading..." : "Upload"}
        </Button>
      </CardFooter>
    </Card>
  )
}
