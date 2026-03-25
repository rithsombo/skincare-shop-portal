"use client"

import * as React from "react"
import {
  CopyIcon,
  Loader,
  LoaderCircleIcon,
  RefreshCcwIcon,
  Trash2Icon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react"
import { toast } from "sonner"

import {
  canAssignCompanyRole,
  canManageCompanyRole,
  CompanyRole,
  getCompanyRoleBadgeVariant,
  isCompanyManager,
} from "@/features/auth/lib/company-access-rules"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAuth } from "@/features/auth/components/auth-provider"
import { authFetch } from "@/features/auth/lib/auth-fetch"

type CompanyMember = {
  id: string
  company_id: string
  user_id: string
  role: CompanyRole
  created_at: string | null
  is_current_user: boolean
  profile: {
    id: string
    email: string | null
    full_name: string | null
    avatar_url: string | null
  } | null
}

type CompanyInvitation = {
  id: string
  company_id: string
  email: string
  role: CompanyRole
  status: "pending" | "accepted" | "revoked" | "expired"
  token: string
  expires_at: string | null
  created_at: string | null
}

type CompanyAccessResult =
  | {
      type: "member"
      message: string
      member: CompanyMember
    }
  | {
      type: "invitation"
      message: string
      invitation: CompanyInvitation
    }

const MEMBERS_ENDPOINT = "/supabase/company-memberships"
const INVITATIONS_ENDPOINT = "/supabase/company-invitations"

function withCompanyId(path: string, companyId: string) {
  const url = new URL(path, window.location.origin)
  url.searchParams.set("company_id", companyId)
  return `${url.pathname}${url.search}`
}

function getString(value: unknown) {
  return typeof value === "string" ? value : ""
}

function normalizeRole(value: unknown): CompanyRole {
  if (value === "owner" || value === "admin" || value === "member") {
    return value
  }

  return "member"
}

function normalizeMember(value: unknown): CompanyMember {
  const row = value as Record<string, unknown>
  const profileValue = row.profile

  const profile =
    profileValue &&
    typeof profileValue === "object" &&
    !Array.isArray(profileValue)
      ? {
          id: getString((profileValue as Record<string, unknown>).id),
          email: getString((profileValue as Record<string, unknown>).email) || null,
          full_name:
            getString((profileValue as Record<string, unknown>).full_name) || null,
          avatar_url:
            getString((profileValue as Record<string, unknown>).avatar_url) || null,
        }
      : null

  return {
    id: getString(row.id),
    company_id: getString(row.company_id),
    user_id: getString(row.user_id),
    role: normalizeRole(row.role),
    created_at: getString(row.created_at) || null,
    is_current_user: row.is_current_user === true,
    profile,
  }
}

function normalizeInvitation(value: unknown): CompanyInvitation {
  const row = value as Record<string, unknown>
  const status = row.status

  return {
    id: getString(row.id),
    company_id: getString(row.company_id),
    email: getString(row.email),
    role: normalizeRole(row.role),
    status:
      status === "accepted" ||
      status === "revoked" ||
      status === "expired" ||
      status === "pending"
        ? status
        : "pending",
    token: getString(row.token),
    expires_at: getString(row.expires_at) || null,
    created_at: getString(row.created_at) || null,
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Request failed."
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

function dedupeById<T extends { id: string }>(items: T[]) {
  return Array.from(new Map(items.map((item) => [item.id, item])).values())
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

function getRoleBadgeVariant(role: CompanyRole) {
  return getCompanyRoleBadgeVariant(role)
}

function getRoleOptions(role: CompanyRole | null) {
  if (role === "owner") {
    return ["owner", "admin", "member"] as const
  }

  if (role === "admin") {
    return ["admin", "member"] as const
  }

  return ["member"] as const
}

function canManageMembers(role: CompanyRole | null) {
  return isCompanyManager(role)
}

function canManageMember(role: CompanyRole | null, member: CompanyMember) {
  if (!canManageMembers(role) || member.is_current_user) {
    return false
  }

  return canManageCompanyRole(role, member.role)
}

function canManageInvitation(role: CompanyRole | null, invitation: CompanyInvitation) {
  return canManageCompanyRole(role, invitation.role)
}

function getDisplayName(member: CompanyMember) {
  return (
    member.profile?.full_name ||
    member.profile?.email ||
    member.user_id.slice(0, 8)
  )
}

function getEmail(member: CompanyMember) {
  return member.profile?.email || "No email"
}

function getInitials(member: CompanyMember) {
  const displayName = getDisplayName(member).trim()

  if (!displayName) {
    return "U"
  }

  const parts = displayName.split(/\s+/).filter(Boolean)
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || "")

  return initials.join("") || displayName[0]?.toUpperCase() || "U"
}

function buildInvitationLink(token: string) {
  if (typeof window === "undefined") {
    return ""
  }

  return `${window.location.origin}/accept-invite?token=${encodeURIComponent(token)}`
}

export function CompanyMembersManagement() {
  const { currentCompany, currentMembership } = useAuth()
  const companyId = currentCompany?.id ?? ""
  const currentRole = currentMembership?.role ?? null
  const canManageAccess = canManageMembers(currentRole)
  const roleOptions = React.useMemo(() => getRoleOptions(currentRole), [currentRole])
  const latestRequestIdRef = React.useRef(0)

  const [members, setMembers] = React.useState<CompanyMember[]>([])
  const [invitations, setInvitations] = React.useState<CompanyInvitation[]>([])
  const [inviteEmail, setInviteEmail] = React.useState("")
  const [inviteRole, setInviteRole] = React.useState<CompanyRole>(roleOptions[0])
  const [roleDrafts, setRoleDrafts] = React.useState<Record<string, CompanyRole>>({})
  const [pendingMemberDelete, setPendingMemberDelete] =
    React.useState<CompanyMember | null>(null)
  const [pendingInvitationDelete, setPendingInvitationDelete] =
    React.useState<CompanyInvitation | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [updatingMemberId, setUpdatingMemberId] = React.useState<string | null>(null)
  const [deletingMemberId, setDeletingMemberId] = React.useState<string | null>(null)
  const [revokingInvitationId, setRevokingInvitationId] = React.useState<string | null>(
    null
  )
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setInviteRole((current) =>
      roleOptions.some((role) => role === current) ? current : roleOptions[0]
    )
  }, [roleOptions, currentRole])

  const loadMembers = React.useCallback(async () => {
    if (!companyId) {
      return [] as CompanyMember[]
    }

    const response = await authFetch(withCompanyId(MEMBERS_ENDPOINT, companyId), {
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error(await readErrorMessage(response))
    }

    const payload = (await response.json()) as unknown
    return Array.isArray(payload)
      ? dedupeById(payload.map(normalizeMember))
      : ([] as CompanyMember[])
  }, [companyId])

  const loadInvitations = React.useCallback(async () => {
    if (!companyId || !canManageAccess) {
      return [] as CompanyInvitation[]
    }

    const response = await authFetch(withCompanyId(INVITATIONS_ENDPOINT, companyId), {
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error(await readErrorMessage(response))
    }

    const payload = (await response.json()) as unknown
    return Array.isArray(payload)
      ? dedupeById(payload.map(normalizeInvitation))
      : ([] as CompanyInvitation[])
  }, [canManageAccess, companyId])

  const refreshData = React.useCallback(
    async (initialLoad = false) => {
      const requestId = latestRequestIdRef.current + 1
      latestRequestIdRef.current = requestId

      try {
        setError(null)

        if (initialLoad) {
          setIsLoading(true)
        } else {
          setIsRefreshing(true)
        }

        const [nextMembers, nextInvitations] = await Promise.all([
          loadMembers(),
          loadInvitations(),
        ])

        if (latestRequestIdRef.current !== requestId) {
          return
        }

        setMembers(nextMembers)
        setRoleDrafts(
          Object.fromEntries(nextMembers.map((member) => [member.id, member.role]))
        )
        setInvitations(nextInvitations)
      } catch (error) {
        if (latestRequestIdRef.current !== requestId) {
          return
        }

        const message = getErrorMessage(error)
        setError(message)
        toast.error(message)
      } finally {
        if (latestRequestIdRef.current !== requestId) {
          return
        }

        if (initialLoad) {
          setIsLoading(false)
        } else {
          setIsRefreshing(false)
        }
      }
    },
    [loadInvitations, loadMembers]
  )

  React.useEffect(() => {
    setMembers([])
    setInvitations([])
    setRoleDrafts({})
    setError(null)
    setPendingMemberDelete(null)
    setPendingInvitationDelete(null)

    if (!companyId) {
      setIsLoading(false)
      setIsRefreshing(false)
      return
    }

    void refreshData(true)
  }, [companyId, refreshData])

  async function handleInviteSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      setError(null)
      setIsSubmitting(true)

      const response = await authFetch(MEMBERS_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          company_id: companyId,
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      })

      if (!response.ok) {
        throw new Error(await readErrorMessage(response))
      }

      const payload = (await response.json()) as CompanyAccessResult
      toast.success(payload.message)
      setInviteEmail("")
      await refreshData()
    } catch (error) {
      const message = getErrorMessage(error)
      setError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleUpdateRole(member: CompanyMember) {
    const nextRole = roleDrafts[member.id] ?? member.role

    if (nextRole === member.role) {
      return
    }

    try {
      setError(null)
      setUpdatingMemberId(member.id)

      const response = await authFetch(`${MEMBERS_ENDPOINT}/${member.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          company_id: companyId,
          role: nextRole,
        }),
      })

      if (!response.ok) {
        throw new Error(await readErrorMessage(response))
      }

      toast.success("Member role updated.")
      await refreshData()
    } catch (error) {
      const message = getErrorMessage(error)
      setError(message)
      toast.error(message)
    } finally {
      setUpdatingMemberId(null)
    }
  }

  async function handleDeleteMember() {
    if (!pendingMemberDelete) {
      return
    }

    try {
      setError(null)
      setDeletingMemberId(pendingMemberDelete.id)

      const response = await authFetch(
        withCompanyId(`${MEMBERS_ENDPOINT}/${pendingMemberDelete.id}`, companyId),
        {
          method: "DELETE",
        }
      )

      if (!response.ok) {
        throw new Error(await readErrorMessage(response))
      }

      toast.success("Member removed from the company.")
      setPendingMemberDelete(null)
      await refreshData()
    } catch (error) {
      const message = getErrorMessage(error)
      setError(message)
      toast.error(message)
    } finally {
      setDeletingMemberId(null)
    }
  }

  async function handleRevokeInvitation() {
    if (!pendingInvitationDelete) {
      return
    }

    try {
      setError(null)
      setRevokingInvitationId(pendingInvitationDelete.id)

      const response = await authFetch(
        withCompanyId(
          `${INVITATIONS_ENDPOINT}/${pendingInvitationDelete.id}`,
          companyId
        ),
        {
          method: "DELETE",
        }
      )

      if (!response.ok) {
        throw new Error(await readErrorMessage(response))
      }

      toast.success("Invitation revoked.")
      setPendingInvitationDelete(null)
      await refreshData()
    } catch (error) {
      const message = getErrorMessage(error)
      setError(message)
      toast.error(message)
    } finally {
      setRevokingInvitationId(null)
    }
  }

  async function handleCopyInvitation(invitation: CompanyInvitation) {
    try {
      const inviteLink = buildInvitationLink(invitation.token)

      if (!inviteLink) {
        throw new Error("Invite link is not available yet.")
      }

      await navigator.clipboard.writeText(inviteLink)
      toast.success("Invite link copied.")
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to copy invite link."

      setError(message)
      toast.error(message)
    }
  }

  if (!companyId) {
    return (
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Company Members</CardTitle>
            <CardDescription>Select a company to manage its members.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="px-4 lg:px-6">
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="size-4" />
              Company Members
            </CardTitle>
            <CardDescription>
              View everyone with access to {currentCompany?.name || "this company"}.
              Owners and admins can grant or revoke access here.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {canManageAccess ? (
              <form
                className="grid gap-3 rounded-none border p-3 md:grid-cols-[minmax(0,1fr)_160px_auto]"
                onSubmit={handleInviteSubmit}
              >
                <div className="grid gap-2">
                  <Label htmlFor="member-email">Email</Label>
                  <Input
                    id="member-email"
                    type="email"
                    placeholder="member@company.com"
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="member-role">Role</Label>
                  <Select
                    value={inviteRole}
                    onValueChange={(value) => setInviteRole(normalizeRole(value))}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="member-role" className="w-full">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting || !inviteEmail.trim()}
                  >
                    {isSubmitting ? (
                      <LoaderCircleIcon className="size-4 animate-spin" />
                    ) : (
                      <UserPlusIcon className="size-4" />
                    )}
                    Add Access
                  </Button>
                </div>
              </form>
            ) : (
              <div className="rounded-none border px-3 py-2 text-xs text-muted-foreground">
                You can view members, but only company owners and admins can manage
                access.
              </div>
            )}

            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-muted-foreground">
                {members.length} member{members.length === 1 ? "" : "s"}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void refreshData()}
                disabled={isRefreshing}
              >
                <RefreshCcwIcon
                  className={`size-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>

            {error ? (
              <div className="rounded-none border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            ) : null}

            {isLoading ? (
              <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader className="size-4 animate-spin" />
                Loading company members...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="w-[220px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.length > 0 ? (
                    members.map((member) => {
                      const memberCanBeManaged = canManageMember(currentRole, member)
                      const nextRole = roleDrafts[member.id] ?? member.role
                      const availableRoles = (
                        ["owner", "admin", "member"] as const
                      ).filter((role): role is CompanyRole =>
                        canAssignCompanyRole(currentRole, role)
                      )

                      return (
                        <TableRow key={member.id}>
                          <TableCell className="whitespace-normal">
                            <div className="flex items-center gap-3">
                              <Avatar size="sm">
                                <AvatarImage
                                  src={member.profile?.avatar_url || undefined}
                                />
                                <AvatarFallback>{getInitials(member)}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-medium">{getDisplayName(member)}</span>
                                  {member.is_current_user ? (
                                    <Badge variant="outline">You</Badge>
                                  ) : null}
                                </div>
                                <div className="truncate text-muted-foreground">
                                  {getEmail(member)}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {memberCanBeManaged ? (
                              <Select
                                value={nextRole}
                                onValueChange={(value) =>
                                  setRoleDrafts((current) => ({
                                    ...current,
                                    [member.id]: normalizeRole(value),
                                  }))
                                }
                                disabled={updatingMemberId === member.id}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue placeholder="Role" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableRoles.map((role) => (
                                    <SelectItem key={role} value={role}>
                                      {role}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge variant={getRoleBadgeVariant(member.role)}>
                                {member.role}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{formatTimestamp(member.created_at)}</TableCell>
                          <TableCell>
                            {memberCanBeManaged ? (
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={
                                    updatingMemberId === member.id ||
                                    nextRole === member.role
                                  }
                                  onClick={() => void handleUpdateRole(member)}
                                >
                                  {updatingMemberId === member.id ? (
                                    <LoaderCircleIcon className="size-4 animate-spin" />
                                  ) : null}
                                  Update
                                </Button>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  disabled={deletingMemberId === member.id}
                                  onClick={() => setPendingMemberDelete(member)}
                                >
                                  <Trash2Icon className="size-4" />
                                  Remove
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                No actions available
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="py-6 text-center text-muted-foreground"
                      >
                        No members found for this company.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {canManageAccess ? (
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Pending Invitations</CardTitle>
              <CardDescription>
                Pending invitations are kept per company and can be revoked before
                they are accepted.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="w-[240px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.length > 0 ? (
                    invitations.map((invitation) => (
                      <TableRow key={invitation.id}>
                        <TableCell>{invitation.email}</TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(invitation.role)}>
                            {invitation.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatTimestamp(invitation.expires_at)}</TableCell>
                        <TableCell>
                          {canManageInvitation(currentRole, invitation) ? (
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => void handleCopyInvitation(invitation)}
                              >
                                <CopyIcon className="size-4" />
                                Copy Link
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                disabled={revokingInvitationId === invitation.id}
                                onClick={() => setPendingInvitationDelete(invitation)}
                              >
                                {revokingInvitationId === invitation.id ? (
                                  <LoaderCircleIcon className="size-4 animate-spin" />
                                ) : (
                                  <Trash2Icon className="size-4" />
                                )}
                                Revoke
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              No actions available
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="py-6 text-center text-muted-foreground"
                      >
                        No pending invitations.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <AlertDialog
        open={pendingMemberDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingMemberDelete(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member access?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingMemberDelete
                ? `This removes ${getDisplayName(
                    pendingMemberDelete
                  )} from ${currentCompany?.name || "the company"}.`
                : "This removes the selected member from the company."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingMemberId !== null}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deletingMemberId !== null}
              onClick={(event) => {
                event.preventDefault()
                void handleDeleteMember()
              }}
            >
              {deletingMemberId ? (
                <LoaderCircleIcon className="size-4 animate-spin" />
              ) : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingInvitationDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingInvitationDelete(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingInvitationDelete
                ? `This revokes the pending invitation for ${pendingInvitationDelete.email}.`
                : "This revokes the selected invitation."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokingInvitationId !== null}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={revokingInvitationId !== null}
              onClick={(event) => {
                event.preventDefault()
                void handleRevokeInvitation()
              }}
            >
              {revokingInvitationId ? (
                <LoaderCircleIcon className="size-4 animate-spin" />
              ) : null}
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
