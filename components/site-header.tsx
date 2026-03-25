"use client"

import { useSearchParams } from "next/navigation"

import { useAuth } from "@/features/auth/components/auth-provider"
import { catalogNavItems, defaultCatalogTab } from "@/features/catalog/config/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function SiteHeader({ title = "Dashboard" }: { title?: string }) {
  const { currentCompany, memberships, setCurrentCompanyId } = useAuth()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get("tab") ?? defaultCatalogTab
  const activeTitle =
    catalogNavItems.find((item) => {
      const url = new URL(item.url, "http://localhost")
      return url.searchParams.get("tab") === activeTab
    })?.title ?? title

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center justify-between gap-3 px-4 lg:gap-4 lg:px-6">
        <div className="flex items-center gap-1 lg:gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">{activeTitle}</h1>
        </div>
        {memberships.length > 0 ? (
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              Company
            </span>
            <Select
              value={currentCompany?.id}
              onValueChange={setCurrentCompanyId}
            >
              <SelectTrigger className="w-52 max-w-[55vw]">
                <SelectValue placeholder="Select company" />
              </SelectTrigger>
              <SelectContent align="end">
                {memberships.map((membership) => (
                  <SelectItem
                    key={membership.company_id}
                    value={membership.company_id}
                  >
                    {membership.company?.name || membership.company?.slug || "Company"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>
    </header>
  )
}
