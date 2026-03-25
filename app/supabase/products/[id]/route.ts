import { handleRoute, readJsonRecord } from "@/lib/api-response"
import { withAuthenticatedAccess } from "@/features/auth/lib/server-auth"
import { deleteProduct, getProduct, updateProduct } from "@/features/catalog/lib/catalog-api"

export const dynamic = "force-dynamic"

async function getId(params: Promise<{ id: string }>) {
  return (await params).id
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handleRoute(() =>
    withAuthenticatedAccess(request, async () =>
      getProduct(await getId(context.params))
    )
  )
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handleRoute(() =>
    withAuthenticatedAccess(request, async () =>
      updateProduct(await getId(context.params), await readJsonRecord(request))
    )
  )
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handleRoute(() =>
    withAuthenticatedAccess(request, async () =>
      deleteProduct(await getId(context.params))
    )
  )
}
