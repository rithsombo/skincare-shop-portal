import { getCurrentAccessToken } from "@/features/auth/lib/request-auth-context"
import {
  canAssignCompanyRole,
  canManageCompanyRole,
  CompanyRole,
  isCompanyManager,
} from "@/features/auth/lib/company-access-rules"
import { ApiError } from "@/lib/api-response"
import {
  createRouteSupabaseClient,
  createServiceRoleSupabaseClient,
} from "@/lib/supabase"

type JsonRecord = Record<string, unknown>

type MembershipRow = {
  id: string
  company_id: string
  user_id: string
  role: CompanyRole
  created_at: string | null
}

type InvitationRow = {
  id: string
  company_id: string
  email: string
  role: CompanyRole
  status: "pending" | "accepted" | "revoked" | "expired"
  token: string
  expires_at: string | null
  created_at: string | null
}

type ProfileRow = {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
}

export type CompanyMember = {
  id: string
  company_id: string
  user_id: string
  role: CompanyRole
  created_at: string | null
  is_current_user: boolean
  profile: ProfileRow | null
}

export type CompanyInvitation = InvitationRow

export type PendingCompanyInvitation = CompanyInvitation & {
  company: {
    id: string
    name: string
    slug: string
  } | null
}

export type CompanyAccessResult =
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

function getClient() {
  return createRouteSupabaseClient(getCurrentAccessToken())
}

function toApiError(error: { message?: string }, fallbackMessage: string) {
  return new ApiError(error.message || fallbackMessage, 400, error)
}

function requireCompanyRole(value: unknown) {
  if (value === "owner" || value === "admin" || value === "member") {
    return value
  }

  throw new ApiError("role must be owner, admin, or member.", 400)
}

function requireCompanyId(record: JsonRecord) {
  const value = record.company_id

  if (typeof value !== "string" || !value.trim()) {
    throw new ApiError("company_id is required.", 400)
  }

  return value.trim()
}

function requireEmail(record: JsonRecord) {
  const value = record.email

  if (typeof value !== "string" || !value.trim()) {
    throw new ApiError("email is required.", 400)
  }

  const email = value.trim().toLowerCase()

  if (!email.includes("@")) {
    throw new ApiError("email must be valid.", 400)
  }

  return email
}

function getString(value: unknown) {
  return typeof value === "string" ? value : ""
}

function normalizeMembershipRow(value: unknown): MembershipRow {
  const row = value as Record<string, unknown>

  return {
    id: getString(row.id),
    company_id: getString(row.company_id),
    user_id: getString(row.user_id),
    role: requireCompanyRole(row.role),
    created_at: getString(row.created_at) || null,
  }
}

function normalizeInvitationRow(value: unknown): InvitationRow {
  const row = value as Record<string, unknown>
  const status = row.status

  return {
    id: getString(row.id),
    company_id: getString(row.company_id),
    email: getString(row.email),
    role: requireCompanyRole(row.role),
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

function normalizeProfileRow(value: unknown): ProfileRow {
  const row = value as Record<string, unknown>

  return {
    id: getString(row.id),
    email: getString(row.email) || null,
    full_name: getString(row.full_name) || null,
    avatar_url: getString(row.avatar_url) || null,
  }
}

function ensureManagerRole(role: CompanyRole) {
  if (!isCompanyManager(role)) {
    throw new ApiError("Only company owners and admins can manage members.", 403)
  }
}

function ensureCanAssignRole(actorRole: CompanyRole, nextRole: CompanyRole) {
  if (!canAssignCompanyRole(actorRole, nextRole)) {
    throw new ApiError("Only owners can assign the owner role.", 403)
  }
}

function ensureCanManageTargetRole(
  actorRole: CompanyRole,
  targetRole: CompanyRole,
  nextRole?: CompanyRole
) {
  if (!canManageCompanyRole(actorRole, targetRole, nextRole)) {
    if (!isCompanyManager(actorRole)) {
      throw new ApiError("Only company owners and admins can manage members.", 403)
    }

    if (actorRole === "admin" && targetRole === "owner") {
      throw new ApiError("Admins cannot manage company owners.", 403)
    }

    if (nextRole === "owner") {
      throw new ApiError("Only owners can assign the owner role.", 403)
    }

    throw new ApiError("Admins cannot manage company owners.", 403)
  }
}

function getInvitationExpiry() {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
}

async function getCurrentUserId() {
  const client = getClient()
  const accessToken = getCurrentAccessToken()

  if (!accessToken) {
    throw new ApiError("Unauthorized.", 401)
  }

  const {
    data: { user },
    error,
  } = await client.auth.getUser(accessToken)

  if (error || !user) {
    throw new ApiError("Unauthorized.", 401, error)
  }

  return user.id
}

async function getCurrentUser() {
  const client = getClient()
  const accessToken = getCurrentAccessToken()

  if (!accessToken) {
    throw new ApiError("Unauthorized.", 401)
  }

  const {
    data: { user },
    error,
  } = await client.auth.getUser(accessToken)

  if (error || !user) {
    throw new ApiError("Unauthorized.", 401, error)
  }

  return user
}

async function getActingMembership(companyId: string, userId: string) {
  const client = getClient()
  const { data, error } = await client
    .from("company_memberships")
    .select("id, company_id, user_id, role, created_at")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    throw toApiError(error, "Failed to load company membership.")
  }

  if (!data) {
    throw new ApiError("You do not have access to this company.", 403)
  }

  return normalizeMembershipRow(data)
}

async function getProfilesMap(userIds: string[]) {
  const client = getClient()
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))]

  if (uniqueUserIds.length === 0) {
    return new Map<string, ProfileRow>()
  }

  const { data, error } = await client
    .from("profiles")
    .select("id, email, full_name, avatar_url")
    .in("id", uniqueUserIds)

  if (error) {
    throw toApiError(error, "Failed to load user profiles.")
  }

  const profiles = Array.isArray(data) ? data.map(normalizeProfileRow) : []
  return new Map(profiles.map((profile) => [profile.id, profile]))
}

async function getMemberById(membershipId: string, currentUserId: string) {
  const client = getClient()
  const { data, error } = await client
    .from("company_memberships")
    .select("id, company_id, user_id, role, created_at")
    .eq("id", membershipId)
    .maybeSingle()

  if (error) {
    throw toApiError(error, "Failed to load company member.")
  }

  if (!data) {
    throw new ApiError("Member not found.", 404)
  }

  const membership = normalizeMembershipRow(data)
  const profiles = await getProfilesMap([membership.user_id])

  return {
    ...membership,
    is_current_user: membership.user_id === currentUserId,
    profile: profiles.get(membership.user_id) ?? null,
  } satisfies CompanyMember
}

export async function listCompanyMembers(companyId: string) {
  const client = getClient()
  const currentUserId = await getCurrentUserId()
  await getActingMembership(companyId, currentUserId)

  const { data, error } = await client
    .from("company_memberships")
    .select("id, company_id, user_id, role, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: true })

  if (error) {
    throw toApiError(error, "Failed to load company members.")
  }

  const memberships = Array.isArray(data) ? data.map(normalizeMembershipRow) : []
  const profiles = await getProfilesMap(memberships.map((membership) => membership.user_id))

  return memberships.map(
    (membership) =>
      ({
        ...membership,
        is_current_user: membership.user_id === currentUserId,
        profile: profiles.get(membership.user_id) ?? null,
      }) satisfies CompanyMember
  )
}

export async function listCompanyInvitations(companyId: string) {
  const client = getClient()
  const currentUserId = await getCurrentUserId()
  const actingMembership = await getActingMembership(companyId, currentUserId)

  if (!isCompanyManager(actingMembership.role)) {
    return [] as CompanyInvitation[]
  }

  const { data, error } = await client
    .from("company_invitations")
    .select("id, company_id, email, role, status, token, expires_at, created_at")
    .eq("company_id", companyId)
    .eq("status", "pending")
    .order("created_at", { ascending: true })

  if (error) {
    throw toApiError(error, "Failed to load company invitations.")
  }

  return Array.isArray(data) ? data.map(normalizeInvitationRow) : []
}

export async function listPendingInvitationsForCurrentUser() {
  const user = await getCurrentUser()
  const email = user.email?.trim().toLowerCase()

  if (!email) {
    return [] as PendingCompanyInvitation[]
  }

  const serviceClient = createServiceRoleSupabaseClient()

  if (!serviceClient) {
    return [] as PendingCompanyInvitation[]
  }

  const { data: membershipRows, error: membershipError } = await serviceClient
    .from("company_memberships")
    .select("company_id")
    .eq("user_id", user.id)

  if (membershipError) {
    throw toApiError(membershipError, "Failed to load current company memberships.")
  }

  const membershipCompanyIds = new Set(
    Array.isArray(membershipRows)
      ? membershipRows
          .map((row) =>
            row && typeof row === "object" && "company_id" in row
              ? getString((row as Record<string, unknown>).company_id)
              : ""
          )
          .filter(Boolean)
      : []
  )

  const { data, error } = await serviceClient
    .from("company_invitations")
    .select(
      "id, company_id, email, role, status, token, expires_at, created_at, company:companies(id, name, slug)"
    )
    .eq("status", "pending")
    .ilike("email", email)
    .order("created_at", { ascending: true })

  if (error) {
    throw toApiError(error, "Failed to load pending invitations.")
  }

  if (!Array.isArray(data)) {
    return [] as PendingCompanyInvitation[]
  }

  return data
    .map((value) => {
      const row = value as Record<string, unknown>
      const invitation = normalizeInvitationRow(row)
      const companyValue = row.company
      const company =
        companyValue &&
        typeof companyValue === "object" &&
        !Array.isArray(companyValue)
          ? {
              id: getString((companyValue as Record<string, unknown>).id),
              name: getString((companyValue as Record<string, unknown>).name),
              slug: getString((companyValue as Record<string, unknown>).slug),
            }
          : null

      return {
        ...invitation,
        company,
      } satisfies PendingCompanyInvitation
    })
    .filter((invitation) => !membershipCompanyIds.has(invitation.company_id))
}

export async function createCompanyAccess(record: JsonRecord) {
  const client = getClient()
  const companyId = requireCompanyId(record)
  const email = requireEmail(record)
  const role = requireCompanyRole(record.role)
  const currentUserId = await getCurrentUserId()
  const actingMembership = await getActingMembership(companyId, currentUserId)

  ensureCanAssignRole(actingMembership.role, role)

  const { data: profileData, error: profileError } = await client
    .from("profiles")
    .select("id, email, full_name, avatar_url")
    .ilike("email", email)
    .maybeSingle()

  if (profileError) {
    throw toApiError(profileError, "Failed to look up the user profile.")
  }

  if (profileData) {
    const profile = normalizeProfileRow(profileData)

    const { data: existingMembership, error: membershipError } = await client
      .from("company_memberships")
      .select("id, company_id, user_id, role, created_at")
      .eq("company_id", companyId)
      .eq("user_id", profile.id)
      .maybeSingle()

    if (membershipError) {
      throw toApiError(membershipError, "Failed to look up company membership.")
    }

    let membershipId: string
    let message: string

    if (existingMembership) {
      const membership = normalizeMembershipRow(existingMembership)

      if (membership.user_id === currentUserId) {
        throw new ApiError("You cannot change your own access from this screen.", 400)
      }

      ensureCanManageTargetRole(actingMembership.role, membership.role, role)

      if (membership.role === role) {
        membershipId = membership.id
        message = "Member access is already up to date."
      } else {
        const { data: updatedMembership, error: updateError } = await client
          .from("company_memberships")
          .update({ role })
          .eq("id", membership.id)
          .select("id, company_id, user_id, role, created_at")
          .single()

        if (updateError) {
          throw toApiError(updateError, "Failed to update member access.")
        }

        membershipId = normalizeMembershipRow(updatedMembership).id
        message = "Member access updated."
      }
    } else {
      const { data: insertedMembership, error: insertError } = await client
        .from("company_memberships")
        .insert({
          company_id: companyId,
          user_id: profile.id,
          role,
          created_by: currentUserId,
        })
        .select("id, company_id, user_id, role, created_at")
        .single()

      if (insertError) {
        throw toApiError(insertError, "Failed to grant company access.")
      }

      membershipId = normalizeMembershipRow(insertedMembership).id
      message = "Member added to the company."
    }

    const revokePendingQuery = client
      .from("company_invitations")
      .update({ status: "revoked" })
      .eq("company_id", companyId)
      .ilike("email", email)
      .eq("status", "pending")

    if (actingMembership.role === "admin") {
      revokePendingQuery.neq("role", "owner")
    }

    const { error: revokePendingError } = await revokePendingQuery

    if (revokePendingError) {
      throw toApiError(revokePendingError, "Failed to reconcile pending invitations.")
    }

    return {
      type: "member",
      message,
      member: await getMemberById(membershipId, currentUserId),
    } satisfies CompanyAccessResult
  }

  const { data: existingInvitation, error: invitationLookupError } = await client
    .from("company_invitations")
    .select("id, company_id, email, role, status, token, expires_at, created_at")
    .eq("company_id", companyId)
    .ilike("email", email)
    .eq("status", "pending")
    .maybeSingle()

  if (invitationLookupError) {
    throw toApiError(invitationLookupError, "Failed to look up company invitation.")
  }

  if (existingInvitation) {
    const invitation = normalizeInvitationRow(existingInvitation)
    ensureCanAssignRole(actingMembership.role, role)

    if (invitation.role === role) {
      return {
        type: "invitation",
        message: "An invitation is already pending for this email.",
        invitation,
      } satisfies CompanyAccessResult
    }

    const { data: updatedInvitation, error: updateError } = await client
      .from("company_invitations")
      .update({
        role,
        invited_by: currentUserId,
        expires_at: getInvitationExpiry(),
      })
      .eq("id", invitation.id)
      .select("id, company_id, email, role, status, token, expires_at, created_at")
      .single()

    if (updateError) {
      throw toApiError(updateError, "Failed to update the pending invitation.")
    }

    return {
      type: "invitation",
      message: "Pending invitation updated.",
      invitation: normalizeInvitationRow(updatedInvitation),
    } satisfies CompanyAccessResult
  }

  const { data: insertedInvitation, error: insertInvitationError } = await client
    .from("company_invitations")
    .insert({
      company_id: companyId,
      email,
      role,
      invited_by: currentUserId,
      expires_at: getInvitationExpiry(),
    })
    .select("id, company_id, email, role, status, token, expires_at, created_at")
    .single()

  if (insertInvitationError) {
    throw toApiError(insertInvitationError, "Failed to create the invitation.")
  }

  return {
    type: "invitation",
    message: "Pending invitation created.",
    invitation: normalizeInvitationRow(insertedInvitation),
  } satisfies CompanyAccessResult
}

export async function updateCompanyMember(
  membershipId: string,
  record: JsonRecord
) {
  const client = getClient()
  const companyId = requireCompanyId(record)
  const nextRole = requireCompanyRole(record.role)
  const currentUserId = await getCurrentUserId()
  const actingMembership = await getActingMembership(companyId, currentUserId)
  const targetMember = await getMemberById(membershipId, currentUserId)

  if (targetMember.company_id !== companyId) {
    throw new ApiError("Member does not belong to this company.", 400)
  }

  if (targetMember.user_id === currentUserId) {
    throw new ApiError("You cannot change your own role from this screen.", 400)
  }

  ensureCanManageTargetRole(actingMembership.role, targetMember.role, nextRole)

  if (targetMember.role === nextRole) {
    return targetMember
  }

  const { data, error } = await client
    .from("company_memberships")
    .update({ role: nextRole })
    .eq("id", membershipId)
    .select("id, company_id, user_id, role, created_at")
    .single()

  if (error) {
    throw toApiError(error, "Failed to update the member role.")
  }

  const membership = normalizeMembershipRow(data)
  const profiles = await getProfilesMap([membership.user_id])

  return {
    ...membership,
    is_current_user: membership.user_id === currentUserId,
    profile: profiles.get(membership.user_id) ?? null,
  } satisfies CompanyMember
}

export async function removeCompanyMember(
  membershipId: string,
  companyId: string
) {
  const client = getClient()
  const currentUserId = await getCurrentUserId()
  const actingMembership = await getActingMembership(companyId, currentUserId)
  const targetMember = await getMemberById(membershipId, currentUserId)

  if (targetMember.company_id !== companyId) {
    throw new ApiError("Member does not belong to this company.", 400)
  }

  if (targetMember.user_id === currentUserId) {
    throw new ApiError("You cannot remove your own access from this screen.", 400)
  }

  ensureCanManageTargetRole(actingMembership.role, targetMember.role)

  const { error } = await client
    .from("company_memberships")
    .delete()
    .eq("id", membershipId)

  if (error) {
    throw toApiError(error, "Failed to remove the member.")
  }

  return { success: true }
}

export async function revokeCompanyInvitation(
  invitationId: string,
  companyId: string
) {
  const client = getClient()
  const currentUserId = await getCurrentUserId()
  const actingMembership = await getActingMembership(companyId, currentUserId)
  ensureManagerRole(actingMembership.role)

  const { data: existingInvitation, error: invitationError } = await client
    .from("company_invitations")
    .select("id, company_id, email, role, status, token, expires_at, created_at")
    .eq("id", invitationId)
    .maybeSingle()

  if (invitationError) {
    throw toApiError(invitationError, "Failed to load the company invitation.")
  }

  if (!existingInvitation) {
    throw new ApiError("Invitation not found.", 404)
  }

  const invitation = normalizeInvitationRow(existingInvitation)

  if (invitation.company_id !== companyId) {
    throw new ApiError("Invitation does not belong to this company.", 400)
  }

  ensureCanManageTargetRole(actingMembership.role, invitation.role)

  const { error } = await client
    .from("company_invitations")
    .update({ status: "revoked" })
    .eq("id", invitationId)

  if (error) {
    throw toApiError(error, "Failed to revoke the invitation.")
  }

  return { success: true }
}

function isInvitationPastExpiry(invitation: InvitationRow) {
  if (!invitation.expires_at) {
    return false
  }

  const expiry = new Date(invitation.expires_at)

  if (Number.isNaN(expiry.getTime())) {
    return false
  }

  return expiry.getTime() <= Date.now()
}

export async function acceptCompanyInvitation(inviteToken: string) {
  const trimmedToken = inviteToken.trim()
  const client = getClient()
  const currentUser = await getCurrentUser()

  if (!trimmedToken) {
    throw new ApiError("token is required.", 400)
  }

  const serviceClient = createServiceRoleSupabaseClient()

  if (serviceClient) {
    const { data: invitationData, error: invitationError } = await serviceClient
      .from("company_invitations")
      .select("id, company_id, email, role, status, token, expires_at, created_at")
      .eq("token", trimmedToken)
      .maybeSingle()

    if (invitationError) {
      throw toApiError(invitationError, "Failed to load the invitation.")
    }

    if (!invitationData) {
      throw new ApiError("This invitation is invalid or no longer available.", 404)
    }

    const invitation = normalizeInvitationRow(invitationData)
    const currentEmail = currentUser.email?.trim().toLowerCase() ?? ""
    const invitedEmail = invitation.email.trim().toLowerCase()

    if (!currentEmail || currentEmail !== invitedEmail) {
      throw new ApiError(
        `This invitation was sent to ${invitation.email}. Sign in with that email to accept it.`,
        403
      )
    }

    if (invitation.status === "revoked") {
      throw new ApiError("This invitation has been revoked.", 400)
    }

    if (invitation.status === "accepted") {
      return {
        company_id: invitation.company_id,
      }
    }

    if (invitation.status === "expired" || isInvitationPastExpiry(invitation)) {
      if (invitation.status === "pending" && isInvitationPastExpiry(invitation)) {
        const { error: updateError } = await serviceClient
          .from("company_invitations")
          .update({ status: "expired" })
          .eq("id", invitation.id)

        if (updateError) {
          throw toApiError(updateError, "Failed to expire the invitation.")
        }
      }

      throw new ApiError("This invitation has expired.", 400)
    }
  }

  const { data, error } = await client.rpc("accept_company_invitation", {
    invite_token: trimmedToken,
  })

  if (error) {
    throw toApiError(error, "Failed to accept the invitation.")
  }

  return {
    company_id: typeof data === "string" ? data : null,
  }
}
