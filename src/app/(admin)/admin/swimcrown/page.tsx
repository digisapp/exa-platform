"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, DollarSign, Users, Loader2 } from "lucide-react";

interface Contestant {
  id: string;
  tier: string;
  fullName: string;
  email: string;
  instagram: string;
  phone: string;
  paymentStatus: string;
  amountCents: number;
  createdAt: string;
}

interface Stats {
  totalContestants: number;
  totalPending: number;
  totalRevenue: number;
  entriesByTier: {
    standard: number;
    full_package: number;
  };
}

export default function SwimCrownAdminPage() {
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/swimcrown")
      .then((r) => r.json())
      .then((data) => {
        setContestants(data.contestants || []);
        setStats(data.stats || null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const paidContestants = contestants.filter((c) => c.paymentStatus === "paid");
  const pendingContestants = contestants.filter((c) => c.paymentStatus === "pending");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Crown className="h-6 w-6 text-amber-400" />
          SwimCrown Admin
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage SwimCrown 2026 entries
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Users className="h-4 w-4" />
              Paid Entries
            </div>
            <p className="text-3xl font-bold">{stats.totalContestants}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <DollarSign className="h-4 w-4" />
              Revenue
            </div>
            <p className="text-3xl font-bold">${(stats.totalRevenue / 100).toLocaleString()}</p>
          </Card>
          <Card className="p-4">
            <div className="text-muted-foreground text-sm mb-1">Runway</div>
            <p className="text-3xl font-bold">{stats.entriesByTier.standard}</p>
          </Card>
          <Card className="p-4">
            <div className="text-muted-foreground text-sm mb-1">Runway + Glam</div>
            <p className="text-3xl font-bold">{stats.entriesByTier.full_package}</p>
          </Card>
        </div>
      )}

      {/* Paid Entries */}
      <div>
        <h2 className="text-lg font-bold mb-4">
          Paid Entries ({paidContestants.length})
        </h2>
        {paidContestants.length === 0 ? (
          <p className="text-muted-foreground">No paid entries yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left py-3 px-4 font-medium">Name</th>
                  <th className="text-left py-3 px-4 font-medium">Email</th>
                  <th className="text-left py-3 px-4 font-medium">Instagram</th>
                  <th className="text-left py-3 px-4 font-medium">Phone</th>
                  <th className="text-left py-3 px-4 font-medium">Tier</th>
                  <th className="text-left py-3 px-4 font-medium">Paid</th>
                  <th className="text-left py-3 px-4 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paidContestants.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/30">
                    <td className="py-3 px-4 font-medium">{c.fullName || "—"}</td>
                    <td className="py-3 px-4">{c.email || "—"}</td>
                    <td className="py-3 px-4">
                      {c.instagram ? (
                        <a
                          href={`https://instagram.com/${c.instagram}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-pink-400 hover:underline"
                        >
                          @{c.instagram}
                        </a>
                      ) : "—"}
                    </td>
                    <td className="py-3 px-4">{c.phone || "—"}</td>
                    <td className="py-3 px-4">
                      <Badge variant={c.tier === "full_package" ? "default" : "secondary"} className={c.tier === "full_package" ? "bg-rose-500/20 text-rose-300 border-rose-500/30" : ""}>
                        {c.tier === "full_package" ? "Runway + Glam" : "Runway"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-medium">${(c.amountCents / 100).toFixed(0)}</td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pending */}
      {pendingContestants.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-4 text-muted-foreground">
            Pending Payment ({pendingContestants.length})
          </h2>
          <div className="overflow-x-auto rounded-lg border border-dashed">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left py-3 px-4 font-medium">Name</th>
                  <th className="text-left py-3 px-4 font-medium">Email</th>
                  <th className="text-left py-3 px-4 font-medium">Instagram</th>
                  <th className="text-left py-3 px-4 font-medium">Tier</th>
                  <th className="text-left py-3 px-4 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pendingContestants.map((c) => (
                  <tr key={c.id} className="text-muted-foreground">
                    <td className="py-3 px-4">{c.fullName || "—"}</td>
                    <td className="py-3 px-4">{c.email || "—"}</td>
                    <td className="py-3 px-4">{c.instagram ? `@${c.instagram}` : "—"}</td>
                    <td className="py-3 px-4">{c.tier === "full_package" ? "Runway + Glam" : "Runway"}</td>
                    <td className="py-3 px-4">{new Date(c.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
