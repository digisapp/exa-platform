"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
      setAutoReplyEnabled(!enabled);
      toast.error("Failed to update setting");
    }
  };

  // Reset page when switching tabs
  useEffect(() => {
    setPage(1);
    setSelectedEmail(null);
  }, [tab]);

  // Escape key to go back from detail view
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedEmail && !showReply && !showCompose) {
        setSelectedEmail(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedEmail, showReply, showCompose]);

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
      // Update local state
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
    await markAsRead(email);
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
          bodyHtml: `<div style="font-family: sans-serif; font-size: 14px; line-height: 1.6; color: #333;">${composeBody.replace(/\n/g, "<br>")}</div>`,
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
          bodyHtml: `<div style="font-family: sans-serif; font-size: 14px; line-height: 1.6; color: #333;">${replyBody.replace(/\n/g, "<br>")}</div>
            <br><br>
            <div style="border-left: 2px solid #ccc; padding-left: 12px; margin-top: 16px; color: #666;">
              <p style="font-size: 12px; color: #999;">On ${new Date(selectedEmail.created_at).toLocaleString()}, ${selectedEmail.from_name || selectedEmail.from_email} wrote:</p>
              ${selectedEmail.body_html || `<p>${selectedEmail.body_text || ""}</p>`}
            </div>`,
          bodyText: `${replyBody}\n\n---\nOn ${new Date(selectedEmail.created_at).toLocaleString()}, ${selectedEmail.from_name || selectedEmail.from_email} wrote:\n${selectedEmail.body_text || ""}`,
          replyToEmailId: selectedEmail.id,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Reply sent!");
        setShowReply(false);
        setReplyBody("");
        // Update the email status in local state
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

  const unreadCount = emails.filter(
    (e) => e.direction === "inbound" && e.status === "received"
  ).length;

  const getStatusBadge = (email: Email) => {
    if (email.direction === "inbound") {
      if (email.status === "received")
        return <Badge className="bg-blue-500 text-white text-[10px]">New</Badge>;
      if (email.status === "replied")
        return <Badge variant="outline" className="text-green-500 border-green-500/30 text-[10px]">Replied</Badge>;
      return null;
    }
    // outbound
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

  // Detail view
  if (selectedEmail) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedEmail(null)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-lg font-semibold truncate flex-1">
            {selectedEmail.subject}
          </h1>
          {getStatusBadge(selectedEmail)}
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

            {/* Body — sandboxed iframe for HTML, plain text fallback */}
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
                    } catch {
                      // Cross-origin fallback
                    }
                  }}
                  title="Email content"
                />
              ) : (
                <pre className="whitespace-pre-wrap text-sm font-sans">
                  {selectedEmail.body_text || "(no content)"}
                </pre>
              )}
            </div>

            {/* AI Draft — show when available for inbound emails that haven't been replied to */}
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
                      onClick={() => {
                        setReplyBody(selectedEmail.ai_draft_text || "");
                        setShowReply(true);
                      }}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Use Draft
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

            {/* Reply button for inbound */}
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
                  <Button
                    variant="outline"
                    onClick={() => setShowReply(true)}
                  >
                    <Reply className="h-4 w-4 mr-2" />
                    Reply
                  </Button>
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
          {tab === "inbox" && unreadCount > 0 && (
            <Badge className="bg-pink-500 text-white text-[10px] px-1.5 py-0">
              {unreadCount}
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
            emails.map((email) => {
              const isUnread =
                email.direction === "inbound" && email.status === "received";
              return (
                <button
                  key={email.id}
                  onClick={() => openEmail(email)}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors ${
                    isUnread ? "bg-blue-500/5" : ""
                  }`}
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
              );
            })
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
