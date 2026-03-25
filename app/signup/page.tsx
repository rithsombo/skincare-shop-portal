import { Suspense } from "react"

import { SignupPage } from "@/features/auth/components/signup-page"

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SignupPage />
    </Suspense>
  )
}
