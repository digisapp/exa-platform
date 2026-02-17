"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  FileText,
  Loader2,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
} from "lucide-react";
import { ContractSendDialog } from "@/components/contracts/ContractSendDialog";
import { ContractViewDialog } from "@/components/contracts/ContractViewDialog";

interface Contract {
  id: string;
  title: string;
  status: "draft" | "sent" | "signed" | "voided";
  signed_at: string | null;
  signer_name: string | null;
  sent_at: string | null;
  created_at: string;
  booking_id: string | null;
  offer_id: string | null;
  model: {
    id: string;
    first_name: string;
    last_name: string;
    profile_photo_url: string;
    username: string;
  } | null;
  brand: {
    id: string;
    company_name: string;
    logo_url: string;
  } | null;
}

const STATUS_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
  draft: { label: "Draft", variant: "secondary", icon: FileText },
  sent: { label: "Pending", variant: "outline", icon: Clock },
  signed: { label: "Signed", variant: "default", icon: CheckCircle2 },
  voided: { label: "Voided", variant: "destructive", icon: XCircle },
};

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<"brand" | "model" | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [viewContractId, setViewContractId] = useState<string | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  useEffect(() => {
    fetchUserRole();
  }, []);

  useEffect(() => {
    if (userRole) {
      fetchContracts();
    }
  }, [userRole]);

  const fetchUserRole = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) return;
      const data = await res.json();
      if (data.actor?.type === "brand" || data.actor?.type === "model") {
        setUserRole(data.actor.type);
      }
    } catch {
      // ignore
    }
  };

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/contracts?role=${userRole}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setContracts(data.contracts || []);
    } catch {
      toast.error("Failed to load contracts");
    } finally {
      setLoading(false);
    }
  };

  const filteredContracts = contracts.filter((c) => {
    if (activeTab === "all") return true;
    if (activeTab === "pending") return c.status === "sent";
    if (activeTab === "signed") return c.status === "signed";
    if (activeTab === "voided") return c.status === "voided";
    return true;
  });

  if (!userRole && !loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Contracts</h2>
        <p className="text-muted-foreground">
          Contracts are available for brands and models.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-500" />
            Contracts
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {userRole === "brand"
              ? "Send and manage contracts with models"
              : "View and sign contracts from brands"
            }
          </p>
        </div>
        {userRole === "brand" && (
          <Button
            onClick={() => setSendDialogOpen(true)}
            className="bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Contract
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            All ({contracts.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            {userRole === "model" ? "Needs Signature" : "Pending"} ({contracts.filter(c => c.status === "sent").length})
          </TabsTrigger>
          <TabsTrigger value="signed">
            Signed ({contracts.filter(c => c.status === "signed").length})
          </TabsTrigger>
          {userRole === "brand" && (
            <TabsTrigger value="voided">
              Voided ({contracts.filter(c => c.status === "voided").length})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredContracts.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {activeTab === "all"
                  ? "No contracts yet"
                  : `No ${activeTab} contracts`
                }
              </p>
              {userRole === "brand" && activeTab === "all" && (
                <Button
                  onClick={() => setSendDialogOpen(true)}
                  variant="outline"
                  className="mt-4"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Send Your First Contract
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredContracts.map((contract) => {
                const statusBadge = STATUS_BADGES[contract.status];
                const StatusIcon = statusBadge?.icon || Clock;
                const counterparty = userRole === "brand" ? contract.model : contract.brand;
                const counterpartyName = userRole === "brand"
                  ? [contract.model?.first_name, contract.model?.last_name].filter(Boolean).join(" ") || "Model"
                  : contract.brand?.company_name || "Brand";
                const counterpartyImage = userRole === "brand"
                  ? contract.model?.profile_photo_url
                  : contract.brand?.logo_url;

                return (
                  <Card
                    key={contract.id}
                    className="cursor-pointer hover:border-blue-500/30 transition-colors"
                    onClick={() => {
                      setViewContractId(contract.id);
                      setViewDialogOpen(true);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-muted overflow-hidden shrink-0">
                          {counterpartyImage ? (
                            <Image
                              src={counterpartyImage}
                              alt={counterpartyName}
                              width={40}
                              height={40}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">{contract.title}</p>
                            {statusBadge && (
                              <Badge variant={statusBadge.variant} className="shrink-0 text-xs">
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusBadge.label}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {userRole === "brand" ? "To: " : "From: "}
                            {counterpartyName}
                            {contract.sent_at && (
                              <> &middot; {new Date(contract.sent_at).toLocaleDateString()}</>
                            )}
                          </p>
                        </div>

                        {/* Signed date or action hint */}
                        <div className="text-right shrink-0">
                          {contract.status === "signed" && contract.signed_at ? (
                            <p className="text-xs text-green-500">
                              Signed {new Date(contract.signed_at).toLocaleDateString()}
                            </p>
                          ) : contract.status === "sent" && userRole === "model" ? (
                            <p className="text-xs text-amber-500 font-medium">Action Required</p>
                          ) : null}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Send Dialog (brand only, no specific model pre-selected) */}
      <ContractSendDialog
        open={sendDialogOpen}
        onOpenChange={setSendDialogOpen}
        onContractSent={fetchContracts}
      />

      {/* View Dialog */}
      <ContractViewDialog
        open={viewDialogOpen}
        onOpenChange={(open) => {
          setViewDialogOpen(open);
          if (!open) {
            setViewContractId(null);
            fetchContracts(); // Refresh after viewing
          }
        }}
        contractId={viewContractId}
        userRole={userRole || "model"}
        onContractSigned={fetchContracts}
      />
    </div>
  );
}
