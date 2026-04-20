"use client"

import * as React from "react"
import {
  ImageIcon,
  Loader,
  PencilIcon,
  PlusIcon,
  RefreshCcwIcon,
  Trash2Icon,
} from "lucide-react"
import Image from "next/image"
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
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import {
  deleteCatalogImageFile,
  uploadCatalogImageFile,
  type CatalogImageScope,
} from "@/features/catalog/lib/catalog-image-upload"
import { LoadItems } from "../services/services"

type Category = {
  id: string
  name: string
  slug: string
  image_url: string
  created_at?: string | null
}

type CategoryManagementProps = {
  endpoint: string
  title: string
  description: string
}

type CategoryFormState = {
  name: string
  slug: string
  image_url: string
  file: File | null
  preview_url: string | null
}

const emptyFormState: CategoryFormState = {
  name: "",
  slug: "",
  image_url: "",
  file: null,
  preview_url: null,
}

function getCategoryStorageKey(endpoint: string, companyId: string) {
  return `catalog-row-order:${endpoint}:${companyId}`
}

function getString(value: unknown) {
  return typeof value === "string" ? value : ""
}

function normalizeCategory(value: unknown): Category {
  const category = value as Record<string, unknown>

  return {
    id: getString(category.id),
    name: getString(category.name),
    slug: getString(category.slug),
    image_url: getString(category.image_url),
    created_at: getString(category.created_at) || null,
  }
}

function revokePreviewUrl(url?: string | null) {
  if (url?.startsWith("blob:")) {
    URL.revokeObjectURL(url)
  }
}

function getUploadScope(endpoint: string): CatalogImageScope {
  if (endpoint.includes("product-categories")) {
    return "product-categories"
  }

  return "collection-categories"
}

function extractCategories(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload.map(normalizeCategory)
  }

  if (payload && typeof payload === "object") {
    const response = payload as { items?: unknown; data?: unknown }
    const source = Array.isArray(response.items)
      ? response.items
      : Array.isArray(response.data)
        ? response.data
        : []

    return source.map(normalizeCategory)
  }

  return [] as Category[]
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

export function CategoryManagement({
  endpoint,
  title,
  description,
}: CategoryManagementProps) {
  const { currentCompany } = useAuth()
  const companyId = currentCompany?.id ?? ""
  const storageKey = React.useMemo(
    () => getCategoryStorageKey(endpoint, companyId || "no-company"),
    [companyId, endpoint]
  )
  const [items, setItems] = React.useState<Category[]>([])
  const [form, setForm] = React.useState<CategoryFormState>(emptyFormState)
  const [mode, setMode] = React.useState<"create" | "edit">("create")
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = React.useState<Category | null>(
    null
  )
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const uploadScope = React.useMemo(() => getUploadScope(endpoint), [endpoint])

  const loadItems = React.useCallback(
    async (initialLoad = false) => {
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

        const payload = await LoadItems(endpoint, companyId)
        setItems(applyStoredRowOrder(extractCategories(payload), storageKey))
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
    [companyId, endpoint, storageKey]
  )

  React.useEffect(() => {
    void loadItems(true)
  }, [loadItems])

  usePersistedRowOrder(storageKey, items, !isLoading)

  function resetForm() {
    revokePreviewUrl(form.preview_url)
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

  function startEditing(item: Category) {
    revokePreviewUrl(form.preview_url)
    setMode("edit")
    setEditingId(item.id)
    setForm({
      name: item.name,
      slug: item.slug,
      image_url: item.image_url,
      file: null,
      preview_url: null,
    })
    setError(null)
    setIsDialogOpen(true)
  }

  function selectImageFile(file: File | null) {
    setForm((current) => {
      revokePreviewUrl(current.preview_url)

      return {
        ...current,
        file,
        preview_url: file ? URL.createObjectURL(file) : null,
      }
    })
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    let uploadedPath: string | null = null

    try {
      setError(null)
      setIsSubmitting(true)
      let imageUrl = form.image_url.trim()

      if (form.file) {
        const upload = await uploadCatalogImageFile({
          companyId,
          file: form.file,
          scope: uploadScope,
        })

        uploadedPath = upload.path
        imageUrl = upload.url
      }

      const payload = {
        company_id: companyId,
        name: form.name.trim(),
        slug: form.slug.trim(),
        image_url: imageUrl || null,
      }

      const isEditing = mode === "edit" && editingId
      const response = await authFetch(
        isEditing ? `${endpoint}/${editingId}` : endpoint,
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

      toast.success(isEditing ? `${title} updated.` : `${title} created.`)
      closeDialog()
      await loadItems(false)
    } catch (error) {
      if (uploadedPath) {
        await Promise.allSettled([
          deleteCatalogImageFile({
            companyId,
            path: uploadedPath,
          }),
        ])
      }

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

      const response = await authFetch(`${endpoint}/${pendingDelete.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error(await readErrorMessage(response))
      }

      setPendingDelete(null)
      toast.success(`${title} deleted.`)
      await loadItems(false)
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
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openCreateDialog}>
            <PlusIcon />
            New
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              void loadItems(false)
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
            Loading...
          </div>
        ) : !companyId ? (
          <div className="flex min-h-40 items-center justify-center text-muted-foreground">
            No company selected.
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-40 items-center justify-center text-muted-foreground">
            No categories found.
          </div>
        ) : (
          <SortableTableProvider items={items} onReorder={setItems}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead className="w-16">Photo</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Created</TableHead>
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
                    <TableCell>
                      {item.image_url ? (
                        <div className="border border-border p-1">
                          <Image
                            src={item.image_url}
                            alt={item.name}
                            width={40}
                            height={40}
                            unoptimized
                            className="size-10 object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex size-10 items-center justify-center border border-dashed border-border text-muted-foreground">
                          <ImageIcon className="size-3" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.slug}
                    </TableCell>
                    <TableCell>{formatTimestamp(item.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEditing(item)}
                        >
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {mode === "edit" ? `Edit ${title}` : `Create ${title}`}
            </DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <form className="space-y-4 px-4 pb-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor={`${title}-name`}>Name</Label>
              <Input
                id={`${title}-name`}
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${title}-slug`}>Slug</Label>
              <Input
                id={`${title}-slug`}
                value={form.slug}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    slug: event.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor={`${title}-image-file`}>Photo</Label>
                <Input
                  id={`${title}-image-file`}
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    setError(null)
                    selectImageFile(event.target.files?.[0] ?? null)
                    event.target.value = ""
                  }}
                  disabled={isSubmitting}
                />
                {form.file ? (
                  <p className="text-[11px] text-muted-foreground">
                    Selected file: {form.file.name}. It will upload on save.
                  </p>
                ) : null}
              </div>
              {form.preview_url || form.image_url ? (
                <div className="space-y-2">
                  <Label>Preview</Label>
                  <div className="border border-border p-2">
                    <Image
                      src={form.preview_url || form.image_url}
                      alt={form.name || `${title} preview`}
                      width={1200}
                      height={1200}
                      unoptimized
                      className="max-h-48 w-full object-contain"
                    />
                  </div>
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor={`${title}-image-url`}>Photo URL</Label>
                <Input
                  id={`${title}-image-url`}
                  value={form.image_url}
                  onChange={(event) =>
                    setForm((current) => {
                      if (current.file) {
                        revokePreviewUrl(current.preview_url)
                      }

                      return {
                        ...current,
                        image_url: event.target.value,
                        file: null,
                        preview_url: null,
                      }
                    })
                  }
                  placeholder="https://..."
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <DialogFooter className="px-0 pb-0">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader className="animate-spin" /> : null}
                {mode === "edit" ? "Update" : "Create"}
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
            <AlertDialogTitle>Delete {title}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {pendingDelete?.name || "this item"}.
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
    </Card>
  )
}
