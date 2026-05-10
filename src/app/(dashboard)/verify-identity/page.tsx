"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, Upload, Camera, Loader2, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];
const MAX_FILE_SIZE_MB = 10;

type Status =
  | { status: "loading" }
  | { status: "not_started" }
  | { status: "pending_review"; submittedAt: string }
  | { status: "approved"; verifiedAt: string; legalName: string | null }
  | { status: "rejected"; submittedAt: string; rejectionReason: string | null }
  | { status: "verified"; verifiedAt: string; legalName: string | null };

export default function VerifyIdentityPage() {
  const router = useRouter();
  const [state, setState] = useState<Status>({ status: "loading" });
  const [submitting, setSubmitting] = useState(false);
  const [idDocFile, setIdDocFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const idDocInputRef = useRef<HTMLInputElement | null>(null);
  const selfieInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/verifications/me");
        if (!res.ok) throw new Error("status fetch failed");
        const data = await res.json();
        if (!cancelled) setState(data);
      } catch {
        if (!cancelled) setState({ status: "not_started" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function validateFile(file: File): string | null {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "File must be a JPG, PNG, WebP, HEIC, or PDF";
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return `File must be smaller than ${MAX_FILE_SIZE_MB} MB`;
    }
    return null;
  }

  async function uploadOne(
    kind: "id_document" | "selfie",
    file: File,
    verificationDraftId: string
  ): Promise<string> {
    const urlRes = await fetch("/api/verifications/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        contentType: file.type,
        verificationDraftId,
      }),
    });
    if (!urlRes.ok) {
      const err = await urlRes.json().catch(() => ({}));
      throw new Error(err.error || "Failed to get upload URL");
    }
    const { signedUrl, path } = await urlRes.json();

    const putRes = await fetch(signedUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!putRes.ok) throw new Error(`Upload failed (${putRes.status})`);

    return path;
  }

  async function handleSubmit() {
    if (!idDocFile || !selfieFile) {
      toast.error("Please attach both your ID and a selfie");
      return;
    }
    const idErr = validateFile(idDocFile);
    if (idErr) return toast.error(`ID: ${idErr}`);
    const selfieErr = validateFile(selfieFile);
    if (selfieErr) return toast.error(`Selfie: ${selfieErr}`);

    setSubmitting(true);
    try {
      const draftId = crypto.randomUUID();
      const [idDocPath, selfiePath] = await Promise.all([
        uploadOne("id_document", idDocFile, draftId),
        uploadOne("selfie", selfieFile, draftId),
      ]);

      const submitRes = await fetch("/api/verifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_document_path: idDocPath,
          selfie_path: selfiePath,
        }),
      });
      if (!submitRes.ok) {
        const err = await submitRes.json().catch(() => ({}));
        throw new Error(err.error || "Failed to submit");
      }

      toast.success("Submitted! We'll review within 24 hours.");
      setState({
        status: "pending_review",
        submittedAt: new Date().toISOString(),
      });
      setIdDocFile(null);
      setSelfieFile(null);
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (state.status === "loading") {
    return (
      <div className="container max-w-2xl mx-auto py-8 px-4">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <Link
        href="/wallet"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Wallet
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-violet-500/15 border border-violet-500/40 shadow-[0_0_16px_rgba(167,139,250,0.25)]">
          <ShieldCheck className="h-6 w-6 text-violet-300" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Verify your identity</h1>
          <p className="text-sm text-muted-foreground">
            Required before we can release payouts to you.
          </p>
        </div>
      </div>

      {(state.status === "verified" || state.status === "approved") && (
        <Card className="border-emerald-500/40 bg-emerald-500/5 shadow-[0_0_24px_rgba(52,211,153,0.15)]">
          <CardContent className="flex items-start gap-3 py-6">
            <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-200">Identity verified</p>
              <p className="text-sm text-muted-foreground mt-1">
                {state.legalName ? `${state.legalName} · ` : ""}
                Verified on {new Date(state.verifiedAt).toLocaleDateString()}.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                You&apos;re cleared for payouts.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {state.status === "pending_review" && (
        <Card className="border-amber-500/40 bg-amber-500/5 shadow-[0_0_24px_rgba(251,191,36,0.15)]">
          <CardContent className="flex items-start gap-3 py-6">
            <Loader2 className="h-6 w-6 text-amber-400 shrink-0 mt-0.5 animate-spin" />
            <div>
              <p className="font-semibold text-amber-200">Under review</p>
              <p className="text-sm text-muted-foreground mt-1">
                Submitted on {new Date(state.submittedAt).toLocaleString()}. Our team
                reviews submissions within 24 hours.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {state.status === "rejected" && (
        <Card className="border-rose-500/40 bg-rose-500/5 shadow-[0_0_24px_rgba(244,63,94,0.15)] mb-6">
          <CardContent className="flex items-start gap-3 py-6">
            <AlertCircle className="h-6 w-6 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-200">Verification rejected</p>
              {state.rejectionReason && (
                <p className="text-sm text-muted-foreground mt-1">
                  Reason: {state.rejectionReason}
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                Please resubmit below with corrected documents.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {(state.status === "not_started" || state.status === "rejected") && (
        <Card className="border-violet-500/30 bg-[#120a24]/95 backdrop-blur-xl shadow-2xl shadow-violet-500/10">
          <CardHeader>
            <CardTitle>Submit documents</CardTitle>
            <CardDescription>
              Upload a government-issued photo ID and a selfie. Both files are stored
              privately and only seen by our review team.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FileSlot
              label="Photo ID (driver's license, passport, or ID card)"
              icon={<Upload className="h-5 w-5" />}
              file={idDocFile}
              inputRef={idDocInputRef}
              onPick={(f) => setIdDocFile(f)}
            />
            <FileSlot
              label="Selfie holding your ID next to your face"
              icon={<Camera className="h-5 w-5" />}
              file={selfieFile}
              inputRef={selfieInputRef}
              onPick={(f) => setSelfieFile(f)}
            />

            <div className="text-xs text-muted-foreground space-y-1.5 pt-2 border-t border-white/5">
              <p>• You must be at least 18 years old.</p>
              <p>• Your name on the ID must match your model profile.</p>
              <p>• Files are encrypted at rest and reviewed by EXA admins only.</p>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={submitting || !idDocFile || !selfieFile}
              className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 shadow-lg shadow-violet-500/25"
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Submit for review"
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FileSlot({
  label,
  icon,
  file,
  inputRef,
  onPick,
}: {
  label: string;
  icon: React.ReactNode;
  file: File | null;
  inputRef: React.MutableRefObject<HTMLInputElement | null>;
  onPick: (f: File | null) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium mb-2 block">{label}</label>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] || null)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full flex items-center gap-3 p-4 rounded-xl border border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10 hover:border-violet-500/50 transition-all"
      >
        <div className="p-2 rounded-lg bg-violet-500/15 text-violet-300">{icon}</div>
        <div className="flex-1 text-left min-w-0">
          {file ? (
            <>
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB · click to change
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Click to upload</p>
          )}
        </div>
      </button>
    </div>
  );
}
