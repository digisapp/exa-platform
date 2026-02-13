"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeliveryCard } from "@/components/deliveries/DeliveryCard";
import { DeliveryDetailSheet } from "@/components/deliveries/DeliveryDetailSheet";
import { LibraryContentCard } from "@/components/deliveries/LibraryContentCard";
import { LibraryContentDetailSheet } from "@/components/deliveries/LibraryContentDetailSheet";
import { FolderDown, Loader2, Inbox } from "lucide-react";

interface Delivery {
  id: string;
  model_id: string;
  booking_id?: string | null;
  offer_id?: string | null;
  recipient_actor_id: string;
  title?: string | null;
  notes?: string | null;
  status: string;
  revision_notes?: string | null;
  delivered_at: string;
  approved_at?: string | null;
  fileCount: number;
  totalSize: number;
  model?: {
    id: string;
    username: string;
    first_name?: string | null;
    last_name?: string | null;
    profile_photo_url?: string | null;
  } | null;
  booking?: {
    id: string;
    booking_number: string;
    service_type: string;
    event_date: string;
  } | null;
  offer?: {
    id: string;
    title: string;
    event_date?: string | null;
  } | null;
}

interface LibraryItem {
  assignmentId: string;
  libraryItemId: string;
  title: string;
  description: string | null;
  notes: string | null;
  assignedAt: string;
  fileCount: number;
  totalSize: number;
}

export default function BrandContentPage() {
  const [loading, setLoading] = useState(true);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null);
  const [selectedLibraryItemId, setSelectedLibraryItemId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [librarySheetOpen, setLibrarySheetOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("models");
  const [activeTab, setActiveTab] = useState("all");

  const loadDeliveries = async () => {
    try {
      const res = await fetch("/api/deliveries?role=brand");
      if (res.ok) {
        const data = await res.json();
        setDeliveries(data.deliveries || []);
      }
    } catch (error) {
      console.error("Failed to load deliveries:", error);
    }
  };

  const loadLibraryItems = async () => {
    try {
      const res = await fetch("/api/media-hub/assigned");
      if (res.ok) {
        const data = await res.json();
        setLibraryItems(data.items || []);
      }
    } catch (error) {
      console.error("Failed to load library items:", error);
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      await Promise.all([loadDeliveries(), loadLibraryItems()]);
      setLoading(false);
    };
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDeliveryClick = (deliveryId: string) => {
    setSelectedDeliveryId(deliveryId);
    setSheetOpen(true);
  };

  const handleLibraryItemClick = (libraryItemId: string) => {
    setSelectedLibraryItemId(libraryItemId);
    setLibrarySheetOpen(true);
  };

  const filteredDeliveries = deliveries.filter((d) => {
    if (activeTab === "all") return true;
    return d.status === activeTab;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-full bg-gradient-to-r from-pink-500/20 to-violet-500/20">
          <FolderDown className="h-6 w-6 text-pink-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Content</h1>
          <p className="text-sm text-muted-foreground">
            Content deliverables and shared files
          </p>
        </div>
      </div>

      {/* Section Tabs: From Models / From EXA */}
      <Tabs value={activeSection} onValueChange={(v) => { setActiveSection(v); setActiveTab("all"); }}>
        <TabsList>
          <TabsTrigger value="models">
            From Models ({deliveries.length})
          </TabsTrigger>
          <TabsTrigger value="exa">
            From EXA ({libraryItems.length})
          </TabsTrigger>
        </TabsList>

        {/* From Models */}
        <TabsContent value="models" className="mt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">
                All ({deliveries.length})
              </TabsTrigger>
              <TabsTrigger value="delivered">
                Delivered ({deliveries.filter((d) => d.status === "delivered").length})
              </TabsTrigger>
              <TabsTrigger value="approved">
                Approved ({deliveries.filter((d) => d.status === "approved").length})
              </TabsTrigger>
              <TabsTrigger value="revision_requested">
                Revision ({deliveries.filter((d) => d.status === "revision_requested").length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {filteredDeliveries.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Inbox className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No deliveries yet</p>
                  <p className="text-sm mt-1">
                    {activeTab === "all"
                      ? "Content deliverables from models will appear here"
                      : `No ${activeTab.replace("_", " ")} deliveries`}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredDeliveries.map((delivery) => (
                    <DeliveryCard
                      key={delivery.id}
                      delivery={delivery}
                      onClick={() => handleDeliveryClick(delivery.id)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* From EXA */}
        <TabsContent value="exa" className="mt-4">
          {libraryItems.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Inbox className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No shared content yet</p>
              <p className="text-sm mt-1">
                Content shared by EXA will appear here
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {libraryItems.map((item) => (
                <LibraryContentCard
                  key={item.assignmentId}
                  item={item}
                  onClick={() => handleLibraryItemClick(item.libraryItemId)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delivery Detail Sheet */}
      <DeliveryDetailSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        deliveryId={selectedDeliveryId}
        role="brand"
        onStatusChange={loadDeliveries}
      />

      {/* Library Content Detail Sheet */}
      <LibraryContentDetailSheet
        open={librarySheetOpen}
        onOpenChange={setLibrarySheetOpen}
        libraryItemId={selectedLibraryItemId}
      />
    </div>
  );
}
