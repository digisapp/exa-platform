import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Synthwave default — translucent bg, white/10 border, white text
        "file:text-white placeholder:text-white/40 selection:bg-pink-500/30 selection:text-white",
        "h-9 w-full min-w-0 rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-base text-white shadow-xs transition-[color,box-shadow,border-color] outline-none",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        // Neon pink focus glow
        "focus-visible:border-pink-400/60 focus-visible:ring-pink-500/20 focus-visible:ring-[3px] focus-visible:shadow-[0_0_16px_rgba(236,72,153,0.25)]",
        // Error / invalid
        "aria-invalid:border-rose-500/60 aria-invalid:ring-rose-500/30 aria-invalid:focus-visible:ring-rose-500/30",
        className
      )}
      {...props}
    />
  )
}

export { Input }
