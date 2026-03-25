import { NextResponse } from "next/server"

export class ApiError extends Error {
  constructor(
    message: string,
    public status = 400,
    public details?: unknown
  ) {
    super(message)
  }
}

export function ensureRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError("Invalid JSON body.", 400)
  }

  return value as Record<string, unknown>
}

export async function readJsonRecord(request: Request) {
  try {
    const payload = await request.json()
    return ensureRecord(payload)
  } catch {
    throw new ApiError("Invalid JSON body.", 400)
  }
}

export function toErrorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: error.message,
        details: error.details ?? null,
      },
      { status: error.status }
    )
  }

  const message =
    error instanceof Error ? error.message : "Internal server error."

  return NextResponse.json({ error: message }, { status: 500 })
}

export async function handleRoute<T>(operation: () => Promise<T>) {
  try {
    const data = await operation()
    return NextResponse.json(data)
  } catch (error) {
    return toErrorResponse(error)
  }
}
