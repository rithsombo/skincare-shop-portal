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

function buildSignupHref(redirectTo: string) {
  const params = new URLSearchParams({
    redirect: redirectTo,
  })

  return `/signup?${params.toString()}`
}

export function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isLoading, session, signIn } = useAuth()
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
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

    try {
      setIsSubmitting(true)
      writePendingAuthRedirect(redirectTo)
      await signIn(email.trim(), password)
      router.replace(redirectTo)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to sign in.")
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
          <CardTitle className="text-xl">Sign In</CardTitle>
          <p className="text-sm text-muted-foreground">
            Use your Supabase email and password to access the dashboard.
          </p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
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
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader className="size-4 animate-spin" /> : null}
              Sign in
            </Button>
          </form>
          <p className="mt-4 text-xs text-muted-foreground">
            Sign in with the exact email address that was invited if you are
            joining a company portal.
          </p>
          <Link
            href={buildSignupHref(redirectTo)}
            className="mt-2 inline-block text-xs text-muted-foreground underline"
          >
            Need an account? Create one
          </Link>
          <Link
            href="/login"
            className="mt-2 ml-3 inline-block text-xs text-muted-foreground underline"
          >
            Back
          </Link>
        </CardContent>
      </Card>
    </main>
  )
}
