import { handleRoute, readJsonRecord } from "@/lib/api-response"
import { withAuthenticatedAccess } from "@/features/auth/lib/server-auth"
import { acceptCompanyInvitation } from "@/features/auth/lib/company-admin-api"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  return handleRoute(() =>
    withAuthenticatedAccess(request, async () => {
      const body = await readJsonRecord(request)
      const token =
        typeof body.token === "string" ? body.token.trim() : ""

      return acceptCompanyInvitation(token)
    })
  )
}
