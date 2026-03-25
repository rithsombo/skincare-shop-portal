"use client"

import * as React from "react"
import Link from "next/link"
import { Building2Icon, LoaderCircleIcon, MailPlusIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getCompanyRoleBadgeVariant } from "@/features/auth/lib/company-access-rules"
import { authFetch } from "@/features/auth/lib/auth-fetch"

export type PendingCompanyInvitation = {
  id: string
  company_id: string
  email: string
  role: "owner" | "admin" | "member"
  status: "pending" | "accepted" | "revoked" | "expired"
  token: string
  expires_at: string | null
  created_at: string | null
  company: {
    id: string
    name: string
    slug: string
  } | null
}

type PendingCompanyInvitationsPanelProps = {
  title: React.ReactNode
  description: React.ReactNode
  wrapperClassName?: string
  cardClassName?: string
  loadingText?: string
  emptyState?: React.ReactNode
  hideWhenEmpty?: boolean
  summaryText?: (count: number, isLoading: boolean) => string
  headerActions?: React.ReactNode
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return "N/A"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

async function readErrorMessage(response: Response) {
  const text = await response.text()

  if (!text) {
    return `Request failed with status ${response.status}.`
  }

  try {
    const payload = JSON.parse(text) as { error?: string; message?: string }
    return payload.message || payload.error || text
  } catch {
    return text
  }
}

function dedupeInvitations(items: PendingCompanyInvitation[]) {
  return Array.from(new Map(items.map((item) => [item.id, item])).values())
}

async function loadPendingCompanyInvitations() {
  const response = await authFetch("/supabase/my-company-invitations", {
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  const payload = (await response.json()) as unknown
  return Array.isArray(payload)
    ? dedupeInvitations(payload as PendingCompanyInvitation[])
    : []
}

export function PendingCompanyInvitationsPanel({
  title,
  description,
  wrapperClassName,
  cardClassName,
  loadingText = "Loading your invitations...",
  emptyState,
  hideWhenEmpty = false,
  summaryText,
  headerActions,
}: PendingCompanyInvitationsPanelProps) {
  const [invitations, setInvitations] = React.useState<PendingCompanyInvitation[]>(
    []
  )
  const [hasLoaded, setHasLoaded] = React.useState(false)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const refreshInvitations = React.useCallback(async () => {
    try {
      setError(null)
      setIsRefreshing(true)
      setInvitations(await loadPendingCompanyInvitations())
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load invitations."
      setError(message)
    } finally {
      setHasLoaded(true)
      setIsRefreshing(false)
    }
  }, [])

  React.useEffect(() => {
    void refreshInvitations()
  }, [refreshInvitations])

  if (!hasLoaded && hideWhenEmpty) {
    return null
  }

  if (hideWhenEmpty && !error && invitations.length === 0) {
    return null
  }

  const defaultSummaryText = hasLoaded
    ? `${invitations.length} pending invitation${invitations.length === 1 ? "" : "s"}`
    : "Checking invitations..."

  return (
    <div className={wrapperClassName}>
      <Card className={cardClassName}>
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isRefreshing}
                onClick={() => void refreshInvitations()}
              >
                {isRefreshing ? (
                  <LoaderCircleIcon className="size-4 animate-spin" />
                ) : (
                  <MailPlusIcon className="size-4" />
                )}
                Refresh
              </Button>
              {headerActions}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-xs text-muted-foreground">
            {summaryText ? summaryText(invitations.length, !hasLoaded) : defaultSummaryText}
          </div>

          {error ? (
            <div className="rounded-none border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {!hasLoaded ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <LoaderCircleIcon className="size-4 animate-spin" />
              {loadingText}
            </div>
          ) : invitations.length > 0 ? (
            <div className="grid gap-3">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex flex-col gap-3 rounded-none border p-3 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Building2Icon className="size-4 text-muted-foreground" />
                      <span className="font-medium">
                        {invitation.company?.name || invitation.company?.slug || "Company"}
                      </span>
                      <Badge variant={getCompanyRoleBadgeVariant(invitation.role)}>
                        {invitation.role}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Invited as {invitation.email}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Expires {formatTimestamp(invitation.expires_at)}
                    </div>
                  </div>
                  <Button asChild className="min-w-36">
                    <Link
                      href={`/accept-invite?token=${encodeURIComponent(invitation.token)}`}
                    >
                      Accept invitation
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            emptyState ?? (
              <div className="rounded-none border px-4 py-3 text-sm text-muted-foreground">
                No pending company invitations were found for this account yet.
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  )
}
