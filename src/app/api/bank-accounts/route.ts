import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { encryptBankAccount } from "@/lib/encryption";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

interface BankAccountRow {
  id: string;
  account_holder_name: string;
  bank_name: string;
  account_number_last4: string;
  routing_number: string;
  account_type: string;
  is_primary: boolean;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit check
    const rateLimitResult = await checkEndpointRateLimit(request, "financial", user.id);
    if (rateLimitResult) return rateLimitResult;

    // Get model ID
    const { data: model } = await supabase
      .from("models")
      .select("id")
      .eq("user_id", user.id)
      .single() as { data: { id: string } | null };

    if (!model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      accountHolderName,
      bankName,
      routingNumber,
      accountNumber,
      accountType,
    } = body;

    // Validate
    if (!accountHolderName || !bankName || !routingNumber || !accountNumber || !accountType) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (routingNumber.length !== 9) {
      return NextResponse.json({ error: "Routing number must be 9 digits" }, { status: 400 });
    }

    if (accountNumber.length < 4) {
      return NextResponse.json({ error: "Invalid account number" }, { status: 400 });
    }

    // Encrypt the account number and routing number
    const encryptedAccountNumber = encryptBankAccount(accountNumber);
    const encryptedRoutingNumber = encryptBankAccount(routingNumber);

    // Check if model already has a bank account
    const { data: existingAccounts } = await (supabase
      .from("bank_accounts") as any)
      .select("id")
      .eq("model_id", model.id);

    const isPrimary = !existingAccounts || existingAccounts.length === 0;

    // Insert bank account
    const { data: bankAccount, error } = await (supabase
      .from("bank_accounts") as any)
      .insert({
        model_id: model.id,
        account_holder_name: accountHolderName,
        bank_name: bankName,
        routing_number: encryptedRoutingNumber,
        account_number_encrypted: encryptedAccountNumber,
        account_number_last4: accountNumber.slice(-4),
        account_type: accountType,
        is_primary: isPrimary,
      })
      .select()
      .single() as { data: BankAccountRow | null; error: unknown };

    if (error) {
      console.error("Error saving bank account:", error);
      return NextResponse.json({ error: "Failed to save bank account" }, { status: 500 });
    }

    if (!bankAccount) {
      return NextResponse.json({ error: "Failed to create bank account" }, { status: 500 });
    }

    // Return bank account without encrypted data
    return NextResponse.json({
      id: bankAccount.id,
      account_holder_name: bankAccount.account_holder_name,
      bank_name: bankAccount.bank_name,
      account_number_last4: bankAccount.account_number_last4,
      routing_number_last4: routingNumber.slice(-4),
      account_type: bankAccount.account_type,
      is_primary: bankAccount.is_primary,
    });
  } catch (error) {
    console.error("Bank account error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();

    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bankAccountId = searchParams.get("id");

    if (!bankAccountId) {
      return NextResponse.json({ error: "Bank account ID required" }, { status: 400 });
    }

    // Get model ID
    const { data: model } = await supabase
      .from("models")
      .select("id")
      .eq("user_id", user.id)
      .single() as { data: { id: string } | null };

    if (!model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    // Delete bank account (only if it belongs to this model)
    const { error } = await (supabase
      .from("bank_accounts") as any)
      .delete()
      .eq("id", bankAccountId)
      .eq("model_id", model.id);

    if (error) {
      console.error("Error deleting bank account:", error);
      return NextResponse.json({ error: "Failed to delete bank account" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Bank account delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
