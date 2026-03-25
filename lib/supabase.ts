import { createClient } from "@supabase/supabase-js"

import { ApiError } from "@/lib/api-response"

function getEnv(name: string) {
  const value = process.env[name]

  if (!value) {
    throw new ApiError(`${name} is not set.`, 500)
  }

  return value
}

export function createRouteSupabaseClient(accessToken?: string) {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  return createClient(
    url ?? getEnv("SUPABASE_URL"),
    key ?? getEnv("SUPABASE_PUBLISHABLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
      global: accessToken
        ? {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        : undefined,
    }
  )
}

export function createServiceRoleSupabaseClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SERVICE_ROLE_KEY

  if (!key) {
    return null
  }

  return createClient(
    url ?? getEnv("SUPABASE_URL"),
    key,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    }
  )
}
