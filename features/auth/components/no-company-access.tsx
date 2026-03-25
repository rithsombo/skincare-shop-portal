"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { LogOutIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/features/auth/components/auth-provider"
import { PendingCompanyInvitationsPanel } from "@/features/auth/components/pending-company-invitations-panel"

export function NoCompanyAccess() {
  const router = useRouter()
  const { signOut, user } = useAuth()
  const [isSigningOut, startSignOutTransition] = React.useTransition()

  function handleSignOut() {
    startSignOutTransition(async () => {
      try {
        await signOut()
        router.replace("/login")
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to log out.")
      }
    })
  }

  return (
    <div className="flex min-h-svh items-center justify-center px-4 py-8">
      <PendingCompanyInvitationsPanel
        wrapperClassName="w-full max-w-2xl"
        title="No Company Access Yet"
        description={
          <>
            {user?.email
              ? `Signed in as ${user.email}.`
              : "Your account is signed in, but no company membership is active yet."}{" "}
            You can accept a pending invitation below or log out.
          </>
        }
        headerActions={
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={isSigningOut}
            onClick={handleSignOut}
          >
            <LogOutIcon className="size-4" />
            {isSigningOut ? "Logging out..." : "Log out"}
          </Button>
        }
      />
    </div>
  )
}
