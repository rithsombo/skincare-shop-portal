import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"

import { ApiError } from "@/lib/api-response"

let r2Client: S3Client | null = null

function getRequiredEnv(name: string) {
  const value = process.env[name]

  if (!value) {
    throw new ApiError(`${name} is not set.`, 500)
  }

  return value
}

function getR2Client() {
  if (r2Client) {
    return r2Client
  }

  const accountId = getRequiredEnv("R2_ACCOUNT_ID")
  const accessKeyId = getRequiredEnv("R2_ACCESS_KEY_ID")
  const secretAccessKey = getRequiredEnv("R2_SECRET_ACCESS_KEY")

  r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })

  return r2Client
}

function getBucketName() {
  return getRequiredEnv("R2_BUCKET_NAME")
}

function getPublicBaseUrl() {
  const value =
    process.env.R2_PUBLIC_BASE_URL ?? process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL

  if (!value) {
    return null
  }

  return value.replace(/\/+$/, "")
}

export function buildR2PublicUrl(path: string) {
  const baseUrl = getPublicBaseUrl()
  return baseUrl ? `${baseUrl}/${path}` : null
}

export async function uploadToR2({
  body,
  cacheControl = "public, max-age=31536000, immutable",
  contentType,
  path,
}: {
  body: Uint8Array
  cacheControl?: string
  contentType?: string
  path: string
}) {
  try {
    await getR2Client().send(
      new PutObjectCommand({
        Bucket: getBucketName(),
        Key: path,
        Body: body,
        CacheControl: cacheControl,
        ContentType: contentType || "application/octet-stream",
      })
    )
  } catch (error) {
    throw new ApiError("Failed to upload file to R2.", 500, error)
  }

  return {
    path,
    url: buildR2PublicUrl(path),
  }
}

export async function deleteFromR2(path: string) {
  try {
    await getR2Client().send(
      new DeleteObjectCommand({
        Bucket: getBucketName(),
        Key: path,
      })
    )
  } catch (error) {
    throw new ApiError("Failed to delete file from R2.", 500, error)
  }
}
