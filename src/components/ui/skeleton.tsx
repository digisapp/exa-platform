import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "animate-pulse rounded-lg bg-gradient-to-br from-pink-500/10 via-violet-500/10 to-cyan-500/10",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
