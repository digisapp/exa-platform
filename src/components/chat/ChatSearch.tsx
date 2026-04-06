"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Loader2, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

interface SearchResult {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  media_type: string | null;
  created_at: string;
}

interface ChatSearchProps {
  onClose: () => void;
  conversationId?: string;
}

export function ChatSearch({ onClose, conversationId }: ChatSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const doSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setTotal(0);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const params = new URLSearchParams({ q: searchQuery.trim(), limit: "20" });
      if (conversationId) params.set("conversationId", conversationId);

      const res = await fetch(`/api/messages/search?${params}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.messages || []);
        setTotal(data.total || 0);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  const handleChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  };

  const handleResultClick = (result: SearchResult) => {
    router.push(`/chats/${result.conversation_id}`);
    onClose();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search header */}
      <div className="flex items-center gap-2 p-3 border-b">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            placeholder="Search messages..."
            className="pl-10 h-10"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
          />
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && hasSearched && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No messages found for &quot;{query}&quot;</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="divide-y">
            {total > 0 && (
              <p className="px-4 py-2 text-xs text-muted-foreground">
                {total} result{total !== 1 ? "s" : ""} found
              </p>
            )}
            {results.map((result) => (
              <button
                key={result.id}
                onClick={() => handleResultClick(result)}
                className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm line-clamp-2">
                      {highlightMatch(result.content || "", query)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(result.created_at), "MMM d, yyyy · h:mm a")}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {!loading && !hasSearched && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="h-8 w-8 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">Search across your messages</p>
          </div>
        )}
      </div>
    </div>
  );
}

/** Highlight matching text in search results */
function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-pink-500/20 text-foreground rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  );
}
