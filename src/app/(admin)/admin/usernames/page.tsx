"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Search,
  Crown,
  Building2,
  Star,
  Ban,
  Settings,
  Clock,
  Loader2,
  CheckCircle,
  XCircle,
} from "lucide-react";

type ReservedUsername = {
  id: string;
  username: string;
  reason: string;
  reserved_for: string | null;
  notes: string | null;
  created_at: string;
};

const reasonConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  vip: { label: "VIP", icon: <Crown className="h-4 w-4" />, color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/50" },
  brand: { label: "Brand", icon: <Building2 className="h-4 w-4" />, color: "bg-blue-500/10 text-blue-500 border-blue-500/50" },
  celebrity: { label: "Celebrity", icon: <Star className="h-4 w-4" />, color: "bg-purple-500/10 text-purple-500 border-purple-500/50" },
  inappropriate: { label: "Blocked", icon: <Ban className="h-4 w-4" />, color: "bg-red-500/10 text-red-500 border-red-500/50" },
  system: { label: "System", icon: <Settings className="h-4 w-4" />, color: "bg-gray-500/10 text-gray-500 border-gray-500/50" },
  held: { label: "Held", icon: <Clock className="h-4 w-4" />, color: "bg-orange-500/10 text-orange-500 border-orange-500/50" },
};

export default function AdminUsernamesPage() {
  const router = useRouter();
  const [usernames, setUsernames] = useState<ReservedUsername[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterReason, setFilterReason] = useState<string>("all");

  // Add username dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newReason, setNewReason] = useState("vip");
  const [newReservedFor, setNewReservedFor] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [adding, setAdding] = useState(false);

  // Check username availability
  const [checkUsername, setCheckUsername] = useState("");
  const [checkResult, setCheckResult] = useState<{ available: boolean; reason: string | null } | null>(null);
  const [checking, setChecking] = useState(false);

  // Delete state
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchUsernames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUsernames = async () => {
    try {
      const response = await fetch("/api/admin/reserved-usernames");
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push("/signin");
          return;
        }
        throw new Error("Failed to fetch");
      }
      const data = await response.json();
      setUsernames(data.usernames || []);
    } catch (error) {
      console.error("Error fetching usernames:", error);
      toast.error("Failed to load reserved usernames");
    } finally {
      setLoading(false);
    }
  };

  const handleAddUsername = async () => {
    if (!newUsername.trim()) {
      toast.error("Username is required");
      return;
    }

    setAdding(true);
    try {
      const response = await fetch("/api/username/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newUsername.toLowerCase().trim(),
          reason: newReason,
          reserved_for: newReservedFor || null,
          notes: newNotes || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to reserve username");
      }

      toast.success(`Username "${newUsername}" reserved successfully`);
      setAddDialogOpen(false);
      setNewUsername("");
      setNewReason("vip");
      setNewReservedFor("");
      setNewNotes("");
      fetchUsernames();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to reserve username";
      toast.error(message);
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteUsername = async (username: string) => {
    setDeleting(username);
    try {
      const response = await fetch(`/api/username/check?username=${encodeURIComponent(username)}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete");
      }

      toast.success(`Username "${username}" unreserved`);
      fetchUsernames();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete";
      toast.error(message);
    } finally {
      setDeleting(null);
    }
  };

  const handleCheckUsername = async () => {
    if (!checkUsername.trim()) return;

    setChecking(true);
    setCheckResult(null);
    try {
      const response = await fetch(`/api/username/check?username=${encodeURIComponent(checkUsername.toLowerCase().trim())}`);
      const data = await response.json();
      setCheckResult({ available: data.available, reason: data.reason });
    } catch {
      toast.error("Failed to check username");
    } finally {
      setChecking(false);
    }
  };

  const filteredUsernames = usernames.filter((u) => {
    const matchesSearch = u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.reserved_for?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesReason = filterReason === "all" || u.reason === filterReason;
    return matchesSearch && matchesReason;
  });

  // Group by reason for stats
  const stats = usernames.reduce((acc, u) => {
    acc[u.reason] = (acc[u.reason] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="container px-8 md:px-16 py-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container px-8 md:px-16 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Reserved Usernames</h1>
            <p className="text-muted-foreground">Manage VIP usernames, brand protection, and blocked words</p>
          </div>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Reserve Username
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reserve Username</DialogTitle>
              <DialogDescription>
                Add a username to the reserved list. This will prevent anyone from using it.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="e.g., noelle"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Select value={newReason} onValueChange={setNewReason}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vip">VIP - Premium short name</SelectItem>
                    <SelectItem value="held">Held - For specific person</SelectItem>
                    <SelectItem value="brand">Brand - Brand protection</SelectItem>
                    <SelectItem value="celebrity">Celebrity - Name protection</SelectItem>
                    <SelectItem value="inappropriate">Blocked - Inappropriate word</SelectItem>
                    <SelectItem value="system">System - System reserved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reserved_for">Reserved For (optional)</Label>
                <Input
                  id="reserved_for"
                  placeholder="e.g., email@example.com or person's name"
                  value={newReservedFor}
                  onChange={(e) => setNewReservedFor(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Input
                  id="notes"
                  placeholder="e.g., Top model, releasing in June"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddUsername} disabled={adding || !newUsername.trim()}>
                {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Reserve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {Object.entries(reasonConfig).map(([reason, config]) => (
          <Card key={reason} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setFilterReason(filterReason === reason ? "all" : reason)}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${config.color.split(" ")[0]}`}>
                  {config.icon}
                </div>
                <div>
                  <p className="text-xl font-bold">{stats[reason] || 0}</p>
                  <p className="text-xs text-muted-foreground">{config.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="manage" className="space-y-6">
        <TabsList>
          <TabsTrigger value="manage">Manage Reserved</TabsTrigger>
          <TabsTrigger value="check">Check Availability</TabsTrigger>
        </TabsList>

        <TabsContent value="manage">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Reserved Usernames ({filteredUsernames.length})</CardTitle>
                  <CardDescription>Click a stat card above to filter by type</CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      className="pl-9 w-[200px]"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  {filterReason !== "all" && (
                    <Button variant="outline" size="sm" onClick={() => setFilterReason("all")}>
                      Clear Filter
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reserved For</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsernames.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No reserved usernames found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsernames.map((u) => {
                      const config = reasonConfig[u.reason] || reasonConfig.system;
                      return (
                        <TableRow key={u.id}>
                          <TableCell className="font-mono font-medium">{u.username}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={config.color}>
                              {config.icon}
                              <span className="ml-1">{config.label}</span>
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {u.reserved_for || "-"}
                          </TableCell>
                          <TableCell className="text-muted-foreground max-w-[200px] truncate">
                            {u.notes || "-"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {new Date(u.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                              onClick={() => handleDeleteUsername(u.username)}
                              disabled={deleting === u.username}
                            >
                              {deleting === u.username ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="check">
          <Card>
            <CardHeader>
              <CardTitle>Check Username Availability</CardTitle>
              <CardDescription>Test if a username is available or why it&apos;s blocked</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 max-w-md">
                <Input
                  placeholder="Enter username to check..."
                  value={checkUsername}
                  onChange={(e) => {
                    setCheckUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""));
                    setCheckResult(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleCheckUsername()}
                />
                <Button onClick={handleCheckUsername} disabled={checking || !checkUsername.trim()}>
                  {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check"}
                </Button>
              </div>

              {checkResult && (
                <div className={`p-4 rounded-lg border ${checkResult.available ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"}`}>
                  <div className="flex items-center gap-3">
                    {checkResult.available ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="font-medium text-green-500">Available</p>
                          <p className="text-sm text-muted-foreground">
                            The username &quot;{checkUsername}&quot; can be claimed
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-red-500" />
                        <div>
                          <p className="font-medium text-red-500">Not Available</p>
                          <p className="text-sm text-muted-foreground">
                            {checkResult.reason}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
