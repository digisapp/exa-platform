"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4 text-emerald-400" />,
        info: <InfoIcon className="size-4 text-cyan-400" />,
        warning: <TriangleAlertIcon className="size-4 text-amber-400" />,
        error: <OctagonXIcon className="size-4 text-rose-400" />,
        loading: <Loader2Icon className="size-4 animate-spin text-pink-400" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast bg-[#120a24]/95 backdrop-blur-xl border border-violet-500/30 text-white shadow-2xl shadow-violet-500/10 rounded-xl",
          title: "text-white font-semibold",
          description: "text-white/70",
          actionButton:
            "!bg-gradient-to-r !from-pink-500 !to-violet-500 !text-white !shadow-[0_0_12px_rgba(236,72,153,0.4)]",
          cancelButton: "!bg-white/10 !text-white/80 hover:!bg-white/20",
          closeButton:
            "!bg-white/5 !text-white/60 !border-white/10 hover:!bg-white/10",
          success:
            "!border-emerald-500/40 !shadow-emerald-500/10",
          error:
            "!border-rose-500/40 !shadow-rose-500/10",
          warning:
            "!border-amber-500/40 !shadow-amber-500/10",
          info:
            "!border-cyan-500/40 !shadow-cyan-500/10",
        },
      }}
      style={
        {
          "--normal-bg": "rgba(18, 10, 36, 0.95)",
          "--normal-text": "#ffffff",
          "--normal-border": "rgba(139, 92, 246, 0.3)",
          "--border-radius": "0.75rem",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
