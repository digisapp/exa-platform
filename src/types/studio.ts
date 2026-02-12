export interface StudioSlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  max_bookings: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  bookings?: StudioBooking[];
  booking?: StudioBooking | null;
}

export interface StudioBooking {
  id: string;
  slot_id: string;
  model_id: string;
  notes: string | null;
  status: "confirmed" | "cancelled" | "completed" | "no_show";
  cancelled_at: string | null;
  cancelled_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  slot?: StudioSlot;
  model?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    username: string | null;
    profile_photo_url: string | null;
  };
}
