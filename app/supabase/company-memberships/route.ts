import { handleRoute, readJsonRecord } from "@/lib/api-response"
import {
  requireCompanyId,
  withAuthenticatedAccess,
} from "@/features/auth/lib/server-auth"
import {
  createCompanyAccess,
  listCompanyMembers,
} from "@/features/auth/lib/company-admin-api"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  return handleRoute(() =>
    withAuthenticatedAccess(request, () =>
      listCompanyMembers(requireCompanyId(request))
    )
  )
}

export async function POST(request: Request) {
  return handleRoute(() =>
    withAuthenticatedAccess(request, async () =>
      createCompanyAccess(await readJsonRecord(request))
    )
  )
}
