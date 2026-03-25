import { handleRoute } from "@/lib/api-response"
import { withAuthenticatedAccess } from "@/features/auth/lib/server-auth"
import { listPendingInvitationsForCurrentUser } from "@/features/auth/lib/company-admin-api"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  return handleRoute(() =>
    withAuthenticatedAccess(request, async () =>
      listPendingInvitationsForCurrentUser()
    )
  )
}
