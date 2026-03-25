export function withCompanyScope(path: string, companyId: string) {
  const url = new URL(path, "http://localhost")
  url.searchParams.set("company_id", companyId)

  return `${url.pathname}?${url.searchParams.toString()}`
}
