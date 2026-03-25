import type { User } from "@supabase/supabase-js"

import { ApiError } from "@/lib/api-response"
import { runWithAccessToken } from "@/features/auth/lib/request-auth-context"
import { createRouteSupabaseClient } from "@/lib/supabase"

export function getRequestAccessToken(request: Request) {
  const authorization = request.headers.get("authorization")

  if (!authorization?.startsWith("Bearer ")) {
    return null
  }

  const token = authorization.slice("Bearer ".length).trim()
  return token || null
}

export async function requireAuthenticatedUser(request: Request): Promise<User> {
  const accessToken = getRequestAccessToken(request)

  if (!accessToken) {
    throw new ApiError("Unauthorized.", 401)
  }

  const supabase = createRouteSupabaseClient(accessToken)
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken)

  if (error || !user) {
    throw new ApiError("Unauthorized.", 401, error)
  }

  return user
}

export function requireCompanyId(request: Request) {
  const companyId = new URL(request.url).searchParams.get("company_id")

  if (!companyId) {
    throw new ApiError("company_id is required.", 400)
  }

  return companyId
}

export async function withAuthenticatedAccess<T>(
  request: Request,
  operation: () => Promise<T>
) {
  const accessToken = getRequestAccessToken(request)

  if (!accessToken) {
    throw new ApiError("Unauthorized.", 401)
  }

  const supabase = createRouteSupabaseClient(accessToken)
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken)

  if (error || !user) {
    throw new ApiError("Unauthorized.", 401, error)
  }

  return runWithAccessToken(accessToken, operation)
}
