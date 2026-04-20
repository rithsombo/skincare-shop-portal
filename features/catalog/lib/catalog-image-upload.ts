"use client"

import { authFetch } from "@/features/auth/lib/auth-fetch"

const UPLOAD_ENDPOINT = "/supabase/catalog-images/upload"
const DELETE_ENDPOINT = "/supabase/catalog-images/delete"
const R2_PUBLIC_BASE_URL =
  process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL?.replace(/\/+$/, "") ?? ""

export type CatalogImageScope =
  | "products"
  | "collections"
  | "product-categories"
  | "collection-categories"

async function readErrorMessage(response: Response) {
  const text = await response.text()

  if (!text) {
    return `Request failed with status ${response.status}.`
  }

  try {
    const payload = JSON.parse(text) as { error?: string; message?: string }
    return payload.message || payload.error || text
  } catch {
    return text
  }
}

export async function uploadCatalogImageFile({
  companyId,
  file,
  scope,
}: {
  companyId: string
  file: File
  scope: CatalogImageScope
}) {
  const formData = new FormData()
  formData.set("file", file)
  formData.set("company_id", companyId)
  formData.set("scope", scope)

  const response = await authFetch(UPLOAD_ENDPOINT, {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  const payload = (await response.json()) as {
    path?: string
    url?: string | null
  }

  if (typeof payload.path !== "string" || !payload.path.trim()) {
    throw new Error("Upload completed, but no storage path was returned.")
  }

  const publicUrl =
    typeof payload.url === "string" && payload.url.trim()
      ? payload.url
      : R2_PUBLIC_BASE_URL
        ? `${R2_PUBLIC_BASE_URL}/${payload.path}`
        : ""

  if (!publicUrl) {
    throw new Error(
      "Upload succeeded, but no public URL is available. Set NEXT_PUBLIC_R2_PUBLIC_BASE_URL."
    )
  }

  return {
    path: payload.path,
    url: publicUrl,
  }
}

export async function deleteCatalogImageFile({
  companyId,
  path,
}: {
  companyId: string
  path: string
}) {
  const response = await authFetch(DELETE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      company_id: companyId,
      path,
    }),
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }
}
