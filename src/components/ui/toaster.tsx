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
import { Copy, Check, Star, Zap, Coins } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        const isReward = props.variant === 'reward';
        const titleStr = typeof title === 'string' ? title.toLowerCase() : '';
        const isXp = titleStr.includes('xp') || titleStr.includes('growth');
        const isCredit = titleStr.includes('credit') || titleStr.includes('refill');

        return (
          <Toast key={id} {...props}>
            <div className="flex gap-4 w-full">
              {isReward && (
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
                  {isXp ? <Zap className="w-5 h-5 fill-current" /> : 
                   isCredit ? <Coins className="w-5 h-5 fill-current text-yellow-300" /> : 
                   <Star className="w-5 h-5 fill-current" />}
                </div>
              )}
              <div className="grid gap-1 pr-8">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
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
