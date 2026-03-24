"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MessageCircle, Loader2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const FOLLOWERS_PER_PAGE = 20;

const getTypeLabel = (type: string) => {
  switch (type) {
    case "fan": return "Fan";
    case "model": return "Model";
    case "brand": return "Brand";
    default: return type;
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case "fan": return "bg-amber-500/20 text-amber-500";
    case "model": return "bg-pink-500/20 text-pink-500";
    case "brand": return "bg-cyan-500/20 text-cyan-500";
    default: return "bg-gray-500/20 text-gray-500";
  }
};

interface ModelFollowersTabProps {
  followers: any[];
  followersLoading: boolean;
  followerCount: number;
}

export function ModelFollowersTab({ followers, followersLoading, followerCount }: ModelFollowersTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return followers;
    const q = searchQuery.toLowerCase();
    return followers.filter((f: any) =>
      f.displayName?.toLowerCase().includes(q) || f.type?.toLowerCase().includes(q)
    );
  }, [followers, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / FOLLOWERS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * FOLLOWERS_PER_PAGE, page * FOLLOWERS_PER_PAGE);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-pink-500" />
          Your Followers
        </CardTitle>
        <CardDescription>
          {followerCount} {followerCount === 1 ? "person has" : "people have"} added you to their favorites
        </CardDescription>
      </CardHeader>
      <CardContent>
        {followersLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : followers.length > 0 ? (
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search followers..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>

            {filtered.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">No followers match &quot;{searchQuery}&quot;</p>
            ) : null}

            {paginated.map((follower: any) => (
              <div
                key={follower.id}
                className="flex items-center gap-4 p-3 rounded-lg border hover:border-pink-500/30 transition-colors"
              >
                {/* Avatar */}
                {follower.profileUrl ? (
                  <Link href={follower.profileUrl}>
                    <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-pink-500/30 hover:ring-pink-500/60 transition-all">
                      {follower.avatarUrl ? (
                        <Image
                          src={follower.avatarUrl}
                          alt={follower.displayName}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-pink-500/20 to-violet-500/20 flex items-center justify-center text-lg font-bold">
                          {follower.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </Link>
                ) : (
                  <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-white/20">
                    {follower.avatarUrl ? (
                      <Image
                        src={follower.avatarUrl}
                        alt={follower.displayName}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-pink-500/20 to-violet-500/20 flex items-center justify-center text-lg font-bold">
                        {follower.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                )}

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {follower.profileUrl ? (
                      <Link href={follower.profileUrl} className="font-medium hover:text-pink-500 transition-colors">
                        {follower.displayName}
                      </Link>
                    ) : (
                      <span className="font-medium">{follower.displayName}</span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTypeColor(follower.type)}`}>
                      {getTypeLabel(follower.type)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Followed {formatDistanceToNow(new Date(follower.followedAt), { addSuffix: true })}
                  </p>
                </div>

                {/* Message Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-pink-500 hover:bg-pink-500/10"
                  asChild
                >
                  <Link href={`/chats?new=${follower.actorId}`}>
                    <MessageCircle className="h-5 w-5" />
                  </Link>
                </Button>
              </div>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-3 border-t">
                <p className="text-sm text-muted-foreground">
                  {filtered.length} {filtered.length === 1 ? "follower" : "followers"}{searchQuery ? " found" : ""}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No followers yet</h3>
            <p className="text-muted-foreground">
              Share your profile to get more followers!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
