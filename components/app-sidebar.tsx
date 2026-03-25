"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useAuth } from "@/features/auth/components/auth-provider"
import { catalogNavItems } from "@/features/catalog/config/navigation"
import Image from "next/image"

const data = {
  navMain: catalogNavItems,
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter()
  const { currentCompany, signOut, user } = useAuth()
  const [isSigningOut, startSignOutTransition] = React.useTransition()

  const sidebarUser = React.useMemo(
    () => ({
      name:
        typeof user?.user_metadata?.full_name === "string" &&
        user.user_metadata.full_name.trim()
          ? user.user_metadata.full_name
          : user?.email?.split("@")[0] || "User",
      email: user?.email || "",
      avatar:
        typeof user?.user_metadata?.avatar_url === "string" &&
        user.user_metadata.avatar_url.trim()
          ? user.user_metadata.avatar_url
          : "/img/skull.png",
    }),
    [user]
  )

  function handleSignOut() {
    startSignOutTransition(async () => {
      try {
        await signOut()
        router.replace("/login")
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to log out."
        )
      }
    })
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link href="/dashboard">
                <Image
                  src="/img/burger-men.png"
                  alt="logo"
                  width={40}
                  height={40}
                />
                <span className="text-base font-semibold">
                  {currentCompany?.name || "Cartify."}
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={sidebarUser}
          isSigningOut={isSigningOut}
          onSignOut={handleSignOut}
        />
      </SidebarFooter>
    </Sidebar>
  )
}
