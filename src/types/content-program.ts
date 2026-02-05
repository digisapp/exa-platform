// Swimwear Content Program Types

export type ApplicationStatus = 'pending' | 'reviewing' | 'approved' | 'rejected' | 'enrolled';
export type EnrollmentStatus = 'active' | 'paused' | 'completed' | 'cancelled' | 'swim_week';
export type PaymentStatus = 'pending' | 'due' | 'paid' | 'overdue' | 'waived';
export type DeliverableStatus = 'pending' | 'in_progress' | 'delivered' | 'approved';
export type NoteType = 'general' | 'call_notes' | 'delivery_notes' | 'payment_notes' | 'internal';

export interface ContentProgramApplication {
  id: string;
  brand_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  website_url: string | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  collection_name: string | null;
  collection_description: string | null;
  collection_pieces_count: number | null;
  target_audience: string | null;
  user_id: string | null;
  status: ApplicationStatus;
  reviewed_at: string | null;
  reviewed_by: string | null;
  admin_notes: string | null;
  rejection_reason: string | null;
  source: string;
  source_detail: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContentProgramEnrollment {
  id: string;
  application_id: string;
  brand_name: string;
  contact_email: string;
  start_date: string;
  commitment_months: number;
  monthly_rate: number;
  swim_week_package_cost: number;
  swim_week_target_date: string;
  status: EnrollmentStatus;
  created_at: string;
  updated_at: string;
  // Joined data
  payments?: ContentProgramPayment[];
  deliverables?: ContentProgramDeliverable[];
  application?: ContentProgramApplication;
}

export interface ContentProgramPayment {
  id: string;
  enrollment_id: string;
  amount: number;
  payment_month: number;
  due_date: string;
  status: PaymentStatus;
  paid_at: string | null;
  payment_method: string | null;
  stripe_payment_intent_id: string | null;
  stripe_invoice_id: string | null;
  credits_toward_swim_week: number;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContentProgramDeliverable {
  id: string;
  enrollment_id: string;
  payment_id: string | null;
  delivery_month: number;
  video_clips_count: number;
  video_clips_required: number;
  photos_count: number;
  photos_required: number;
  status: DeliverableStatus;
  delivery_date: string | null;
  delivery_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContentProgramNote {
  id: string;
  application_id: string | null;
  enrollment_id: string | null;
  content: string;
  note_type: NoteType;
  created_by: string | null;
  created_at: string;
}

// Helper type for enrollment with all related data
export interface EnrollmentWithDetails extends ContentProgramEnrollment {
  payments: ContentProgramPayment[];
  deliverables: ContentProgramDeliverable[];
  total_paid: number;
  total_credits: number;
  remaining_balance: number;
}

// Stats for admin dashboard
export interface ContentProgramStats {
  pendingApplications: number;
  activeEnrollments: number;
  totalPaymentsReceived: number;
  totalSwimWeekCredits: number;
}
