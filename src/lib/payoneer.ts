/**
 * Payoneer Mass Payout API Integration
 *
 * Used for international payouts to models in countries not supported by Stripe Connect:
 * - Brazil, Argentina, Thailand, Ghana, and 190+ other countries
 *
 * Documentation: https://developer.payoneer.com/docs/mass-payouts-and-services.html
 */

import crypto from "crypto";

// ==============================================
// TYPES
// ==============================================

export interface PayoneerConfig {
  clientId: string;
  clientSecret: string;
  partnerId: string;
  environment: "sandbox" | "production";
}

export interface PayoneerTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export interface PayoneerPayee {
  payee_id: string;
  email: string;
  first_name: string;
  last_name: string;
  status: "ACTIVE" | "PENDING" | "INACTIVE";
  country: string;
  created_at: string;
}

export interface PayoneerPayeeRegistration {
  email: string;
  first_name: string;
  last_name: string;
  country: string; // ISO 3166-1 alpha-2 (e.g., "BR", "AR", "TH", "GH")
  address?: {
    address_line_1: string;
    city: string;
    state?: string;
    postal_code: string;
    country: string;
  };
}

export interface PayoneerPayout {
  payout_id: string;
  payee_id: string;
  amount: number;
  currency: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
  description?: string;
  client_reference_id?: string;
  created_at: string;
  completed_at?: string;
}

export interface PayoneerPayoutRequest {
  payee_id: string;
  amount: number;
  currency: string; // ISO 4217 (e.g., "USD")
  description?: string;
  client_reference_id?: string; // Your internal reference (e.g., withdrawal_request_id)
}

export interface PayoneerError {
  error_code: string;
  error_message: string;
  details?: Record<string, unknown>;
}

export interface PayoneerWebhookPayload {
  event_type: string;
  event_id: string;
  timestamp: string;
  data: {
    payout_id?: string;
    payee_id?: string;
    status?: string;
    [key: string]: unknown;
  };
}

// ==============================================
// PAYONEER CLIENT
// ==============================================

class PayoneerClient {
  private config: PayoneerConfig;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(config: PayoneerConfig) {
    this.config = config;
  }

  private get baseUrl(): string {
    return this.config.environment === "production"
      ? "https://api.payoneer.com/v4"
      : "https://api.sandbox.payoneer.com/v4";
  }

  private get authUrl(): string {
    return this.config.environment === "production"
      ? "https://api.payoneer.com/v2/oauth2/token"
      : "https://api.sandbox.payoneer.com/v2/oauth2/token";
  }

  /**
   * Get OAuth2 access token (cached until expiry)
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid (with 60s buffer)
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60000) {
      return this.accessToken;
    }

    const credentials = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`
    ).toString("base64");

    const response = await fetch(this.authUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        scope: "read write",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Payoneer auth failed: ${error}`);
    }

    const data: PayoneerTokenResponse = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + data.expires_in * 1000;

    return this.accessToken;
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    endpoint: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const token = await this.getAccessToken();

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Partner-Id": this.config.partnerId,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      const error = data as PayoneerError;
      throw new Error(
        `Payoneer API error: ${error.error_code} - ${error.error_message}`
      );
    }

    return data as T;
  }

  // ==============================================
  // PAYEE MANAGEMENT
  // ==============================================

  /**
   * Register a new payee (model) with Payoneer
   * Returns a registration link for the payee to complete their account setup
   */
  async registerPayee(
    payee: PayoneerPayeeRegistration
  ): Promise<{ payee_id: string; registration_link: string }> {
    return this.request("POST", "/payees", {
      ...payee,
      partner_id: this.config.partnerId,
    });
  }

  /**
   * Get payee details by ID
   */
  async getPayee(payeeId: string): Promise<PayoneerPayee> {
    return this.request("GET", `/payees/${payeeId}`);
  }

  /**
   * Get payee status
   */
  async getPayeeStatus(
    payeeId: string
  ): Promise<{ status: string; can_receive_payments: boolean }> {
    return this.request("GET", `/payees/${payeeId}/status`);
  }

  /**
   * Get registration link for existing payee
   * (if they need to complete setup)
   */
  async getPayeeRegistrationLink(payeeId: string): Promise<{ link: string }> {
    return this.request("GET", `/payees/${payeeId}/registration-link`);
  }

  // ==============================================
  // PAYOUTS
  // ==============================================

  /**
   * Create a payout to a payee
   */
  async createPayout(payout: PayoneerPayoutRequest): Promise<PayoneerPayout> {
    return this.request("POST", "/payouts", {
      ...payout,
      partner_id: this.config.partnerId,
    });
  }

  /**
   * Get payout details
   */
  async getPayout(payoutId: string): Promise<PayoneerPayout> {
    return this.request("GET", `/payouts/${payoutId}`);
  }

  /**
   * Get payout status
   */
  async getPayoutStatus(
    payoutId: string
  ): Promise<{ status: string; failure_reason?: string }> {
    return this.request("GET", `/payouts/${payoutId}/status`);
  }

  /**
   * Cancel a pending payout
   */
  async cancelPayout(payoutId: string): Promise<{ success: boolean }> {
    return this.request("POST", `/payouts/${payoutId}/cancel`);
  }

  /**
   * Create batch payout (up to 500 payments)
   */
  async createBatchPayout(
    payouts: PayoneerPayoutRequest[]
  ): Promise<{ batch_id: string; payouts: PayoneerPayout[] }> {
    return this.request("POST", "/payouts/batch", {
      payouts,
      partner_id: this.config.partnerId,
    });
  }

  // ==============================================
  // BALANCE & REPORTS
  // ==============================================

  /**
   * Get partner account balance
   */
  async getBalance(): Promise<{ currency: string; available: number }[]> {
    return this.request("GET", "/balances");
  }

  /**
   * Get payout history
   */
  async getPayoutHistory(params?: {
    from_date?: string;
    to_date?: string;
    status?: string;
    page?: number;
    page_size?: number;
  }): Promise<{ payouts: PayoneerPayout[]; total: number }> {
    const query = params
      ? "?" + new URLSearchParams(params as Record<string, string>).toString()
      : "";
    return this.request("GET", `/payouts${query}`);
  }
}

// ==============================================
// SINGLETON INSTANCE
// ==============================================

let payoneerClient: PayoneerClient | null = null;

/**
 * Get Payoneer client instance
 * Throws if environment variables are not configured
 */
export function getPayoneerClient(): PayoneerClient {
  if (payoneerClient) {
    return payoneerClient;
  }

  const clientId = process.env.PAYONEER_CLIENT_ID;
  const clientSecret = process.env.PAYONEER_CLIENT_SECRET;
  const partnerId = process.env.PAYONEER_PARTNER_ID;
  const environment = process.env.PAYONEER_ENVIRONMENT as "sandbox" | "production";

  if (!clientId || !clientSecret || !partnerId) {
    throw new Error(
      "Payoneer not configured. Set PAYONEER_CLIENT_ID, PAYONEER_CLIENT_SECRET, and PAYONEER_PARTNER_ID"
    );
  }

  payoneerClient = new PayoneerClient({
    clientId,
    clientSecret,
    partnerId,
    environment: environment || "sandbox",
  });

  return payoneerClient;
}

/**
 * Check if Payoneer is configured
 */
export function isPayoneerConfigured(): boolean {
  return !!(
    process.env.PAYONEER_CLIENT_ID &&
    process.env.PAYONEER_CLIENT_SECRET &&
    process.env.PAYONEER_PARTNER_ID
  );
}

// ==============================================
// WEBHOOK VERIFICATION
// ==============================================

/**
 * Verify Payoneer webhook signature
 */
export function verifyPayoneerWebhook(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// ==============================================
// COUNTRY HELPERS
// ==============================================

/**
 * Countries where Payoneer is preferred over Stripe
 * (Stripe Connect not available or has limitations)
 */
export const PAYONEER_PREFERRED_COUNTRIES = [
  "AR", // Argentina - Stripe not available
  "GH", // Ghana - Stripe not available
  "NG", // Nigeria - Stripe limited
  "KE", // Kenya - Stripe limited
  "ZA", // South Africa - Stripe limited
  "PH", // Philippines - Stripe limited
  "VN", // Vietnam - Stripe not available
  "BD", // Bangladesh - Stripe not available
  "PK", // Pakistan - Stripe not available
  "EG", // Egypt - Stripe not available
  "MA", // Morocco - Stripe not available
  "TN", // Tunisia - Stripe not available
  "CO", // Colombia - Stripe limited
  "PE", // Peru - Stripe limited
  "CL", // Chile - Stripe limited
  "UA", // Ukraine - Stripe limited
];

/**
 * Countries where both Stripe and Payoneer work well
 * (Let user choose their preference)
 */
export const DUAL_PAYOUT_COUNTRIES = [
  "BR", // Brazil
  "TH", // Thailand
  "MY", // Malaysia
  "ID", // Indonesia
  "MX", // Mexico
  "IN", // India
];

/**
 * Check if country should use Payoneer
 */
export function shouldUsePayoneer(countryCode: string): boolean {
  return PAYONEER_PREFERRED_COUNTRIES.includes(countryCode.toUpperCase());
}

/**
 * Check if country supports both payout methods
 */
export function supportsBothPayoutMethods(countryCode: string): boolean {
  return DUAL_PAYOUT_COUNTRIES.includes(countryCode.toUpperCase());
}
