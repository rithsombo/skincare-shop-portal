import { Suspense } from "react"

import { AcceptInvitePage } from "@/features/auth/components/accept-invite-page"

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AcceptInvitePage />
    </Suspense>
  )
}
