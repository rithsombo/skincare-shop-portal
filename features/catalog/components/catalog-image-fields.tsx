"use client"

import { ImageIcon, PlusIcon } from "lucide-react"
import Image from "next/image"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type CatalogImage = {
  image_url: string
  alt_text: string
  file?: File | null
  preview_url?: string | null
}

export function CatalogImageFields({
  addImage,
  disabled = false,
  images,
  onError,
  removeImage,
  scopeLabel,
  selectImageFile,
  updateImageValue,
}: {
  addImage: () => void
  disabled?: boolean
  images: CatalogImage[]
  onError?: (message: string | null) => void
  removeImage: (index: number) => void
  scopeLabel: string
  selectImageFile: (index: number, file: File | null) => void
  updateImageValue: (
    index: number,
    key: "image_url" | "alt_text",
    value: string
  ) => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label>Images</Label>
          <p className="text-[11px] text-muted-foreground">
            Pick a file for preview now. It uploads to R2 only when you save.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addImage}
          disabled={disabled}
        >
          <PlusIcon />
          Add image
        </Button>
      </div>

      <div className="space-y-3">
        {images.map((image, index) => {
          const previewUrl = image.preview_url || image.image_url
          const selectedFileName = image.file?.name

          return (
            <div
              key={`${scopeLabel}-image-${index}`}
              className="grid gap-3 border border-border p-3"
            >
              <div className="space-y-2">
                <Label htmlFor={`${scopeLabel}-image-file-${index}`}>
                  Upload photo
                </Label>
                <Input
                  id={`${scopeLabel}-image-file-${index}`}
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    onError?.(null)
                    selectImageFile(index, event.target.files?.[0] ?? null)
                    event.target.value = ""
                  }}
                  disabled={disabled}
                />
                {selectedFileName ? (
                  <p className="text-[11px] text-muted-foreground">
                    Selected file: {selectedFileName}. It will upload on save.
                  </p>
                ) : null}
              </div>

              {previewUrl ? (
                <div className="space-y-2">
                  <Label>Preview</Label>
                  <div className="border border-border p-2">
                    <Image
                      src={previewUrl}
                      alt={image.alt_text || "Selected catalog image preview"}
                      width={1200}
                      height={1200}
                      unoptimized
                      className="max-h-48 w-full object-contain"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <ImageIcon className="size-3" />
                  No image selected yet.
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor={`${scopeLabel}-image-url-${index}`}>
                  Public URL
                </Label>
                <Input
                  id={`${scopeLabel}-image-url-${index}`}
                  value={image.image_url}
                  onChange={(event) =>
                    updateImageValue(index, "image_url", event.target.value)
                  }
                  placeholder="https://..."
                  disabled={disabled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${scopeLabel}-image-alt-${index}`}>
                  Alt text
                </Label>
                <Input
                  id={`${scopeLabel}-image-alt-${index}`}
                  value={image.alt_text}
                  onChange={(event) =>
                    updateImageValue(index, "alt_text", event.target.value)
                  }
                  placeholder="Optional description"
                  disabled={disabled}
                />
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeImage(index)}
                  disabled={disabled}
                >
                  Remove
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
