import { ApiError, handleRoute, readJsonRecord } from "@/lib/api-response"
import { deleteFromR2 } from "@/lib/r2"
import {
  getRequestAccessToken,
  requireAuthenticatedUser,
} from "@/features/auth/lib/server-auth"
import { createRouteSupabaseClient } from "@/lib/supabase"

export const dynamic = "force-dynamic"

function requireString(record: Record<string, unknown>, key: string) {
  const value = record[key]

  if (typeof value !== "string" || !value.trim()) {
    throw new ApiError(`${key} is required.`, 400)
  }

  return value.trim()
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

function assertPathBelongsToCompany(path: string, companyId: string) {
  if (!path.startsWith(`catalog/${companyId}/`)) {
    throw new ApiError("Invalid catalog image path.", 400)
  }
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    const accessToken = getRequestAccessToken(request)

    if (!accessToken) {
      throw new ApiError("Unauthorized.", 401)
    }

    const user = await requireAuthenticatedUser(request)
    const record = await readJsonRecord(request)
    const companyId = requireString(record, "company_id")
    const path = requireString(record, "path")

    await assertCompanyAccess(accessToken, companyId, user.id)
    assertPathBelongsToCompany(path, companyId)
    await deleteFromR2(path)

    return { success: true }
  })
}
