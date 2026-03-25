import { handleRoute, readJsonRecord } from "@/lib/api-response"
import {
  requireCompanyId,
  withAuthenticatedAccess,
} from "@/features/auth/lib/server-auth"
import {
  createProductCategory,
  listProductCategories,
} from "@/features/catalog/lib/catalog-api"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  return handleRoute(() =>
    withAuthenticatedAccess(request, () =>
      listProductCategories(requireCompanyId(request))
    )
  )
}

export async function POST(request: Request) {
  return handleRoute(() =>
    withAuthenticatedAccess(request, async () =>
      createProductCategory(await readJsonRecord(request))
    )
  )
}
