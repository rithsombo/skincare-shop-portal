"use client"

import { PendingCompanyInvitationsPanel } from "@/features/auth/components/pending-company-invitations-panel"

export function DashboardPendingCompanyInvitations() {
  return (
    <PendingCompanyInvitationsPanel
      wrapperClassName="px-4 lg:px-6"
      cardClassName="rounded-none border-dashed"
      title="Pending Company Invitations"
      description="Accept another company invitation without leaving your current workspace."
      hideWhenEmpty
    />
  )
}
