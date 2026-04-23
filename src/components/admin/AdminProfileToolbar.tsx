"use client";

import Link from "next/link";
import { Pencil, Settings } from "lucide-react";

interface AdminProfileToolbarProps {
  modelId: string;
}

export function AdminProfileToolbar({ modelId }: AdminProfileToolbarProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2">
      <Link
        href={`/admin/models/${modelId}`}
        className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 text-white text-sm font-medium shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 hover:scale-105 transition-all"
      >
        <Pencil className="h-4 w-4" />
        Admin Edit
      </Link>
    </div>
  );
}
