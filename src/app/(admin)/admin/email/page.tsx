"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Inbox,
  Send,
  Search,
  Loader2,
  Mail,
  MailOpen,
  Reply,
  Plus,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ArrowLeft,
  Bot,
  Check,
  X,
  Sparkles,
  Trash2,
  CheckCheck,
  MessageSquare,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Email {
  id: string;
  direction: "inbound" | "outbound";
  thread_id: string | null;
  from_email: string;
  from_name: string | null;
  to_email: string;
  to_name: string | null;
  subject: string;
  body_html: string | null;
  body_text: string | null;
  status: string;
  created_at: string;
  read_at: string | null;
  replied_at: string | null;
  metadata: any;
  ai_category: string | null;
  ai_confidence: number | null;
  ai_summary: string | null;
  ai_draft_html: string | null;
  ai_draft_text: string | null;
  ai_processed_at: string | null;
}

/** Escape special chars for safe HTML insertion */
function escapeHtmlChars(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Strip dangerous HTML (scripts, event handlers) for safe quoting */
function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, "")
    .replace(/javascript:/gi, "");
}

/** Wrap plain text in EXA-branded HTML email template */
function wrapInBrandedTemplate(bodyText: string, isReply?: boolean, originalEmail?: Email | null): string {
  const bodyHtml = escapeHtmlChars(bodyText).replace(/\n/g, "<br>");

  const quotedContent = originalEmail?.body_html
    ? sanitizeHtml(originalEmail.body_html)
    : `<p>${escapeHtmlChars(originalEmail?.body_text || "")}</p>`;

  const quotedReply = isReply && originalEmail
    ? `<tr>
        <td style="padding: 0 30px 30px;">
          <div style="border-left: 3px solid #ec4899; padding-left: 16px; margin-top: 8px;">
            <p style="margin: 0 0 8px; color: #71717a; font-size: 12px;">
              On ${new Date(originalEmail.created_at).toLocaleString()}, ${originalEmail.from_name || originalEmail.from_email} wrote:
            </p>
            <div style="color: #a1a1aa; font-size: 14px; line-height: 1.6;">
              ${quotedContent}
            </div>
          </div>
        </td>
      </tr>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #1a1a1a; border-radius: 16px; overflow: hidden;">
          <!-- Header with logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); padding: 24px 30px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 24px; font-weight: bold; letter-spacing: 2px;">
                EXA MODELS
              </h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 30px;">
              <div style="color: #e4e4e7; font-size: 15px; line-height: 1.7;">
                ${bodyHtml}
              </div>
            </td>
          </tr>
          ${quotedReply}
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 30px; border-top: 1px solid #262626; text-align: center;">
              <p style="margin: 0 0 8px; color: #a1a1aa; font-size: 13px;">
                Questions? Reply to this email or DM us on Instagram
              </p>
              <p style="margin: 0; color: #71717a; font-size: 12px;">
                EXA Models — Where Models Shine
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export default function AdminEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = searchParams.get("tab") || "inbox";

  const [emails, setEmails] = useState<Email[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

  // Compose state
  const [showCompose, setShowCompose] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [sending, setSending] = useState(false);

  // Reply state
  const [showReply, setShowReply] = useState(false);
  const [replyBody, setReplyBody] = useState("");

  // Auto-reply toggle
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [autoReplyLoading, setAutoReplyLoading] = useState(true);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Thread view
  const [threadEmails, setThreadEmails] = useState<Email[]>([]);
  const [showThread, setShowThread] = useState(false);

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  // Total unread (separate from paginated list)
  const [totalUnread, setTotalUnread] = useState(0);

  const searchTimerRef = useRef<NodeJS.Timeout>();

  const limit = 30;
  const totalPages = Math.ceil(total / limit);

  // Debounce search input
  useEffect(() => {
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(searchTimerRef.current);
  }, [search]);

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    try {
      const direction = tab === "inbox" ? "inbound" : "outbound";
      const params = new URLSearchParams({
        direction,
        page: page.toString(),
        limit: limit.toString(),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);

      const res = await fetch(`/api/admin/email?${params}`);
      const data = await res.json();

      if (res.ok) {
        setEmails(data.emails);
        setTotal(data.total);
      } else {
        toast.error(data.error || "Failed to fetch emails");
      }
    } catch {
      toast.error("Failed to fetch emails");
    } finally {
      setLoading(false);
    }
  }, [tab, page, debouncedSearch]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  // Fetch total unread count (not just current page)
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/email?direction=inbound&status=received&page=1&limit=1");
      if (res.ok) {
        const data = await res.json();
        setTotalUnread(data.total || 0);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount, emails]);

  // Load auto-reply setting
  useEffect(() => {
    fetch("/api/admin/settings?key=ai_auto_reply_enabled")
      .then((r) => r.json())
      .then((d) => setAutoReplyEnabled(d.value === true))
      .catch(() => {})
      .finally(() => setAutoReplyLoading(false));
  }, []);

  const toggleAutoReply = async (enabled: boolean) => {
    setAutoReplyEnabled(enabled);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "ai_auto_reply_enabled", value: enabled }),
      });
      if (res.ok) {
        toast.success(enabled ? "AI auto-reply enabled" : "AI auto-reply disabled");
      } else {
        setAutoReplyEnabled(!enabled);
        toast.error("Failed to update setting");
      }
    } catch {
      setAutoReplyEnabled(!enabled); // Rollback on network error
      toast.error("Failed to update setting");
    }
  };

  // Reset page when switching tabs
  useEffect(() => {
    setPage(1);
    setSelectedEmail(null);
    setSelectedIds(new Set());
    setShowThread(false);
  }, [tab]);

  // Escape key to go back from detail view
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedEmail && !showReply && !showCompose) {
        if (showThread) {
          setShowThread(false);
        } else {
          setSelectedEmail(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedEmail, showReply, showCompose, showThread]);

  const handleTabChange = (newTab: string) => {
    router.push(`/admin/email?tab=${newTab}`);
  };

  const markAsRead = async (email: Email) => {
    if (email.direction === "inbound" && email.status === "received") {
      await fetch("/api/admin/email", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailId: email.id }),
      });
      setEmails((prev) =>
        prev.map((e) =>
          e.id === email.id ? { ...e, status: "read", read_at: new Date().toISOString() } : e
        )
      );
    }
  };

  const openEmail = async (email: Email) => {
    setSelectedEmail(email);
    setShowReply(false);
    setReplyBody("");
    setShowThread(false);
    setThreadEmails([]);
    await markAsRead(email);
  };

  // Fetch thread for an email
  const loadThread = async (email: Email) => {
    const threadId = email.thread_id || email.id;
    try {
      const res = await fetch(`/api/admin/email?thread_id=${threadId}`);
      const data = await res.json();
      if (res.ok && data.emails.length > 0) {
        setThreadEmails(data.emails);
        setShowThread(true);
      } else {
        toast.info("No thread found — this is a standalone email");
      }
    } catch {
      toast.error("Failed to load thread");
    }
  };

  // Delete single email (with confirmation)
  const deleteEmail = async (emailId: string) => {
    if (confirmDelete !== emailId) {
      setConfirmDelete(emailId);
      return;
    }
    setConfirmDelete(null);
    try {
      const res = await fetch("/api/admin/email", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailId }),
      });
      if (res.ok) {
        toast.success("Email deleted");
        setEmails((prev) => prev.filter((e) => e.id !== emailId));
        setTotal((prev) => prev - 1);
        if (selectedEmail?.id === emailId) setSelectedEmail(null);
      } else {
        toast.error("Failed to delete");
      }
    } catch {
      toast.error("Failed to delete email");
    }
  };

  // Bulk actions
  const bulkMarkAsRead = async () => {
    const ids = Array.from(selectedIds);
    try {
      const res = await fetch("/api/admin/email", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailIds: ids }),
      });
      if (res.ok) {
        toast.success(`${ids.length} email${ids.length > 1 ? "s" : ""} marked as read`);
        setEmails((prev) =>
          prev.map((e) =>
            ids.includes(e.id) ? { ...e, status: "read", read_at: new Date().toISOString() } : e
          )
        );
        setSelectedIds(new Set());
      }
    } catch {
      toast.error("Failed to update");
    }
  };

  const bulkDelete = async () => {
    if (!confirmBulkDelete) {
      setConfirmBulkDelete(true);
      return;
    }
    setConfirmBulkDelete(false);
    const ids = Array.from(selectedIds);
    try {
      const res = await fetch("/api/admin/email", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailIds: ids }),
      });
      if (res.ok) {
        toast.success(`${ids.length} email${ids.length > 1 ? "s" : ""} deleted`);
        setEmails((prev) => prev.filter((e) => !ids.includes(e.id)));
        setTotal((prev) => prev - ids.length);
        setSelectedIds(new Set());
      }
    } catch {
      toast.error("Failed to delete");
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === emails.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(emails.map((e) => e.id)));
    }
  };

  const handleSend = async () => {
    if (!composeTo || !composeSubject || !composeBody) {
      toast.error("Please fill in all fields");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/admin/email/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: composeTo,
          subject: composeSubject,
          bodyHtml: wrapInBrandedTemplate(composeBody),
          bodyText: composeBody,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Email sent!");
        setShowCompose(false);
        setComposeTo("");
        setComposeSubject("");
        setComposeBody("");
        if (tab === "sent") fetchEmails();
      } else {
        toast.error(data.error || "Failed to send");
      }
    } catch {
      toast.error("Failed to send email");
    } finally {
      setSending(false);
    }
  };

  const handleReply = async () => {
    if (!selectedEmail || !replyBody) {
      toast.error("Please enter a reply");
      return;
    }

    setSending(true);
    try {
      const replySubject = selectedEmail.subject.startsWith("Re:")
        ? selectedEmail.subject
        : `Re: ${selectedEmail.subject}`;

      const res = await fetch("/api/admin/email/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: selectedEmail.from_email,
          subject: replySubject,
          bodyHtml: wrapInBrandedTemplate(replyBody, true, selectedEmail),
          bodyText: `${replyBody}\n\n---\nOn ${new Date(selectedEmail.created_at).toLocaleString()}, ${selectedEmail.from_name || selectedEmail.from_email} wrote:\n${selectedEmail.body_text || ""}`,
          replyToEmailId: selectedEmail.id,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Reply sent!");
        setShowReply(false);
        setReplyBody("");
        setSelectedEmail((prev) =>
          prev ? { ...prev, status: "replied", replied_at: new Date().toISOString() } : null
        );
        setEmails((prev) =>
          prev.map((e) =>
            e.id === selectedEmail.id
              ? { ...e, status: "replied", replied_at: new Date().toISOString() }
              : e
          )
        );
      } else {
        toast.error(data.error || "Failed to send reply");
      }
    } catch {
      toast.error("Failed to send reply");
    } finally {
      setSending(false);
    }
  };

  // unreadCount uses totalUnread from dedicated API call (not just current page)

  const getStatusBadge = (email: Email) => {
    if (email.direction === "inbound") {
      if (email.status === "received")
        return <Badge className="bg-blue-500 text-white text-[10px]">New</Badge>;
      if (email.status === "replied")
        return <Badge variant="outline" className="text-green-500 border-green-500/30 text-[10px]">Replied</Badge>;
      return null;
    }
    const isAutoSent = email.metadata?.auto_sent === true;
    if (email.status === "delivered")
      return (
        <span className="flex items-center gap-1">
          <Badge variant="outline" className="text-green-500 border-green-500/30 text-[10px]">Delivered</Badge>
          {isAutoSent && <Badge variant="outline" className="text-violet-500 border-violet-500/30 text-[10px]"><Bot className="h-2.5 w-2.5 mr-0.5" />AI</Badge>}
        </span>
      );
    if (email.status === "bounced")
      return <Badge variant="outline" className="text-red-500 border-red-500/30 text-[10px]">Bounced</Badge>;
    if (email.status === "sent")
      return (
        <span className="flex items-center gap-1">
          <Badge variant="outline" className="text-blue-500 border-blue-500/30 text-[10px]">Sent</Badge>
          {isAutoSent && <Badge variant="outline" className="text-violet-500 border-violet-500/30 text-[10px]"><Bot className="h-2.5 w-2.5 mr-0.5" />AI</Badge>}
        </span>
      );
    return null;
  };

  // Render a single email message (used in detail and thread view)
  const renderEmailMessage = (email: Email, isThread = false) => (
    <div key={email.id} className={`space-y-3 ${isThread ? "pb-4 border-b last:border-b-0" : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">
              {email.direction === "inbound" ? (
                <>{email.from_name || email.from_email}</>
              ) : (
                <span className="text-pink-500">EXA Models</span>
              )}
            </p>
            {email.direction === "inbound" ? (
              <Badge variant="outline" className="text-[9px]">Received</Badge>
            ) : (
              <Badge variant="outline" className="text-[9px] border-pink-500/30 text-pink-500">Sent</Badge>
            )}
            {email.metadata?.auto_sent && (
              <Badge variant="outline" className="text-[9px] border-violet-500/30 text-violet-500">
                <Bot className="h-2.5 w-2.5 mr-0.5" />AI
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {email.direction === "inbound"
              ? `${email.from_email} → ${email.to_email}`
              : `${email.from_email} → ${email.to_email}`}
          </p>
        </div>
        <p className="text-xs text-muted-foreground whitespace-nowrap">
          {new Date(email.created_at).toLocaleString()}
        </p>
      </div>

      <div>
        {email.body_html ? (
          <iframe
            srcDoc={email.body_html}
            sandbox="allow-same-origin"
            className="w-full min-h-[200px] border rounded-lg bg-white"
            style={{ height: "auto" }}
            onLoad={(e) => {
              const iframe = e.target as HTMLIFrameElement;
              try {
                if (iframe.contentDocument?.body) {
                  iframe.style.height = Math.max(200, iframe.contentDocument.body.scrollHeight + 32) + "px";
                }
              } catch { /* cross-origin fallback */ }
            }}
            title="Email content"
          />
        ) : (
          <pre className="whitespace-pre-wrap text-sm font-sans text-muted-foreground">
            {email.body_text || "(no content)"}
          </pre>
        )}
      </div>
    </div>
  );

  // Thread view
  if (showThread && selectedEmail && threadEmails.length > 0) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setShowThread(false)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to email
          </Button>
          <h1 className="text-lg font-semibold truncate flex-1">
            Thread: {selectedEmail.subject}
          </h1>
          <Badge variant="outline" className="text-[10px]">
            {threadEmails.length} message{threadEmails.length > 1 ? "s" : ""}
          </Badge>
        </div>

        <Card>
          <CardContent className="p-6 space-y-6">
            {threadEmails.map((email) => renderEmailMessage(email, true))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Detail view
  if (selectedEmail) {
    // Always show thread button — thread_id means it's part of a thread,
    // and any email could have replies not on the current page
    const hasThread = !!selectedEmail.thread_id || selectedEmail.status === "replied";

    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedEmail(null)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-lg font-semibold truncate flex-1">
            {selectedEmail.subject}
          </h1>
          {getStatusBadge(selectedEmail)}
          <div className="flex items-center gap-1">
            {hasThread && (
              <Button variant="ghost" size="sm" onClick={() => loadThread(selectedEmail)} title="View thread">
                <MessageSquare className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className={confirmDelete === selectedEmail.id ? "text-white bg-red-500 hover:bg-red-600" : "text-red-500 hover:text-red-600 hover:bg-red-500/10"}
              onClick={() => deleteEmail(selectedEmail.id)}
              onBlur={() => setConfirmDelete(null)}
              title={confirmDelete === selectedEmail.id ? "Click again to confirm" : "Delete email"}
            >
              <Trash2 className="h-4 w-4" />
              {confirmDelete === selectedEmail.id && <span className="ml-1 text-xs">Confirm?</span>}
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="font-medium">
                  {selectedEmail.direction === "inbound" ? "From" : "To"}:{" "}
                  <span className="text-foreground">
                    {selectedEmail.direction === "inbound"
                      ? selectedEmail.from_name
                        ? `${selectedEmail.from_name} <${selectedEmail.from_email}>`
                        : selectedEmail.from_email
                      : selectedEmail.to_email}
                  </span>
                </p>
                {selectedEmail.direction === "inbound" && (
                  <p className="text-sm text-muted-foreground">
                    To: {selectedEmail.to_email}
                  </p>
                )}
                {selectedEmail.direction === "outbound" && (
                  <p className="text-sm text-muted-foreground">
                    From: {selectedEmail.from_email}
                  </p>
                )}
              </div>
              <p className="text-sm text-muted-foreground whitespace-nowrap">
                {new Date(selectedEmail.created_at).toLocaleString()}
              </p>
            </div>

            {/* AI info + Linked user */}
            {(selectedEmail.ai_category || selectedEmail.metadata?.linked_actor_type) && (
              <div className="flex items-center gap-3 flex-wrap text-xs">
                {selectedEmail.ai_category && (
                  <div className="flex items-center gap-1.5">
                    <Bot className="h-3 w-3 text-violet-400" />
                    <Badge variant="outline" className="text-[10px] border-violet-500/30 text-violet-500">
                      {selectedEmail.ai_category.replace(/_/g, " ")}
                    </Badge>
                    {selectedEmail.ai_summary && (
                      <span className="text-muted-foreground">{selectedEmail.ai_summary}</span>
                    )}
                  </div>
                )}
                {selectedEmail.metadata?.linked_actor_type && (
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px]">
                      {selectedEmail.metadata.linked_actor_type}
                    </Badge>
                    <span className="text-muted-foreground">
                      Registered {selectedEmail.metadata.linked_actor_type}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Body */}
            <div className="border-t pt-4">
              {selectedEmail.body_html ? (
                <iframe
                  srcDoc={selectedEmail.body_html}
                  sandbox="allow-same-origin"
                  className="w-full min-h-[300px] border rounded-lg bg-white"
                  style={{ height: "auto" }}
                  onLoad={(e) => {
                    const iframe = e.target as HTMLIFrameElement;
                    try {
                      if (iframe.contentDocument?.body) {
                        iframe.style.height = Math.max(300, iframe.contentDocument.body.scrollHeight + 32) + "px";
                      }
                    } catch { /* cross-origin fallback */ }
                  }}
                  title="Email content"
                />
              ) : (
                <pre className="whitespace-pre-wrap text-sm font-sans">
                  {selectedEmail.body_text || "(no content)"}
                </pre>
              )}
            </div>

            {/* AI Draft */}
            {selectedEmail.direction === "inbound" && selectedEmail.ai_draft_text && selectedEmail.status !== "replied" && (
              <div className="border-t pt-4">
                <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-violet-500" />
                      <span className="text-sm font-medium">AI Draft Reply</span>
                      {selectedEmail.ai_category && (
                        <Badge variant="outline" className="text-[10px] border-violet-500/30 text-violet-500">
                          {selectedEmail.ai_category.replace(/_/g, " ")}
                        </Badge>
                      )}
                      {selectedEmail.ai_confidence != null && (
                        <span className="text-[10px] text-muted-foreground">
                          {Math.round(selectedEmail.ai_confidence * 100)}% confidence
                        </span>
                      )}
                    </div>
                  </div>

                  {selectedEmail.ai_summary && (
                    <p className="text-xs text-muted-foreground italic">
                      Summary: {selectedEmail.ai_summary}
                    </p>
                  )}

                  <div className="bg-background rounded-md p-3 text-sm whitespace-pre-wrap border">
                    {selectedEmail.ai_draft_text}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-pink-500 to-violet-500"
                      disabled={sending}
                      onClick={async () => {
                        // Send the AI draft immediately without editing
                        setSending(true);
                        try {
                          const draftText = selectedEmail.ai_draft_text || "";
                          const replySubject = selectedEmail.subject.startsWith("Re:")
                            ? selectedEmail.subject
                            : `Re: ${selectedEmail.subject}`;
                          const res = await fetch("/api/admin/email/reply", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              to: selectedEmail.from_email,
                              subject: replySubject,
                              bodyHtml: wrapInBrandedTemplate(draftText, true, selectedEmail),
                              bodyText: draftText,
                              replyToEmailId: selectedEmail.id,
                            }),
                          });
                          if (res.ok) {
                            toast.success("AI draft sent!");
                            setSelectedEmail((prev) =>
                              prev ? { ...prev, status: "replied", replied_at: new Date().toISOString() } : null
                            );
                            setEmails((prev) =>
                              prev.map((e) =>
                                e.id === selectedEmail.id ? { ...e, status: "replied", replied_at: new Date().toISOString() } : e
                              )
                            );
                          } else {
                            const data = await res.json();
                            toast.error(data.error || "Failed to send");
                          }
                        } catch {
                          toast.error("Failed to send");
                        } finally {
                          setSending(false);
                        }
                      }}
                    >
                      {sending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                      Send Draft
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setReplyBody(selectedEmail.ai_draft_text || "");
                        setShowReply(true);
                      }}
                    >
                      Edit Draft
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground"
                      onClick={() => setShowReply(true)}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Ignore
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Reply */}
            {selectedEmail.direction === "inbound" && (
              <div className="border-t pt-4">
                {showReply ? (
                  <div className="space-y-3">
                    <Textarea
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      placeholder="Type your reply..."
                      rows={6}
                      className="resize-none"
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={handleReply}
                        disabled={sending || !replyBody.trim()}
                        className="bg-gradient-to-r from-pink-500 to-violet-500"
                      >
                        {sending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Send Reply
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setShowReply(false);
                          setReplyBody("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => setShowReply(true)}>
                      <Reply className="h-4 w-4 mr-2" />
                      Reply
                    </Button>
                    {hasThread && (
                      <Button variant="outline" onClick={() => loadThread(selectedEmail)}>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        View Thread
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // List view
  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6 text-pink-500" />
            Email
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Send and receive emails via Resend
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch
              checked={autoReplyEnabled}
              onCheckedChange={toggleAutoReply}
              disabled={autoReplyLoading}
            />
            <label className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer">
              <Bot className="h-3 w-3" />
              Auto-reply
            </label>
          </div>
          <Button
            onClick={() => setShowCompose(true)}
            className="bg-gradient-to-r from-pink-500 to-violet-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Compose
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b">
        <button
          onClick={() => handleTabChange("inbox")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "inbox"
              ? "border-pink-500 text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Inbox className="h-4 w-4" />
          Inbox
          {tab === "inbox" && totalUnread > 0 && (
            <Badge className="bg-pink-500 text-white text-[10px] px-1.5 py-0">
              {totalUnread}
            </Badge>
          )}
        </button>
        <button
          onClick={() => handleTabChange("sent")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "sent"
              ? "border-pink-500 text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Send className="h-4 w-4" />
          Sent
        </button>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={fetchEmails} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-muted/50 rounded-lg border">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <div className="flex-1" />
          {tab === "inbox" && (
            <Button variant="outline" size="sm" onClick={bulkMarkAsRead}>
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              Mark Read
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className={confirmBulkDelete ? "text-white bg-red-500 border-red-500 hover:bg-red-600" : "text-red-500 border-red-500/30 hover:bg-red-500/10"}
            onClick={bulkDelete}
            onBlur={() => setConfirmBulkDelete(false)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            {confirmBulkDelete ? "Confirm Delete?" : "Delete"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email, name, or subject..."
          className="pl-10"
        />
      </div>

      {/* Email List */}
      <Card>
        <CardContent className="p-0 divide-y">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : emails.length === 0 ? (
            <div className="text-center py-16">
              <div className="p-4 rounded-full bg-muted inline-block mb-4">
                {tab === "inbox" ? (
                  <Inbox className="h-8 w-8 text-muted-foreground" />
                ) : (
                  <Send className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <p className="text-muted-foreground">
                {tab === "inbox" ? "No emails received yet" : "No emails sent yet"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {tab === "inbox"
                  ? "Replies to your emails will appear here automatically"
                  : "Emails you send will be tracked here"}
              </p>
            </div>
          ) : (
            <>
              {/* Select all row */}
              {emails.length > 0 && (
                <div className="flex items-center gap-3 px-4 py-2 bg-muted/30">
                  <Checkbox
                    checked={selectedIds.size === emails.length && emails.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                  <span className="text-xs text-muted-foreground">
                    {selectedIds.size === emails.length ? "Deselect all" : "Select all"}
                  </span>
                </div>
              )}
              {emails.map((email) => {
                const isUnread =
                  email.direction === "inbound" && email.status === "received";
                const isSelected = selectedIds.has(email.id);
                return (
                  <div
                    key={email.id}
                    className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors ${
                      isUnread ? "bg-blue-500/5" : ""
                    } ${isSelected ? "bg-pink-500/5" : ""}`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelect(email.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button
                      onClick={() => openEmail(email)}
                      className="flex-1 flex items-center gap-3 text-left min-w-0"
                    >
                      <div className="flex-shrink-0">
                        {isUnread ? (
                          <Mail className="h-4 w-4 text-blue-500" />
                        ) : (
                          <MailOpen className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p
                            className={`text-sm truncate ${
                              isUnread ? "font-semibold" : "font-medium"
                            }`}
                          >
                            {email.direction === "inbound"
                              ? email.from_name || email.from_email
                              : `To: ${email.to_email}`}
                          </p>
                          {getStatusBadge(email)}
                          {email.ai_category === "spam" && (
                            <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-400">spam</Badge>
                          )}
                          {email.thread_id && (
                            <MessageSquare className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                        <p
                          className={`text-sm truncate ${
                            email.ai_category === "spam"
                              ? "text-muted-foreground/50 line-through"
                              : isUnread
                                ? "text-foreground font-medium"
                                : "text-muted-foreground"
                          }`}
                        >
                          {email.subject}
                        </p>
                        {email.ai_summary ? (
                          <p className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-1">
                            <Bot className="h-3 w-3 inline flex-shrink-0 text-violet-400" />
                            {email.ai_summary}
                          </p>
                        ) : email.body_text ? (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {email.body_text.slice(0, 100)}
                          </p>
                        ) : null}
                      </div>

                      <p className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                        {formatDistanceToNow(new Date(email.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </button>
                  </div>
                );
              })}
            </>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {total} email{total === 1 ? "" : "s"} total
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Compose Dialog */}
      <Dialog open={showCompose} onOpenChange={setShowCompose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Input
                value={composeTo}
                onChange={(e) => setComposeTo(e.target.value)}
                placeholder="To: email@example.com"
                type="email"
              />
            </div>
            <div>
              <Input
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                placeholder="Subject"
              />
            </div>
            <div>
              <Textarea
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                placeholder="Type your message..."
                rows={8}
                className="resize-none"
              />
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-pink-500" />
              Sent with EXA Models branded template
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowCompose(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSend}
                disabled={sending || !composeTo || !composeSubject || !composeBody.trim()}
                className="bg-gradient-to-r from-pink-500 to-violet-500"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
