"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, ChevronUp } from "lucide-react";

const INITIAL_COUNT = 8;

interface Model {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  profile_photo_url: string;
}

export function ModelGrid({ models }: { models: Model[] }) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = models.length > INITIAL_COUNT;
  const visible = expanded ? models : models.slice(0, INITIAL_COUNT);

  return (
    <div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
        {visible.map((model) => (
          <Link
            key={model.id}
            href={`/${model.username}`}
            target="_blank"
            className="group block"
          >
            <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-muted">
              <Image
                src={model.profile_photo_url}
                alt={model.first_name || model.username}
                fill
                sizes="(max-width: 768px) 33vw, 12.5vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-2">
                <p className="text-white text-[10px] font-semibold truncate">
                  {model.first_name
                    ? `${model.first_name} ${model.last_name || ""}`.trim()
                    : model.username}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center mt-6">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-sm font-medium text-muted-foreground hover:text-white transition-colors"
          >
            {expanded ? (
              <>
                Show Less <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                See All {models.length} Models <ChevronDown className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
