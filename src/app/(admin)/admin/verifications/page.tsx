"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, ShieldCheck, ShieldX, FileText, Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Verification {
  id: string;
  status: "pending_review" | "approved" | "rejected";
  submitted_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  legal_name: string | null;
  date_of_birth: string | null;
  country: string | null;
  id_document_path: string;
  selfie_path: string;
  id_document_url: string | null;
  selfie_url: string | null;
  model: {
    id: string;
    username: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    dob: string | null;
    date_of_birth: string | null;
    country_code: string | null;
    instagram_name: string | null;
  } | null;
}

export default function AdminVerificationsPage() {
  const [tab, setTab] = useState<"pending_review" | "approved" | "rejected" | "all">("pending_review");
  const [list, setList] = useState<Verification[] | null>(null);
  const [reviewing, setReviewing] = useState<Verification | null>(null);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const [legalName, setLegalName] = useState("");
  const [dob, setDob] = useState("");
  const [country, setCountry] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  async function load() {
    setList(null);
    try {
      const res = await fetch(`/api/admin/verifications?status=${tab}`);
      const data = await res.json();
      setList(data.verifications || []);
    } catch (e) {
      setList([]);
      toast.error("Failed to load verifications");
    }
  }

  useEffect(() => {
    load();
  }, [tab]);

  function openReview(v: Verification) {
    setReviewing(v);
    setLegalName(v.model?.first_name && v.model?.last_name
      ? `${v.model.first_name} ${v.model.last_name}`
      : "");
    setDob(v.model?.dob || v.model?.date_of_birth || "");
    setCountry(v.model?.country_code || "");
    setRejectReason("");
  }

  async function handleApprove() {
    if (!reviewing) return;
    if (!legalName.trim() || !dob.trim() || country.trim().length !== 2) {
      toast.error("Legal name, DOB (YYYY-MM-DD), and 2-letter country code required");
      return;
    }
    setApproving(true);
    try {
      const res = await fetch(`/api/admin/verifications/${reviewing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          legal_name: legalName.trim(),
          date_of_birth: dob.trim(),
          country: country.trim().toUpperCase(),
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "Approval failed");
      }
      toast.success("Verification approved");
      setReviewing(null);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setApproving(false);
    }
  }

  async function handleReject() {
    if (!reviewing) return;
    if (!rejectReason.trim()) {
      toast.error("Please give a reason");
      return;
    }
    setRejecting(true);
    try {
      const res = await fetch(`/api/admin/verifications/${reviewing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", reason: rejectReason.trim() }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "Rejection failed");
      }
      toast.success("Verification rejected");
      setReviewing(null);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRejecting(false);
    }
  }

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Admin
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-violet-500/15 border border-violet-500/40">
          <ShieldCheck className="h-6 w-6 text-violet-300" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Identity Verifications</h1>
          <p className="text-sm text-muted-foreground">
            Review submitted ID + selfie pairs and approve / reject.
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mb-6">
        <TabsList className="grid grid-cols-4 max-w-md">
          <TabsTrigger value="pending_review">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      {list === null && (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}

      {list && list.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No verifications in this state.
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {list?.map((v) => {
          const m = v.model;
          const displayName = m?.first_name
            ? `${m.first_name} ${m.last_name || ""}`.trim()
            : m?.username || "Unknown";
          return (
            <Card key={v.id} className="border-violet-500/20 bg-[#120a24]/95">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {displayName}
                      {v.status === "pending_review" && (
                        <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/40">
                          Pending review
                        </Badge>
                      )}
                      {v.status === "approved" && (
                        <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/40">
                          Approved
                        </Badge>
                      )}
                      {v.status === "rejected" && (
                        <Badge className="bg-rose-500/15 text-rose-300 border-rose-500/40">
                          Rejected
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      @{m?.username} {m?.email ? `· ${m.email}` : ""} · Submitted{" "}
                      {new Date(v.submitted_at).toLocaleString()}
                    </CardDescription>
                    {(m?.dob || m?.date_of_birth) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Self-reported DOB: {m.dob || m.date_of_birth}
                      </p>
                    )}
                  </div>
                  {v.status === "pending_review" && (
                    <Button onClick={() => openReview(v)} className="shrink-0">
                      Review
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <DocumentPreview
                    label="ID document"
                    icon={<FileText className="h-4 w-4" />}
                    url={v.id_document_url}
                    path={v.id_document_path}
                  />
                  <DocumentPreview
                    label="Selfie"
                    icon={<Camera className="h-4 w-4" />}
                    url={v.selfie_url}
                    path={v.selfie_path}
                  />
                </div>
                {v.status === "rejected" && v.rejection_reason && (
                  <p className="mt-4 text-sm text-rose-300">
                    Rejection reason: {v.rejection_reason}
                  </p>
                )}
                {v.status === "approved" && v.legal_name && (
                  <p className="mt-4 text-sm text-emerald-300">
                    Verified as {v.legal_name} · DOB {v.date_of_birth} · {v.country}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Review modal */}
      <Dialog open={!!reviewing} onOpenChange={(open) => !open && setReviewing(null)}>
        <DialogContent className="max-w-2xl border-violet-500/30 bg-[#120a24]/95">
          <DialogHeader>
            <DialogTitle>Review verification</DialogTitle>
            <DialogDescription>
              Confirm the model&apos;s identity by reading the document and matching it to the selfie.
              Legal name, DOB, and country are stamped onto the model row.
            </DialogDescription>
          </DialogHeader>
          {reviewing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <DocumentPreview
                  label="ID document"
                  icon={<FileText className="h-4 w-4" />}
                  url={reviewing.id_document_url}
                  path={reviewing.id_document_path}
                />
                <DocumentPreview
                  label="Selfie"
                  icon={<Camera className="h-4 w-4" />}
                  url={reviewing.selfie_url}
                  path={reviewing.selfie_path}
                />
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <Label htmlFor="legal-name">Legal name (as on ID)</Label>
                  <Input
                    id="legal-name"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    placeholder="e.g. Jane Anne Smith"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="dob">Date of birth (YYYY-MM-DD)</Label>
                    <Input
                      id="dob"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      placeholder="2001-04-15"
                    />
                  </div>
                  <div>
                    <Label htmlFor="country">Country (ISO 2)</Label>
                    <Input
                      id="country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value.toUpperCase())}
                      maxLength={2}
                      placeholder="US"
                    />
                  </div>
                </div>

                <div className="border-t border-white/10 pt-4">
                  <Label htmlFor="reject-reason">Or reject with reason</Label>
                  <Textarea
                    id="reject-reason"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="e.g. ID and selfie do not match · ID is expired · DOB indicates under 18"
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleReject}
              disabled={rejecting || approving}
              className="border-rose-500/40 text-rose-300 hover:bg-rose-500/10"
            >
              {rejecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldX className="h-4 w-4 mr-2" />}
              Reject
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approving || rejecting}
              className="bg-gradient-to-r from-emerald-500 to-cyan-500"
            >
              {approving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DocumentPreview({
  label,
  icon,
  url,
  path,
}: {
  label: string;
  icon: React.ReactNode;
  url: string | null;
  path: string;
}) {
  const isPdf = path.toLowerCase().endsWith(".pdf");
  return (
    <div className="border border-white/10 rounded-xl p-3 bg-black/30">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        {icon}
        <span>{label}</span>
      </div>
      {url ? (
        isPdf ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-violet-300 hover:text-violet-200 text-sm py-8 text-center border border-violet-500/30 rounded-lg"
          >
            Open PDF in new tab
          </a>
        ) : (
          <a href={url} target="_blank" rel="noopener noreferrer">
            <Image
              src={url}
              alt={label}
              width={400}
              height={300}
              unoptimized
              className="w-full h-auto rounded-lg object-contain max-h-80"
            />
          </a>
        )
      ) : (
        <p className="text-xs text-rose-300">Failed to load preview</p>
      )}
    </div>
  );
}
