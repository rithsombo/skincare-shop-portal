"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { LoaderCircleIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/features/auth/components/auth-provider"
import { authFetch } from "@/features/auth/lib/auth-fetch"

function getCompletedAcceptanceStorageKey(userId: string, token: string) {
  return `accept-invite:${userId}:${token}`
}

function hasCompletedAcceptance(userId: string, token: string) {
  if (typeof window === "undefined") {
    return false
  }

  return (
    window.sessionStorage.getItem(getCompletedAcceptanceStorageKey(userId, token)) ===
    "completed"
  )
}

function markAcceptanceCompleted(userId: string, token: string) {
  if (typeof window === "undefined") {
    return
  }

  window.sessionStorage.setItem(
    getCompletedAcceptanceStorageKey(userId, token),
    "completed"
  )
}

function buildLoginRedirect(token: string) {
  const params = new URLSearchParams({
    redirect: `/accept-invite?token=${token}`,
  })

  return `/login?${params.toString()}`
}

function buildSignupRedirect(token: string) {
  const params = new URLSearchParams({
    redirect: `/accept-invite?token=${token}`,
  })

  return `/signup?${params.toString()}`
}

async function readErrorMessage(response: Response) {
  const text = await response.text()

  if (!text) {
    return "Failed to accept the invitation."
  }

  try {
    const payload = JSON.parse(text) as { error?: string; message?: string }
    return payload.message || payload.error || text
  } catch {
    return text
  }
}

export function AcceptInvitePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isLoading, session, signOut } = useAuth()
  const [status, setStatus] = React.useState<"idle" | "submitting" | "success">(
    "idle"
  )
  const [error, setError] = React.useState<string | null>(null)
  const [isSigningOut, startSignOutTransition] = React.useTransition()

  const token = searchParams.get("token")?.trim() ?? ""

  React.useEffect(() => {
    if (isLoading || !session || !token || status !== "idle") {
      return
    }

    if (hasCompletedAcceptance(session.user.id, token)) {
      setStatus("success")
      window.location.replace("/dashboard?tab=members")
      return
    }

    let isMounted = true

    setStatus("submitting")
    setError(null)

    void (async () => {
      try {
        const response = await authFetch("/supabase/company-invitations/accept", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        })

        if (!response.ok) {
          throw new Error(await readErrorMessage(response))
        }

        const payload = (await response.json()) as { company_id?: string | null }

        if (payload.company_id && typeof window !== "undefined" && session?.user.id) {
          window.localStorage.setItem(
            `current-company:${session.user.id}`,
            payload.company_id
          )
        }

        markAcceptanceCompleted(session.user.id, token)
        if (isMounted) {
          setStatus("success")
        }
        toast.success("Invitation accepted.")
        window.location.replace("/dashboard?tab=members")
      } catch (error) {
        if (!isMounted) {
          return
        }
        const message =
          error instanceof Error
            ? error.message
            : "Failed to accept the invitation."

        setError(message)
        setStatus("idle")
      }
    })()

    return () => {
      isMounted = false
    }
  }, [isLoading, session, status, token])

  function handleSwitchAccount() {
    startSignOutTransition(async () => {
      try {
        await signOut()
        router.replace(buildLoginRedirect(token))
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to log out.")
      }
    })
  }

  if (!token) {
    return (
      <main className="flex min-h-svh items-center justify-center px-4">
        <Card className="w-full max-w-md rounded-none">
          <CardHeader>
            <CardTitle>Invalid Invite Link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This invitation link is missing its token. Ask a company admin to
              generate a new invite.
            </p>
            <Button asChild className="w-full">
              <Link href="/login">Go to sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  if (isLoading) {
    return (
      <main className="flex min-h-svh items-center justify-center px-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircleIcon className="size-4 animate-spin" />
          Checking session...
        </div>
      </main>
    )
  }

  if (!session) {
    return (
      <main className="flex min-h-svh items-center justify-center px-4">
        <Card className="w-full max-w-md rounded-none">
          <CardHeader>
            <CardTitle>Sign In To Accept Invite</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Sign in with the same email address that was invited. After sign-in,
              the invitation will be accepted automatically.
            </p>
            <Button asChild className="w-full">
              <Link href={buildLoginRedirect(token)}>Continue to sign in</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href={buildSignupRedirect(token)}>Create account first</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="flex min-h-svh items-center justify-center px-4">
      <Card className="w-full max-w-md rounded-none">
        <CardHeader>
          <CardTitle>Accepting Invitation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "submitting" ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircleIcon className="size-4 animate-spin" />
              Accepting your company invitation...
            </div>
          ) : null}
          {status === "success" ? (
            <p className="text-sm text-muted-foreground">
              Invitation accepted. Redirecting to the dashboard...
            </p>
          ) : null}
          {error ? (
            <>
              <p className="text-sm text-destructive">{error}</p>
              <p className="text-xs text-muted-foreground">
                Signed in as {session.user.email || "this account"}. If this is not
                the invited email, switch accounts and sign in with the invited one.
              </p>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                disabled={isSigningOut}
                onClick={handleSwitchAccount}
              >
                {isSigningOut ? "Switching account..." : "Sign out and use another account"}
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard?tab=members">Back to dashboard</Link>
              </Button>
            </>
          ) : null}
        </CardContent>
      </Card>
    </main>
  )
}
