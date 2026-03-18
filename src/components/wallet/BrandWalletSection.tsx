"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  CheckCircle,
  XCircle,
  Receipt,
  ExternalLink,
  Download,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

import type { BrandSubscription, BrandPayment } from "@/app/(dashboard)/wallet/page";

interface BrandWalletSectionProps {
  brandSubscription: BrandSubscription | null;
  brandPayments: BrandPayment[];
}

export default function BrandWalletSection({
  brandSubscription,
  brandPayments,
}: BrandWalletSectionProps) {
  return (
    <>
      {/* Subscription Status */}
      {brandSubscription && (
        <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-cyan-500" />
                  Subscription
                </CardTitle>
                <CardDescription>Your current plan</CardDescription>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  brandSubscription.status === "active" && "bg-green-500/10 text-green-500 border-green-500/50",
                  brandSubscription.status === "past_due" && "bg-yellow-500/10 text-yellow-500 border-yellow-500/50",
                  brandSubscription.status === "canceled" && "bg-red-500/10 text-red-500 border-red-500/50",
                  brandSubscription.status === "paused" && "bg-gray-500/10 text-gray-500 border-gray-500/50"
                )}
              >
                {brandSubscription.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Plan</p>
                <p className="font-semibold capitalize">{brandSubscription.tier}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Billing</p>
                <p className="font-semibold capitalize">{brandSubscription.billing_cycle || "Monthly"}</p>
              </div>
              {brandSubscription.coins_granted_at && (
                <div>
                  <p className="text-sm text-muted-foreground">Last Coins Added</p>
                  <p className="font-semibold">
                    {new Date(brandSubscription.coins_granted_at).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-border/50">
              <Link href="/brands/pricing">
                <Button variant="outline" size="sm">
                  Manage Subscription
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Payment History
          </CardTitle>
          <CardDescription>Your subscription payments</CardDescription>
        </CardHeader>
        <CardContent>
          {brandPayments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No payment history yet</p>
              <p className="text-sm mt-1">Subscribe to a plan to see your payments here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {brandPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-background">
                      {payment.status === "paid" ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : payment.status === "open" ? (
                        <Clock className="h-4 w-4 text-yellow-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{payment.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(payment.created * 1000).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-green-500">
                      ${(payment.amount / 100).toFixed(2)}
                    </span>
                    <div className="flex gap-1">
                      {payment.hosted_invoice_url && (
                        <a
                          href={payment.hosted_invoice_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded hover:bg-muted transition-colors"
                          title="View Invoice"
                        >
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </a>
                      )}
                      {payment.invoice_pdf && (
                        <a
                          href={payment.invoice_pdf}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded hover:bg-muted transition-colors"
                          title="Download PDF"
                        >
                          <Download className="h-4 w-4 text-muted-foreground" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
