"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavMain({
  items,
}: {
  items: ReadonlyArray<{
    title: string
    url?: string
    disabled?: boolean
    icon?: React.ReactNode
  }>
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function isItemActive(url: string) {
    const [itemPathname, itemQuery = ""] = url.split("?")

    if (pathname !== itemPathname) {
      return false
    }

    const itemSearchParams = new URLSearchParams(itemQuery)

    for (const [key, value] of itemSearchParams.entries()) {
      if (searchParams.get(key) !== value) {
        return false
      }
    }

    return true
  }

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              {item.url && !item.disabled ? (
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  isActive={isItemActive(item.url)}
                >
                  <Link href={item.url}>
                    {item.icon}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              ) : (
                <SidebarMenuButton tooltip={item.title} disabled>
                  {item.icon}
                  <span>{item.title}</span>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
