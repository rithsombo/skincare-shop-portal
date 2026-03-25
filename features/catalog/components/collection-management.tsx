"use client"

import * as React from "react"
import {
  Loader,
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
import { useAuth } from "@/features/auth/components/auth-provider"
import { authFetch } from "@/features/auth/lib/auth-fetch"
import { withCompanyScope } from "@/features/catalog/lib/company-scope"

const COLLECTIONS_ENDPOINT = "/supabase/collections"
const COLLECTION_CATEGORIES_ENDPOINT = "/supabase/collection-categories"
const PRODUCTS_ENDPOINT = "/supabase/products"

function getCollectionRowOrderStorageKey(companyId: string) {
  return `catalog-row-order:collections:${companyId}`
}

type CollectionCategory = {
  id: string
  name: string
  slug: string
}

type ProductOption = {
  id: string
  name: string
  slug: string
}

type CollectionImage = {
  image_url: string
  alt_text: string
}

type LinkedProduct = {
  product_id: string
  sort_order?: number
  product?: ProductOption | null
}

type Collection = {
  id: string
  slug: string
  name: string
  description: string
  ritual: string
  price_amount: number
  currency: string
  category_id: string
  is_active: boolean
  updated_at?: string | null
  category: CollectionCategory | null
  images: CollectionImage[]
  products: LinkedProduct[]
  feedback_entries: { id: string }[]
}

type CollectionFormState = {
  slug: string
  name: string
  description: string
  ritual: string
  price_amount: string
  currency: string
  category_id: string
  is_active: boolean
  images: CollectionImage[]
  product_ids: string[]
}

const emptyFormState: CollectionFormState = {
  slug: "",
  name: "",
  description: "",
  ritual: "",
  price_amount: "",
  currency: "USD",
  category_id: "",
  is_active: true,
  images: [{ image_url: "", alt_text: "" }],
  product_ids: [],
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

function normalizeCategory(value: unknown): CollectionCategory | null {
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

function extractCategories(payload: unknown) {
  if (payload && typeof payload === "object") {
    const response = payload as { items?: unknown; data?: unknown }
    const source = Array.isArray(response.items)
      ? response.items
      : Array.isArray(response.data)
        ? response.data
        : []

    return source
      .map(normalizeCategory)
      .filter((category): category is CollectionCategory => category !== null)
  }

  return [] as CollectionCategory[]
}

function normalizeProductOption(value: unknown): ProductOption | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }

  const product = value as Record<string, unknown>
  return {
    id: getString(product.id),
    name: getString(product.name),
    slug: getString(product.slug),
  }
}

function extractProductOptions(payload: unknown) {
  if (payload && typeof payload === "object") {
    const response = payload as { items?: unknown; data?: unknown }
    const source = Array.isArray(response.items)
      ? response.items
      : Array.isArray(response.data)
        ? response.data
        : []

    return source
      .map(normalizeProductOption)
      .filter((product): product is ProductOption => product !== null)
  }

  return [] as ProductOption[]
}

function normalizeCollection(value: unknown): Collection {
  const collection = value as Record<string, unknown>

  return {
    id: getString(collection.id),
    slug: getString(collection.slug),
    name: getString(collection.name),
    description: getString(collection.description),
    ritual: getString(collection.ritual),
    price_amount: getNumber(collection.price_amount),
    currency: getString(collection.currency) || "USD",
    category_id: getString(collection.category_id),
    is_active: getBoolean(collection.is_active),
    updated_at: getString(collection.updated_at) || null,
    category: normalizeCategory(collection.category),
    images: Array.isArray(collection.images)
      ? collection.images.map((image) => {
          const row = image as Record<string, unknown>
          return {
            image_url: getString(row.image_url),
            alt_text: getString(row.alt_text),
          }
        })
      : [],
    products: Array.isArray(collection.products)
      ? collection.products.map((entry) => {
          const row = entry as Record<string, unknown>
          return {
            product_id: getString(row.product_id),
            sort_order: getNumber(row.sort_order),
            product: normalizeProductOption(row.product),
          }
        })
      : [],
    feedback_entries: Array.isArray(collection.feedback_entries)
      ? collection.feedback_entries.map((entry) => ({
          id: getString((entry as Record<string, unknown>).id),
        }))
      : [],
  }
}

function extractCollections(payload: unknown) {
  if (payload && typeof payload === "object") {
    const response = payload as { items?: unknown; data?: unknown }
    const source = Array.isArray(response.items)
      ? response.items
      : Array.isArray(response.data)
        ? response.data
        : []

    return source.map(normalizeCollection)
  }

  return [] as Collection[]
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

export function CollectionManagement() {
  const { currentCompany } = useAuth()
  const companyId = currentCompany?.id ?? ""
  const collectionRowOrderStorageKey = React.useMemo(
    () => getCollectionRowOrderStorageKey(companyId || "no-company"),
    [companyId]
  )
  const [items, setItems] = React.useState<Collection[]>([])
  const [categories, setCategories] = React.useState<CollectionCategory[]>([])
  const [products, setProducts] = React.useState<ProductOption[]>([])
  const [form, setForm] = React.useState<CollectionFormState>(emptyFormState)
  const [mode, setMode] = React.useState<"create" | "edit">("create")
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = React.useState<Collection | null>(null)
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  usePersistedRowOrder(collectionRowOrderStorageKey, items, !isLoading)

  const loadCollections = React.useCallback(async (initialLoad = false) => {
    try {
      setError(null)

      if (initialLoad) {
        setIsLoading(true)
      } else {
        setIsRefreshing(true)
      }

      if (!companyId) {
        setItems([])
        return
      }

      const response = await authFetch(withCompanyScope(COLLECTIONS_ENDPOINT, companyId), {
        method: "GET",
        cache: "no-store",
      })

      if (!response.ok) {
        throw new Error(await readErrorMessage(response))
      }

      const payload = await response.json()
      setItems(
        applyStoredRowOrder(
          extractCollections(payload),
          collectionRowOrderStorageKey
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
  }, [collectionRowOrderStorageKey, companyId])

  const loadDependencies = React.useCallback(async () => {
    try {
      if (!companyId) {
        setCategories([])
        setProducts([])
        return
      }

      const [categoryResponse, productResponse] = await Promise.all([
        authFetch(withCompanyScope(COLLECTION_CATEGORIES_ENDPOINT, companyId), {
          cache: "no-store",
        }),
        authFetch(withCompanyScope(PRODUCTS_ENDPOINT, companyId), {
          cache: "no-store",
        }),
      ])

      if (!categoryResponse.ok) {
        throw new Error(await readErrorMessage(categoryResponse))
      }

      if (!productResponse.ok) {
        throw new Error(await readErrorMessage(productResponse))
      }

      const [categoryPayload, productPayload] = await Promise.all([
        categoryResponse.json(),
        productResponse.json(),
      ])

      setCategories(extractCategories(categoryPayload))
      setProducts(extractProductOptions(productPayload))
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }, [companyId])

  React.useEffect(() => {
    void Promise.all([loadCollections(true), loadDependencies()])
  }, [loadCollections, loadDependencies])

  function resetForm() {
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
    resetForm()
    setError(null)
    setIsDialogOpen(true)
  }

  function startEditing(item: Collection) {
    setMode("edit")
    setEditingId(item.id)
    setForm({
      slug: item.slug,
      name: item.name,
      description: item.description,
      ritual: item.ritual,
      price_amount: item.price_amount.toString(),
      currency: item.currency,
      category_id: item.category_id,
      is_active: item.is_active,
      images:
        item.images.length > 0
          ? item.images.map((image) => ({
              image_url: image.image_url,
              alt_text: image.alt_text,
            }))
          : [{ image_url: "", alt_text: "" }],
      product_ids: item.products
        .slice()
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((entry) => entry.product_id),
    })
    setError(null)
    setIsDialogOpen(true)
  }

  function updateImage(index: number, key: keyof CollectionImage, value: string) {
    setForm((current) => ({
      ...current,
      images: current.images.map((image, imageIndex) =>
        imageIndex === index ? { ...image, [key]: value } : image
      ),
    }))
  }

  function addImage() {
    setForm((current) => ({
      ...current,
      images: [...current.images, { image_url: "", alt_text: "" }],
    }))
  }

  function removeImage(index: number) {
    setForm((current) => ({
      ...current,
      images:
        current.images.length === 1
          ? [{ image_url: "", alt_text: "" }]
          : current.images.filter((_, imageIndex) => imageIndex !== index),
    }))
  }

  function toggleProductSelection(productId: string) {
    setForm((current) => ({
      ...current,
      product_ids: current.product_ids.includes(productId)
        ? current.product_ids.filter((id) => id !== productId)
        : [...current.product_ids, productId],
    }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const priceAmount = Number(form.price_amount)
    if (!Number.isFinite(priceAmount)) {
      const message = "Price amount must be a valid number."
      setError(message)
      toast.error(message)
      return
    }

    try {
      setError(null)
      setIsSubmitting(true)

      const payload = {
        company_id: companyId,
        slug: form.slug.trim(),
        name: form.name.trim(),
        description: form.description.trim(),
        ritual: form.ritual.trim(),
        price_amount: priceAmount,
        currency: form.currency.trim().toUpperCase(),
        category_id: form.category_id.trim() || null,
        is_active: form.is_active,
        images: form.images
          .map((image, index) => ({
            image_url: image.image_url.trim(),
            alt_text: image.alt_text.trim() || null,
            sort_order: index,
          }))
          .filter((image) => image.image_url),
        products: form.product_ids.map((product_id, index) => ({
          product_id,
          sort_order: index,
        })),
      }

      const isEditing = mode === "edit" && editingId
      const response = await authFetch(
        isEditing ? `${COLLECTIONS_ENDPOINT}/${editingId}` : COLLECTIONS_ENDPOINT,
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

      toast.success(isEditing ? "Collection updated." : "Collection created.")
      closeDialog()
      await loadCollections(false)
    } catch (error) {
      const message = getErrorMessage(error)
      setError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) {
      return
    }

    try {
      setError(null)
      setDeletingId(pendingDelete.id)

      const response = await authFetch(`${COLLECTIONS_ENDPOINT}/${pendingDelete.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error(await readErrorMessage(response))
      }

      setPendingDelete(null)
      toast.success("Collection deleted.")
      await loadCollections(false)
    } catch (error) {
      const message = getErrorMessage(error)
      setError(message)
      toast.error(message)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Collections</CardTitle>
          <CardDescription>
            Create, edit, select, and delete collections with linked category, images, and products.
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openCreateDialog}>
            <PlusIcon />
            New collection
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              void Promise.all([loadCollections(false), loadDependencies()])
            }}
            disabled={isLoading || isRefreshing}
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
          <div className="flex min-h-40 items-center justify-center text-muted-foreground">
            <Loader className="mr-2 animate-spin" />
            Loading collections...
          </div>
        ) : !companyId ? (
          <div className="flex min-h-40 items-center justify-center text-muted-foreground">
            No company selected.
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-40 items-center justify-center text-muted-foreground">
            No collections found.
          </div>
        ) : (
          <SortableTableProvider items={items} onReorder={setItems}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Linked</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <SortableTableBody itemIds={items.map((item) => item.id)}>
                {items.map((item) => (
                  <SortableTableRow
                    key={item.id}
                    id={item.id}
                    className="data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
                  >
                    <SortableTableDragHandle />
                    <TableCell className="whitespace-normal">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-muted-foreground">{item.slug}</div>
                    </TableCell>
                    <TableCell>{formatPrice(item.price_amount, item.currency)}</TableCell>
                    <TableCell>{item.category?.name || item.category_id || "Uncategorized"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{item.images.length} images</Badge>
                        <Badge variant="outline">{item.products.length} products</Badge>
                        <Badge variant="outline">{item.feedback_entries.length} feedback</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.is_active ? "default" : "outline"}>
                        {item.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatTimestamp(item.updated_at)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => startEditing(item)}>
                          <PencilIcon />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setPendingDelete(item)}
                          disabled={deletingId === item.id}
                        >
                          {deletingId === item.id ? (
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
              {mode === "edit" ? "Edit collection" : "Create collection"}
            </DialogTitle>
            <DialogDescription>
              Collections link to collection categories and multiple products.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4 px-4 pb-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="collection-name">Name</Label>
                <Input
                  id="collection-name"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="collection-slug">Slug</Label>
                <Input
                  id="collection-slug"
                  value={form.slug}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, slug: event.target.value }))
                  }
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="collection-price">Price amount</Label>
                <Input
                  id="collection-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price_amount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      price_amount: event.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="collection-currency">Currency</Label>
                <Input
                  id="collection-currency"
                  value={form.currency}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      currency: event.target.value.toUpperCase(),
                    }))
                  }
                  maxLength={3}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Collection category</Label>
              <Select
                value={form.category_id || "__none__"}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    category_id: value === "__none__" ? "" : value,
                  }))
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
              <Label htmlFor="collection-description">Description</Label>
              <Input
                id="collection-description"
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="collection-ritual">Ritual</Label>
              <RichTextEditor
                id="collection-ritual"
                value={form.ritual}
                onChange={(value) =>
                  setForm((current) => ({ ...current, ritual: value }))
                }
                placeholder="Describe the ritual for this collection..."
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Images</Label>
                <Button type="button" variant="outline" size="sm" onClick={addImage}>
                  <PlusIcon />
                  Add image
                </Button>
              </div>
              <div className="space-y-3">
                {form.images.map((image, index) => (
                  <div key={`collection-image-${index}`} className="grid gap-3 border border-border p-3">
                    <Input
                      value={image.image_url}
                      onChange={(event) =>
                        updateImage(index, "image_url", event.target.value)
                      }
                      placeholder="Image URL"
                    />
                    <Input
                      value={image.alt_text}
                      onChange={(event) =>
                        updateImage(index, "alt_text", event.target.value)
                      }
                      placeholder="Alt text"
                    />
                    <div className="flex justify-end">
                      <Button type="button" variant="outline" size="sm" onClick={() => removeImage(index)}>
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Products in collection</Label>
              <div className="grid gap-2 border border-border p-3">
                {products.map((product) => (
                  <label key={product.id} className="flex items-center gap-3">
                    <Checkbox
                      checked={form.product_ids.includes(product.id)}
                      onCheckedChange={() => toggleProductSelection(product.id)}
                    />
                    <span className="text-xs">
                      {product.name}
                      <span className="ml-2 text-muted-foreground">{product.slug}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-3 border border-border px-3 py-2">
              <Checkbox
                checked={form.is_active}
                onCheckedChange={(checked) =>
                  setForm((current) => ({ ...current, is_active: checked === true }))
                }
              />
              <span className="text-xs">Is active</span>
            </label>

            <DialogFooter className="px-0 pb-0">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader className="animate-spin" /> : null}
                {mode === "edit" ? "Update collection" : "Create collection"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && deletingId === null) {
            setPendingDelete(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete collection?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {pendingDelete?.name || "this collection"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingId !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deletingId !== null}
              onClick={() => {
                void confirmDelete()
              }}
            >
              {deletingId !== null ? <Loader className="animate-spin" /> : <Trash2Icon />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
