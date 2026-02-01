"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Phone,
  Loader2,
  CheckCircle,
  Clock,
  Calendar,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface CallRequest {
  id: string;
  status: string;
  scheduled_at: string | null;
  message: string | null;
  created_at: string;
  completed_at: string | null;
}

interface RequestCallCardProps {
  modelName: string;
  modelPhone: string;
  modelInstagram?: string;
}

export function RequestCallCard({ modelName, modelPhone, modelInstagram }: RequestCallCardProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [callRequests, setCallRequests] = useState<CallRequest[]>([]);

  useEffect(() => {
    fetchCallRequests();
  }, []);

  const fetchCallRequests = async () => {
    try {
      const response = await fetch("/api/call-requests");
      if (response.ok) {
        const data = await response.json();
        setCallRequests(data.callRequests || []);
      }
    } catch (error) {
      console.error("Failed to fetch call requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const submitRequest = async () => {
    setSubmitting(true);

    try {
      const response = await fetch("/api/call-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: modelName,
          phone: modelPhone,
          instagram_handle: modelInstagram,
          message: message || null,
          source: "dashboard",
          source_detail: "model-dashboard",
        }),
      });

      if (response.ok) {
        toast.success("Call request submitted! We'll be in touch soon.");
        setDialogOpen(false);
        setMessage("");
        fetchCallRequests();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to submit request");
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-amber-500" />;
      case "scheduled":
        return <Calendar className="h-4 w-4 text-blue-500" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-500";
      case "scheduled":
        return "bg-blue-500";
      case "completed":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const hasPendingRequest = callRequests.some(
    (r) => r.status === "pending" || r.status === "scheduled"
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-pink-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-pink-500/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Phone className="h-5 w-5 text-pink-500" />
          Schedule a Call
        </CardTitle>
        <CardDescription>
          Need to chat with the EXA team? Request a call!
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Pending/Recent Requests */}
        {callRequests.length > 0 && (
          <div className="space-y-2 mb-4">
            {callRequests.slice(0, 3).map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-2 rounded-lg bg-muted text-sm"
              >
                <div className="flex items-center gap-2">
                  {getStatusIcon(request.status)}
                  <span>
                    {request.status === "pending"
                      ? "Waiting for callback"
                      : request.status === "scheduled"
                      ? "Call scheduled"
                      : "Call completed"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(request.status)} variant="secondary">
                    {request.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
              disabled={hasPendingRequest}
            >
              <Phone className="mr-2 h-4 w-4" />
              {hasPendingRequest ? "Call Request Pending" : "Request a Call"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request a Call with EXA</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-3 rounded-lg bg-muted text-sm">
                <p><strong>Name:</strong> {modelName}</p>
                <p><strong>Phone:</strong> {modelPhone}</p>
                {modelInstagram && <p><strong>Instagram:</strong> @{modelInstagram}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  What would you like to discuss? (optional)
                </label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Let us know what you'd like to talk about..."
                  rows={3}
                />
              </div>

              <Button
                onClick={submitRequest}
                disabled={submitting}
                className="w-full"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Phone className="mr-2 h-4 w-4" />
                    Submit Request
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                We&apos;ll call you at {modelPhone} as soon as possible!
              </p>
            </div>
          </DialogContent>
        </Dialog>

        {hasPendingRequest && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            You already have a pending call request. We&apos;ll be in touch soon!
          </p>
        )}
      </CardContent>
    </Card>
  );
}
