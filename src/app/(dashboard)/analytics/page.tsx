"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Eye,
  Users,
  Coins,
  TrendingUp,
  Heart,
  Lock,
  Image as ImageIcon,
  MessageCircle,
  Loader2,
  BarChart3,
} from "lucide-react";

interface AnalyticsData {
  profileViews: number;
  followerCount: number;
  totalEarnings: number;
  contentSales: number;
  tipsReceived: number;
  messageEarnings: number;
  totalContent: number;
  paidContent: number;
  freeContent: number;
  totalUnlocks: number;
  coinBalance: number;
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    async function loadAnalytics() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get model data
      const { data: model } = await supabase
        .from("models")
        .select("id, profile_views, coin_balance, user_id")
        .eq("user_id", user.id)
        .single() as { data: any };

      if (!model) {
        setLoading(false);
        return;
      }

      // Get actor ID for the model
      const { data: actor } = await supabase
        .from("actors")
        .select("id")
        .eq("user_id", user.id)
        .single() as { data: { id: string } | null };

      // Get follower count
      const { count: followerCount } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", actor?.id || "");

      // Get earnings from coin_transactions
      const { data: earnings } = await supabase
        .from("coin_transactions")
        .select("action, amount, created_at")
        .eq("actor_id", actor?.id || "")
        .gt("amount", 0) as { data: any[] | null };

      const contentSales = earnings?.filter(e => e.action === "content_sale").reduce((sum, e) => sum + e.amount, 0) || 0;
      const tipsReceived = earnings?.filter(e => e.action === "tip_received").reduce((sum, e) => sum + e.amount, 0) || 0;
      const messageEarnings = earnings?.filter(e => e.action === "message_received").reduce((sum, e) => sum + e.amount, 0) || 0;
      const totalEarnings = contentSales + tipsReceived + messageEarnings;

      // Get content stats
      const { data: content } = await supabase
        .from("premium_content")
        .select("coin_price, unlock_count")
        .eq("model_id", model.id)
        .eq("is_active", true) as { data: any[] | null };

      const totalContent = content?.length || 0;
      const paidContent = content?.filter(c => c.coin_price > 0).length || 0;
      const freeContent = content?.filter(c => c.coin_price === 0).length || 0;
      const totalUnlocks = content?.reduce((sum, c) => sum + (c.unlock_count || 0), 0) || 0;

      // Get recent transactions
      const { data: recent } = await supabase
        .from("coin_transactions")
        .select("*")
        .eq("actor_id", actor?.id || "")
        .order("created_at", { ascending: false })
        .limit(10) as { data: any[] | null };

      setData({
        profileViews: model.profile_views || 0,
        followerCount: followerCount || 0,
        totalEarnings,
        contentSales,
        tipsReceived,
        messageEarnings,
        totalContent,
        paidContent,
        freeContent,
        totalUnlocks,
        coinBalance: model.coin_balance || 0,
      });
      setRecentTransactions(recent || []);
      setLoading(false);
    }

    loadAnalytics();
  }, [supabase]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <p className="text-muted-foreground">Analytics not available</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BarChart3 className="h-8 w-8 text-pink-500" />
          Analytics
        </h1>
        <p className="text-muted-foreground">Track your profile performance and earnings</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              Profile Views
            </CardDescription>
            <CardTitle className="text-2xl">{data.profileViews.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              Favorites
            </CardDescription>
            <CardTitle className="text-2xl">{data.followerCount.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Total Earnings
            </CardDescription>
            <CardTitle className="text-2xl text-green-500">{data.totalEarnings.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Coins className="h-3 w-3" />
              Coin Balance
            </CardDescription>
            <CardTitle className="text-2xl text-pink-500">{data.coinBalance.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tabs for detailed stats */}
      <Tabs defaultValue="earnings" className="space-y-6">
        <TabsList>
          <TabsTrigger value="earnings">Earnings</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Earnings Tab */}
        <TabsContent value="earnings" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardDescription className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-violet-500" />
                  Content Sales
                </CardDescription>
                <CardTitle className="text-3xl">{data.contentSales.toLocaleString()}</CardTitle>
                <p className="text-sm text-muted-foreground">coins from unlocks</p>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardDescription className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-pink-500" />
                  Tips Received
                </CardDescription>
                <CardTitle className="text-3xl">{data.tipsReceived.toLocaleString()}</CardTitle>
                <p className="text-sm text-muted-foreground">coins from tips</p>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardDescription className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-blue-500" />
                  Messages
                </CardDescription>
                <CardTitle className="text-3xl">{data.messageEarnings.toLocaleString()}</CardTitle>
                <p className="text-sm text-muted-foreground">coins from messages</p>
              </CardHeader>
            </Card>
          </div>

          {/* Earnings Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Earnings Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {data.totalEarnings > 0 ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Content Sales</span>
                      <span>{data.totalEarnings > 0 ? Math.round((data.contentSales / data.totalEarnings) * 100) : 0}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-violet-500 rounded-full"
                        style={{ width: `${data.totalEarnings > 0 ? (data.contentSales / data.totalEarnings) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Tips</span>
                      <span>{data.totalEarnings > 0 ? Math.round((data.tipsReceived / data.totalEarnings) * 100) : 0}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-pink-500 rounded-full"
                        style={{ width: `${data.totalEarnings > 0 ? (data.tipsReceived / data.totalEarnings) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Messages</span>
                      <span>{data.totalEarnings > 0 ? Math.round((data.messageEarnings / data.totalEarnings) * 100) : 0}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${data.totalEarnings > 0 ? (data.messageEarnings / data.totalEarnings) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No earnings yet</p>
                  <p className="text-sm">Start uploading content and engaging with fans!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-6">
          <div className="grid md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <ImageIcon className="h-3 w-3" />
                  Total Content
                </CardDescription>
                <CardTitle className="text-2xl">{data.totalContent}</CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Paid Content
                </CardDescription>
                <CardTitle className="text-2xl">{data.paidContent}</CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Free Content</CardDescription>
                <CardTitle className="text-2xl">{data.freeContent}</CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  Total Unlocks
                </CardDescription>
                <CardTitle className="text-2xl">{data.totalUnlocks}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Content Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>• Upload regularly to keep fans engaged</p>
              <p>• Mix free and paid content to attract new followers</p>
              <p>• Premium content priced at 10-50 coins performs best</p>
              <p>• High-quality photos and videos get more unlocks</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Your latest coin activity</CardDescription>
            </CardHeader>
            <CardContent>
              {recentTransactions.length > 0 ? (
                <div className="space-y-3">
                  {recentTransactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${tx.amount > 0 ? "bg-green-500/20" : "bg-red-500/20"}`}>
                          {tx.action === "content_sale" ? (
                            <Lock className="h-4 w-4 text-violet-500" />
                          ) : tx.action === "tip_received" ? (
                            <Heart className="h-4 w-4 text-pink-500" />
                          ) : (
                            <Coins className="h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium capitalize text-sm">
                            {tx.action.replace(/_/g, " ")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(tx.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                      <span className={`font-bold ${tx.amount > 0 ? "text-green-500" : "text-red-500"}`}>
                        {tx.amount > 0 ? "+" : ""}{tx.amount}
                        <Coins className="inline h-3 w-3 ml-1" />
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Coins className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No transactions yet</p>
                  <p className="text-sm">Activity will appear here as you earn coins</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
