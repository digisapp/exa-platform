import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { sendPrintReadyForPickupEmail } from "@/lib/email";
import { z } from "zod";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: actor } = await supabase
      .from("actors")
      .select("type")
      .eq("user_id", user.id)
      .single();
    if (!actor || actor.type !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const printQueueSchema = z.object({
      status: z.enum(["paid", "printing", "ready", "picked_up", "cancelled"], { message: "Invalid status" }),
      notes: z.string().optional(),
    });
    const parsed = printQueueSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }
    const { status, notes } = parsed.data;

    const adminClient: any = createServiceRoleClient();

    // Fetch the order first so we can send emails
    const { data: order } = await adminClient
      .from("comp_card_print_orders")
      .select("id, email, first_name, quantity, status")
      .eq("id", id)
      .single();

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const updateData: Record<string, string> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (notes !== undefined) updateData.notes = notes;

    const { error } = await adminClient
      .from("comp_card_print_orders")
      .update(updateData)
      .eq("id", id);

    if (error) {
      console.error("Print order update error:", error);
      return NextResponse.json(
        { error: "Failed to update order" },
        { status: 500 }
      );
    }

    // Send "ready for pickup" email when status changes to "ready"
    if (status === "ready" && order.status !== "ready" && order.email) {
      try {
        await sendPrintReadyForPickupEmail({
          to: order.email,
          firstName: order.first_name || "there",
          quantity: order.quantity,
        });
      } catch (emailError) {
        console.error("Failed to send ready for pickup email:", emailError);
        // Don't fail the status update if email fails
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Print order update error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
