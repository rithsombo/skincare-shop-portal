"use client"

import * as React from "react"
import {
  BoldIcon,
  ItalicIcon,
  ListIcon,
  ListOrderedIcon,
  RedoIcon,
  RemoveFormattingIcon,
  UndoIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type RichTextEditorProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function isLikelyHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value)
}

function toEditorHtml(value: string) {
  if (!value.trim()) {
    return ""
  }

  if (isLikelyHtml(value)) {
    return value
  }

  return escapeHtml(value).replaceAll("\n", "<br>")
}

export function RichTextEditor({
  id,
  value,
  onChange,
  placeholder,
  className,
}: RichTextEditorProps) {
  const editorRef = React.useRef<HTMLDivElement>(null)
  const lastAppliedValueRef = React.useRef<string>("")

  React.useEffect(() => {
    const editor = editorRef.current
    if (!editor) {
      return
    }

    const nextHtml = toEditorHtml(value)
    if (lastAppliedValueRef.current === nextHtml) {
      return
    }

    editor.innerHTML = nextHtml
    lastAppliedValueRef.current = nextHtml
  }, [value])

  function emitChange() {
    const editor = editorRef.current
    if (!editor) {
      return
    }

    const nextValue = editor.innerHTML
    lastAppliedValueRef.current = nextValue
    onChange(nextValue)
  }

  function runCommand(command: string) {
    const editor = editorRef.current
    if (!editor) {
      return
    }

    editor.focus()
    document.execCommand(command)
    emitChange()
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-none border border-input bg-transparent",
        className
      )}
    >
      <div className="flex flex-wrap gap-1 border-b border-border p-2">
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          onClick={() => runCommand("bold")}
        >
          <BoldIcon />
          <span className="sr-only">Bold</span>
        </Button>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          onClick={() => runCommand("italic")}
        >
          <ItalicIcon />
          <span className="sr-only">Italic</span>
        </Button>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          onClick={() => runCommand("insertUnorderedList")}
        >
          <ListIcon />
          <span className="sr-only">Bulleted list</span>
        </Button>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          onClick={() => runCommand("insertOrderedList")}
        >
          <ListOrderedIcon />
          <span className="sr-only">Numbered list</span>
        </Button>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          onClick={() => runCommand("undo")}
        >
          <UndoIcon />
          <span className="sr-only">Undo</span>
        </Button>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          onClick={() => runCommand("redo")}
        >
          <RedoIcon />
          <span className="sr-only">Redo</span>
        </Button>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          onClick={() => runCommand("removeFormat")}
        >
          <RemoveFormattingIcon />
          <span className="sr-only">Clear formatting</span>
        </Button>
      </div>
      <div
        id={id}
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        className={cn(
          "min-h-32 px-3 py-2 text-xs outline-none empty:before:pointer-events-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)] [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5"
        )}
        onInput={emitChange}
      />
    </div>
  )
}
