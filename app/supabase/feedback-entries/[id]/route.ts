import { handleRoute, readJsonRecord } from "@/lib/api-response"
import { withAuthenticatedAccess } from "@/features/auth/lib/server-auth"
import {
  deleteFeedbackEntry,
  getFeedbackEntry,
  updateFeedbackEntry,
} from "@/features/catalog/lib/catalog-api"

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
      getFeedbackEntry(await getId(context.params))
    )
  )
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handleRoute(() =>
    withAuthenticatedAccess(request, async () =>
      updateFeedbackEntry(await getId(context.params), await readJsonRecord(request))
    )
  )
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handleRoute(() =>
    withAuthenticatedAccess(request, async () =>
      deleteFeedbackEntry(await getId(context.params))
    )
  )
}
