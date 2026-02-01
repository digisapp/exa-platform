"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Phone,
  Search,
  Loader2,
  User,
  Instagram,
  Mail,
  MessageSquare,
  Tag,
  Plus,
  ExternalLink,
  PhoneCall,
  Send,
  Filter,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface CallRequest {
  id: string;
  name: string;
  instagram_handle: string | null;
  phone: string;
  email: string | null;
  message: string | null;
  source: string;
  source_detail: string | null;
  call_type: string | null;
  priority: string;
  status: string;
  scheduled_at: string | null;
  completed_at: string | null;
  outcome: string | null;
  created_at: string;
  model?: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    profile_photo_url: string | null;
  };
  notes?: Note[];
  tags?: { tag: CrmTag }[];
}

interface Note {
  id: string;
  content: string;
  note_type: string;
  created_by: string | null;
  created_at: string;
}

interface CrmTag {
  id: string;
  name: string;
  color: string;
}

export default function AdminCrmPage() {
  const [callRequests, setCallRequests] = useState<CallRequest[]>([]);
  const [tags, setTags] = useState<CrmTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [sourceFilter, setSourceFilter] = useState("all");

  // Dialog states
  const [selectedRequest, setSelectedRequest] = useState<CallRequest | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, sourceFilter]);

  const fetchData = async () => {
    const supabase = createClient();
    setLoading(true);

    try {
      // Fetch tags
      const { data: tagsData } = await (supabase as any)
        .from("crm_tags")
        .select("*")
        .order("name");

      setTags(tagsData || []);

      // Fetch call requests
      let query = (supabase as any)
        .from("call_requests")
        .select(`
          *,
          model:models(id, username, first_name, last_name, profile_photo_url),
          notes:call_notes(id, content, note_type, created_by, created_at),
          tags:call_request_tags(tag:crm_tags(*))
        `)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (sourceFilter !== "all") {
        query = query.eq("source", sourceFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setCallRequests(data || []);
    } catch (error) {
      console.error("Failed to fetch CRM data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const supabase = createClient();

    try {
      const updateData: any = { status };
      if (status === "completed") {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await (supabase as any)
        .from("call_requests")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;

      // Log activity
      await (supabase as any)
        .from("crm_activities")
        .insert({
          call_request_id: id,
          activity_type: "status_changed",
          description: `Status changed to ${status}`,
        });

      toast.success("Status updated");
      fetchData();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const updateCallType = async (id: string, callType: string) => {
    const supabase = createClient();

    try {
      const { error: updateError } = await (supabase as any)
        .from("call_requests")
        .update({ call_type: callType })
        .eq("id", id);

      if (updateError) throw updateError;
      toast.success("Call type updated");
      fetchData();
    } catch {
      toast.error("Failed to update call type");
    }
  };

  const updatePriority = async (id: string, priority: string) => {
    const supabase = createClient();

    try {
      const { error: updateError } = await (supabase as any)
        .from("call_requests")
        .update({ priority })
        .eq("id", id);

      if (updateError) throw updateError;
      toast.success("Priority updated");
      fetchData();
    } catch {
      toast.error("Failed to update priority");
    }
  };

  const addNote = async () => {
    if (!selectedRequest || !newNote.trim()) return;

    setSavingNote(true);
    const supabase = createClient();

    try {
      const { error: insertError } = await (supabase as any)
        .from("call_notes")
        .insert({
          call_request_id: selectedRequest.id,
          content: newNote.trim(),
          note_type: "general",
          created_by: "Admin", // TODO: Get actual admin name
        });

      if (insertError) throw insertError;

      // Log activity
      await (supabase as any)
        .from("crm_activities")
        .insert({
          call_request_id: selectedRequest.id,
          activity_type: "note_added",
          description: "Note added",
        });

      toast.success("Note added");
      setNewNote("");
      fetchData();

      // Update selected request
      const { data: updated } = await (supabase as any)
        .from("call_requests")
        .select(`
          *,
          model:models(id, username, first_name, last_name, profile_photo_url),
          notes:call_notes(id, content, note_type, created_by, created_at),
          tags:call_request_tags(tag:crm_tags(*))
        `)
        .eq("id", selectedRequest.id)
        .single();

      if (updated) setSelectedRequest(updated);
    } catch {
      toast.error("Failed to add note");
    } finally {
      setSavingNote(false);
    }
  };

  const addTag = async (tagId: string) => {
    if (!selectedRequest) return;

    const supabase = createClient();

    try {
      const { error: insertError } = await (supabase as any)
        .from("call_request_tags")
        .insert({
          call_request_id: selectedRequest.id,
          tag_id: tagId,
          added_by: "Admin",
        });

      if (insertError) throw insertError;
      toast.success("Tag added");
      fetchData();
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && err.code === "23505") {
        toast.error("Tag already added");
      } else {
        toast.error("Failed to add tag");
      }
    }
  };

  const removeTag = async (tagId: string) => {
    if (!selectedRequest) return;

    const supabase = createClient();

    try {
      const { error: deleteError } = await (supabase as any)
        .from("call_request_tags")
        .delete()
        .eq("call_request_id", selectedRequest.id)
        .eq("tag_id", tagId);

      if (deleteError) throw deleteError;
      toast.success("Tag removed");
      fetchData();
    } catch {
      toast.error("Failed to remove tag");
    }
  };

  const openDetails = (request: CallRequest) => {
    setSelectedRequest(request);
    setDetailsOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-amber-500";
      case "scheduled": return "bg-blue-500";
      case "in_progress": return "bg-purple-500";
      case "completed": return "bg-green-500";
      case "no_answer": return "bg-red-500";
      case "voicemail": return "bg-indigo-500";
      case "cancelled": return "bg-gray-500";
      case "spam": return "bg-red-700";
      default: return "bg-gray-500";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-500";
      case "high": return "bg-orange-500";
      case "normal": return "bg-blue-500";
      case "low": return "bg-gray-500";
      default: return "bg-blue-500";
    }
  };

  const filteredRequests = callRequests.filter((req) => {
    const query = searchQuery.toLowerCase();
    return (
      req.name.toLowerCase().includes(query) ||
      req.phone.includes(query) ||
      req.instagram_handle?.toLowerCase().includes(query) ||
      req.email?.toLowerCase().includes(query)
    );
  });

  // Stats
  const stats = {
    total: callRequests.length,
    pending: callRequests.filter(r => r.status === "pending").length,
    scheduled: callRequests.filter(r => r.status === "scheduled").length,
    completed: callRequests.filter(r => r.status === "completed").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Phone className="h-7 w-7 text-pink-500" />
            Call Requests & CRM
          </h1>
          <p className="text-muted-foreground">
            Manage incoming call requests and model relationships
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/call`)}>
            Copy Public Link
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Total Requests</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-500/30">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold text-amber-500">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-500/30">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Scheduled</p>
            <p className="text-2xl font-bold text-blue-500">{stats.scheduled}</p>
          </CardContent>
        </Card>
        <Card className="border-green-500/30">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold text-green-500">{stats.completed}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, Instagram..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="no_answer">No Answer</SelectItem>
            <SelectItem value="voicemail">Voicemail</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[150px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="dashboard">Dashboard</SelectItem>
            <SelectItem value="website">Website</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Call Requests List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
        </div>
      ) : filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Phone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No call requests found</h3>
            <p className="text-muted-foreground">
              Share your call link to start receiving requests
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((request) => (
            <Card
              key={request.id}
              className="hover:border-pink-500/30 transition-all cursor-pointer"
              onClick={() => openDetails(request)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                    {request.model?.profile_photo_url ? (
                      <Image
                        src={request.model.profile_photo_url}
                        alt={request.name}
                        width={48}
                        height={48}
                        className="object-cover"
                      />
                    ) : (
                      <User className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{request.name}</span>
                      {request.model && (
                        <Badge variant="outline" className="text-xs">
                          EXA Model
                        </Badge>
                      )}
                      <Badge className={getStatusColor(request.status)}>
                        {request.status.replace("_", " ")}
                      </Badge>
                      <Badge className={getPriorityColor(request.priority)} variant="outline">
                        {request.priority}
                      </Badge>
                      {request.tags?.map((t) => (
                        <Badge
                          key={t.tag.id}
                          style={{ backgroundColor: t.tag.color }}
                          className="text-white text-xs"
                        >
                          {t.tag.name}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {request.phone}
                      </span>
                      {request.instagram_handle && (
                        <span className="flex items-center gap-1">
                          <Instagram className="h-3 w-3" />
                          @{request.instagram_handle}
                        </span>
                      )}
                      <span>Source: {request.source}</span>
                      <span>{formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}</span>
                    </div>
                    {request.message && (
                      <p className="text-sm text-muted-foreground mt-1 truncate">
                        &ldquo;{request.message}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <a href={`tel:${request.phone}`}>
                      <Button size="sm" className="bg-green-500 hover:bg-green-600">
                        <PhoneCall className="h-4 w-4" />
                      </Button>
                    </a>
                    <Select
                      value={request.status}
                      onValueChange={(v) => updateStatus(request.id, v)}
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="no_answer">No Answer</SelectItem>
                        <SelectItem value="voicemail">Voicemail</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="spam">Spam</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Call Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-6 py-4">
              {/* Contact Info */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Contact Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                      {selectedRequest.model?.profile_photo_url ? (
                        <Image
                          src={selectedRequest.model.profile_photo_url}
                          alt={selectedRequest.name}
                          width={64}
                          height={64}
                          className="object-cover"
                        />
                      ) : (
                        <User className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg">{selectedRequest.name}</h3>
                        {selectedRequest.model && (
                          <Link href={`/admin/models/${selectedRequest.model.id}`}>
                            <Badge variant="outline" className="cursor-pointer">
                              View EXA Profile <ExternalLink className="h-3 w-3 ml-1" />
                            </Badge>
                          </Link>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <a
                          href={`tel:${selectedRequest.phone}`}
                          className="flex items-center gap-2 text-green-500 hover:underline"
                        >
                          <Phone className="h-4 w-4" />
                          {selectedRequest.phone}
                        </a>
                        {selectedRequest.instagram_handle && (
                          <a
                            href={`https://instagram.com/${selectedRequest.instagram_handle}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-pink-500 hover:underline"
                          >
                            <Instagram className="h-4 w-4" />
                            @{selectedRequest.instagram_handle}
                          </a>
                        )}
                        {selectedRequest.email && (
                          <a
                            href={`mailto:${selectedRequest.email}`}
                            className="flex items-center gap-2 text-blue-500 hover:underline"
                          >
                            <Mail className="h-4 w-4" />
                            {selectedRequest.email}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  {selectedRequest.message && (
                    <div className="mt-4 p-3 rounded-lg bg-muted">
                      <p className="text-sm text-muted-foreground mb-1">Message:</p>
                      <p className="text-sm">{selectedRequest.message}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Status & Settings */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={selectedRequest.status}
                    onValueChange={(v) => {
                      updateStatus(selectedRequest.id, v);
                      setSelectedRequest({ ...selectedRequest, status: v });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="no_answer">No Answer</SelectItem>
                      <SelectItem value="voicemail">Voicemail</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="spam">Spam</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Call Type</label>
                  <Select
                    value={selectedRequest.call_type || "none"}
                    onValueChange={(v) => {
                      updateCallType(selectedRequest.id, v === "none" ? "" : v);
                      setSelectedRequest({ ...selectedRequest, call_type: v === "none" ? null : v });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not Set</SelectItem>
                      <SelectItem value="onboarding">Onboarding</SelectItem>
                      <SelectItem value="support">Support</SelectItem>
                      <SelectItem value="opportunity">Opportunity</SelectItem>
                      <SelectItem value="check-in">Check-in</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Priority</label>
                  <Select
                    value={selectedRequest.priority}
                    onValueChange={(v) => {
                      updatePriority(selectedRequest.id, v);
                      setSelectedRequest({ ...selectedRequest, priority: v });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tags */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Tags
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedRequest.tags?.map((t) => (
                      <Badge
                        key={t.tag.id}
                        style={{ backgroundColor: t.tag.color }}
                        className="text-white cursor-pointer"
                        onClick={() => removeTag(t.tag.id)}
                      >
                        {t.tag.name} ×
                      </Badge>
                    ))}
                    {(!selectedRequest.tags || selectedRequest.tags.length === 0) && (
                      <span className="text-sm text-muted-foreground">No tags</span>
                    )}
                  </div>
                  <Select onValueChange={addTag}>
                    <SelectTrigger className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Add a tag..." />
                    </SelectTrigger>
                    <SelectContent>
                      {tags.map((tag) => (
                        <SelectItem key={tag.id} value={tag.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: tag.color }}
                            />
                            {tag.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* Notes */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 mb-4">
                    {selectedRequest.notes?.length === 0 && (
                      <p className="text-sm text-muted-foreground">No notes yet</p>
                    )}
                    {selectedRequest.notes?.map((note) => (
                      <div key={note.id} className="p-3 rounded-lg bg-muted">
                        <p className="text-sm">{note.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {note.created_by} • {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Add a note..."
                      rows={2}
                      className="flex-1"
                    />
                    <Button onClick={addNote} disabled={savingNote || !newNote.trim()}>
                      {savingNote ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Metadata */}
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Source: {selectedRequest.source} {selectedRequest.source_detail && `(${selectedRequest.source_detail})`}</p>
                <p>Requested: {new Date(selectedRequest.created_at).toLocaleString()}</p>
                {selectedRequest.completed_at && (
                  <p>Completed: {new Date(selectedRequest.completed_at).toLocaleString()}</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
