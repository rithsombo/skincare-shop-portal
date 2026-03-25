import { handleRoute, readJsonRecord } from "@/lib/api-response"
import {
  requireCompanyId,
  withAuthenticatedAccess,
} from "@/features/auth/lib/server-auth"
import {
  removeCompanyMember,
  updateCompanyMember,
} from "@/features/auth/lib/company-admin-api"

export const dynamic = "force-dynamic"

export async function PATCH(
  request: Request,
  context: { params: Promise<unknown> }
) {
  return handleRoute(() =>
    withAuthenticatedAccess(request, async () => {
      const { id } = (await context.params) as { id: string }
      return updateCompanyMember(id, await readJsonRecord(request))
    })
  )
}

export async function DELETE(
  request: Request,
  context: { params: Promise<unknown> }
) {
  return handleRoute(() =>
    withAuthenticatedAccess(request, async () => {
      const { id } = (await context.params) as { id: string }
      return removeCompanyMember(id, requireCompanyId(request))
    })
  )
}
