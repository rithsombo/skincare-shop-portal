"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/features/auth/components/auth-provider"
import { writePendingAuthRedirect } from "@/features/auth/lib/pending-auth-redirect"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function getSafeRedirect(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard"
  }

  return value
}

function buildLoginHref(redirectTo: string) {
  const params = new URLSearchParams({
    redirect: redirectTo,
  })

  return `/login?${params.toString()}`
}

function buildEmailRedirectUrl(redirectTo: string) {
  if (typeof window === "undefined") {
    return undefined
  }

  return new URL(redirectTo, window.location.origin).toString()
}

export function SignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isLoading, session, signUp } = useAuth()
  const [fullName, setFullName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [notice, setNotice] = React.useState<string | null>(null)
  const redirectTo = React.useMemo(
    () => getSafeRedirect(searchParams.get("redirect")),
    [searchParams]
  )

  React.useEffect(() => {
    if (!isLoading && session) {
      router.replace(redirectTo)
    }
  }, [isLoading, redirectTo, router, session])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.")
      return
    }

    try {
      setIsSubmitting(true)
      setNotice(null)
      writePendingAuthRedirect(redirectTo)

      const result = await signUp({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        emailRedirectTo: buildEmailRedirectUrl(redirectTo),
      })

      if (result.requiresEmailConfirmation) {
        setNotice(
          "Your account was created. Confirm your email from the link we sent, and you will be returned to continue this flow."
        )
        toast.success("Account created. Check your email for confirmation.")
        return
      }

      toast.success("Account created.")
      router.replace(redirectTo)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create account."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-svh items-center justify-center px-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader className="size-4 animate-spin" />
          Loading session...
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-svh items-center justify-center px-4">
      <Card className="w-full max-w-sm rounded-none">
        <CardHeader className="space-y-2">
          <CardTitle className="text-xl">Create Account</CardTitle>
          <p className="text-sm text-muted-foreground">
            Create your portal account, then continue into the dashboard or your
            invitation flow.
          </p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="full-name">Full name</Label>
              <Input
                id="full-name"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader className="size-4 animate-spin" /> : null}
              Create account
            </Button>
          </form>
          {notice ? (
            <p className="mt-4 text-xs text-muted-foreground">{notice}</p>
          ) : (
            <p className="mt-4 text-xs text-muted-foreground">
              Use the same email address that was invited to your company portal.
            </p>
          )}
          <Link
            href={buildLoginHref(redirectTo)}
            className="mt-2 inline-block text-xs text-muted-foreground underline"
          >
            Already have an account? Sign in
          </Link>
        </CardContent>
      </Card>
    </main>
  )
}
