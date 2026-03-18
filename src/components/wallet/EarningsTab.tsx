"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Coins,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Heart,
  Lock,
  MessageCircle,
  CreditCard,
  BarChart3,
  Phone,
  Gift,
  Briefcase,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

import type { Transaction } from "@/app/(dashboard)/wallet/page";

const EARNING_TYPE_LABELS: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  tip_received: { label: "Tips", icon: Gift, color: "text-pink-500" },
  video_call: { label: "Video Calls", icon: Phone, color: "text-blue-500" },
  voice_call: { label: "Voice Calls", icon: Phone, color: "text-green-500" },
  message_received: { label: "Messages", icon: MessageCircle, color: "text-purple-500" },
  content_sale: { label: "Content Sales", icon: Eye, color: "text-orange-500" },
  booking_payment: { label: "Bookings", icon: Briefcase, color: "text-cyan-500" },
};

interface EarningsTabProps {
  totalEarnings: number;
  thisMonthEarnings: number;
  earningsByMonth: Record<string, number>;
  earningsByType: Record<string, number>;
  transactions: Transaction[];
  hasMoreTransactions: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}

function getActionIcon(action: string) {
  switch (action) {
    case "tip_received":
    case "tip_sent":
      return <Heart className="h-4 w-4 text-pink-500" />;
    case "content_sale":
    case "content_unlock":
      return <Lock className="h-4 w-4 text-violet-500" />;
    case "message_received":
    case "message_sent":
      return <MessageCircle className="h-4 w-4 text-blue-500" />;
    case "purchase":
      return <CreditCard className="h-4 w-4 text-green-500" />;
    default:
      return <Coins className="h-4 w-4 text-yellow-500" />;
  }
}

function getActionLabel(action: string) {
  switch (action) {
    case "tip_received": return "Tip Received";
    case "tip_sent": return "Tip Sent";
    case "content_sale": return "Content Sale";
    case "content_unlock": return "Content Unlock";
    case "message_received": return "Message Payment";
    case "message_sent": return "Message";
    case "purchase": return "Coin Purchase";
    default: return action.replace(/_/g, " ");
  }
}

export default function EarningsTab({
  totalEarnings,
  thisMonthEarnings,
  earningsByMonth,
  earningsByType,
  transactions,
  hasMoreTransactions,
  loadingMore,
  onLoadMore,
}: EarningsTabProps) {
  return (
    <div className="space-y-6">
      {/* Earnings Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{totalEarnings.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Earned</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{thisMonthEarnings.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">This Month</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Heart className="h-5 w-5 text-pink-500" />
              <div>
                <p className="text-2xl font-bold">
                  {transactions.filter(t => t.action === "tip_received").reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">From Tips</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-violet-500" />
              <div>
                <p className="text-2xl font-bold">
                  {transactions.filter(t => t.action === "content_sale").reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Content Sales</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Earnings Chart */}
      {Object.keys(earningsByMonth).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Monthly Earnings
            </CardTitle>
            <CardDescription>Coins earned over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const months = Object.keys(earningsByMonth).sort().slice(-6);
              const maxEarning = Math.max(...months.map(m => earningsByMonth[m] || 0), 1);

              return (
                <div className="flex items-end gap-2 h-40">
                  {months.map((month) => {
                    const earning = earningsByMonth[month] || 0;
                    const height = (earning / maxEarning) * 100;
                    const [year, m] = month.split("-");
                    const monthLabel = new Date(parseInt(year), parseInt(m) - 1).toLocaleDateString("en-US", { month: "short" });

                    return (
                      <div key={month} className="flex-1 flex flex-col items-center gap-2">
                        <div className="w-full bg-muted rounded-t relative" style={{ height: `${Math.max(height, 5)}%` }}>
                          <div
                            className="absolute inset-0 bg-gradient-to-t from-pink-500 to-violet-500 rounded-t"
                            style={{ height: "100%" }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{monthLabel}</span>
                        <span className="text-xs font-medium">{earning.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Earnings Breakdown */}
      {Object.keys(earningsByType).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Earnings Breakdown
            </CardTitle>
            <CardDescription>Where your coins come from</CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const earningTypes = Object.entries(earningsByType)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5);
              const totalFromTypes = earningTypes.reduce((sum, [, amount]) => sum + amount, 0);

              return (
                <div className="space-y-4">
                  {earningTypes.map(([type, amount]) => {
                    const typeInfo = EARNING_TYPE_LABELS[type] || { label: type.replace(/_/g, " "), icon: Coins, color: "text-gray-500" };
                    const Icon = typeInfo.icon;
                    const percentage = totalFromTypes > 0 ? Math.round((amount / totalFromTypes) * 100) : 0;

                    return (
                      <div key={type} className="flex items-center gap-4">
                        <div className={`p-2 rounded-full bg-muted ${typeInfo.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium capitalize">{typeInfo.label}</span>
                            <span className="text-sm text-muted-foreground">{amount.toLocaleString()} coins</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-pink-500 to-violet-500 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-sm font-medium w-12 text-right">{percentage}%</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Your coin activity</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Coins className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-background">
                      {getActionIcon(tx.action)}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{getActionLabel(tx.action)}</p>
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
                  <span className={cn(
                    "font-bold flex items-center gap-1",
                    tx.amount >= 0 ? "text-green-500" : "text-red-500"
                  )}>
                    {tx.amount >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    {tx.amount >= 0 ? "+" : ""}{tx.amount}
                  </span>
                </div>
              ))}
              {hasMoreTransactions && (
                <div className="text-center pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onLoadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Load More
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
