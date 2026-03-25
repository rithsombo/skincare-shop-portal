"use client"

import { useSearchParams } from "next/navigation"

import {
  CatalogTab,
  catalogTabs,
  defaultCatalogTab,
} from "@/features/catalog/config/navigation"
import { CompanyMembersManagement } from "@/features/auth/components/company-members-management"
import { CategoryManagement } from "@/features/catalog/components/category-management"
import { CollectionManagement } from "@/features/catalog/components/collection-management"
import { ProductManagement } from "@/features/catalog/components/product-management"

function isCatalogTab(value: string | null): value is CatalogTab {
  return value !== null && catalogTabs.includes(value as CatalogTab)
}

export function CatalogManagement() {
  const searchParams = useSearchParams()
  const requestedTab = searchParams.get("tab")
  const activeTab: CatalogTab = isCatalogTab(requestedTab)
    ? requestedTab
    : defaultCatalogTab

  if (activeTab === "product-categories") {
    return (
      <div className="px-4 lg:px-6">
        <CategoryManagement
          endpoint="/supabase/product-categories"
          title="Product Categories"
          description="Create, edit, select, and delete product categories."
        />
      </div>
    )
  }

  if (activeTab === "collections") {
    return (
      <div className="px-4 lg:px-6">
        <CollectionManagement />
      </div>
    )
  }

  if (activeTab === "collection-categories") {
    return (
      <div className="px-4 lg:px-6">
        <CategoryManagement
          endpoint="/supabase/collection-categories"
          title="Collection Categories"
          description="Create, edit, select, and delete collection categories."
        />
      </div>
    )
  }

  if (activeTab === "members") {
    return <CompanyMembersManagement />
  }

  return (
    <div className="px-4 lg:px-6">
      <ProductManagement />
    </div>
  )
}
