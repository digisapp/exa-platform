"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Send,
  ArrowLeft,
  Building2,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Calendar,
  DollarSign,
  Repeat,
  Eye,
  X,
} from "lucide-react";
import Link from "next/link";

interface Brand {
  id: string;
  company_name: string;
  logo_url: string | null;
}

interface Campaign {
  id: string;
  name: string;
  brand_id: string;
  model_count?: number;
}

interface OfferResponse {
  id: string;
  model_id: string;
  status: string;
  responded_at: string | null;
  model: {
    id: string;
    username: string;
    first_name: string | null;
    last_name: string | null;
    profile_photo_url: string | null;
  };
}

interface Offer {
  id: string;
  brand_id: string;
  campaign_id: string;
  title: string;
  description: string | null;
  location_name: string | null;
  location_city: string | null;
  location_state: string | null;
  event_date: string | null;
  event_time: string | null;
  compensation_type: string;
  compensation_amount: number;
  compensation_description: string | null;
  spots: number;
  status: string;
  is_recurring: boolean;
  created_at: string;
  brand?: {
    id: string;
    brands: Brand;
  };
  campaign?: {
    id: string;
    name: string;
  };
  responses?: OfferResponse[];
}

export default function AdminOffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<string | null>(null);
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const supabase = createClient();

  // Form state
  const [formData, setFormData] = useState({
    campaign_id: "",
    title: "",
    description: "",
    location_name: "",
    location_city: "",
    location_state: "",
    event_date: "",
    event_time: "",
    compensation_type: "perks",
    compensation_amount: 0,
    compensation_description: "",
    spots: 1,
    is_recurring: false,
    recurrence_pattern: "weekly",
    recurrence_end_date: "",
  });

  useEffect(() => {
    loadOffers();
    loadBrands();
  }, []);

  useEffect(() => {
    if (selectedBrandId) {
      loadCampaigns(selectedBrandId);
    } else {
      setCampaigns([]);
    }
  }, [selectedBrandId]);

  async function loadOffers() {
    setLoading(true);
    try {
      const response = await fetch("/api/offers");
      const data = await response.json();
      if (data.offers) {
        setOffers(data.offers);
      }
    } catch (error) {
      console.error("Error loading offers:", error);
      toast.error("Failed to load offers");
    } finally {
      setLoading(false);
    }
  }

  async function loadBrands() {
    const { data } = await (supabase
      .from("brands") as any)
      .select("id, company_name, logo_url")
      .order("company_name");
    setBrands(data || []);
  }

  async function loadCampaigns(brandId: string) {
    // Get the actor id for this brand
    const { data: actor } = await (supabase
      .from("actors") as any)
      .select("id")
      .eq("id", brandId)
      .single();

    if (!actor) {
      setCampaigns([]);
      return;
    }

    const { data: campaignsData } = await (supabase
      .from("campaigns") as any)
      .select(`
        id,
        name,
        brand_id,
        campaign_models(count)
      `)
      .eq("brand_id", brandId)
      .order("name");

    const campaignsWithCount = (campaignsData || []).map((c: any) => ({
      ...c,
      model_count: c.campaign_models?.[0]?.count || 0,
    }));

    setCampaigns(campaignsWithCount);
  }

  function resetForm() {
    setFormData({
      campaign_id: "",
      title: "",
      description: "",
      location_name: "",
      location_city: "",
      location_state: "",
      event_date: "",
      event_time: "",
      compensation_type: "perks",
      compensation_amount: 0,
      compensation_description: "",
      spots: 1,
      is_recurring: false,
      recurrence_pattern: "weekly",
      recurrence_end_date: "",
    });
    setSelectedBrandId("");
    setShowForm(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.campaign_id) {
      toast.error("Please select a campaign");
      return;
    }

    if (!formData.title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    setSending(true);
    try {
      const response = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          compensation_amount: formData.compensation_type === "paid"
            ? formData.compensation_amount * 100
            : 0,
          is_recurring: formData.is_recurring,
          recurrence_pattern: formData.is_recurring ? formData.recurrence_pattern : null,
          recurrence_end_date: formData.is_recurring && formData.recurrence_end_date
            ? formData.recurrence_end_date
            : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to send offer");
        return;
      }

      toast.success(`Offer sent to ${data.models_notified} models!`);
      resetForm();
      loadOffers();
    } catch (error) {
      console.error("Error sending offer:", error);
      toast.error("Failed to send offer");
    } finally {
      setSending(false);
    }
  }

  function getResponseStats(offer: Offer) {
    const responses = offer.responses || [];
    return {
      total: responses.length,
      accepted: responses.filter(r => r.status === "accepted").length,
      declined: responses.filter(r => r.status === "declined").length,
      pending: responses.filter(r => r.status === "pending").length,
    };
  }

  const selectedOfferData = offers.find(o => o.id === selectedOffer);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container px-8 md:px-16 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Brand Offers</h1>
            <p className="text-muted-foreground">Manage offers sent by brands to models</p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Create Offer
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Offer</CardTitle>
            <CardDescription>
              Send an offer on behalf of a brand to their campaign models
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Brand & Campaign Selection */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brand">Brand *</Label>
                  <Select
                    value={selectedBrandId}
                    onValueChange={(v) => {
                      setSelectedBrandId(v);
                      setFormData({ ...formData, campaign_id: "" });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map((brand) => (
                        <SelectItem key={brand.id} value={brand.id}>
                          {brand.company_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaign">Campaign *</Label>
                  <Select
                    value={formData.campaign_id}
                    onValueChange={(v) => setFormData({ ...formData, campaign_id: v })}
                    disabled={!selectedBrandId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={selectedBrandId ? "Select a campaign" : "Select a brand first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {campaigns.map((campaign) => (
                        <SelectItem key={campaign.id} value={campaign.id}>
                          {campaign.name} ({campaign.model_count} models)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Dinner Models Needed Thursday"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Details about the opportunity..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              {/* Location */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2 col-span-3 md:col-span-1">
                  <Label htmlFor="location_name">Venue Name</Label>
                  <Input
                    id="location_name"
                    placeholder="e.g., Mila Restaurant"
                    value={formData.location_name}
                    onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location_city">City</Label>
                  <Input
                    id="location_city"
                    placeholder="Miami"
                    value={formData.location_city}
                    onChange={(e) => setFormData({ ...formData, location_city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location_state">State</Label>
                  <Input
                    id="location_state"
                    placeholder="FL"
                    value={formData.location_state}
                    onChange={(e) => setFormData({ ...formData, location_state: e.target.value })}
                  />
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="event_date">Date</Label>
                  <Input
                    id="event_date"
                    type="date"
                    value={formData.event_date}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event_time">Time</Label>
                  <Input
                    id="event_time"
                    placeholder="8:00 PM"
                    value={formData.event_time}
                    onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                  />
                </div>
              </div>

              {/* Compensation */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="compensation_type">Compensation</Label>
                  <Select
                    value={formData.compensation_type}
                    onValueChange={(v) => setFormData({ ...formData, compensation_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="perks">Perks</SelectItem>
                      <SelectItem value="tfp">TFP</SelectItem>
                      <SelectItem value="exposure">Exposure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.compensation_type === "paid" && (
                  <div className="space-y-2">
                    <Label htmlFor="compensation_amount">Amount ($)</Label>
                    <Input
                      id="compensation_amount"
                      type="number"
                      min="0"
                      placeholder="500"
                      value={formData.compensation_amount || ""}
                      onChange={(e) => setFormData({ ...formData, compensation_amount: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                )}
              </div>

              {/* Compensation Description */}
              <div className="space-y-2">
                <Label htmlFor="compensation_description">
                  {formData.compensation_type === "perks" ? "What's Included" : "Additional Details"}
                </Label>
                <Input
                  id="compensation_description"
                  placeholder={formData.compensation_type === "perks"
                    ? "e.g., Free dinner + drinks, table for you and a guest"
                    : "e.g., Payment via Venmo after event"
                  }
                  value={formData.compensation_description}
                  onChange={(e) => setFormData({ ...formData, compensation_description: e.target.value })}
                />
              </div>

              {/* Spots */}
              <div className="space-y-2">
                <Label htmlFor="spots">Spots Needed</Label>
                <Input
                  id="spots"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.spots}
                  onChange={(e) => setFormData({ ...formData, spots: parseInt(e.target.value) || 1 })}
                />
              </div>

              {/* Recurring Options */}
              <div className="space-y-4 pt-2 border-t">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_recurring"
                    checked={formData.is_recurring}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked === true })}
                  />
                  <Label htmlFor="is_recurring" className="flex items-center gap-2 cursor-pointer">
                    <Repeat className="h-4 w-4 text-violet-400" />
                    Make this a recurring offer
                  </Label>
                </div>

                {formData.is_recurring && (
                  <div className="grid grid-cols-2 gap-3 pl-6">
                    <div className="space-y-2">
                      <Label htmlFor="recurrence_pattern">Repeat</Label>
                      <Select
                        value={formData.recurrence_pattern}
                        onValueChange={(v) => setFormData({ ...formData, recurrence_pattern: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="biweekly">Every 2 weeks</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="recurrence_end_date">Until (optional)</Label>
                      <Input
                        id="recurrence_end_date"
                        type="date"
                        value={formData.recurrence_end_date}
                        onChange={(e) => setFormData({ ...formData, recurrence_end_date: e.target.value })}
                        min={formData.event_date || undefined}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Submit */}
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={sending}>
                  {sending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Offer
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Offers List with Responses */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Offers Column */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-pink-500" />
              All Offers ({offers.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
            {offers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Send className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No offers yet</p>
              </div>
            ) : (
              offers.map((offer) => {
                const stats = getResponseStats(offer);
                return (
                  <div
                    key={offer.id}
                    className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                      selectedOffer === offer.id
                        ? "border-pink-500 bg-pink-500/10"
                        : "hover:border-muted-foreground/50"
                    }`}
                    onClick={() => setSelectedOffer(offer.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {offer.brand?.brands?.company_name || "Unknown Brand"}
                          </span>
                        </div>
                        <h3 className="font-medium">{offer.title}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <Badge variant="outline" className="capitalize">{offer.compensation_type}</Badge>
                          {offer.is_recurring && (
                            <Badge variant="outline" className="bg-violet-500/10 text-violet-500 border-violet-500/30">
                              <Repeat className="h-3 w-3 mr-1" />
                              Recurring
                            </Badge>
                          )}
                          <Badge
                            variant={offer.status === "open" ? "default" : "secondary"}
                            className={offer.status === "open" ? "bg-green-500" : ""}
                          >
                            {offer.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <p className="font-medium">{stats.accepted}/{offer.spots} filled</p>
                        {offer.event_date && (
                          <p className="text-muted-foreground">
                            {new Date(offer.event_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Location & Details */}
                    <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                      {(offer.location_city || offer.location_state) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {[offer.location_name, offer.location_city, offer.location_state].filter(Boolean).join(", ")}
                        </span>
                      )}
                      {offer.event_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {offer.event_time}
                        </span>
                      )}
                      {offer.compensation_type === "paid" && offer.compensation_amount > 0 && (
                        <span className="flex items-center gap-1 text-green-500">
                          <DollarSign className="h-3 w-3" />
                          ${(offer.compensation_amount / 100).toLocaleString()}
                        </span>
                      )}
                    </div>

                    {/* Response Stats */}
                    <div className="flex items-center gap-3 mt-3 pt-3 border-t">
                      <span className="flex items-center gap-1 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        {stats.accepted}
                      </span>
                      <span className="flex items-center gap-1 text-sm">
                        <Clock className="h-4 w-4 text-yellow-500" />
                        {stats.pending}
                      </span>
                      <span className="flex items-center gap-1 text-sm">
                        <XCircle className="h-4 w-4 text-red-500" />
                        {stats.declined}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {new Date(offer.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Responses Column */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Responses {selectedOfferData && `(${selectedOfferData.responses?.length || 0})`}
            </CardTitle>
            <CardDescription>
              {selectedOfferData
                ? `Showing responses for: ${selectedOfferData.title}`
                : "Select an offer to view responses"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
            {!selectedOffer ? (
              <div className="text-center py-8 text-muted-foreground">
                <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select an offer to view responses</p>
              </div>
            ) : !selectedOfferData?.responses?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No responses yet</p>
              </div>
            ) : (
              selectedOfferData.responses.map((response) => (
                <div
                  key={response.id}
                  className="p-4 rounded-lg border flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-pink-500/20 to-violet-500/20">
                      {response.model?.profile_photo_url ? (
                        <img
                          src={response.model.profile_photo_url}
                          alt={response.model.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg">
                          {response.model?.first_name?.charAt(0) || response.model?.username?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                      )}
                    </div>
                    <div>
                      <Link
                        href={`/${response.model?.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium hover:text-pink-500"
                      >
                        {response.model?.first_name || response.model?.last_name
                          ? `${response.model?.first_name || ''} ${response.model?.last_name || ''}`.trim()
                          : `@${response.model?.username}`}
                      </Link>
                      {(response.model?.first_name || response.model?.last_name) && (
                        <p className="text-sm text-muted-foreground">
                          @{response.model?.username}
                        </p>
                      )}
                      {response.responded_at && (
                        <p className="text-xs text-muted-foreground">
                          Responded {new Date(response.responded_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={response.status === "accepted" ? "default" : response.status === "declined" ? "secondary" : "outline"}
                    className={
                      response.status === "accepted" ? "bg-green-500" :
                      response.status === "declined" ? "bg-red-500/10 text-red-500" :
                      ""
                    }
                  >
                    {response.status === "accepted" && <CheckCircle className="h-3 w-3 mr-1" />}
                    {response.status === "declined" && <XCircle className="h-3 w-3 mr-1" />}
                    {response.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                    {response.status}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
