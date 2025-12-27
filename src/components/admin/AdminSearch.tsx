"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, X, Loader2, Coins } from "lucide-react";
import Link from "next/link";

interface SearchResult {
  id: string;
  type: "model" | "fan";
  name: string;
  email: string;
  username?: string;
  coin_balance: number;
  is_approved?: boolean;
  created_at: string;
}

interface AdminSearchProps {
  type: "models" | "fans" | "all";
  placeholder?: string;
}

export function AdminSearch({ type, placeholder }: AdminSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    const debounce = setTimeout(async () => {
      setLoading(true);
      setHasSearched(true);
      const searchResults: SearchResult[] = [];

      if (type === "models" || type === "all") {
        const { data: models } = await supabase
          .from("models")
          .select("id, username, first_name, last_name, email, coin_balance, is_approved, created_at")
          .or(`username.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
          .limit(10) as { data: any[] | null };

        if (models) {
          searchResults.push(
            ...models.map((m) => ({
              id: m.id,
              type: "model" as const,
              name: m.first_name ? `${m.first_name} ${m.last_name || ""}`.trim() : m.username,
              email: m.email || "",
              username: m.username,
              coin_balance: m.coin_balance || 0,
              is_approved: m.is_approved,
              created_at: m.created_at,
            }))
          );
        }
      }

      if (type === "fans" || type === "all") {
        const { data: fans } = await supabase
          .from("fans")
          .select("id, display_name, email, coin_balance, created_at")
          .or(`display_name.ilike.%${query}%,email.ilike.%${query}%`)
          .limit(10) as { data: any[] | null };

        if (fans) {
          searchResults.push(
            ...fans.map((f) => ({
              id: f.id,
              type: "fan" as const,
              name: f.display_name || "Fan",
              email: f.email || "",
              coin_balance: f.coin_balance || 0,
              created_at: f.created_at,
            }))
          );
        }
      }

      setResults(searchResults);
      setLoading(false);
    }, 300);

    return () => clearTimeout(debounce);
  }, [query, type, supabase]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder || `Search ${type}...`}
          className="pl-10 pr-10"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
            onClick={() => setQuery("")}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && hasSearched && results.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No results found for &quot;{query}&quot;
        </p>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-2">
          {results.map((result) => (
            <div
              key={`${result.type}-${result.id}`}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                    result.type === "model"
                      ? "bg-gradient-to-br from-blue-500 to-cyan-500"
                      : "bg-gradient-to-br from-pink-500 to-violet-500"
                  }`}
                >
                  {result.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{result.name}</p>
                    <Badge variant="outline" className="text-xs">
                      {result.type}
                    </Badge>
                    {result.type === "model" && (
                      <Badge variant={result.is_approved ? "default" : "secondary"} className="text-xs">
                        {result.is_approved ? "Approved" : "Pending"}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {result.email}
                    {result.username && ` • @${result.username}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-yellow-500">
                  <Coins className="h-4 w-4" />
                  <span className="font-semibold">{result.coin_balance}</span>
                </div>
                {result.type === "model" && result.username && (
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/${result.username}`}>View</Link>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
