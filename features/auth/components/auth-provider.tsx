"use client"

import * as React from "react"
import type { Session, User } from "@supabase/supabase-js"

import {
  clearPendingAuthRedirect,
  readPendingAuthRedirect,
} from "@/features/auth/lib/pending-auth-redirect"
import { createBrowserSupabaseClient } from "@/features/auth/lib/supabase-browser"

type Company = {
  id: string
  name: string
  slug: string
}

type CompanyMembership = {
  id: string
  company_id: string
  role: "owner" | "admin" | "member"
  company: Company | null
}

type AuthContextValue = {
  isLoading: boolean
  session: Session | null
  user: User | null
  memberships: CompanyMembership[]
  currentCompany: Company | null
  currentMembership: CompanyMembership | null
  setCurrentCompanyId: (companyId: string) => void
  refreshMemberships: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (input: {
    email: string
    password: string
    fullName?: string
    emailRedirectTo?: string
  }) => Promise<{ requiresEmailConfirmation: boolean }>
  signOut: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

function getCompanyStorageKey(userId: string) {
  return `current-company:${userId}`
}

function normalizeMemberships(value: unknown): CompanyMembership[] {
  if (!Array.isArray(value)) {
    return []
  }

  const memberships: CompanyMembership[] = []

  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      continue
    }

    const row = entry as Record<string, unknown>
    const companyValue = row.company

    if (
      !companyValue ||
      typeof companyValue !== "object" ||
      Array.isArray(companyValue)
    ) {
      continue
    }

    const companyRow = companyValue as Record<string, unknown>

    if (
      typeof row.id !== "string" ||
      typeof row.company_id !== "string" ||
      typeof companyRow.id !== "string"
    ) {
      continue
    }

    memberships.push({
      id: row.id,
      company_id: row.company_id,
      role:
        row.role === "owner" || row.role === "admin" || row.role === "member"
          ? row.role
          : "member",
      company: {
        id: companyRow.id,
        name: typeof companyRow.name === "string" ? companyRow.name : "",
        slug: typeof companyRow.slug === "string" ? companyRow.slug : "",
      },
    })
  }

  const rolePriority: Record<CompanyMembership["role"], number> = {
    owner: 3,
    admin: 2,
    member: 1,
  }

  const byCompany = new Map<string, CompanyMembership>()

  for (const membership of memberships) {
    const existing = byCompany.get(membership.company_id)

    if (
      !existing ||
      rolePriority[membership.role] > rolePriority[existing.role]
    ) {
      byCompany.set(membership.company_id, membership)
    }
  }

  return Array.from(byCompany.values())
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = React.useMemo(() => createBrowserSupabaseClient(), [])
  const [session, setSession] = React.useState<Session | null>(null)
  const [user, setUser] = React.useState<User | null>(null)
  const [memberships, setMemberships] = React.useState<CompanyMembership[]>([])
  const [currentCompanyId, setCurrentCompanyIdState] = React.useState<
    string | null
  >(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const userId = user?.id ?? null
  const userIdRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    userIdRef.current = userId
  }, [userId])

  const redirectToPendingPath = React.useCallback((nextSession: Session | null) => {
    if (!nextSession || typeof window === "undefined") {
      return
    }

    const pendingRedirect = readPendingAuthRedirect()

    if (!pendingRedirect) {
      return
    }

    const currentPath = `${window.location.pathname}${window.location.search}`

    if (currentPath === pendingRedirect) {
      clearPendingAuthRedirect()
      return
    }

    if (
      window.location.pathname === "/" ||
      window.location.pathname === "/login" ||
      window.location.pathname === "/signup" ||
      window.location.pathname === "/dashboard"
    ) {
      clearPendingAuthRedirect()
      window.location.replace(pendingRedirect)
    }
  }, [])

  React.useEffect(() => {
    let isMounted = true

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) {
        return
      }

      if (error) {
        setSession(null)
        setUser(null)
        setIsLoading(false)
        return
      }

      setSession(data.session)
      setUser(data.session?.user ?? null)
      setIsLoading(Boolean(data.session?.user))
      redirectToPendingPath(data.session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!isMounted) {
        return
      }

      const nextUserId = nextSession?.user?.id ?? null
      const previousUserId = userIdRef.current
      const shouldReloadMemberships = nextUserId !== previousUserId

      setSession(nextSession)
      setUser(nextSession?.user ?? null)

      if (shouldReloadMemberships) {
        setIsLoading(Boolean(nextUserId))
      }

      redirectToPendingPath(nextSession)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [redirectToPendingPath, supabase])

  const loadMemberships = React.useCallback(
    async (nextUserId: string) => {
      const { data, error } = await supabase
        .from("company_memberships")
        .select("id, company_id, role, company:companies(id, name, slug)")
        .order("created_at", { ascending: true })

      if (error) {
        throw error
      }

      const nextMemberships = normalizeMemberships(data)
      setMemberships(nextMemberships)

      const storageKey = getCompanyStorageKey(nextUserId)
      const storedCompanyId =
        typeof window !== "undefined"
          ? window.localStorage.getItem(storageKey)
          : null

      const resolvedCompanyId =
        storedCompanyId &&
        nextMemberships.some(
          (membership) => membership.company_id === storedCompanyId
        )
          ? storedCompanyId
          : nextMemberships[0]?.company_id ?? null

      setCurrentCompanyIdState(resolvedCompanyId)
    },
    [supabase]
  )

  React.useEffect(() => {
    if (!userId) {
      setMemberships([])
      setCurrentCompanyIdState(null)
      setIsLoading(false)
      return
    }

    let isMounted = true
    setIsLoading(true)

    void loadMemberships(userId)
      .catch(() => {
        if (!isMounted) {
          return
        }

        setMemberships([])
        setCurrentCompanyIdState(null)
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [loadMemberships, userId])

  React.useEffect(() => {
    if (!user || typeof window === "undefined") {
      return
    }

    const storageKey = getCompanyStorageKey(user.id)

    if (currentCompanyId) {
      window.localStorage.setItem(storageKey, currentCompanyId)
      return
    }

    window.localStorage.removeItem(storageKey)
  }, [currentCompanyId, user])

  const currentMembership =
    memberships.find((membership) => membership.company_id === currentCompanyId) ??
    null
  const currentCompany = currentMembership?.company ?? null

  function setCurrentCompanyId(companyId: string) {
    setCurrentCompanyIdState(companyId)
  }

  async function refreshMemberships() {
    if (!userId) {
      setMemberships([])
      setCurrentCompanyIdState(null)
      return
    }

    await loadMemberships(userId)
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      throw error
    }
  }

  async function signUp(input: {
    email: string
    password: string
    fullName?: string
    emailRedirectTo?: string
  }) {
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        ...(input.fullName?.trim()
          ? {
              data: {
                full_name: input.fullName.trim(),
              },
            }
          : {}),
        ...(input.emailRedirectTo
          ? {
              emailRedirectTo: input.emailRedirectTo,
            }
          : {}),
      },
    })

    if (error) {
      throw error
    }

    return {
      requiresEmailConfirmation: !data.session,
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      throw error
    }

    setMemberships([])
    setCurrentCompanyIdState(null)
  }

  return (
    <AuthContext.Provider
      value={{
        isLoading,
        session,
        user,
        memberships,
        currentCompany,
        currentMembership,
        setCurrentCompanyId,
        refreshMemberships,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = React.useContext(AuthContext)

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.")
  }

  return context
}
