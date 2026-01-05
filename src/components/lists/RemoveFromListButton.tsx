"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X, Loader2 } from "lucide-react";

interface RemoveFromListButtonProps {
  listId: string;
  modelId: string;
  modelName: string;
}

export function RemoveFromListButton({ listId, modelId, modelName }: RemoveFromListButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleRemove = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/lists/${listId}/items?modelId=${modelId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to remove from list");
      }

      toast.success(`Removed ${modelName} from list`);
      router.refresh();
    } catch (error) {
      toast.error("Failed to remove from list");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleRemove}
      disabled={loading}
      className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <X className="h-4 w-4" />
      )}
    </button>
  );
}
