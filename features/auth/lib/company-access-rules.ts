export type CompanyRole = "owner" | "admin" | "member"

export function isCompanyManager(role: CompanyRole | null) {
  return role === "owner" || role === "admin"
}

export function canAssignCompanyRole(
  actorRole: CompanyRole | null,
  nextRole: CompanyRole
) {
  if (!isCompanyManager(actorRole)) {
    return false
  }

  if (actorRole === "admin" && nextRole === "owner") {
    return false
  }

  return true
}

export function canManageCompanyRole(
  actorRole: CompanyRole | null,
  targetRole: CompanyRole,
  nextRole?: CompanyRole
) {
  if (!isCompanyManager(actorRole)) {
    return false
  }

  if (actorRole === "admin" && targetRole === "owner") {
    return false
  }

  if (nextRole) {
    return canAssignCompanyRole(actorRole, nextRole)
  }

  return true
}

export function getCompanyRoleBadgeVariant(role: CompanyRole) {
  if (role === "owner") {
    return "default" as const
  }

  if (role === "admin") {
    return "secondary" as const
  }

  return "outline" as const
}
