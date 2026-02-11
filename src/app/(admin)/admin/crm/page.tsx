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
  Calendar,
  Clock,
  CheckCircle,
  Target,
  TrendingUp,
  BarChart3,
  Copy,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";

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

// Quick note templates
const NOTE_TEMPLATES = [
  { label: "Left Voicemail", text: "Left voicemail, waiting for callback." },
  { label: "No Answer", text: "Called, no answer. Will try again later." },
  { label: "Callback Requested", text: "Spoke briefly, they requested a callback at a different time." },
  { label: "Sent Info", text: "Sent onboarding information via email/DM." },
  { label: "Interested", text: "Very interested in joining EXA. Following up soon." },
  { label: "Not Ready", text: "Not ready to commit right now. Will check back in a few weeks." },
];

// Call outcomes for tracking
const CALL_OUTCOMES = [
  { value: "signed_up", label: "Signed Up", color: "bg-green-500" },
  { value: "interested", label: "Interested - Following Up", color: "bg-blue-500" },
  { value: "callback_requested", label: "Callback Requested", color: "bg-purple-500" },
  { value: "not_interested", label: "Not Interested", color: "bg-gray-500" },
  { value: "wrong_number", label: "Wrong Number", color: "bg-red-500" },
  { value: "no_decision", label: "No Decision Yet", color: "bg-amber-500" },
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function AdminCrmPage() {
  const [callRequests, setCallRequests] = useState<CallRequest[]>([]);
  const [tags, setTags] = useState<CrmTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [dayFilter, setDayFilter] = useState("all");

  // Dialog states
  const [selectedRequest, setSelectedRequest] = useState<CallRequest | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Scheduling states
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");

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
      const updateData: Record<string, unknown> = { status };
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

  const updateOutcome = async (id: string, outcome: string) => {
    const supabase = createClient();

    try {
      const { error: updateError } = await (supabase as any)
        .from("call_requests")
        .update({ outcome })
        .eq("id", id);

      if (updateError) throw updateError;

      // Log activity
      await (supabase as any)
        .from("crm_activities")
        .insert({
          call_request_id: id,
          activity_type: "status_changed",
          description: `Outcome set to ${outcome}`,
        });

      toast.success("Outcome updated");
      fetchData();

      if (selectedRequest) {
        setSelectedRequest({ ...selectedRequest, outcome });
      }
    } catch {
      toast.error("Failed to update outcome");
    }
  };

  const scheduleCallback = async () => {
    if (!selectedRequest || !scheduleDate || !scheduleTime) {
      toast.error("Please select both date and time");
      return;
    }

    const supabase = createClient();
    const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();

    try {
      const { error: updateError } = await (supabase as any)
        .from("call_requests")
        .update({
          scheduled_at: scheduledAt,
          status: "scheduled"
        })
        .eq("id", selectedRequest.id);

      if (updateError) throw updateError;

      // Log activity
      await (supabase as any)
        .from("crm_activities")
        .insert({
          call_request_id: selectedRequest.id,
          activity_type: "call_scheduled",
          description: `Call scheduled for ${format(new Date(scheduledAt), "PPp")}`,
        });

      toast.success("Callback scheduled!");
      setScheduleDate("");
      setScheduleTime("");
      fetchData();

      setSelectedRequest({
        ...selectedRequest,
        scheduled_at: scheduledAt,
        status: "scheduled"
      });
    } catch {
      toast.error("Failed to schedule callback");
    }
  };

  const addNote = async (noteText?: string) => {
    const text = noteText || newNote;
    if (!selectedRequest || !text.trim()) return;

    setSavingNote(true);
    const supabase = createClient();

    try {
      const { error: insertError } = await (supabase as any)
        .from("call_notes")
        .insert({
          call_request_id: selectedRequest.id,
          content: text.trim(),
          note_type: "general",
          created_by: "Admin",
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

  const deleteRequest = async (id: string) => {
    const supabase = createClient();
    try {
      const { error } = await (supabase as any)
        .from("call_requests")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Call request deleted");
      fetchData();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const openDetails = (request: CallRequest) => {
    setSelectedRequest(request);
    setDetailsOpen(true);
    // Pre-fill schedule if already scheduled
    if (request.scheduled_at) {
      const date = new Date(request.scheduled_at);
      setScheduleDate(format(date, "yyyy-MM-dd"));
      setScheduleTime(format(date, "HH:mm"));
    } else {
      setScheduleDate("");
      setScheduleTime("");
    }
  };

  const copyPublicLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/call`);
    toast.success("Link copied to clipboard!");
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

  // Priority color helper - reserved for future use with CRM priority tags
  const _getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-500";
      case "high": return "bg-orange-500";
      case "normal": return "bg-blue-500";
      case "low": return "bg-gray-500";
      default: return "bg-blue-500";
    }
  };
  void _getPriorityColor; // Suppress unused warning

  const filteredRequests = callRequests.filter((req) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      req.name.toLowerCase().includes(query) ||
      req.phone.includes(query) ||
      req.instagram_handle?.toLowerCase().includes(query) ||
      req.email?.toLowerCase().includes(query);

    if (!matchesSearch) return false;

    if (dayFilter !== "all" && req.scheduled_at) {
      const dayIndex = DAY_NAMES.indexOf(dayFilter);
      if (dayIndex >= 0) {
        const scheduledDay = new Date(req.scheduled_at).getDay();
        if (scheduledDay !== dayIndex) return false;
      }
    } else if (dayFilter !== "all" && !req.scheduled_at) {
      return false;
    }

    return true;
  });

  // Stats
  const stats = {
    total: callRequests.length,
    pending: callRequests.filter(r => r.status === "pending").length,
    scheduled: callRequests.filter(r => r.status === "scheduled").length,
    completed: callRequests.filter(r => r.status === "completed").length,
    signedUp: callRequests.filter(r => r.outcome === "signed_up").length,
  };

  // Conversion rate
  const conversionRate = stats.completed > 0
    ? Math.round((stats.signedUp / stats.completed) * 100)
    : 0;

  return (
    <div className="container px-4 md:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-3">
            <Phone className="h-6 w-6 md:h-7 md:w-7 text-pink-500" />
            Call Requests & CRM
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage incoming call requests and model relationships
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copyPublicLink}>
            <Copy className="h-4 w-4 mr-2" />
            Copy Link
          </Button>
          <Link href="/admin/crm/availability">
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              Availability
            </Button>
          </Link>
          <Link href="/admin/crm/analytics">
            <Button variant="outline" size="sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats - Mobile optimized grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-3 md:p-4 text-center">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-xl md:text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-500/30">
          <CardContent className="p-3 md:p-4 text-center">
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="text-xl md:text-2xl font-bold text-amber-500">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-500/30">
          <CardContent className="p-3 md:p-4 text-center">
            <p className="text-xs text-muted-foreground">Scheduled</p>
            <p className="text-xl md:text-2xl font-bold text-blue-500">{stats.scheduled}</p>
          </CardContent>
        </Card>
        <Card className="border-green-500/30">
          <CardContent className="p-3 md:p-4 text-center">
            <p className="text-xs text-muted-foreground">Completed</p>
            <p className="text-xl md:text-2xl font-bold text-green-500">{stats.completed}</p>
          </CardContent>
        </Card>
        <Card className="border-pink-500/30 col-span-2 md:col-span-1">
          <CardContent className="p-3 md:p-4 text-center">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Conversion
            </p>
            <p className="text-xl md:text-2xl font-bold text-pink-500">{conversionRate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters - Mobile optimized */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, phone, IG..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]">
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
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[130px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="gig-email">Gig Email</SelectItem>
              <SelectItem value="dashboard">Dashboard</SelectItem>
              <SelectItem value="website">Website</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Day Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        <Button
          variant={dayFilter === "all" ? "default" : "outline"}
          size="sm"
          className={`text-xs h-8 ${dayFilter === "all" ? "bg-pink-500 hover:bg-pink-600" : ""}`}
          onClick={() => setDayFilter("all")}
        >
          All
        </Button>
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => {
          const count = callRequests.filter((r) => {
            if (!r.scheduled_at) return false;
            return DAY_NAMES[new Date(r.scheduled_at).getDay()] === day;
          }).length;
          return (
            <Button
              key={day}
              variant={dayFilter === day ? "default" : "outline"}
              size="sm"
              className={`text-xs h-8 ${dayFilter === day ? "bg-pink-500 hover:bg-pink-600" : ""}`}
              onClick={() => setDayFilter(day)}
            >
              {day}
              {count > 0 && (
                <span className="ml-1 text-[10px] opacity-70">({count})</span>
              )}
            </Button>
          );
        })}
      </div>

      {/* Call Requests List - Mobile optimized */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
        </div>
      ) : filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="p-8 md:p-12 text-center">
            <Phone className="h-10 w-10 md:h-12 md:w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No call requests found</h3>
            <p className="text-muted-foreground text-sm">
              Share your call link to start receiving requests
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredRequests.map((request) => (
            <Card
              key={request.id}
              className="hover:border-pink-500/30 transition-all cursor-pointer"
              onClick={() => openDetails(request)}
            >
              <CardContent className="p-3 md:p-4">
                <div className="flex items-start md:items-center gap-3">
                  {/* Avatar - Hidden on very small screens */}
                  <div className="hidden sm:flex w-10 h-10 md:w-12 md:h-12 rounded-full bg-muted items-center justify-center overflow-hidden flex-shrink-0">
                    {request.model?.profile_photo_url ? (
                      <Image
                        src={request.model.profile_photo_url}
                        alt={request.name}
                        width={48}
                        height={48}
                        className="object-cover"
                      />
                    ) : (
                      <User className="h-5 w-5 md:h-6 md:w-6 text-muted-foreground" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm md:text-base">{request.name}</span>
                      <Badge className={`${getStatusColor(request.status)} text-xs`}>
                        {request.status.replace("_", " ")}
                      </Badge>
                      {request.outcome && (
                        <Badge variant="outline" className="text-xs">
                          <Target className="h-3 w-3 mr-1" />
                          {request.outcome.replace("_", " ")}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 md:gap-4 mt-1 text-xs md:text-sm text-muted-foreground flex-wrap">
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
                      <span className="hidden md:inline">{formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}</span>
                    </div>
                    {request.scheduled_at && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-blue-500">
                        <Calendar className="h-3 w-3" />
                        Scheduled: {format(new Date(request.scheduled_at), "MMM d, h:mm a")}
                      </div>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <a href={`tel:${request.phone}`}>
                      <Button size="sm" className="bg-green-500 hover:bg-green-600 h-9 w-9 md:h-10 md:w-10 p-0">
                        <PhoneCall className="h-4 w-4" />
                      </Button>
                    </a>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 w-9 md:h-10 md:w-10 p-0 text-red-500 hover:bg-red-500/10 hover:text-red-500 border-red-500/30"
                      onClick={() => {
                        if (confirm(`Delete call request from ${request.name}?`)) {
                          deleteRequest(request.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Details Dialog - Enhanced */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-pink-500" />
              Call Request Details
            </DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 py-2">
              {/* Contact Info */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                      {selectedRequest.model?.profile_photo_url ? (
                        <Image
                          src={selectedRequest.model.profile_photo_url}
                          alt={selectedRequest.name}
                          width={56}
                          height={56}
                          className="object-cover"
                        />
                      ) : (
                        <User className="h-7 w-7 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-lg">{selectedRequest.name}</h3>
                        {selectedRequest.model && (
                          <Link href={`/admin/models/${selectedRequest.model.id}`}>
                            <Badge variant="outline" className="cursor-pointer text-xs">
                              EXA Profile <ExternalLink className="h-3 w-3 ml-1" />
                            </Badge>
                          </Link>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 mt-2 text-sm">
                        <a
                          href={`tel:${selectedRequest.phone}`}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 text-green-500 hover:bg-green-500/20"
                        >
                          <PhoneCall className="h-4 w-4" />
                          {selectedRequest.phone}
                        </a>
                        {selectedRequest.instagram_handle && (
                          <a
                            href={`https://instagram.com/${selectedRequest.instagram_handle}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-pink-500/10 text-pink-500 hover:bg-pink-500/20"
                          >
                            <Instagram className="h-4 w-4" />
                            @{selectedRequest.instagram_handle}
                          </a>
                        )}
                        {selectedRequest.email && (
                          <a
                            href={`mailto:${selectedRequest.email}`}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
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
                      <p className="text-xs text-muted-foreground mb-1">Message:</p>
                      <p className="text-sm">{selectedRequest.message}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Schedule Callback */}
              <Card className="border-blue-500/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    Schedule Callback
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={scheduleCallback} className="bg-blue-500 hover:bg-blue-600">
                      <Clock className="h-4 w-4 mr-2" />
                      Schedule
                    </Button>
                  </div>
                  {selectedRequest.scheduled_at && (
                    <p className="text-xs text-blue-500 mt-2 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Scheduled for {format(new Date(selectedRequest.scheduled_at), "PPp")}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Status, Type, Priority, Outcome */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <Select
                    value={selectedRequest.status}
                    onValueChange={(v) => {
                      updateStatus(selectedRequest.id, v);
                      setSelectedRequest({ ...selectedRequest, status: v });
                    }}
                  >
                    <SelectTrigger className="h-9">
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
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Call Type</label>
                  <Select
                    value={selectedRequest.call_type || "none"}
                    onValueChange={(v) => {
                      updateCallType(selectedRequest.id, v === "none" ? "" : v);
                      setSelectedRequest({ ...selectedRequest, call_type: v === "none" ? null : v });
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select" />
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
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Priority</label>
                  <Select
                    value={selectedRequest.priority}
                    onValueChange={(v) => {
                      updatePriority(selectedRequest.id, v);
                      setSelectedRequest({ ...selectedRequest, priority: v });
                    }}
                  >
                    <SelectTrigger className="h-9">
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
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    Outcome
                  </label>
                  <Select
                    value={selectedRequest.outcome || "none"}
                    onValueChange={(v) => updateOutcome(selectedRequest.id, v === "none" ? "" : v)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not Set</SelectItem>
                      {CALL_OUTCOMES.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
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

              {/* Notes with Quick Templates */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Quick Templates */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {NOTE_TEMPLATES.map((template) => (
                      <Button
                        key={template.label}
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => addNote(template.text)}
                      >
                        {template.label}
                      </Button>
                    ))}
                  </div>

                  {/* Existing Notes */}
                  <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                    {selectedRequest.notes?.length === 0 && (
                      <p className="text-sm text-muted-foreground">No notes yet</p>
                    )}
                    {selectedRequest.notes?.map((note) => (
                      <div key={note.id} className="p-2 rounded-lg bg-muted text-sm">
                        <p>{note.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {note.created_by} • {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Add Note */}
                  <div className="flex gap-2">
                    <Textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Add a custom note..."
                      rows={2}
                      className="flex-1 text-sm"
                    />
                    <Button onClick={() => addNote()} disabled={savingNote || !newNote.trim()} size="sm">
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
              <div className="text-xs text-muted-foreground space-y-1 px-1">
                <p>Source: {selectedRequest.source} {selectedRequest.source_detail && `(${selectedRequest.source_detail})`}</p>
                <p>Requested: {format(new Date(selectedRequest.created_at), "PPp")}</p>
                {selectedRequest.completed_at && (
                  <p>Completed: {format(new Date(selectedRequest.completed_at), "PPp")}</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
