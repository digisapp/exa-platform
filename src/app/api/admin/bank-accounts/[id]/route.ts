import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { decryptBankAccount } from "@/lib/encryption";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if admin
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!actor || actor.type !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Rate limit
    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    // Get bank account
    interface BankAccountRow {
      id: string;
      account_holder_name: string;
      bank_name: string;
      account_number_encrypted: string;
      routing_number: string;
      account_type: string;
    }

    const { data: bankAccount, error } = await supabase
      .from("bank_accounts")
      .select("*")
      .eq("id", id)
      .single() as { data: BankAccountRow | null; error: unknown };

    if (error || !bankAccount) {
      return NextResponse.json({ error: "Bank account not found" }, { status: 404 });
    }

    // Decrypt account number
    let accountNumber: string;
    try {
      accountNumber = decryptBankAccount(bankAccount.account_number_encrypted);
    } catch (decryptError) {
      console.error("Failed to decrypt account number:", decryptError);
      return NextResponse.json({ error: "Failed to decrypt account number" }, { status: 500 });
    }

    return NextResponse.json({
      id: bankAccount.id,
      account_holder_name: bankAccount.account_holder_name,
      bank_name: bankAccount.bank_name,
      account_number: accountNumber,
      routing_number: bankAccount.routing_number,
      account_type: bankAccount.account_type,
    });
  } catch (error) {
    console.error("Admin bank account error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
