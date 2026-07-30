import { NextResponse } from "next/server";
import { decryptBankAccount } from "@/lib/encryption";
import { withAuth } from "@/lib/auth/with-auth";
import { logger } from "@/lib/logger";

export const GET = withAuth<{ id: string }>(
  async ({ params, supabase }) => {
    const { id } = params;

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

    // Decrypt account number and routing number
    let accountNumber: string;
    let routingNumber: string;
    try {
      accountNumber = decryptBankAccount(bankAccount.account_number_encrypted);
    } catch (decryptError) {
      logger.error("Failed to decrypt account number", decryptError);
      return NextResponse.json({ error: "Failed to decrypt account number" }, { status: 500 });
    }
    try {
      routingNumber = decryptBankAccount(bankAccount.routing_number);
    } catch {
      // Fallback: routing number may not be encrypted in older records
      routingNumber = bankAccount.routing_number;
    }

    return NextResponse.json({
      id: bankAccount.id,
      account_holder_name: bankAccount.account_holder_name,
      bank_name: bankAccount.bank_name,
      account_number: accountNumber,
      routing_number: routingNumber,
      account_type: bankAccount.account_type,
    });
  },
  { requireType: "admin", rateLimit: "general" }
);
