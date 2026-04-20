import type { SupabaseClient } from "@supabase/supabase-js"

import { getCurrentAccessToken } from "@/features/auth/lib/request-auth-context"
import { ApiError } from "@/lib/api-response"
import { createRouteSupabaseClient } from "@/lib/supabase"

type JsonRecord = Record<string, unknown>

const CATEGORY_SELECT = "id, name, slug, image_url, created_at"

const FEEDBACK_SELECT = `
  id,
  product_id,
  collection_id,
  title,
  note,
  image_url,
  source_type,
  sort_order,
  is_active,
  created_at
`

const CONTACT_CHANNEL_SELECT = `
  id,
  type,
  label,
  handle,
  url,
  is_primary,
  is_active,
  sort_order,
  created_at
`

const PRODUCT_SELECT = `
  id,
  slug,
  name,
  description,
  how_to_use,
  price_amount,
  currency,
  category_id,
  has_set_option,
  is_active,
  created_at,
  updated_at,
  category:product_categories!products_category_id_fkey(
    id,
    name,
    slug,
    created_at
  ),
  images:product_images(
    id,
    image_url,
    alt_text,
    sort_order,
    created_at
  ),
  ingredients:product_ingredients(
    id,
    ingredient,
    sort_order,
    created_at
  ),
  feedback_entries:feedback_entries!feedback_entries_product_id_fkey(
    id,
    title,
    note,
    image_url,
    source_type,
    sort_order,
    is_active,
    created_at
  )
`

const COLLECTION_SELECT = `
  id,
  slug,
  name,
  description,
  ritual,
  price_amount,
  currency,
  category_id,
  is_active,
  created_at,
  updated_at,
  category:collection_categories!collections_category_id_fkey(
    id,
    name,
    slug,
    created_at
  ),
  images:collection_images(
    id,
    image_url,
    alt_text,
    sort_order,
    created_at
  ),
  products:collection_products(
    id,
    product_id,
    sort_order,
    created_at,
    product:products!collection_products_product_id_fkey(
      id,
      slug,
      name,
      price_amount,
      currency,
      is_active
    )
  ),
  feedback_entries:feedback_entries!feedback_entries_collection_id_fkey(
    id,
    title,
    note,
    image_url,
    source_type,
    sort_order,
    is_active,
    created_at
  )
`

function getClient() {
  return createRouteSupabaseClient(getCurrentAccessToken())
}

function toApiError(error: { message: string }, fallbackMessage: string) {
  return new ApiError(error.message || fallbackMessage, 400, error)
}

function requireString(
  record: JsonRecord,
  key: string,
  label = key,
  allowEmpty = false
) {
  const value = record[key]

  if (typeof value !== "string") {
    throw new ApiError(`${label} must be a string.`, 400)
  }

  const normalized = value.trim()
  if (!allowEmpty && !normalized) {
    throw new ApiError(`${label} is required.`, 400)
  }

  return normalized
}

function optionalString(record: JsonRecord, key: string) {
  const value = record[key]
  if (value === undefined) {
    return undefined
  }

  if (value === null || value === "") {
    return null
  }

  if (typeof value !== "string") {
    throw new ApiError(`${key} must be a string.`, 400)
  }

  return value.trim()
}

function optionalNumber(record: JsonRecord, key: string) {
  const value = record[key]
  if (value === undefined) {
    return undefined
  }

  const numberValue =
    typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN

  if (!Number.isFinite(numberValue)) {
    throw new ApiError(`${key} must be a number.`, 400)
  }

  return numberValue
}

function optionalBoolean(record: JsonRecord, key: string) {
  const value = record[key]
  if (value === undefined) {
    return undefined
  }

  if (typeof value !== "boolean") {
    throw new ApiError(`${key} must be a boolean.`, 400)
  }

  return value
}

function optionalUuid(record: JsonRecord, key: string) {
  const value = record[key]
  if (value === undefined) {
    return undefined
  }

  if (value === null || value === "") {
    return null
  }

  if (typeof value !== "string") {
    throw new ApiError(`${key} must be a string UUID.`, 400)
  }

  return value
}

function ensureArray(value: unknown, key: string) {
  if (!Array.isArray(value)) {
    throw new ApiError(`${key} must be an array.`, 400)
  }

  return value
}

function ensureObject(value: unknown, key: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(`${key} must be an object.`, 400)
  }

  return value as JsonRecord
}

function buildCategoryPayload(record: JsonRecord, partial = false) {
  const payload: Record<string, unknown> = {}

  if ("company_id" in record) {
    payload.company_id = optionalUuid(record, "company_id")
  }

  if ("name" in record) {
    payload.name = requireString(record, "name")
  }

  if ("slug" in record) {
    payload.slug = requireString(record, "slug")
  }

  if ("image_url" in record) {
    payload.image_url = optionalString(record, "image_url")
  }

  if (!partial) {
    if (!("company_id" in payload) || payload.company_id === null) {
      throw new ApiError("company_id is required.", 400)
    }
    if (!("name" in payload)) {
      throw new ApiError("name is required.", 400)
    }
    if (!("slug" in payload)) {
      throw new ApiError("slug is required.", 400)
    }
  }

  return payload
}

function buildProductPayload(record: JsonRecord, partial = false) {
  const payload: Record<string, unknown> = {}

  if ("company_id" in record) {
    payload.company_id = optionalUuid(record, "company_id")
  }

  if ("slug" in record) {
    payload.slug = requireString(record, "slug")
  }

  if ("name" in record) {
    payload.name = requireString(record, "name")
  }

  if ("description" in record) {
    payload.description = requireString(record, "description", "description", true)
  }

  if ("how_to_use" in record) {
    payload.how_to_use = requireString(record, "how_to_use", "how_to_use", true)
  }

  if ("price_amount" in record) {
    const priceAmount = optionalNumber(record, "price_amount")
    if (priceAmount === undefined || priceAmount < 0) {
      throw new ApiError("price_amount must be a non-negative number.", 400)
    }
    payload.price_amount = priceAmount
  }

  if ("currency" in record) {
    payload.currency = requireString(record, "currency").toUpperCase()
  }

  if ("category_id" in record) {
    payload.category_id = optionalUuid(record, "category_id")
  }

  if ("has_set_option" in record) {
    payload.has_set_option = optionalBoolean(record, "has_set_option")
  }

  if ("is_active" in record) {
    payload.is_active = optionalBoolean(record, "is_active")
  }

  if (!partial) {
    for (const key of [
      "company_id",
      "slug",
      "name",
      "description",
      "how_to_use",
      "price_amount",
      "currency",
    ]) {
      if (!(key in payload)) {
        throw new ApiError(`${key} is required.`, 400)
      }
    }
  }

  return payload
}

function buildCollectionPayload(record: JsonRecord, partial = false) {
  const payload: Record<string, unknown> = {}

  if ("company_id" in record) {
    payload.company_id = optionalUuid(record, "company_id")
  }

  if ("slug" in record) {
    payload.slug = requireString(record, "slug")
  }

  if ("name" in record) {
    payload.name = requireString(record, "name")
  }

  if ("description" in record) {
    payload.description = requireString(record, "description", "description", true)
  }

  if ("ritual" in record) {
    payload.ritual = requireString(record, "ritual", "ritual", true)
  }

  if ("price_amount" in record) {
    const priceAmount = optionalNumber(record, "price_amount")
    if (priceAmount === undefined || priceAmount < 0) {
      throw new ApiError("price_amount must be a non-negative number.", 400)
    }
    payload.price_amount = priceAmount
  }

  if ("currency" in record) {
    payload.currency = requireString(record, "currency").toUpperCase()
  }

  if ("category_id" in record) {
    payload.category_id = optionalUuid(record, "category_id")
  }

  if ("is_active" in record) {
    payload.is_active = optionalBoolean(record, "is_active")
  }

  if (!partial) {
    for (const key of [
      "company_id",
      "slug",
      "name",
      "description",
      "ritual",
      "price_amount",
      "currency",
    ]) {
      if (!(key in payload)) {
        throw new ApiError(`${key} is required.`, 400)
      }
    }
  }

  return payload
}

function buildFeedbackPayload(record: JsonRecord, partial = false) {
  const payload: Record<string, unknown> = {}

  if ("company_id" in record) {
    payload.company_id = optionalUuid(record, "company_id")
  }

  if ("product_id" in record) {
    payload.product_id = optionalUuid(record, "product_id")
  }

  if ("collection_id" in record) {
    payload.collection_id = optionalUuid(record, "collection_id")
  }

  if ("title" in record) {
    payload.title = requireString(record, "title")
  }

  if ("note" in record) {
    payload.note = requireString(record, "note", "note", true)
  }

  if ("image_url" in record) {
    payload.image_url = requireString(record, "image_url")
  }

  if ("source_type" in record) {
    payload.source_type = requireString(record, "source_type")
  }

  if ("sort_order" in record) {
    payload.sort_order = optionalNumber(record, "sort_order")
  }

  if ("is_active" in record) {
    payload.is_active = optionalBoolean(record, "is_active")
  }

  if (!partial) {
    for (const key of ["company_id", "title", "note", "image_url", "source_type"]) {
      if (!(key in payload)) {
        throw new ApiError(`${key} is required.`, 400)
      }
    }

    const hasProduct = payload.product_id !== null && payload.product_id !== undefined
    const hasCollection =
      payload.collection_id !== null && payload.collection_id !== undefined

    if (hasProduct === hasCollection) {
      throw new ApiError(
        "Exactly one of product_id or collection_id must be provided.",
        400
      )
    }
  }

  return payload
}

function buildContactChannelPayload(record: JsonRecord, partial = false) {
  const payload: Record<string, unknown> = {}

  if ("company_id" in record) {
    payload.company_id = optionalUuid(record, "company_id")
  }

  if ("type" in record) {
    payload.type = requireString(record, "type")
  }

  if ("label" in record) {
    payload.label = requireString(record, "label")
  }

  if ("handle" in record) {
    payload.handle = optionalString(record, "handle")
  }

  if ("url" in record) {
    payload.url = requireString(record, "url")
  }

  if ("is_primary" in record) {
    payload.is_primary = optionalBoolean(record, "is_primary")
  }

  if ("is_active" in record) {
    payload.is_active = optionalBoolean(record, "is_active")
  }

  if ("sort_order" in record) {
    payload.sort_order = optionalNumber(record, "sort_order")
  }

  if (!partial) {
    for (const key of ["company_id", "type", "label", "url"]) {
      if (!(key in payload)) {
        throw new ApiError(`${key} is required.`, 400)
      }
    }
  }

  return payload
}

function normalizeImages(
  value: unknown,
  foreignKey: "product_id" | "collection_id",
  parentId: string
) {
  return ensureArray(value, "images").map((entry, index) => {
    const row = ensureObject(entry, "images[]")

    return {
      [foreignKey]: parentId,
      image_url: requireString(row, "image_url"),
      alt_text: optionalString(row, "alt_text") ?? null,
      sort_order: optionalNumber(row, "sort_order") ?? index,
    }
  })
}

function normalizeIngredients(value: unknown, productId: string) {
  return ensureArray(value, "ingredients").map((entry, index) => {
    const row = ensureObject(entry, "ingredients[]")

    return {
      product_id: productId,
      ingredient: requireString(row, "ingredient"),
      sort_order: optionalNumber(row, "sort_order") ?? index,
    }
  })
}

function normalizeCollectionProducts(value: unknown, collectionId: string) {
  return ensureArray(value, "products").map((entry, index) => {
    if (typeof entry === "string") {
      return {
        collection_id: collectionId,
        product_id: entry,
        sort_order: index,
      }
    }

    const row = ensureObject(entry, "products[]")
    const productId =
      optionalUuid(row, "product_id") ?? optionalUuid(row, "id")

    if (!productId) {
      throw new ApiError("products[].product_id is required.", 400)
    }

    return {
      collection_id: collectionId,
      product_id: productId,
      sort_order: optionalNumber(row, "sort_order") ?? index,
    }
  })
}

async function replaceProductRelations(
  supabase: SupabaseClient,
  productId: string,
  record: JsonRecord
) {
  if ("images" in record) {
    const { error: deleteImagesError } = await supabase
      .from("product_images")
      .delete()
      .eq("product_id", productId)

    if (deleteImagesError) {
      throw toApiError(deleteImagesError, "Failed to replace product images.")
    }

    const images = normalizeImages(record.images, "product_id", productId)
    if (images.length > 0) {
      const { error: insertImagesError } = await supabase
        .from("product_images")
        .insert(images)

      if (insertImagesError) {
        throw toApiError(insertImagesError, "Failed to save product images.")
      }
    }
  }

  if ("ingredients" in record) {
    const { error: deleteIngredientsError } = await supabase
      .from("product_ingredients")
      .delete()
      .eq("product_id", productId)

    if (deleteIngredientsError) {
      throw toApiError(
        deleteIngredientsError,
        "Failed to replace product ingredients."
      )
    }

    const ingredients = normalizeIngredients(record.ingredients, productId)
    if (ingredients.length > 0) {
      const { error: insertIngredientsError } = await supabase
        .from("product_ingredients")
        .insert(ingredients)

      if (insertIngredientsError) {
        throw toApiError(
          insertIngredientsError,
          "Failed to save product ingredients."
        )
      }
    }
  }
}

async function replaceCollectionRelations(
  supabase: SupabaseClient,
  collectionId: string,
  record: JsonRecord
) {
  if ("images" in record) {
    const { error: deleteImagesError } = await supabase
      .from("collection_images")
      .delete()
      .eq("collection_id", collectionId)

    if (deleteImagesError) {
      throw toApiError(
        deleteImagesError,
        "Failed to replace collection images."
      )
    }

    const images = normalizeImages(record.images, "collection_id", collectionId)
    if (images.length > 0) {
      const { error: insertImagesError } = await supabase
        .from("collection_images")
        .insert(images)

      if (insertImagesError) {
        throw toApiError(
          insertImagesError,
          "Failed to save collection images."
        )
      }
    }
  }

  if ("products" in record) {
    const { error: deleteProductsError } = await supabase
      .from("collection_products")
      .delete()
      .eq("collection_id", collectionId)

    if (deleteProductsError) {
      throw toApiError(
        deleteProductsError,
        "Failed to replace collection products."
      )
    }

    const products = normalizeCollectionProducts(record.products, collectionId)
    if (products.length > 0) {
      const { error: insertProductsError } = await supabase
        .from("collection_products")
        .insert(products)

      if (insertProductsError) {
        throw toApiError(
          insertProductsError,
          "Failed to save collection products."
        )
      }
    }
  }
}

async function getSingleById(
  table: string,
  select: string,
  id: string,
  label: string
) {
  const supabase = getClient()
  const { data, error } = await supabase
    .from(table)
    .select(select)
    .eq("id", id)
    .maybeSingle()

  if (error) {
    throw toApiError(error, `Failed to load ${label}.`)
  }

  if (!data) {
    throw new ApiError(`${label} not found.`, 404)
  }

  return data
}

export async function listProductCategories(companyId: string) {
  const supabase = getClient()
  const { data, error, count } = await supabase
    .from("product_categories")
    .select(CATEGORY_SELECT, { count: "exact" })
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })

  if (error) {
    throw toApiError(error, "Failed to load product categories.")
  }

  return { items: data ?? [], total: count ?? 0 }
}

export async function getProductCategory(id: string) {
  return { item: await getSingleById("product_categories", CATEGORY_SELECT, id, "Product category") }
}

export async function createProductCategory(record: JsonRecord) {
  const supabase = getClient()
  const payload = buildCategoryPayload(record)

  const { data, error } = await supabase
    .from("product_categories")
    .insert(payload)
    .select(CATEGORY_SELECT)
    .single()

  if (error) {
    throw toApiError(error, "Failed to create product category.")
  }

  return { item: data }
}

export async function updateProductCategory(id: string, record: JsonRecord) {
  const supabase = getClient()
  const payload = buildCategoryPayload(record, true)

  const { data, error } = await supabase
    .from("product_categories")
    .update(payload)
    .eq("id", id)
    .select(CATEGORY_SELECT)
    .maybeSingle()

  if (error) {
    throw toApiError(error, "Failed to update product category.")
  }

  if (!data) {
    throw new ApiError("Product category not found.", 404)
  }

  return { item: data }
}

export async function deleteProductCategory(id: string) {
  const supabase = getClient()
  const { error } = await supabase.from("product_categories").delete().eq("id", id)

  if (error) {
    throw toApiError(error, "Failed to delete product category.")
  }

  return { success: true }
}

export async function listCollectionCategories(companyId: string) {
  const supabase = getClient()
  const { data, error, count } = await supabase
    .from("collection_categories")
    .select(CATEGORY_SELECT, { count: "exact" })
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })

  if (error) {
    throw toApiError(error, "Failed to load collection categories.")
  }

  return { items: data ?? [], total: count ?? 0 }
}

export async function getCollectionCategory(id: string) {
  return {
    item: await getSingleById(
      "collection_categories",
      CATEGORY_SELECT,
      id,
      "Collection category"
    ),
  }
}

export async function createCollectionCategory(record: JsonRecord) {
  const supabase = getClient()
  const payload = buildCategoryPayload(record)

  const { data, error } = await supabase
    .from("collection_categories")
    .insert(payload)
    .select(CATEGORY_SELECT)
    .single()

  if (error) {
    throw toApiError(error, "Failed to create collection category.")
  }

  return { item: data }
}

export async function updateCollectionCategory(id: string, record: JsonRecord) {
  const supabase = getClient()
  const payload = buildCategoryPayload(record, true)

  const { data, error } = await supabase
    .from("collection_categories")
    .update(payload)
    .eq("id", id)
    .select(CATEGORY_SELECT)
    .maybeSingle()

  if (error) {
    throw toApiError(error, "Failed to update collection category.")
  }

  if (!data) {
    throw new ApiError("Collection category not found.", 404)
  }

  return { item: data }
}

export async function deleteCollectionCategory(id: string) {
  const supabase = getClient()
  const { error } = await supabase
    .from("collection_categories")
    .delete()
    .eq("id", id)

  if (error) {
    throw toApiError(error, "Failed to delete collection category.")
  }

  return { success: true }
}

export async function listProducts(companyId: string) {
  const supabase = getClient()
  const { data, error, count } = await supabase
    .from("products")
    .select(PRODUCT_SELECT, { count: "exact" })
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })

  if (error) {
    throw toApiError(error, "Failed to load products.")
  }

  return { items: data ?? [], total: count ?? 0 }
}

export async function getProduct(id: string) {
  return { item: await getSingleById("products", PRODUCT_SELECT, id, "Product") }
}

export async function createProduct(record: JsonRecord) {
  const supabase = getClient()
  const payload = buildProductPayload(record)

  const { data, error } = await supabase
    .from("products")
    .insert(payload)
    .select("id")
    .single()

  if (error) {
    throw toApiError(error, "Failed to create product.")
  }

  await replaceProductRelations(supabase, data.id, record)
  return getProduct(data.id)
}

export async function updateProduct(id: string, record: JsonRecord) {
  const supabase = getClient()
  const payload = buildProductPayload(record, true)

  if (Object.keys(payload).length > 0) {
    payload.updated_at = new Date().toISOString()

    const { error } = await supabase
      .from("products")
      .update(payload)
      .eq("id", id)

    if (error) {
      throw toApiError(error, "Failed to update product.")
    }
  }

  await replaceProductRelations(supabase, id, record)
  return getProduct(id)
}

export async function deleteProduct(id: string) {
  const supabase = getClient()
  const { error } = await supabase.from("products").delete().eq("id", id)

  if (error) {
    throw toApiError(error, "Failed to delete product.")
  }

  return { success: true }
}

export async function listCollections(companyId: string) {
  const supabase = getClient()
  const { data, error, count } = await supabase
    .from("collections")
    .select(COLLECTION_SELECT, { count: "exact" })
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })

  if (error) {
    throw toApiError(error, "Failed to load collections.")
  }

  return { items: data ?? [], total: count ?? 0 }
}

export async function getCollection(id: string) {
  return {
    item: await getSingleById("collections", COLLECTION_SELECT, id, "Collection"),
  }
}

export async function createCollection(record: JsonRecord) {
  const supabase = getClient()
  const payload = buildCollectionPayload(record)

  const { data, error } = await supabase
    .from("collections")
    .insert(payload)
    .select("id")
    .single()

  if (error) {
    throw toApiError(error, "Failed to create collection.")
  }

  await replaceCollectionRelations(supabase, data.id, record)
  return getCollection(data.id)
}

export async function updateCollection(id: string, record: JsonRecord) {
  const supabase = getClient()
  const payload = buildCollectionPayload(record, true)

  if (Object.keys(payload).length > 0) {
    payload.updated_at = new Date().toISOString()

    const { error } = await supabase
      .from("collections")
      .update(payload)
      .eq("id", id)

    if (error) {
      throw toApiError(error, "Failed to update collection.")
    }
  }

  await replaceCollectionRelations(supabase, id, record)
  return getCollection(id)
}

export async function deleteCollection(id: string) {
  const supabase = getClient()
  const { error } = await supabase.from("collections").delete().eq("id", id)

  if (error) {
    throw toApiError(error, "Failed to delete collection.")
  }

  return { success: true }
}

export async function listFeedbackEntries(companyId: string) {
  const supabase = getClient()
  const { data, error, count } = await supabase
    .from("feedback_entries")
    .select(FEEDBACK_SELECT, { count: "exact" })
    .eq("company_id", companyId)
    .order("sort_order", { ascending: true })

  if (error) {
    throw toApiError(error, "Failed to load feedback entries.")
  }

  return { items: data ?? [], total: count ?? 0 }
}

export async function getFeedbackEntry(id: string) {
  return {
    item: await getSingleById("feedback_entries", FEEDBACK_SELECT, id, "Feedback entry"),
  }
}

export async function createFeedbackEntry(record: JsonRecord) {
  const supabase = getClient()
  const payload = buildFeedbackPayload(record)

  const { data, error } = await supabase
    .from("feedback_entries")
    .insert(payload)
    .select(FEEDBACK_SELECT)
    .single()

  if (error) {
    throw toApiError(error, "Failed to create feedback entry.")
  }

  return { item: data }
}

export async function updateFeedbackEntry(id: string, record: JsonRecord) {
  const supabase = getClient()
  const payload = buildFeedbackPayload(record, true)

  const { data, error } = await supabase
    .from("feedback_entries")
    .update(payload)
    .eq("id", id)
    .select(FEEDBACK_SELECT)
    .maybeSingle()

  if (error) {
    throw toApiError(error, "Failed to update feedback entry.")
  }

  if (!data) {
    throw new ApiError("Feedback entry not found.", 404)
  }

  return { item: data }
}

export async function deleteFeedbackEntry(id: string) {
  const supabase = getClient()
  const { error } = await supabase.from("feedback_entries").delete().eq("id", id)

  if (error) {
    throw toApiError(error, "Failed to delete feedback entry.")
  }

  return { success: true }
}

export async function listContactChannels(companyId: string) {
  const supabase = getClient()
  const { data, error, count } = await supabase
    .from("contact_channels")
    .select(CONTACT_CHANNEL_SELECT, { count: "exact" })
    .eq("company_id", companyId)
    .order("sort_order", { ascending: true })

  if (error) {
    throw toApiError(error, "Failed to load contact channels.")
  }

  return { items: data ?? [], total: count ?? 0 }
}

export async function getContactChannel(id: string) {
  return {
    item: await getSingleById(
      "contact_channels",
      CONTACT_CHANNEL_SELECT,
      id,
      "Contact channel"
    ),
  }
}

export async function createContactChannel(record: JsonRecord) {
  const supabase = getClient()
  const payload = buildContactChannelPayload(record)

  const { data, error } = await supabase
    .from("contact_channels")
    .insert(payload)
    .select(CONTACT_CHANNEL_SELECT)
    .single()

  if (error) {
    throw toApiError(error, "Failed to create contact channel.")
  }

  return { item: data }
}

export async function updateContactChannel(id: string, record: JsonRecord) {
  const supabase = getClient()
  const payload = buildContactChannelPayload(record, true)

  const { data, error } = await supabase
    .from("contact_channels")
    .update(payload)
    .eq("id", id)
    .select(CONTACT_CHANNEL_SELECT)
    .maybeSingle()

  if (error) {
    throw toApiError(error, "Failed to update contact channel.")
  }

  if (!data) {
    throw new ApiError("Contact channel not found.", 404)
  }

  return { item: data }
}

export async function deleteContactChannel(id: string) {
  const supabase = getClient()
  const { error } = await supabase.from("contact_channels").delete().eq("id", id)

  if (error) {
    throw toApiError(error, "Failed to delete contact channel.")
  }

  return { success: true }
}
