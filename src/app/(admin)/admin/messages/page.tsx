"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Search,
  MessageCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Users,
  Clock,
  Eye,
  Flag,
  Image as ImageIcon,
  Video,
  Mic,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface Participant {
  actor_id: string;
  display_name: string | null;
  type: "fan" | "model";
  avatar_url: string | null;
  username: string | null;
}

interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  participants: Participant[];
  last_message: string | null;
  last_message_at: string | null;
  message_count: number;
}

interface Message {
  id: string;
  content: string | null;
  created_at: string;
  sender_id: string;
  sender_type: string | null;
  sender_name: string | null;
  sender_avatar: string | null;
  is_system: boolean;
  is_flagged: boolean;
  flagged_reason: string | null;
  media_type: string | null;
  media_url: string | null;
}

export default function AdminMessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const pageSize = 30;
  const supabase = createClient();

  // Stats
  const [stats, setStats] = useState({
    totalConversations: 0,
    totalMessages: 0,
    flaggedMessages: 0,
    activeToday: 0,
  });

  const loadStats = useCallback(async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      { count: totalConvos },
      { count: totalMsgs },
      { count: flagged },
      { count: activeToday },
    ] = await Promise.all([
      supabase.from("conversations").select("*", { count: "exact", head: true }),
      supabase.from("messages").select("*", { count: "exact", head: true }),
      supabase.from("messages").select("*", { count: "exact", head: true }).eq("is_flagged", true),
      supabase.from("conversations").select("*", { count: "exact", head: true }).gte("updated_at", today.toISOString()),
    ]);

    setStats({
      totalConversations: totalConvos || 0,
      totalMessages: totalMsgs || 0,
      flaggedMessages: flagged || 0,
      activeToday: activeToday || 0,
    });
  }, [supabase]);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      let targetConversationIds: string[] | null = null;

      // If searching, first find matching fans/models, then their conversations
      if (search) {
        const searchPattern = `%${search}%`;

        // Search fans by display_name - fans.id IS the actor_id directly
        const { data: matchingFans } = await supabase
          .from("fans")
          .select("id")
          .ilike("display_name", searchPattern);

        // Search models by first_name or username - need user_id to find actor
        const { data: matchingModels } = await supabase
          .from("models")
          .select("user_id")
          .or(`first_name.ilike.${searchPattern},username.ilike.${searchPattern}`);

        // For fans, we already have actor_ids directly (fans.id = actors.id)
        const fanActorIds = (matchingFans || []).map((f: any) => f.id);

        // For models, look up actors by user_id to get actor_ids
        const modelUserIds = (matchingModels || []).map((m: any) => m.user_id).filter(Boolean);
        let modelActorIds: string[] = [];
        if (modelUserIds.length > 0) {
          const { data: modelActors } = await supabase
            .from("actors")
            .select("id")
            .in("user_id", modelUserIds);
          modelActorIds = (modelActors || []).map((a: any) => a.id);
        }

        const matchingActorIds = [...fanActorIds, ...modelActorIds];

        if (matchingActorIds.length === 0) {
          setConversations([]);
          setTotalCount(0);
          setLoading(false);
          return;
        }

        // Find conversations with these actors
        const { data: participantConvos } = await supabase
          .from("conversation_participants")
          .select("conversation_id")
          .in("actor_id", matchingActorIds);

        targetConversationIds = [...new Set((participantConvos || []).map((p: any) => p.conversation_id))];

        if (targetConversationIds.length === 0) {
          setConversations([]);
          setTotalCount(0);
          setLoading(false);
          return;
        }
      }

      // Get conversations (filtered by search results if applicable)
      let query = supabase
        .from("conversations")
        .select(`
          id,
          created_at,
          updated_at,
          conversation_participants (
            actor_id
          )
        `)
        .order("updated_at", { ascending: false });

      if (targetConversationIds) {
        query = query.in("id", targetConversationIds);
        setTotalCount(targetConversationIds.length);
      } else {
        // Get count for non-search queries
        const { count } = await supabase
          .from("conversations")
          .select("*", { count: "exact", head: true });
        setTotalCount(count || 0);
      }

      // Apply pagination
      const { data: convos, error } = await query.range((page - 1) * pageSize, page * pageSize - 1);

      if (error) {
        console.error("Error loading conversations:", error);
        return;
      }

      // Get participant details - first get actors to find user_ids
      const actorIds = new Set<string>();
      (convos || []).forEach((c: any) => {
        c.conversation_participants?.forEach((p: any) => {
          actorIds.add(p.actor_id);
        });
      });

      // Look up actors to get user_id and type
      const actorIdArray = Array.from(actorIds);
      const { data: actors } = await supabase
        .from("actors")
        .select("id, user_id, type")
        .in("id", actorIdArray);

      // Create actor lookup map (actor_id -> { user_id, type })
      const actorLookup = new Map((actors || []).map((a: any) => [a.id, a]));
      const userIds = [...new Set((actors || []).map((a: any) => a.user_id).filter(Boolean))];

      // Get fan details - fans.id = actors.id (query by actor_id, not user_id!)
      const { data: fans } = await supabase
        .from("fans")
        .select("id, display_name, avatar_url")
        .in("id", actorIdArray);

      // Get model details - models.user_id = actors.user_id (query by user_id)
      const { data: models } = await supabase
        .from("models")
        .select("user_id, first_name, last_name, username, profile_photo_url")
        .in("user_id", userIds);

      // Create lookup maps - fans by actor_id, models by user_id
      const fanMap = new Map((fans || []).map((f: any) => [f.id, { ...f, type: "fan" as const }]));
      const modelMap = new Map((models || []).map((m: any) => [m.user_id, { ...m, type: "model" as const }]));

      // Get last message for each conversation
      const convoIds = (convos || []).map((c: any) => c.id);
      const { data: lastMessages } = await supabase
        .from("messages")
        .select("conversation_id, content, created_at")
        .in("conversation_id", convoIds)
        .order("created_at", { ascending: false });

      // Create last message map (first occurrence for each conversation is the latest)
      const lastMessageMap = new Map<string, { content: string | null; created_at: string }>();
      (lastMessages || []).forEach((m: any) => {
        if (!lastMessageMap.has(m.conversation_id)) {
          lastMessageMap.set(m.conversation_id, { content: m.content, created_at: m.created_at });
        }
      });

      // Get message counts
      const { data: messageCounts } = await supabase
        .from("messages")
        .select("conversation_id")
        .in("conversation_id", convoIds);

      const messageCountMap = new Map<string, number>();
      (messageCounts || []).forEach((m: any) => {
        messageCountMap.set(m.conversation_id, (messageCountMap.get(m.conversation_id) || 0) + 1);
      });

      // Build conversations with full details
      const enrichedConversations: Conversation[] = (convos || []).map((c: any) => {
        const participants: Participant[] = (c.conversation_participants || []).map((p: any) => {
          // Get actor info to find user_id and type
          const actor = actorLookup.get(p.actor_id);
          const userId = actor?.user_id;
          const actorType = actor?.type;

          // For fans: look up by actor_id (fans.id = actors.id)
          // For models: look up by user_id (models.user_id = actors.user_id)
          const fan = fanMap.get(p.actor_id);
          const model = userId ? modelMap.get(userId) : null;

          if (model || actorType === "model") {
            return {
              actor_id: p.actor_id,
              display_name: model?.first_name || model?.username || "Model",
              type: "model" as const,
              avatar_url: model?.profile_photo_url || null,
              username: model?.username || null,
            };
          }
          if (fan || actorType === "fan") {
            return {
              actor_id: p.actor_id,
              display_name: fan?.display_name || "Fan",
              type: "fan" as const,
              avatar_url: fan?.avatar_url || null,
              username: null,
            };
          }
          return {
            actor_id: p.actor_id,
            display_name: actorType === "admin" ? "EXA Team" : "Unknown",
            type: actorType === "admin" ? "model" as const : "fan" as const,
            avatar_url: null,
            username: null,
          };
        });

        const lastMsg = lastMessageMap.get(c.id);

        return {
          id: c.id,
          created_at: c.created_at,
          updated_at: c.updated_at,
          participants,
          last_message: lastMsg?.content || null,
          last_message_at: lastMsg?.created_at || null,
          message_count: messageCountMap.get(c.id) || 0,
        };
      });

      setConversations(enrichedConversations);
    } catch (error) {
      console.error("Failed to load conversations:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase, page, search]);

  const loadMessages = useCallback(async (conversationId: string) => {
    setLoadingMessages(true);
    try {
      const { data: msgs, error } = await supabase
        .from("messages")
        .select("id, content, created_at, sender_id, sender_type, is_system, is_flagged, flagged_reason, media_type, media_url")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(200);

      if (error) {
        console.error("Error loading messages:", error);
        return;
      }

      // Get sender details - first look up actors to get user_ids
      const senderIds = [...new Set((msgs || []).map((m: any) => m.sender_id).filter(Boolean))];

      // Look up actors to get user_id and type
      const { data: senderActors } = await supabase
        .from("actors")
        .select("id, user_id, type")
        .in("id", senderIds);

      const actorLookup = new Map((senderActors || []).map((a: any) => [a.id, a]));
      const userIds = [...new Set((senderActors || []).map((a: any) => a.user_id).filter(Boolean))];

      // Get fan details - fans.id = actors.id (query by actor_id)
      const { data: fans } = await supabase
        .from("fans")
        .select("id, display_name, avatar_url")
        .in("id", senderIds);

      // Get model details - models.user_id = actors.user_id (query by user_id)
      const { data: models } = await supabase
        .from("models")
        .select("user_id, first_name, username, profile_photo_url")
        .in("user_id", userIds);

      // Create lookup maps - fans by actor_id, models by user_id
      const fanMap = new Map((fans || []).map((f: any) => [f.id, f]));
      const modelMap = new Map((models || []).map((m: any) => [m.user_id, m]));

      const enrichedMessages: Message[] = (msgs || []).map((m: any) => {
        const actor = actorLookup.get(m.sender_id);
        const userId = actor?.user_id;
        const actorType = actor?.type;

        // For fans: look up by sender_id (actor_id), for models: look up by user_id
        const fan = fanMap.get(m.sender_id);
        const model = userId ? modelMap.get(userId) : null;

        let senderName = "Unknown";
        let senderAvatar = null;
        let senderType = m.sender_type || actorType;

        if (model || actorType === "model") {
          senderName = model?.first_name || model?.username || "Model";
          senderAvatar = model?.profile_photo_url || null;
          senderType = "model";
        } else if (fan || actorType === "fan") {
          senderName = fan?.display_name || "Fan";
          senderAvatar = fan?.avatar_url || null;
          senderType = "fan";
        } else if (actorType === "admin") {
          senderName = "EXA Team";
          senderType = "admin";
        }

        return {
          id: m.id,
          content: m.content,
          created_at: m.created_at,
          sender_id: m.sender_id,
          sender_type: senderType,
          sender_name: senderName,
          sender_avatar: senderAvatar,
          is_system: m.is_system || false,
          is_flagged: m.is_flagged || false,
          flagged_reason: m.flagged_reason,
          media_type: m.media_type,
          media_url: m.media_url,
        };
      });

      setMessages(enrichedMessages);
    } catch (error) {
      console.error("Failed to load messages:", error);
    } finally {
      setLoadingMessages(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadStats();
    loadConversations();
  }, [loadStats, loadConversations]);

  const handleViewConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setDialogOpen(true);
    loadMessages(conversation.id);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const getMediaIcon = (type: string | null) => {
    if (!type) return null;
    if (type.startsWith("image")) return <ImageIcon className="h-4 w-4" />;
    if (type.startsWith("video")) return <Video className="h-4 w-4" />;
    if (type.startsWith("audio")) return <Mic className="h-4 w-4" />;
    return null;
  };

  return (
    <div className="container px-8 md:px-16 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Messages</h1>
            <p className="text-sm text-muted-foreground">View all conversations and messages</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-500/10">
                <MessageCircle className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalConversations.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Conversations</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-500/10">
                <Users className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalMessages.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Messages</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-500/10">
                <Flag className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.flaggedMessages.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Flagged</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-violet-500/10">
                <Clock className="h-5 w-5 text-violet-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.activeToday.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Active Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Conversations</CardTitle>
          <CardDescription>Search by participant name or username</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Participants</TableHead>
                    <TableHead>Last Message</TableHead>
                    <TableHead className="text-right">Messages</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conversations.map((convo) => (
                    <TableRow key={convo.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {convo.participants.map((p, i) => (
                            <div key={p.actor_id} className="flex items-center gap-1">
                              {i > 0 && <span className="text-muted-foreground mx-1">&</span>}
                              <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex-shrink-0">
                                {p.avatar_url ? (
                                  <Image
                                    src={p.avatar_url}
                                    alt={p.display_name || ""}
                                    width={32}
                                    height={32}
                                    className="object-cover w-full h-full"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-xs">
                                    {(p.display_name || "?")[0].toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {p.display_name}
                                </p>
                                <div className="flex items-center gap-1">
                                  <Badge
                                    variant="outline"
                                    className={p.type === "model" ? "text-pink-500 border-pink-500/30 text-xs" : "text-blue-500 border-blue-500/30 text-xs"}
                                  >
                                    {p.type}
                                  </Badge>
                                  {p.username && (
                                    <span className="text-xs text-muted-foreground">@{p.username}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {convo.last_message || "No messages"}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{convo.message_count}</Badge>
                      </TableCell>
                      <TableCell>
                        {convo.last_message_at ? (
                          <span className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(convo.last_message_at), { addSuffix: true })}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewConversation(convo)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {conversations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No conversations found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages} ({totalCount} total)
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Message Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Conversation
              {selectedConversation && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({selectedConversation.participants.map((p) => p.display_name).join(" & ")})
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="h-[500px] overflow-y-auto pr-4">
            {loadingMessages ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${msg.is_flagged ? "bg-red-500/10 p-2 rounded-lg border border-red-500/20" : ""}`}
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex-shrink-0">
                      {msg.sender_avatar ? (
                        <Image
                          src={msg.sender_avatar}
                          alt={msg.sender_name || ""}
                          width={32}
                          height={32}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs">
                          {(msg.sender_name || "?")[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{msg.sender_name}</span>
                        <Badge
                          variant="outline"
                          className={msg.sender_type === "model" ? "text-pink-500 border-pink-500/30 text-xs" : "text-blue-500 border-blue-500/30 text-xs"}
                        >
                          {msg.sender_type || "fan"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(msg.created_at), "MMM d, h:mm a")}
                        </span>
                        {msg.is_flagged && (
                          <Badge variant="destructive" className="text-xs">
                            <Flag className="h-3 w-3 mr-1" />
                            Flagged
                          </Badge>
                        )}
                      </div>
                      {msg.is_system ? (
                        <p className="text-sm text-muted-foreground italic">{msg.content}</p>
                      ) : (
                        <p className="text-sm mt-1">{msg.content}</p>
                      )}
                      {msg.media_type && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                          {getMediaIcon(msg.media_type)}
                          <span>Media attachment ({msg.media_type})</span>
                        </div>
                      )}
                      {msg.flagged_reason && (
                        <p className="text-xs text-red-500 mt-1">Reason: {msg.flagged_reason}</p>
                      )}
                    </div>
                  </div>
                ))}
                {messages.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No messages in this conversation</p>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
