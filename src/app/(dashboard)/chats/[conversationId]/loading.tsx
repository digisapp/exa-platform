import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function ConversationLoading() {
  return (
    <div className="flex flex-col h-full">
      {/* Conversation header */}
      <div className="flex items-center gap-3 p-4 border-b border-violet-500/10">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      {/* Message bubbles */}
      <div className="flex-1 overflow-hidden p-4 space-y-4">
        {[64, 44, 56, 36, 60, 48].map((w, i) => (
          <div key={i} className={cn("flex", i % 2 ? "justify-end" : "justify-start")}>
            <Skeleton
              className={cn("h-10 rounded-2xl", i % 2 ? "rounded-br-md" : "rounded-bl-md")}
              style={{ width: `${w}%`, maxWidth: "20rem" }}
            />
          </div>
        ))}
      </div>
      {/* Composer */}
      <div className="p-4 border-t border-violet-500/10">
        <Skeleton className="h-12 w-full rounded-full" />
      </div>
    </div>
  );
}
