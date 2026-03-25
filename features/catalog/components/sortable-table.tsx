"use client"

import * as React from "react"
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVerticalIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { TableBody, TableCell, TableRow } from "@/components/ui/table"

type SortableItem = {
  id: UniqueIdentifier
}

function useIsHydrated() {
  const [isHydrated, setIsHydrated] = React.useState(false)

  React.useEffect(() => {
    setIsHydrated(true)
  }, [])

  return isHydrated
}

function normalizeStoredIds(value: unknown) {
  if (!Array.isArray(value)) {
    return null
  }

  return value.map((item) => String(item))
}

export function applyStoredRowOrder<T extends SortableItem>(
  items: T[],
  storageKey: string
) {
  if (typeof window === "undefined") {
    return items
  }

  try {
    const storedValue = window.localStorage.getItem(storageKey)

    if (!storedValue) {
      return items
    }

    const storedIds = normalizeStoredIds(JSON.parse(storedValue))

    if (!storedIds) {
      return items
    }

    const order = new Map(storedIds.map((id, index) => [id, index]))

    return [...items].sort((left, right) => {
      const leftIndex = order.get(String(left.id))
      const rightIndex = order.get(String(right.id))

      if (leftIndex === undefined && rightIndex === undefined) {
        return 0
      }

      if (leftIndex === undefined) {
        return 1
      }

      if (rightIndex === undefined) {
        return -1
      }

      return leftIndex - rightIndex
    })
  } catch {
    return items
  }
}

export function usePersistedRowOrder<T extends SortableItem>(
  storageKey: string,
  items: T[],
  enabled = true
) {
  React.useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return
    }

    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify(items.map((item) => String(item.id)))
      )
    } catch {
      return
    }
  }, [enabled, items, storageKey])
}

type SortableTableContextValue = {
  attributes: ReturnType<typeof useSortable>["attributes"]
  listeners: ReturnType<typeof useSortable>["listeners"]
  setActivatorNodeRef: ReturnType<typeof useSortable>["setActivatorNodeRef"]
}

const SortableTableContext =
  React.createContext<SortableTableContextValue | null>(null)

export function SortableTableBody<T extends SortableItem>({
  itemIds,
  children,
  className,
}: {
  itemIds: T["id"][]
  children: React.ReactNode
  className?: string
}) {
  const isHydrated = useIsHydrated()

  if (!isHydrated) {
    return <TableBody className={className}>{children}</TableBody>
  }

  return (
    <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
      <TableBody className={className}>{children}</TableBody>
    </SortableContext>
  )
}

export function SortableTableProvider<T extends SortableItem>({
  items,
  onReorder,
  children,
}: {
  items: T[]
  onReorder: (items: T[]) => void
  children: React.ReactNode
}) {
  const isHydrated = useIsHydrated()
  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const itemIds = React.useMemo(() => items.map((item) => item.id), [items])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = itemIds.indexOf(active.id)
    const newIndex = itemIds.indexOf(over.id)

    if (oldIndex < 0 || newIndex < 0) {
      return
    }

    onReorder(arrayMove(items, oldIndex, newIndex))
  }

  if (!isHydrated) {
    return <>{children}</>
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
      sensors={sensors}
    >
      {children}
    </DndContext>
  )
}

export function SortableTableRow({
  id,
  children,
  className,
  ...props
}: React.ComponentProps<typeof TableRow> & {
  id: UniqueIdentifier
}) {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const isHydrated = useIsHydrated()

  if (!isHydrated) {
    return (
      <TableRow className={className} {...props}>
        {children}
      </TableRow>
    )
  }

  return (
    <SortableTableContext.Provider
      value={{ attributes, listeners, setActivatorNodeRef }}
    >
      <TableRow
        ref={setNodeRef}
        data-dragging={isDragging}
        className={className}
        style={{
          transform: CSS.Transform.toString(transform),
          transition,
          ...(props.style ?? {}),
        }}
        {...props}
      >
        {children}
      </TableRow>
    </SortableTableContext.Provider>
  )
}

export function SortableTableDragHandle({
  label = "Drag to reorder row",
}: {
  label?: string
}) {
  const isHydrated = useIsHydrated()
  const context = React.useContext(SortableTableContext)

  if (!isHydrated) {
    return (
      <TableCell className="w-10">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground"
        >
          <GripVerticalIcon className="size-4" />
          <span className="sr-only">{label}</span>
        </Button>
      </TableCell>
    )
  }

  if (!context) {
    throw new Error(
      "SortableTableDragHandle must be rendered inside SortableTableRow."
    )
  }

  return (
    <TableCell className="w-10">
      <Button
        ref={context.setActivatorNodeRef}
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 cursor-grab text-muted-foreground active:cursor-grabbing"
        {...context.attributes}
        {...context.listeners}
      >
        <GripVerticalIcon className="size-4" />
        <span className="sr-only">{label}</span>
      </Button>
    </TableCell>
  )
}
