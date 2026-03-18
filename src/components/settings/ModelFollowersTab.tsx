"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MessageCircle, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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
            {followers.map((follower: any) => (
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
