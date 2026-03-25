import { Suspense } from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { DashboardPendingCompanyInvitations } from "@/features/auth/components/dashboard-pending-company-invitations"
import { CatalogManagement } from "@/features/catalog/components/catalog-management"

export default function Page() {
  return (
    <AuthGuard>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <Suspense fallback={null}>
          <AppSidebar variant="inset" />
          <SidebarInset>
            <SiteHeader title="Catalog" />
            <div className="flex flex-1 flex-col">
              <div className="@container/main flex flex-1 flex-col gap-2">
                <div className="flex flex-col gap-4 py-4 md:py-6">
                  <DashboardPendingCompanyInvitations />
                  <CatalogManagement />
                </div>
              </div>
            </div>
          </SidebarInset>
        </Suspense>
      </SidebarProvider>
    </AuthGuard>
  )
}
