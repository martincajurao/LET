
"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { Copy, Check } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1 pr-8">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            <div className="flex items-center gap-2">
              {props.variant === "destructive" && (
                <ToastCopyAction title={title} description={description} />
              )}
              {action}
            </div>
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}

function ToastCopyAction({ title, description }: { title?: React.ReactNode; description?: React.ReactNode }) {
  const [copied, setCopied] = useState(false)

  const onCopy = () => {
    const t = typeof title === 'string' ? title : '';
    const d = typeof description === 'string' ? description : '';
    const text = `${t}${t && d ? ': ' : ''}${d}`;
    
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 shrink-0 opacity-50 hover:opacity-100 group-[.destructive]:text-red-100 group-[.destructive]:hover:text-white"
      onClick={onCopy}
      title="Copy error message"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  )
}
