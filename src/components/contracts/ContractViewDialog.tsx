"use client";

import { useState, useEffect } from "react";
import DOMPurify from "isomorphic-dompurify";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

interface ContractDetail {
  id: string;
  title: string;
  content: string | null;
  pdf_url: string | null;
  status: "draft" | "sent" | "signed" | "voided";
  signed_at: string | null;
  signer_name: string | null;
  sent_at: string | null;
  created_at: string;
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

interface ContractViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string | null;
  userRole: "brand" | "model";
  onContractSigned?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
  draft: { label: "Draft", variant: "secondary", icon: FileText },
  sent: { label: "Pending Signature", variant: "outline", icon: Clock },
  signed: { label: "Signed", variant: "default", icon: CheckCircle2 },
  voided: { label: "Voided", variant: "destructive", icon: XCircle },
};

export function ContractViewDialog({
  open,
  onOpenChange,
  contractId,
  userRole,
  onContractSigned,
}: ContractViewDialogProps) {
  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [signing, setSigning] = useState(false);
  const [voiding, setVoiding] = useState(false);

  useEffect(() => {
    if (open && contractId) {
      fetchContract();
      setAgreed(false);
    } else {
      setContract(null);
      setAgreed(false);
    }
  }, [open, contractId]);

  const fetchContract = async () => {
    if (!contractId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/contracts/${contractId}`);
      if (!res.ok) throw new Error("Failed to load contract");
      const data = await res.json();
      setContract(data.contract);
    } catch {
      toast.error("Failed to load contract");
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async () => {
    if (!contractId || !agreed) return;
    setSigning(true);
    try {
      const res = await fetch(`/api/contracts/${contractId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sign" }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to sign");
      }

      toast.success("Contract signed successfully");
      onContractSigned?.();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to sign contract");
    } finally {
      setSigning(false);
    }
  };

  const handleVoid = async () => {
    if (!contractId) return;
    setVoiding(true);
    try {
      const res = await fetch(`/api/contracts/${contractId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "void" }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to void");
      }

      toast.success("Contract voided");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to void contract");
    } finally {
      setVoiding(false);
    }
  };

  const statusConfig = contract ? STATUS_CONFIG[contract.status] : null;
  const StatusIcon = statusConfig?.icon || Clock;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : contract ? (
          <>
            <DialogHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <DialogTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5 text-blue-500" />
                    {contract.title}
                  </DialogTitle>
                  <DialogDescription className="mt-1">
                    {userRole === "model"
                      ? `From ${contract.brand?.company_name || "Brand"}`
                      : `Sent to ${[contract.model?.first_name, contract.model?.last_name].filter(Boolean).join(" ") || "Model"}`
                    }
                    {contract.sent_at && (
                      <> &middot; {new Date(contract.sent_at).toLocaleDateString()}</>
                    )}
                  </DialogDescription>
                </div>
                {statusConfig && (
                  <Badge variant={statusConfig.variant} className="shrink-0">
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {statusConfig.label}
                  </Badge>
                )}
              </div>
            </DialogHeader>

            {/* Contract Content */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {contract.content ? (
                <div
                  className="prose prose-sm dark:prose-invert max-w-none p-4 rounded-lg bg-muted/30 border"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(contract.content) }}
                />
              ) : contract.pdf_url ? (
                <div className="p-4 rounded-lg bg-muted/30 border text-center space-y-3">
                  <FileText className="h-12 w-12 text-red-500 mx-auto" />
                  <p className="text-sm text-muted-foreground">This contract is a PDF document</p>
                  <Button variant="outline" asChild>
                    <a href={contract.pdf_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open PDF
                    </a>
                  </Button>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No content available</p>
              )}

              {/* Signature info */}
              {contract.status === "signed" && contract.signed_at && (
                <div className="mt-4 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <p className="font-medium text-green-500">Signed</p>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Signed by: <span className="text-foreground">{contract.signer_name}</span></p>
                    <p>Date: <span className="text-foreground">{new Date(contract.signed_at).toLocaleString()}</span></p>
                  </div>
                </div>
              )}

              {/* Voided info */}
              {contract.status === "voided" && (
                <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-500" />
                    <p className="font-medium text-red-500">This contract has been voided</p>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <DialogFooter className="flex-col gap-3 sm:flex-col">
              {/* Model sign action */}
              {userRole === "model" && contract.status === "sent" && (
                <>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <Checkbox
                      id="agree-terms"
                      checked={agreed}
                      onCheckedChange={(checked) => setAgreed(checked === true)}
                      className="mt-0.5"
                    />
                    <label htmlFor="agree-terms" className="text-sm leading-relaxed cursor-pointer">
                      I have read and understand the terms of this contract. I agree to be bound by these terms.
                    </label>
                  </div>
                  <Button
                    onClick={handleSign}
                    disabled={!agreed || signing}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {signing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Signing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        I Agree &amp; Sign
                      </>
                    )}
                  </Button>
                </>
              )}

              {/* Brand void action */}
              {userRole === "brand" && contract.status === "sent" && (
                <Button
                  variant="outline"
                  onClick={handleVoid}
                  disabled={voiding}
                  className="w-full text-red-500 border-red-500/30 hover:bg-red-500/10"
                >
                  {voiding ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Voiding...
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Void Contract
                    </>
                  )}
                </Button>
              )}
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
