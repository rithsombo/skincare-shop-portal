"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader } from "lucide-react"

import { useAuth } from "@/features/auth/components/auth-provider"
import { NoCompanyAccess } from "@/features/auth/components/no-company-access"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { currentCompany, isLoading, memberships, session } = useAuth()

  React.useEffect(() => {
    if (!isLoading && !session) {
      router.replace("/login")
    }
  }, [isLoading, router, session])

  if (isLoading || !session) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader className="size-4 animate-spin" />
          Checking session...
        </div>
      </div>
    )
  }

  if (memberships.length === 0 || !currentCompany) {
    return <NoCompanyAccess />
  }

  return <>{children}</>
}
