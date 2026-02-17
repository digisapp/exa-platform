"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Shield,
  BookOpen,
  Upload,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ContractTemplate {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  content: string;
}

interface ContractSendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modelId?: string;
  modelName?: string;
  bookingId?: string;
  offerId?: string;
  onContractSent?: () => void;
}

const TEMPLATE_ICONS: Record<string, typeof FileText> = {
  model_release: FileText,
  nda: Shield,
  booking_terms: BookOpen,
};

const TEMPLATE_COLORS: Record<string, string> = {
  model_release: "border-pink-500/30 hover:border-pink-500/60 bg-pink-500/5",
  nda: "border-violet-500/30 hover:border-violet-500/60 bg-violet-500/5",
  booking_terms: "border-blue-500/30 hover:border-blue-500/60 bg-blue-500/5",
};

const TEMPLATE_ICON_COLORS: Record<string, string> = {
  model_release: "text-pink-500",
  nda: "text-violet-500",
  booking_terms: "text-blue-500",
};

export function ContractSendDialog({
  open,
  onOpenChange,
  modelId,
  modelName,
  bookingId,
  offerId,
  onContractSent,
}: ContractSendDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [title, setTitle] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfStoragePath, setPdfStoragePath] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      fetchTemplates();
    } else {
      // Reset on close
      setStep(1);
      setSelectedTemplate(null);
      setTitle("");
      setPdfFile(null);
      setPdfUrl(null);
      setPdfStoragePath(null);
    }
  }, [open]);

  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const res = await fetch("/api/contracts/templates");
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch {
      toast.error("Failed to load templates");
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleSelectTemplate = (template: ContractTemplate) => {
    setSelectedTemplate(template);
    setTitle(template.name);
    setPdfFile(null);
    setPdfUrl(null);
    setPdfStoragePath(null);
    setStep(2);
  };

  const handlePdfUpload = async (file: File) => {
    if (file.type !== "application/pdf") {
      toast.error("Only PDF files are allowed");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be under 10MB");
      return;
    }

    setUploading(true);
    setPdfFile(file);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/contracts/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      const data = await res.json();
      setPdfUrl(data.url);
      setPdfStoragePath(data.storagePath);
      setSelectedTemplate(null);
      if (!title) setTitle(file.name.replace(/\.pdf$/i, ""));
      setStep(2);
      toast.success("PDF uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
      setPdfFile(null);
    } finally {
      setUploading(false);
    }
  };

  const handleSend = async () => {
    if (!modelId) {
      toast.error("No model selected");
      return;
    }
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    if (!selectedTemplate && !pdfUrl) {
      toast.error("Please select a template or upload a PDF");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplate?.id || null,
          title: title.trim(),
          content: selectedTemplate?.content || null,
          pdfUrl: pdfUrl || null,
          pdfStoragePath: pdfStoragePath || null,
          modelId,
          bookingId: bookingId || null,
          offerId: offerId || null,
          status: "sent",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send contract");
      }

      toast.success("Contract sent successfully");
      onOpenChange(false);
      onContractSent?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send contract");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" />
            {step === 1 ? "Send Contract" : "Review & Send"}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? `Choose a template or upload a custom PDF${modelName ? ` for ${modelName}` : ""}`
              : "Review the details and send the contract"
            }
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            {/* Templates */}
            {loadingTemplates ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Choose a Template</Label>
                <div className="grid gap-3">
                  {templates.map((template) => {
                    const Icon = TEMPLATE_ICONS[template.category] || FileText;
                    const colorClass = TEMPLATE_COLORS[template.category] || "";
                    const iconColor = TEMPLATE_ICON_COLORS[template.category] || "text-muted-foreground";
                    return (
                      <button
                        key={template.id}
                        onClick={() => handleSelectTemplate(template)}
                        className={cn(
                          "flex items-start gap-3 p-4 rounded-lg border text-left transition-all",
                          colorClass
                        )}
                      >
                        <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", iconColor)} />
                        <div>
                          <p className="font-medium text-sm">{template.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{template.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or</span>
              </div>
            </div>

            {/* PDF Upload */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Upload Custom PDF</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePdfUpload(file);
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className={cn(
                  "w-full flex flex-col items-center gap-2 p-6 rounded-lg border-2 border-dashed transition-colors",
                  "border-muted-foreground/25 hover:border-muted-foreground/50",
                  uploading && "opacity-50 cursor-not-allowed"
                )}
              >
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <Upload className="h-6 w-6 text-muted-foreground" />
                )}
                <span className="text-sm text-muted-foreground">
                  {uploading ? "Uploading..." : "Click to upload PDF (max 10MB)"}
                </span>
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {/* Back button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep(1)}
              className="text-muted-foreground -ml-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>

            {/* What's selected */}
            <div className="p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2">
                {selectedTemplate ? (
                  <>
                    {(() => {
                      const Icon = TEMPLATE_ICONS[selectedTemplate.category] || FileText;
                      return <Icon className="h-4 w-4 text-blue-500" />;
                    })()}
                    <span className="text-sm font-medium">Template: {selectedTemplate.name}</span>
                  </>
                ) : pdfFile ? (
                  <>
                    <FileText className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium">PDF: {pdfFile.name}</span>
                    <Check className="h-4 w-4 text-green-500 ml-auto" />
                  </>
                ) : null}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="contract-title">Contract Title</Label>
              <Input
                id="contract-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Model Release for Miami Shoot"
                maxLength={200}
              />
            </div>

            {/* Model name display */}
            {modelName && (
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground">Sending to</p>
                <p className="text-sm font-medium">{modelName}</p>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <DialogFooter>
            <Button
              onClick={handleSend}
              disabled={sending || !title.trim()}
              className="bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Send Contract
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
