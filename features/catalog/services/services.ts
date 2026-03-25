import { authFetch } from "@/features/auth/lib/auth-fetch"
import { withCompanyScope } from "@/features/catalog/lib/company-scope"
import { readErrorMessage } from "@/lib/utils"

export const LoadItems = async (endpoint: string, companyId: string) => {
  const response = await authFetch(withCompanyScope(endpoint, companyId), {
    method: "GET",
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }
  return response.json()
}
