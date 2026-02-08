import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

interface PosStaff {
  id: string;
  name: string;
  role: string | null;
  is_active: boolean | null;
}

/**
 * Validates POS staff authentication via x-pos-staff-id header.
 * Returns the staff record if valid, or a 401 NextResponse if not.
 */
export async function requirePosAuth(
  request: Request
): Promise<PosStaff | NextResponse> {
  const staffId = request.headers.get("x-pos-staff-id");

  if (!staffId) {
    return NextResponse.json(
      { error: "Authentication required. Missing x-pos-staff-id header." },
      { status: 401 }
    );
  }

  const supabase = createServiceRoleClient();

  const { data: staff, error } = await supabase
    .from("pos_staff")
    .select("id, name, role, is_active")
    .eq("id", staffId)
    .eq("is_active", true)
    .single();

  if (error || !staff) {
    return NextResponse.json(
      { error: "Invalid or inactive staff credentials" },
      { status: 401 }
    );
  }

  return staff as PosStaff;
}

/** Type guard to check if requirePosAuth returned an error response */
export function isPosAuthError(
  result: PosStaff | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
