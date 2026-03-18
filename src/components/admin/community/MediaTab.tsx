"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Loader2,
  Mail,
  Camera,
  Phone,
  Plus,
  Pencil,
  Trash2,
  X,
  Instagram,
  ExternalLink,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface MediaContact {
  id: string;
  name: string;
  title: string | null;
  media_company: string | null;
  email: string | null;
  phone: string | null;
  instagram_handle: string | null;
  website_url: string | null;
  category: string | null;
  notes: string | null;
  status: string;
  last_contacted_at: string | null;
  created_at: string;
}

const MEDIA_CATEGORIES: { value: string; label: string }[] = [
  { value: "fashion", label: "Fashion" },
  { value: "lifestyle", label: "Lifestyle" },
  { value: "entertainment", label: "Entertainment" },
  { value: "sports", label: "Sports" },
  { value: "photography", label: "Photography" },
  { value: "videography", label: "Videography" },
  { value: "blog", label: "Blog / Digital" },
  { value: "podcast", label: "Podcast" },
  { value: "news", label: "News / Press" },
  { value: "tv", label: "TV / Broadcast" },
  { value: "swimwear", label: "Swimwear / Swim" },
  { value: "beauty", label: "Beauty / Wellness" },
  { value: "other", label: "Other" },
];

const MEDIA_STATUSES: { value: string; label: string; color: string }[] = [
  { value: "new", label: "New", color: "text-blue-400 bg-blue-500/10 border-blue-500/30" },
  { value: "contacted", label: "Contacted", color: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  { value: "responded", label: "Responded", color: "text-violet-400 bg-violet-500/10 border-violet-500/30" },
  { value: "interested", label: "Interested", color: "text-green-400 bg-green-500/10 border-green-500/30" },
  { value: "not_interested", label: "Not Interested", color: "text-muted-foreground bg-muted/50 border-border" },
  { value: "do_not_contact", label: "Do Not Contact", color: "text-red-400 bg-red-500/10 border-red-500/30" },
];

const BLANK_CONTACT: Omit<MediaContact, "id" | "created_at"> = {
  name: "", title: null, media_company: null, email: null, phone: null,
  instagram_handle: null, website_url: null, category: null, notes: null,
  status: "new", last_contacted_at: null,
};

export default function MediaTab() {
  const [mediaContacts, setMediaContacts] = useState<MediaContact[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaSearch, setMediaSearch] = useState("");
  const [mediaStatusFilter, setMediaStatusFilter] = useState("all");
  const [mediaCategoryFilter, setMediaCategoryFilter] = useState("all");
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<MediaContact | null>(null);
  const [mediaForm, setMediaForm] = useState<Omit<MediaContact, "id" | "created_at">>(BLANK_CONTACT);
  const [mediaSaving, setMediaSaving] = useState(false);

  const loadMediaContacts = useCallback(async () => {
    setMediaLoading(true);
    const params = new URLSearchParams({ search: mediaSearch, status: mediaStatusFilter, category: mediaCategoryFilter });
    const res = await fetch(`/api/admin/media-contacts?${params}`);
    if (res.ok) {
      const data = await res.json();
      setMediaContacts(data.contacts || []);
    }
    setMediaLoading(false);
  }, [mediaSearch, mediaStatusFilter, mediaCategoryFilter]);

  useEffect(() => {
    void loadMediaContacts();
  }, [loadMediaContacts]);

  const openAddContact = () => {
    setEditingContact(null);
    setMediaForm(BLANK_CONTACT);
    setMediaDialogOpen(true);
  };

  const openEditContact = (contact: MediaContact) => {
    setEditingContact(contact);
    setMediaForm({
      name: contact.name,
      title: contact.title,
      media_company: contact.media_company,
      email: contact.email,
      phone: contact.phone,
      instagram_handle: contact.instagram_handle,
      website_url: contact.website_url,
      category: contact.category,
      notes: contact.notes,
      status: contact.status,
      last_contacted_at: contact.last_contacted_at,
    });
    setMediaDialogOpen(true);
  };

  const saveMediaContact = async () => {
    if (!mediaForm.name.trim()) { toast.error("Name is required"); return; }
    setMediaSaving(true);
    try {
      const url = editingContact
        ? `/api/admin/media-contacts?id=${editingContact.id}`
        : "/api/admin/media-contacts";
      const method = editingContact ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mediaForm),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }
      toast.success(editingContact ? "Contact updated" : "Contact added");
      setMediaDialogOpen(false);
      await loadMediaContacts();
    } catch (err: any) {
      toast.error(err.message || "Failed to save contact");
    } finally {
      setMediaSaving(false);
    }
  };

  const deleteMediaContact = async (contact: MediaContact) => {
    if (!confirm(`Delete ${contact.name}?`)) return;
    const res = await fetch(`/api/admin/media-contacts?id=${contact.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Contact deleted");
      setMediaContacts(prev => prev.filter(c => c.id !== contact.id));
    } else {
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters + Add Button */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search name, company, email, instagram..."
                  value={mediaSearch}
                  onChange={(e) => setMediaSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={mediaCategoryFilter} onValueChange={setMediaCategoryFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {MEDIA_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={mediaStatusFilter} onValueChange={setMediaStatusFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {MEDIA_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={openAddContact} className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600">
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Contacts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-violet-400" />
            Media Contacts
            <Badge variant="outline" className="ml-2">{mediaContacts.length}</Badge>
          </CardTitle>
          <CardDescription>Press, photographers, bloggers, and media partners</CardDescription>
        </CardHeader>
        <CardContent>
          {mediaLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : mediaContacts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Camera className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="mb-4">No media contacts yet</p>
              <Button onClick={openAddContact} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add your first contact
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Instagram</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mediaContacts.map((contact) => {
                    const statusMeta = MEDIA_STATUSES.find(s => s.value === contact.status);
                    const categoryLabel = MEDIA_CATEGORIES.find(c => c.value === contact.category)?.label;
                    return (
                      <TableRow key={contact.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{contact.name}</p>
                            {contact.title && <p className="text-xs text-muted-foreground">{contact.title}</p>}
                          </div>
                        </TableCell>
                        <TableCell>
                          {contact.email ? (
                            <a href={`mailto:${contact.email}`} className="text-sm text-cyan-400 hover:underline flex items-center gap-1">
                              <Mail className="h-3.5 w-3.5" />
                              {contact.email}
                            </a>
                          ) : <span className="text-muted-foreground text-sm">&mdash;</span>}
                        </TableCell>
                        <TableCell>
                          {contact.phone ? (
                            <span className="flex items-center gap-1 text-sm">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                              {contact.phone}
                            </span>
                          ) : <span className="text-muted-foreground text-sm">&mdash;</span>}
                        </TableCell>
                        <TableCell>
                          {contact.instagram_handle ? (
                            <a
                              href={`https://instagram.com/${contact.instagram_handle.replace(/^@/, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-pink-400 hover:text-pink-300 text-sm"
                            >
                              <Instagram className="h-3.5 w-3.5" />
                              @{contact.instagram_handle.replace(/^@/, "")}
                            </a>
                          ) : <span className="text-muted-foreground text-sm">&mdash;</span>}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {contact.website_url ? (
                              <a href={contact.website_url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline flex items-center gap-1 text-sm">
                                {contact.media_company || "\u2014"}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <span className="text-sm text-muted-foreground">{contact.media_company || "\u2014"}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {categoryLabel ? (
                            <Badge variant="outline" className="text-xs">{categoryLabel}</Badge>
                          ) : <span className="text-muted-foreground text-sm">&mdash;</span>}
                        </TableCell>
                        <TableCell>
                          {statusMeta && (
                            <Badge variant="outline" className={`text-xs ${statusMeta.color}`}>
                              {statusMeta.label}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditContact(contact)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => deleteMediaContact(contact)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Media Contact Dialog */}
      <Dialog open={mediaDialogOpen} onOpenChange={setMediaDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingContact ? "Edit Contact" : "Add Media Contact"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={mediaForm.name} onChange={e => setMediaForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />
            </div>
            <div className="space-y-1.5">
              <Label>Title / Role</Label>
              <Input value={mediaForm.title || ""} onChange={e => setMediaForm(f => ({ ...f, title: e.target.value || null }))} placeholder="e.g. Editor, Photographer" />
            </div>
            <div className="space-y-1.5">
              <Label>Media Company</Label>
              <Input value={mediaForm.media_company || ""} onChange={e => setMediaForm(f => ({ ...f, media_company: e.target.value || null }))} placeholder="Publication or company" />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={mediaForm.category || ""} onValueChange={v => setMediaForm(f => ({ ...f, category: v || null }))}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {MEDIA_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={mediaForm.email || ""} onChange={e => setMediaForm(f => ({ ...f, email: e.target.value || null }))} placeholder="email@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={mediaForm.phone || ""} onChange={e => setMediaForm(f => ({ ...f, phone: e.target.value || null }))} placeholder="+1 (555) 000-0000" />
            </div>
            <div className="space-y-1.5">
              <Label>Instagram Handle</Label>
              <Input value={mediaForm.instagram_handle || ""} onChange={e => setMediaForm(f => ({ ...f, instagram_handle: e.target.value || null }))} placeholder="@handle" />
            </div>
            <div className="space-y-1.5">
              <Label>Website URL</Label>
              <Input value={mediaForm.website_url || ""} onChange={e => setMediaForm(f => ({ ...f, website_url: e.target.value || null }))} placeholder="https://..." />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={mediaForm.status} onValueChange={v => setMediaForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MEDIA_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={mediaForm.notes || ""}
                onChange={e => setMediaForm(f => ({ ...f, notes: e.target.value || null }))}
                placeholder="Any notes about this contact..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMediaDialogOpen(false)} disabled={mediaSaving}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={saveMediaContact} disabled={mediaSaving} className="bg-gradient-to-r from-pink-500 to-violet-500">
              {mediaSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {editingContact ? "Save Changes" : "Add Contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
