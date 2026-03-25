import { handleRoute, readJsonRecord } from "@/lib/api-response"
import {
  requireCompanyId,
  withAuthenticatedAccess,
} from "@/features/auth/lib/server-auth"
import {
  createCollectionCategory,
  listCollectionCategories,
} from "@/features/catalog/lib/catalog-api"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  return handleRoute(() =>
    withAuthenticatedAccess(request, () =>
      listCollectionCategories(requireCompanyId(request))
    )
  )
}

export async function POST(request: Request) {
  return handleRoute(() =>
    withAuthenticatedAccess(request, async () =>
      createCollectionCategory(await readJsonRecord(request))
    )
  )
}
