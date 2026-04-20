import sharp from "sharp"

import { ApiError, handleRoute } from "@/lib/api-response"
import { uploadToR2 } from "@/lib/r2"
import {
  getRequestAccessToken,
  requireAuthenticatedUser,
} from "@/features/auth/lib/server-auth"
import { createRouteSupabaseClient } from "@/lib/supabase"

export const dynamic = "force-dynamic"

const ALLOWED_SCOPES = new Set([
  "products",
  "collections",
  "product-categories",
  "collection-categories",
])
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
const MAX_IMAGE_DIMENSION_PX = 1800
const WEBP_QUALITY = 85

function requireFormString(formData: FormData, key: string) {
  const value = formData.get(key)

  if (typeof value !== "string") {
    throw new ApiError(`${key} is required.`, 400)
  }

  const normalized = value.trim()

  if (!normalized) {
    throw new ApiError(`${key} is required.`, 400)
  }

  return normalized
}

function requireScope(formData: FormData) {
  const scope = requireFormString(formData, "scope")

  if (!ALLOWED_SCOPES.has(scope)) {
    throw new ApiError(
      "scope must be one of: products, collections, product-categories, collection-categories.",
      400
    )
  }

  return scope
}

function requireImageFile(formData: FormData) {
  const value = formData.get("file")

  if (!(value instanceof File)) {
    throw new ApiError("file is required.", 400)
  }

  if (value.size === 0) {
    throw new ApiError("file must not be empty.", 400)
  }

  if (value.size > MAX_FILE_SIZE_BYTES) {
    throw new ApiError("file must be 10 MB or smaller.", 400)
  }

  if (!value.type.startsWith("image/")) {
    throw new ApiError("Only image uploads are allowed.", 400)
  }

  return value
}

function sanitizeFileName(fileName: string) {
  const normalized = fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")

  return normalized || "image"
}

function getFileStem(fileName: string) {
  return sanitizeFileName(fileName).replace(/\.[a-z0-9]+$/i, "") || "image"
}

function getExtensionFromContentType(contentType: string) {
  if (contentType === "image/webp") {
    return "webp"
  }

  if (contentType === "image/png") {
    return "png"
  }

  if (contentType === "image/jpeg") {
    return "jpg"
  }

  return "bin"
}

async function assertCompanyAccess(
  accessToken: string,
  companyId: string,
  userId: string
) {
  const supabase = createRouteSupabaseClient(accessToken)
  const { data, error } = await supabase
    .from("company_memberships")
    .select("id")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    throw new ApiError("Failed to verify company access.", 400, error)
  }

  if (!data) {
    throw new ApiError("You do not have access to that company.", 403)
  }
}

function buildObjectPath(
  companyId: string,
  scope: string,
  fileName: string,
  contentType: string
) {
  const date = new Date()
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")

  return `catalog/${companyId}/${scope}/${year}/${month}/${crypto.randomUUID()}-${getFileStem(
    fileName
  )}.${getExtensionFromContentType(contentType)}`
}

async function optimizeImage(file: File) {
  const input = Buffer.from(await file.arrayBuffer())

  try {
    const image = sharp(input, { animated: true })
    const metadata = await image.metadata()

    if ((metadata.pages ?? 1) > 1) {
      return {
        body: new Uint8Array(input),
        contentType: file.type || "application/octet-stream",
        size: input.byteLength,
      }
    }

    const pipeline = image.rotate().resize({
      width: MAX_IMAGE_DIMENSION_PX,
      height: MAX_IMAGE_DIMENSION_PX,
      fit: "inside",
      withoutEnlargement: true,
    })

    if (metadata.hasAlpha) {
      const output = await pipeline
        .png({
          compressionLevel: 9,
          adaptiveFiltering: true,
        })
        .toBuffer()

      return {
        body: new Uint8Array(output),
        contentType: "image/png",
        size: output.byteLength,
      }
    }

    const output = await pipeline
      .webp({
        quality: WEBP_QUALITY,
      })
      .toBuffer()

    return {
      body: new Uint8Array(output),
      contentType: "image/webp",
      size: output.byteLength,
    }
  } catch (error) {
    throw new ApiError("Failed to optimize image.", 400, error)
  }
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    const accessToken = getRequestAccessToken(request)

    if (!accessToken) {
      throw new ApiError("Unauthorized.", 401)
    }

    const user = await requireAuthenticatedUser(request)
    const formData = await request.formData()
    const companyId = requireFormString(formData, "company_id")
    const scope = requireScope(formData)
    const file = requireImageFile(formData)

    await assertCompanyAccess(accessToken, companyId, user.id)

    const optimized = await optimizeImage(file)

    const upload = await uploadToR2({
      body: optimized.body,
      contentType: optimized.contentType,
      path: buildObjectPath(companyId, scope, file.name, optimized.contentType),
    })

    return {
      content_type: optimized.contentType,
      path: upload.path,
      size: optimized.size,
      url: upload.url,
    }
  })
}
