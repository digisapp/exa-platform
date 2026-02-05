import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin check
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!actor || actor.type !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { status, admin_notes, rejection_reason } = body;

    // Validate status
    const validStatuses = ["pending", "reviewing", "approved", "rejected", "enrolled"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Use admin client for the update
    const adminClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (status) {
      updateData.status = status;
      updateData.reviewed_at = new Date().toISOString();
      updateData.reviewed_by = actor.id;
    }
    if (admin_notes !== undefined) {
      updateData.admin_notes = admin_notes;
    }
    if (rejection_reason !== undefined) {
      updateData.rejection_reason = rejection_reason;
    }

    const { data: application, error } = await adminClient
      .from("content_program_applications")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Update application error:", error);
      throw error;
    }

    // If approved, create enrollment
    if (status === "approved" && application) {
      // Check if enrollment already exists
      const { data: existingEnrollment } = await adminClient
        .from("content_program_enrollments")
        .select("id")
        .eq("application_id", id)
        .single();

      if (!existingEnrollment) {
        // Create enrollment with 3 payments
        const startDate = new Date();
        const { data: enrollment, error: enrollError } = await adminClient
          .from("content_program_enrollments")
          .insert({
            application_id: id,
            brand_name: application.brand_name,
            contact_email: application.email,
            start_date: startDate.toISOString().split("T")[0],
            commitment_months: 3,
            monthly_rate: 500.00,
            swim_week_package_cost: 3000.00,
            swim_week_target_date: "2026-05-26",
            status: "active",
          })
          .select()
          .single();

        if (enrollError) {
          console.error("Create enrollment error:", enrollError);
        } else if (enrollment) {
          // Create 3 payment records
          const payments = [];
          for (let i = 1; i <= 3; i++) {
            const dueDate = new Date(startDate);
            dueDate.setMonth(dueDate.getMonth() + i - 1);
            payments.push({
              enrollment_id: enrollment.id,
              amount: 500.00,
              payment_month: i,
              due_date: dueDate.toISOString().split("T")[0],
              status: i === 1 ? "due" : "pending",
              credits_toward_swim_week: 500.00,
            });
          }

          const { error: paymentsError } = await adminClient
            .from("content_program_payments")
            .insert(payments);

          if (paymentsError) {
            console.error("Create payments error:", paymentsError);
          }

          // Update application status to enrolled
          await adminClient
            .from("content_program_applications")
            .update({ status: "enrolled" })
            .eq("id", id);
        }
      }

      // TODO: Send approval email
      // await sendContentProgramApprovedEmail({
      //   to: application.email,
      //   brandName: application.brand_name,
      //   contactName: application.contact_name,
      // });
    }

    return NextResponse.json({ success: true, application });
  } catch (error) {
    console.error("Update content program application error:", error);
    return NextResponse.json(
      { error: "Failed to update application" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin check
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!actor || actor.type !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Use admin client for the delete
    const adminClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await adminClient
      .from("content_program_applications")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Delete application error:", error);
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete content program application error:", error);
    return NextResponse.json(
      { error: "Failed to delete application" },
      { status: 500 }
    );
  }
}
