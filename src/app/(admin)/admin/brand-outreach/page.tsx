"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Mail,
  Building2,
  Send,
  Users,
  CheckCircle,
  Clock,
  ExternalLink,
  Instagram,
  Globe,
  Search,
  Plus,
  Loader2,
  MessageSquare,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface BrandContact {
  id: string;
  brand_name: string;
  contact_name: string | null;
  email: string;
  email_type: string;
  phone: string | null;
  website_url: string | null;
  instagram_handle: string | null;
  category: string;
  location_city: string | null;
  location_country: string | null;
  notes: string | null;
  status: string;
  last_contacted_at: string | null;
  created_at: string;
}

const statusColors: Record<string, string> = {
  new: "bg-gray-500",
  contacted: "bg-blue-500",
  responded: "bg-purple-500",
  interested: "bg-green-500",
  not_interested: "bg-red-500",
  converted: "bg-emerald-500",
  do_not_contact: "bg-zinc-700",
};

const statusLabels: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  responded: "Responded",
  interested: "Interested",
  not_interested: "Not Interested",
  converted: "Converted",
  do_not_contact: "Do Not Contact",
};

export default function BrandOutreachPage() {
  const [contacts, setContacts] = useState<BrandContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSubject, setEmailSubject] = useState("Partnership Opportunity - Miami Swim Week 2026");
  const [emailBody, setEmailBody] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newContact, setNewContact] = useState({
    brand_name: "",
    contact_name: "",
    email: "",
    email_type: "pr",
    website_url: "",
    instagram_handle: "",
    category: "swimwear",
    notes: "",
  });

  const supabase = createClient();

  useEffect(() => {
    loadContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadContacts() {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("brand_outreach_contacts")
      .select("*")
      .order("brand_name");

    if (error) {
      toast.error("Failed to load contacts");
      console.error(error);
    } else {
      setContacts(data || []);
    }
    setLoading(false);
  }

  // Filter contacts
  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch =
      contact.brand_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (contact.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === "all" || contact.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || contact.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Stats
  const stats = {
    total: contacts.length,
    new: contacts.filter((c) => c.status === "new").length,
    contacted: contacts.filter((c) => c.status === "contacted").length,
    responded: contacts.filter((c) => ["responded", "interested"].includes(c.status)).length,
    converted: contacts.filter((c) => c.status === "converted").length,
  };

  // Toggle contact selection
  const toggleSelection = (id: string) => {
    setSelectedContacts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Select all filtered
  const selectAll = () => {
    if (selectedContacts.size === filteredContacts.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(filteredContacts.map((c) => c.id)));
    }
  };

  // Send emails to selected contacts
  async function sendOutreachEmails() {
    if (selectedContacts.size === 0) {
      toast.error("Please select at least one contact");
      return;
    }
    if (!emailSubject.trim() || !emailBody.trim()) {
      toast.error("Please enter subject and message");
      return;
    }

    setSendingEmail(true);
    const selectedBrands = contacts.filter((c) => selectedContacts.has(c.id));

    try {
      const response = await fetch("/api/admin/brand-outreach/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contacts: selectedBrands.map((c) => ({
            id: c.id,
            email: c.email,
            brand_name: c.brand_name,
            contact_name: c.contact_name,
          })),
          subject: emailSubject,
          body: emailBody,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send emails");
      }

      toast.success(`Sent ${data.sent} emails successfully`);
      setEmailDialogOpen(false);
      setSelectedContacts(new Set());
      loadContacts(); // Refresh to show updated status
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send emails");
    } finally {
      setSendingEmail(false);
    }
  }

  // Update contact status
  async function updateContactStatus(contactId: string, newStatus: string) {
    const { error } = await (supabase as any)
      .from("brand_outreach_contacts")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", contactId);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success("Status updated");
      loadContacts();
    }
  }

  // Delete a single contact
  async function deleteContact(contactId: string, brandName: string) {
    if (!confirm(`Delete ${brandName} from outreach list?`)) return;

    const { error } = await (supabase as any)
      .from("brand_outreach_contacts")
      .delete()
      .eq("id", contactId);

    if (error) {
      toast.error("Failed to delete contact");
    } else {
      toast.success(`${brandName} deleted`);
      setSelectedContacts((prev) => {
        const newSet = new Set(prev);
        newSet.delete(contactId);
        return newSet;
      });
      loadContacts();
    }
  }

  // Delete selected contacts
  async function deleteSelectedContacts() {
    if (selectedContacts.size === 0) return;
    if (!confirm(`Delete ${selectedContacts.size} selected contact${selectedContacts.size > 1 ? "s" : ""}?`)) return;

    const ids = Array.from(selectedContacts);
    const { error } = await (supabase as any)
      .from("brand_outreach_contacts")
      .delete()
      .in("id", ids);

    if (error) {
      toast.error("Failed to delete contacts");
    } else {
      toast.success(`${ids.length} contact${ids.length > 1 ? "s" : ""} deleted`);
      setSelectedContacts(new Set());
      loadContacts();
    }
  }

  // Add new contact
  async function addContact() {
    if (!newContact.brand_name || !newContact.email) {
      toast.error("Brand name and email are required");
      return;
    }

    const { error } = await (supabase as any).from("brand_outreach_contacts").insert({
      ...newContact,
      status: "new",
    });

    if (error) {
      toast.error("Failed to add contact");
      console.error(error);
    } else {
      toast.success("Contact added");
      setAddDialogOpen(false);
      setNewContact({
        brand_name: "",
        contact_name: "",
        email: "",
        email_type: "pr",
        website_url: "",
        instagram_handle: "",
        category: "swimwear",
        notes: "",
      });
      loadContacts();
    }
  }

  // Default email template
  const defaultEmailTemplate = `Hi {{contact_name}},

I hope this message finds you well! I'm reaching out from EXA Models regarding an exciting opportunity for {{brand_name}} at Miami Swim Week 2026 (May 26-31).

We're connecting premium brands with our roster of professional runway models for the upcoming shows. Our models have walked for brands like Sports Illustrated, Maaji, and Beach Bunny.

You can view our Miami Swim Week 2026 showcase and available models here:
www.examodels.com/swimweek

We'd love to discuss how we can support {{brand_name}}'s presence at Swim Week, whether you're looking for:
- Runway models for your show
- Fitting models for your collection
- Brand ambassadors and content creators

Would you be open to a quick call this week to explore potential collaboration?

Best regards,
EXA Models Team
www.examodels.com`;

  useEffect(() => {
    if (!emailBody) {
      setEmailBody(defaultEmailTemplate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-muted-foreground hover:text-primary">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Brand Outreach</h1>
              <p className="text-muted-foreground">
                Swimwear & Resort Wear Brands for Miami Swim Week 2026
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadContacts}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Brand
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Brand Contact</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Brand Name *</Label>
                      <Input
                        value={newContact.brand_name}
                        onChange={(e) =>
                          setNewContact({ ...newContact, brand_name: e.target.value })
                        }
                        placeholder="Luli Fama"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Contact Name</Label>
                      <Input
                        value={newContact.contact_name}
                        onChange={(e) =>
                          setNewContact({ ...newContact, contact_name: e.target.value })
                        }
                        placeholder="Jane Smith"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        value={newContact.email}
                        onChange={(e) =>
                          setNewContact({ ...newContact, email: e.target.value })
                        }
                        placeholder="pr@brand.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email Type</Label>
                      <Select
                        value={newContact.email_type}
                        onValueChange={(v) =>
                          setNewContact({ ...newContact, email_type: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pr">PR</SelectItem>
                          <SelectItem value="press">Press</SelectItem>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="wholesale">Wholesale</SelectItem>
                          <SelectItem value="partnerships">Partnerships</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Website</Label>
                      <Input
                        value={newContact.website_url}
                        onChange={(e) =>
                          setNewContact({ ...newContact, website_url: e.target.value })
                        }
                        placeholder="https://brand.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Instagram</Label>
                      <Input
                        value={newContact.instagram_handle}
                        onChange={(e) =>
                          setNewContact({ ...newContact, instagram_handle: e.target.value })
                        }
                        placeholder="brandswimwear"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={newContact.category}
                      onValueChange={(v) =>
                        setNewContact({ ...newContact, category: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="swimwear">Swimwear</SelectItem>
                        <SelectItem value="resort_wear">Resort Wear</SelectItem>
                        <SelectItem value="lingerie">Lingerie</SelectItem>
                        <SelectItem value="luxury">Luxury</SelectItem>
                        <SelectItem value="fashion">Fashion</SelectItem>
                        <SelectItem value="activewear">Activewear</SelectItem>
                        <SelectItem value="beauty">Beauty</SelectItem>
                        <SelectItem value="accessories">Accessories</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={newContact.notes}
                      onChange={(e) =>
                        setNewContact({ ...newContact, notes: e.target.value })
                      }
                      placeholder="Additional notes about this brand..."
                    />
                  </div>
                  <Button onClick={addContact} className="w-full">
                    Add Contact
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-pink-500/20">
                  <Building2 className="h-5 w-5 text-pink-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Brands</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gray-500/20">
                  <Clock className="h-5 w-5 text-gray-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.new}</p>
                  <p className="text-sm text-muted-foreground">New</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Mail className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.contacted}</p>
                  <p className="text-sm text-muted-foreground">Contacted</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <MessageSquare className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.responded}</p>
                  <p className="text-sm text-muted-foreground">Responded</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/20">
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.converted}</p>
                  <p className="text-sm text-muted-foreground">Converted</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search brands..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="responded">Responded</SelectItem>
                <SelectItem value="interested">Interested</SelectItem>
                <SelectItem value="not_interested">Not Interested</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="swimwear">Swimwear</SelectItem>
                <SelectItem value="resort_wear">Resort Wear</SelectItem>
                <SelectItem value="lingerie">Lingerie</SelectItem>
                <SelectItem value="luxury">Luxury</SelectItem>
                <SelectItem value="fashion">Fashion</SelectItem>
                <SelectItem value="activewear">Activewear</SelectItem>
                <SelectItem value="beauty">Beauty</SelectItem>
                <SelectItem value="accessories">Accessories</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedContacts.size > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSelectedContacts(new Set())}>
                Clear ({selectedContacts.size})
              </Button>
              <Button variant="outline" className="text-red-500 hover:bg-red-500/10 border-red-500/50" onClick={deleteSelectedContacts}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete ({selectedContacts.size})
              </Button>
              <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-pink-500 to-violet-500">
                    <Send className="h-4 w-4 mr-2" />
                    Send Email ({selectedContacts.size})
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Send Outreach Email</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="text-sm text-muted-foreground">
                      Sending to {selectedContacts.size} brand
                      {selectedContacts.size > 1 ? "s" : ""}
                    </div>
                    <div className="space-y-2">
                      <Label>Subject</Label>
                      <Input
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>
                        Message{" "}
                        <span className="text-muted-foreground text-xs">
                          (Use {"{{brand_name}}"} and {"{{contact_name}}"} for
                          personalization)
                        </span>
                      </Label>
                      <Textarea
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                        rows={12}
                        className="font-mono text-sm"
                      />
                    </div>
                    <Button
                      onClick={sendOutreachEmails}
                      disabled={sendingEmail}
                      className="w-full bg-gradient-to-r from-pink-500 to-violet-500"
                    >
                      {sendingEmail ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send to {selectedContacts.size} Brand
                          {selectedContacts.size > 1 ? "s" : ""}
                        </>
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        {/* Brand List */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {filteredContacts.length} Brand{filteredContacts.length !== 1 ? "s" : ""}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={selectAll}>
                {selectedContacts.size === filteredContacts.length
                  ? "Deselect All"
                  : "Select All"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    selectedContacts.has(contact.id)
                      ? "border-pink-500 bg-pink-500/5"
                      : "border-border hover:border-pink-500/50"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedContacts.has(contact.id)}
                      onChange={() => toggleSelection(contact.id)}
                      className="mt-1 h-4 w-4 rounded border-gray-300"
                    />

                    {/* Brand Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{contact.brand_name}</h3>
                        <Badge className={`${statusColors[contact.status]} text-white text-xs`}>
                          {statusLabels[contact.status]}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {contact.email_type.toUpperCase()}
                        </Badge>
                        {contact.category && (
                          <Badge variant="secondary" className="text-xs">
                            {contact.category.replace("_", " ")}
                          </Badge>
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        {contact.contact_name && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            {contact.contact_name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5" />
                          {contact.email}
                        </span>
                        {contact.website_url && (
                          <a
                            href={contact.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 hover:text-pink-500"
                          >
                            <Globe className="h-3.5 w-3.5" />
                            Website
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        {contact.instagram_handle && (
                          <a
                            href={`https://instagram.com/${contact.instagram_handle}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 hover:text-pink-500"
                          >
                            <Instagram className="h-3.5 w-3.5" />
                            @{contact.instagram_handle}
                          </a>
                        )}
                        {contact.location_city && (
                          <span>
                            {contact.location_city}
                            {contact.location_country && `, ${contact.location_country}`}
                          </span>
                        )}
                      </div>

                      {contact.notes && (
                        <p className="mt-2 text-xs text-muted-foreground line-clamp-1">
                          {contact.notes}
                        </p>
                      )}

                      {contact.last_contacted_at && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Last contacted: {format(new Date(contact.last_contacted_at), "MMM d, yyyy")}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <Select
                        value={contact.status}
                        onValueChange={(v) => updateContactStatus(contact.id, v)}
                      >
                        <SelectTrigger className="w-32 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="contacted">Contacted</SelectItem>
                          <SelectItem value="responded">Responded</SelectItem>
                          <SelectItem value="interested">Interested</SelectItem>
                          <SelectItem value="not_interested">Not Interested</SelectItem>
                          <SelectItem value="converted">Converted</SelectItem>
                          <SelectItem value="do_not_contact">Do Not Contact</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-red-500"
                        onClick={() => deleteContact(contact.id, contact.brand_name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {filteredContacts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No brands found matching your filters
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
