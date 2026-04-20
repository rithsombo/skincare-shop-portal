"use client"

import * as React from "react"
import {
  Loader,
  PackageIcon,
  PencilIcon,
  PlusIcon,
  RefreshCcwIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  applyStoredRowOrder,
  SortableTableProvider,
  SortableTableBody,
  SortableTableDragHandle,
  SortableTableRow,
  usePersistedRowOrder,
} from "@/features/catalog/components/sortable-table"
import { CatalogImageFields } from "@/features/catalog/components/catalog-image-fields"
import {
  deleteCatalogImageFile,
  uploadCatalogImageFile,
} from "@/features/catalog/lib/catalog-image-upload"
import { useAuth } from "@/features/auth/components/auth-provider"
import { authFetch } from "@/features/auth/lib/auth-fetch"
import { withCompanyScope } from "@/features/catalog/lib/company-scope"
import { cn } from "@/lib/utils"

const PRODUCTS_ENDPOINT = "/supabase/products"
const PRODUCT_CATEGORIES_ENDPOINT = "/supabase/product-categories"

function getProductRowOrderStorageKey(companyId: string) {
  return `catalog-row-order:products:${companyId}`
}

type ProductCategory = {
  id: string
  name: string
  slug: string
}

type ProductImage = {
  id?: string
  image_url: string
  alt_text: string
  file?: File | null
  preview_url?: string | null
  sort_order?: number
}

type ProductIngredient = {
  id?: string
  ingredient: string
  sort_order?: number
}

type ProductFeedbackEntry = {
  id: string
}

type Product = {
  id: string
  slug: string
  name: string
  description: string
  how_to_use: string
  price_amount: number
  currency: string
  category_id: string
  has_set_option: boolean
  is_active: boolean
  updated_at?: string | null
  category: ProductCategory | null
  images: ProductImage[]
  ingredients: ProductIngredient[]
  feedback_entries: ProductFeedbackEntry[]
}

type ProductFormState = {
  slug: string
  name: string
  description: string
  how_to_use: string
  price_amount: string
  currency: string
  category_id: string
  has_set_option: boolean
  is_active: boolean
  images: ProductImage[]
  ingredients: ProductIngredient[]
}

const emptyFormState: ProductFormState = {
  slug: "",
  name: "",
  description: "",
  how_to_use: "",
  price_amount: "",
  currency: "USD",
  category_id: "",
  has_set_option: false,
  is_active: true,
  images: [{ image_url: "", alt_text: "", file: null, preview_url: null }],
  ingredients: [{ ingredient: "" }],
}

function getString(value: unknown) {
  return typeof value === "string" ? value : ""
}

function getBoolean(value: unknown) {
  return value === true
}

function getNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function normalizeCategory(value: unknown): ProductCategory | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }

  const category = value as Record<string, unknown>

  return {
    id: getString(category.id),
    name: getString(category.name),
    slug: getString(category.slug),
  }
}

function normalizeImages(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as ProductImage[]
  }

  return value.map((entry) => {
    const image = entry as Record<string, unknown>

    return {
      id: getString(image.id),
      image_url: getString(image.image_url),
      alt_text: getString(image.alt_text),
      file: null,
      preview_url: null,
      sort_order: getNumber(image.sort_order),
    }
  })
}

function normalizeIngredients(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as ProductIngredient[]
  }

  return value.map((entry) => {
    const ingredient = entry as Record<string, unknown>

    return {
      id: getString(ingredient.id),
      ingredient: getString(ingredient.ingredient),
      sort_order: getNumber(ingredient.sort_order),
    }
  })
}

function normalizeFeedbackEntries(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as ProductFeedbackEntry[]
  }

  return value.map((entry) => {
    const feedback = entry as Record<string, unknown>

    return {
      id: getString(feedback.id),
    }
  })
}

function normalizeProduct(value: unknown): Product {
  const product = value as Record<string, unknown>

  return {
    id: getString(product.id),
    slug: getString(product.slug),
    name: getString(product.name),
    description: getString(product.description),
    how_to_use: getString(product.how_to_use),
    price_amount: getNumber(product.price_amount),
    currency: getString(product.currency) || "USD",
    category_id: getString(product.category_id),
    has_set_option: getBoolean(product.has_set_option),
    is_active: getBoolean(product.is_active),
    updated_at: getString(product.updated_at) || null,
    category: normalizeCategory(product.category),
    images: normalizeImages(product.images),
    ingredients: normalizeIngredients(product.ingredients),
    feedback_entries: normalizeFeedbackEntries(product.feedback_entries),
  }
}

function extractProducts(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload.map(normalizeProduct)
  }

  if (payload && typeof payload === "object") {
    const response = payload as {
      data?: unknown
      items?: unknown
      products?: unknown
    }

    if (Array.isArray(response.data)) {
      return response.data.map(normalizeProduct)
    }

    if (Array.isArray(response.items)) {
      return response.items.map(normalizeProduct)
    }

    if (Array.isArray(response.products)) {
      return response.products.map(normalizeProduct)
    }
  }

  return [] as Product[]
}

function extractCategories(payload: unknown) {
  if (payload && typeof payload === "object") {
    const response = payload as {
      items?: unknown
      data?: unknown
    }

    const source = Array.isArray(response.items)
      ? response.items
      : Array.isArray(response.data)
        ? response.data
        : []

    return source
      .map(normalizeCategory)
      .filter((category): category is ProductCategory => category !== null)
  }

  if (Array.isArray(payload)) {
    return payload
      .map(normalizeCategory)
      .filter((category): category is ProductCategory => category !== null)
  }

  return [] as ProductCategory[]
}

function productToFormState(product: Product): ProductFormState {
  return {
    slug: product.slug,
    name: product.name,
    description: product.description,
    how_to_use: product.how_to_use,
    price_amount: product.price_amount.toString(),
    currency: product.currency || "USD",
    category_id: product.category_id,
    has_set_option: product.has_set_option,
    is_active: product.is_active,
    images:
      product.images.length > 0
        ? product.images.map((image) => ({
            image_url: image.image_url,
            alt_text: image.alt_text,
            file: null,
            preview_url: null,
          }))
        : [{ image_url: "", alt_text: "", file: null, preview_url: null }],
    ingredients:
      product.ingredients.length > 0
        ? product.ingredients.map((ingredient) => ({
            ingredient: ingredient.ingredient,
          }))
        : [{ ingredient: "" }],
  }
}

function formatPrice(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${currency || "USD"} ${amount}`
  }
}

function formatTimestamp(value?: string | null) {
  if (!value) {
    return "N/A"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Request failed."
}

async function readErrorMessage(response: Response) {
  const text = await response.text()

  if (!text) {
    return `Request failed with status ${response.status}.`
  }

  try {
    const payload = JSON.parse(text) as { error?: string; message?: string }
    return payload.message || payload.error || text
  } catch {
    return text
  }
}

function ProductTextarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "flex min-h-24 w-full rounded-none border border-input bg-transparent px-3 py-2 text-xs shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

function revokePreviewUrl(url?: string | null) {
  if (url?.startsWith("blob:")) {
    URL.revokeObjectURL(url)
  }
}

function cleanupDraftImages(images: ProductImage[]) {
  for (const image of images) {
    revokePreviewUrl(image.preview_url)
  }
}

export function ProductManagement() {
  const { currentCompany } = useAuth()
  const companyId = currentCompany?.id ?? ""
  const productRowOrderStorageKey = React.useMemo(
    () => getProductRowOrderStorageKey(companyId || "no-company"),
    [companyId]
  )
  const [products, setProducts] = React.useState<Product[]>([])
  const [categories, setCategories] = React.useState<ProductCategory[]>([])
  const [form, setForm] = React.useState<ProductFormState>(emptyFormState)
  const [mode, setMode] = React.useState<"create" | "edit">("create")
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [productPendingDelete, setProductPendingDelete] =
    React.useState<Product | null>(null)
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const latestImagesRef = React.useRef<ProductImage[]>(emptyFormState.images)

  React.useEffect(() => {
    latestImagesRef.current = form.images
  }, [form.images])

  React.useEffect(() => {
    return () => {
      cleanupDraftImages(latestImagesRef.current)
    }
  }, [])

  usePersistedRowOrder(productRowOrderStorageKey, products, !isLoading)

  const loadProducts = React.useCallback(
    async (initialLoad = false) => {
      try {
        setError(null)

        if (initialLoad) {
          setIsLoading(true)
        } else {
          setIsRefreshing(true)
        }

        if (!companyId) {
          setProducts([])
          return
        }

        const response = await authFetch(
          withCompanyScope(PRODUCTS_ENDPOINT, companyId),
          {
            method: "GET",
            cache: "no-store",
          }
        )

        if (!response.ok) {
          throw new Error(await readErrorMessage(response))
        }

        const payload = await response.json()
        setProducts(
          applyStoredRowOrder(
            extractProducts(payload),
            productRowOrderStorageKey
          )
        )
      } catch (error) {
        const message = getErrorMessage(error)
        setError(message)
        toast.error(message)
      } finally {
        if (initialLoad) {
          setIsLoading(false)
        } else {
          setIsRefreshing(false)
        }
      }
    },
    [companyId, productRowOrderStorageKey]
  )

  const loadCategories = React.useCallback(async () => {
    try {
      if (!companyId) {
        setCategories([])
        return
      }

      const response = await authFetch(
        withCompanyScope(PRODUCT_CATEGORIES_ENDPOINT, companyId),
        {
          method: "GET",
          cache: "no-store",
        }
      )

      if (!response.ok) {
        throw new Error(await readErrorMessage(response))
      }

      const payload = await response.json()
      setCategories(extractCategories(payload))
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }, [companyId])

  React.useEffect(() => {
    void Promise.all([loadProducts(true), loadCategories()])
  }, [loadProducts, loadCategories])

  function updateField<Key extends keyof ProductFormState>(
    key: Key,
    value: ProductFormState[Key]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }))
  }

  function updateImageValue(
    index: number,
    key: "image_url" | "alt_text",
    value: string
  ) {
    setForm((current) => ({
      ...current,
      images: current.images.map((image, imageIndex) => {
        if (imageIndex !== index) {
          return image
        }

        if (key === "image_url" && image.file) {
          revokePreviewUrl(image.preview_url)

          return {
            ...image,
            image_url: value,
            file: null,
            preview_url: null,
          }
        }

        return { ...image, [key]: value }
      }),
    }))
  }

  function selectImageFile(index: number, file: File | null) {
    setForm((current) => ({
      ...current,
      images: current.images.map((image, imageIndex) => {
        if (imageIndex !== index) {
          return image
        }

        revokePreviewUrl(image.preview_url)

        return {
          ...image,
          file,
          preview_url: file ? URL.createObjectURL(file) : null,
        }
      }),
    }))
  }

  function addImage() {
    setForm((current) => ({
      ...current,
      images: [
        ...current.images,
        { image_url: "", alt_text: "", file: null, preview_url: null },
      ],
    }))
  }

  function removeImage(index: number) {
    setForm((current) => ({
      ...current,
      images: (() => {
        const imageToRemove = current.images[index]
        revokePreviewUrl(imageToRemove?.preview_url)

        if (current.images.length === 1) {
          return [
            { image_url: "", alt_text: "", file: null, preview_url: null },
          ]
        }

        return current.images.filter((_, imageIndex) => imageIndex !== index)
      })(),
    }))
  }

  function updateIngredient(index: number, value: string) {
    setForm((current) => ({
      ...current,
      ingredients: current.ingredients.map((ingredient, ingredientIndex) =>
        ingredientIndex === index
          ? { ...ingredient, ingredient: value }
          : ingredient
      ),
    }))
  }

  function addIngredient() {
    setForm((current) => ({
      ...current,
      ingredients: [...current.ingredients, { ingredient: "" }],
    }))
  }

  function removeIngredient(index: number) {
    setForm((current) => ({
      ...current,
      ingredients:
        current.ingredients.length === 1
          ? [{ ingredient: "" }]
          : current.ingredients.filter(
              (_, ingredientIndex) => ingredientIndex !== index
            ),
    }))
  }

  function resetForm() {
    cleanupDraftImages(latestImagesRef.current)
    setMode("create")
    setEditingId(null)
    setForm(emptyFormState)
  }

  function closeDialog() {
    setIsDialogOpen(false)
    setError(null)
    resetForm()
  }

  function openCreateDialog() {
    setError(null)
    resetForm()
    setIsDialogOpen(true)
  }

  function startEditing(product: Product) {
    setError(null)
    setMode("edit")
    setEditingId(product.id)
    cleanupDraftImages(latestImagesRef.current)
    setForm(productToFormState(product))
    setIsDialogOpen(true)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const priceAmount = Number(form.price_amount)
    const uploadedPaths: string[] = []

    if (!Number.isFinite(priceAmount)) {
      const message = "Price amount must be a valid number."
      setError(message)
      toast.error(message)
      return
    }

    try {
      setError(null)
      setIsSubmitting(true)
      const images = (
        await Promise.all(
          form.images.map(async (image, index) => {
            const alt_text = image.alt_text.trim() || null

            if (image.file) {
              const upload = await uploadCatalogImageFile({
                companyId,
                file: image.file,
                scope: "products",
              })

              uploadedPaths.push(upload.path)

              return {
                image_url: upload.url,
                alt_text,
                sort_order: index,
              }
            }

            const image_url = image.image_url.trim()

            if (!image_url) {
              return null
            }

            return {
              image_url,
              alt_text,
              sort_order: index,
            }
          })
        )
      ).filter((image): image is NonNullable<typeof image> => image !== null)

      const payload = {
        company_id: companyId,
        slug: form.slug.trim(),
        name: form.name.trim(),
        description: form.description.trim(),
        how_to_use: form.how_to_use.trim(),
        price_amount: priceAmount,
        currency: form.currency.trim().toUpperCase(),
        category_id: form.category_id.trim() || null,
        has_set_option: form.has_set_option,
        is_active: form.is_active,
        images,
        ingredients: form.ingredients
          .map((ingredient, index) => ({
            ingredient: ingredient.ingredient.trim(),
            sort_order: index,
          }))
          .filter((ingredient) => ingredient.ingredient),
      }

      const isEditing = mode === "edit" && editingId
      const response = await authFetch(
        isEditing ? `${PRODUCTS_ENDPOINT}/${editingId}` : PRODUCTS_ENDPOINT,
        {
          method: isEditing ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      )

      if (!response.ok) {
        throw new Error(await readErrorMessage(response))
      }

      toast.success(isEditing ? "Product updated." : "Product created.")
      closeDialog()
      await loadProducts(false)
    } catch (error) {
      if (uploadedPaths.length > 0) {
        await Promise.allSettled(
          uploadedPaths.map((path) =>
            deleteCatalogImageFile({
              companyId,
              path,
            })
          )
        )
      }

      const message = getErrorMessage(error)
      setError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function confirmDelete() {
    if (!productPendingDelete) {
      return
    }

    try {
      setError(null)
      setDeletingId(productPendingDelete.id)

      const response = await authFetch(
        `${PRODUCTS_ENDPOINT}/${productPendingDelete.id}`,
        {
          method: "DELETE",
        }
      )

      if (!response.ok) {
        throw new Error(await readErrorMessage(response))
      }

      if (editingId === productPendingDelete.id) {
        closeDialog()
      }

      setProductPendingDelete(null)
      toast.success("Product deleted.")
      await loadProducts(false)
    } catch (error) {
      const message = getErrorMessage(error)
      setError(message)
      toast.error(message)
    } finally {
      setDeletingId(null)
    }
  }

  const activeProducts = products.filter((product) => product.is_active).length
  const setOptionProducts = products.filter(
    (product) => product.has_set_option
  ).length

  return (
    <div className="grid gap-4 px-4 lg:px-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Total products</CardDescription>
            <CardTitle>{products.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Active products</CardDescription>
            <CardTitle>{activeProducts}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Set-enabled products</CardDescription>
            <CardTitle>{setOptionProducts}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Products</CardTitle>
            <CardDescription>
              Wired to categories, images, and ingredients from the Supabase
              API.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={openCreateDialog}>
              <PlusIcon />
              New product
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                void Promise.all([loadProducts(false), loadCategories()])
              }}
              disabled={isRefreshing || isLoading}
            >
              {isRefreshing ? (
                <Loader className="animate-spin" />
              ) : (
                <RefreshCcwIcon />
              )}
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {error ? (
            <div className="rounded-none border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          ) : null}

          {isLoading ? (
            <div className="flex min-h-48 items-center justify-center text-muted-foreground">
              <Loader className="mr-2 animate-spin" />
              Loading products...
            </div>
          ) : !companyId ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <PackageIcon className="size-5" />
              <p>No company selected.</p>
            </div>
          ) : products.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <PackageIcon className="size-5" />
              <p>No products returned from `/supabase/products`.</p>
            </div>
          ) : (
            <SortableTableProvider items={products} onReorder={setProducts}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>Name</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Linked</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <SortableTableBody
                  itemIds={products.map((product) => product.id)}
                >
                  {products.map((product) => (
                    <SortableTableRow
                      key={product.id}
                      id={product.id}
                      className="data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
                    >
                      <SortableTableDragHandle />
                      <TableCell className="whitespace-normal">
                        <div className="font-medium">
                          {product.name || "Untitled"}
                        </div>
                        <div className="text-muted-foreground">
                          {product.slug}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-blue-400 text-smd font-semibold">
                          {formatPrice(product.price_amount, product.currency)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Badge
                            variant={product.is_active ? "default" : "outline"}
                            className={cn(
                              "bg-[#2F6B3F]",
                              !product.is_active && "bg-yellow-700"
                            )}
                          >
                            {product.is_active ? "Active" : "Inactive"}
                          </Badge>
                          {product.has_set_option ? (
                            <Badge variant="secondary" className="">
                              Set option
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-normal text-muted-foreground">
                        {product.category?.name ||
                          product.category_id ||
                          "Uncategorized"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">
                            {product.images.length} image
                            {product.images.length === 1 ? "" : "s"}
                          </Badge>
                          <Badge variant="outline">
                            {product.ingredients.length} ingredient
                            {product.ingredients.length === 1 ? "" : "s"}
                          </Badge>
                          <Badge variant="outline">
                            {product.feedback_entries.length} feedback
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatTimestamp(product.updated_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEditing(product)}
                          >
                            <PencilIcon />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setProductPendingDelete(product)
                            }}
                            disabled={deletingId === product.id}
                          >
                            {deletingId === product.id ? (
                              <Loader className="animate-spin" />
                            ) : (
                              <Trash2Icon />
                            )}
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </SortableTableRow>
                  ))}
                </SortableTableBody>
              </Table>
            </SortableTableProvider>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (isSubmitting) {
            return
          }

          if (!open) {
            closeDialog()
            return
          }

          setIsDialogOpen(true)
        }}
      >
        <DialogContent className="max-h-[85svh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {mode === "edit" ? "Edit product" : "Create product"}
            </DialogTitle>
            <DialogDescription>
              Category, images, and ingredients are linked to the product API.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4 px-4 pb-4" onSubmit={handleSubmit}>
            {error ? (
              <div className="rounded-none border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="product-name">Name</Label>
                <Input
                  id="product-name"
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-slug">Slug</Label>
                <Input
                  id="product-slug"
                  value={form.slug}
                  onChange={(event) => updateField("slug", event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="product-price">Price amount</Label>
                <Input
                  id="product-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price_amount}
                  onChange={(event) =>
                    updateField("price_amount", event.target.value)
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-currency">Currency</Label>
                <Input
                  id="product-currency"
                  value={form.currency}
                  onChange={(event) =>
                    updateField("currency", event.target.value.toUpperCase())
                  }
                  maxLength={3}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={form.category_id || "__none__"}
                onValueChange={(value) =>
                  updateField("category_id", value === "__none__" ? "" : value)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Uncategorized</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-description">Description</Label>
              <ProductTextarea
                id="product-description"
                value={form.description}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-how-to-use">How to use</Label>
              <RichTextEditor
                id="product-how-to-use"
                value={form.how_to_use}
                onChange={(value) => updateField("how_to_use", value)}
                placeholder="Describe the application steps for this product..."
              />
            </div>

            <CatalogImageFields
              scopeLabel="products"
              images={form.images}
              addImage={addImage}
              updateImageValue={updateImageValue}
              selectImageFile={selectImageFile}
              removeImage={removeImage}
              disabled={isSubmitting}
              onError={setError}
            />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Ingredients</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addIngredient}
                >
                  <PlusIcon />
                  Add ingredient
                </Button>
              </div>
              <div className="space-y-3">
                {form.ingredients.map((ingredient, index) => (
                  <div
                    key={`ingredient-${index}`}
                    className="flex gap-2 border border-border p-3"
                  >
                    <Input
                      value={ingredient.ingredient}
                      onChange={(event) =>
                        updateIngredient(index, event.target.value)
                      }
                      placeholder="Ingredient name"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeIngredient(index)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-3 border border-border px-3 py-2">
                <Checkbox
                  checked={form.has_set_option}
                  onCheckedChange={(checked) =>
                    updateField("has_set_option", checked === true)
                  }
                />
                <span className="text-xs">Has set option</span>
              </label>
              <label className="flex items-center gap-3 border border-border px-3 py-2">
                <Checkbox
                  checked={form.is_active}
                  onCheckedChange={(checked) =>
                    updateField("is_active", checked === true)
                  }
                />
                <span className="text-xs">Is active</span>
              </label>
            </div>

            <DialogFooter className="px-0 pb-0">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader className="animate-spin" /> : null}
                {mode === "edit" ? "Update product" : "Create product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={productPendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && deletingId === null) {
            setProductPendingDelete(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              {productPendingDelete?.name ||
                productPendingDelete?.slug ||
                "this product"}
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingId !== null}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deletingId !== null}
              onClick={() => {
                void confirmDelete()
              }}
            >
              {deletingId !== null ? (
                <Loader className="animate-spin" />
              ) : (
                <Trash2Icon />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
