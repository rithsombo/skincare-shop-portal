import {
  BoxIcon,
  FolderKanbanIcon,
  LayersIcon,
  ShapesIcon,
  UsersIcon,
} from "lucide-react"

export const catalogTabs = [
  "products",
  "product-categories",
  "collections",
  "collection-categories",
  "members",
] as const

export type CatalogTab = (typeof catalogTabs)[number]

export const defaultCatalogTab: CatalogTab = "products"

export const catalogNavItems = [
  {
    title: "Products",
    url: "/dashboard?tab=products",
    icon: <BoxIcon />,
  },
  {
    title: "Product Categories",
    url: "/dashboard?tab=product-categories",
    icon: <ShapesIcon />,
  },
  {
    title: "Collections",
    url: "/dashboard?tab=collections",
    icon: <FolderKanbanIcon />,
  },
  {
    title: "Collection Categories",
    url: "/dashboard?tab=collection-categories",
    icon: <LayersIcon />,
  },
  {
    title: "Members",
    url: "/dashboard?tab=members",
    icon: <UsersIcon />,
  },
] as const
