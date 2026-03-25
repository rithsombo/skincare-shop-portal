"use client"

const PENDING_AUTH_REDIRECT_KEY = "pending-auth-redirect"

export function readPendingAuthRedirect() {
  if (typeof window === "undefined") {
    return null
  }

  return window.localStorage.getItem(PENDING_AUTH_REDIRECT_KEY)
}

export function writePendingAuthRedirect(path: string) {
  if (
    typeof window === "undefined" ||
    !path ||
    !path.startsWith("/") ||
    path === "/dashboard"
  ) {
    return
  }

  window.localStorage.setItem(PENDING_AUTH_REDIRECT_KEY, path)
}

export function clearPendingAuthRedirect() {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.removeItem(PENDING_AUTH_REDIRECT_KEY)
}
