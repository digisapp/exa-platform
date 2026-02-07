import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import {
  getPayoneerClient,
  isPayoneerConfigured,
  PayoneerPayeeRegistration,
} from "@/lib/payoneer";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

/**
 * POST /api/payoneer/register
 * Register a model with Payoneer to receive payouts
 */
export async function POST(request: NextRequest) {
  try {
    // Check if Payoneer is configured
    if (!isPayoneerConfigured()) {
      return NextResponse.json(
        { error: "Payoneer is not configured" },
        { status: 503 }
      );
    }

    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit check
    const rateLimitResult = await checkEndpointRateLimit(request, "financial", user.id);
    if (rateLimitResult) return rateLimitResult;

    // Get model
    const { data: model } = (await supabase
      .from("models")
      .select("id, email, first_name, last_name, country_code")
      .eq("user_id", user.id)
      .single()) as { data: { id: string; email: string; first_name: string; last_name: string; country_code: string } | null };

    if (!model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    // Check if already registered
    const { data: existing } = (await supabase
      .from("payoneer_accounts")
      .select("id, status, registration_link")
      .eq("model_id", model.id)
      .single()) as { data: { id: string; status: string; registration_link: string } | null };

    if (existing) {
      // If pending, return the registration link
      if (existing.status === "pending" && existing.registration_link) {
        return NextResponse.json({
          status: "pending",
          registration_link: existing.registration_link,
          message: "Please complete your Payoneer registration",
        });
      }

      // If active, no need to register again
      if (existing.status === "active") {
        return NextResponse.json({
          status: "active",
          message: "Payoneer account already active",
        });
      }
    }

    // Get request body for additional info
    const body = await request.json().catch(() => ({}));
    const countryCode = body.country_code || model.country_code;

    if (!countryCode) {
      return NextResponse.json(
        { error: "Country code is required" },
        { status: 400 }
      );
    }

    // Register with Payoneer
    const payoneer = getPayoneerClient();

    const registration: PayoneerPayeeRegistration = {
      email: model.email,
      first_name: model.first_name || "Model",
      last_name: model.last_name || user.id.slice(0, 8),
      country: countryCode.toUpperCase(),
    };

    const result = await payoneer.registerPayee(registration);

    // Save to database
    if (existing) {
      // Update existing record
      await supabase
        .from("payoneer_accounts")
        .update({
          payee_id: result.payee_id,
          registration_link: result.registration_link,
          status: "pending",
          country: countryCode.toUpperCase(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      // Create new record
      await supabase.from("payoneer_accounts").insert({
        model_id: model.id,
        payee_id: result.payee_id,
        email: model.email,
        first_name: model.first_name,
        last_name: model.last_name,
        country: countryCode.toUpperCase(),
        registration_link: result.registration_link,
        status: "pending",
      });
    }

    // Update model's country code if not set
    if (!model.country_code) {
      await supabase
        .from("models")
        .update({ country_code: countryCode.toUpperCase() })
        .eq("id", model.id);
    }

    return NextResponse.json({
      status: "pending",
      registration_link: result.registration_link,
      message: "Please complete your Payoneer registration to receive payouts",
    });
  } catch (error) {
    console.error("Payoneer registration error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Registration failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/payoneer/register
 * Get current Payoneer registration status
 */
export async function GET() {
  try {
    if (!isPayoneerConfigured()) {
      return NextResponse.json(
        { error: "Payoneer is not configured", configured: false },
        { status: 503 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get model
    const { data: model } = (await supabase
      .from("models")
      .select("id")
      .eq("user_id", user.id)
      .single()) as { data: { id: string } | null };

    if (!model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    // Get Payoneer account
    const { data: account } = (await supabase
      .from("payoneer_accounts")
      .select("*")
      .eq("model_id", model.id)
      .single()) as { data: any };

    if (!account) {
      return NextResponse.json({
        configured: true,
        registered: false,
        status: null,
      });
    }

    // If pending, check with Payoneer for updated status
    if (account.status === "pending") {
      try {
        const payoneer = getPayoneerClient();
        const status = await payoneer.getPayeeStatus(account.payee_id);

        if (status.can_receive_payments && account.status !== "active") {
          // Update local status
          await supabase
            .from("payoneer_accounts")
            .update({
              status: "active",
              can_receive_payments: true,
              registration_completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", account.id);

          account.status = "active";
          account.can_receive_payments = true;
        }
      } catch {
        // Ignore errors checking status - return cached data
      }
    }

    return NextResponse.json({
      configured: true,
      registered: true,
      status: account.status,
      can_receive_payments: account.can_receive_payments,
      registration_link: account.status === "pending" ? account.registration_link : null,
      country: account.country,
    });
  } catch (error) {
    console.error("Payoneer status check error:", error);
    return NextResponse.json(
      { error: "Failed to check status" },
      { status: 500 }
    );
  }
}
