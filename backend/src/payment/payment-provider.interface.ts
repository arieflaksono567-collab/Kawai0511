/**
 * KAWAI 0511 - Phase 6B Payment Provider Abstraction
 * Core system is decoupled from specific vendors (Midtrans, Xendit, QRIS, Cash, etc.)
 */

import * as crypto from 'crypto';

export interface ProviderPaymentRequest {
  paymentId: string;
  amount: number;
  currency: string;
  idempotencyKey: string;
  metadata?: Record<string, any>;
}

export interface NormalizedPaymentResponse {
  providerPaymentId: string;
  status: 'PAID' | 'AUTHORIZED' | 'PENDING' | 'FAILED';
  paidAt?: string;
  actionUrl?: string; // QRIS image URL, DeepLink, or redirect URL
  rawResponse?: Record<string, any>;
}

export interface NormalizedWebhookResult {
  verified: boolean;
  eventId?: string;
  providerPaymentId?: string;
  status?: 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
  paidAt?: string;
  failedReason?: string;
  amount?: number;
  rawPayload?: Record<string, any>;
}

export interface NormalizedRefundResponse {
  refundId: string;
  status: 'REFUNDED' | 'FAILED';
  refundedAt?: string;
  rawResponse?: Record<string, any>;
}

export interface PaymentProvider {
  readonly providerName: string;

  createPayment(request: ProviderPaymentRequest): Promise<NormalizedPaymentResponse>;
  getPaymentStatus(providerPaymentId: string): Promise<NormalizedPaymentResponse>;
  verifyWebhook(headers: Record<string, any>, payload: any): Promise<NormalizedWebhookResult>;
  refundPayment(
    providerPaymentId: string,
    amount: number,
    reason?: string
  ): Promise<NormalizedRefundResponse>;
}

/**
 * Cash Payment Provider for In-Person Cash Settlements
 * Cash is directly collected offline by driver upon ride completion.
 */
export class CashPaymentProvider implements PaymentProvider {
  readonly providerName = 'CASH';

  async createPayment(request: ProviderPaymentRequest): Promise<NormalizedPaymentResponse> {
    const now = new Date().toISOString();
    return {
      providerPaymentId: `cash-${request.paymentId}`,
      status: 'PAID',
      paidAt: now,
      rawResponse: {
        provider: this.providerName,
        paymentId: request.paymentId,
        amount: request.amount,
        currency: request.currency,
        settlementMethod: 'OFFLINE_CASH',
      },
    };
  }

  async getPaymentStatus(providerPaymentId: string): Promise<NormalizedPaymentResponse> {
    return {
      providerPaymentId,
      status: 'PAID',
      paidAt: new Date().toISOString(),
    };
  }

  async verifyWebhook(_headers: Record<string, any>, _payload: any): Promise<NormalizedWebhookResult> {
    return {
      verified: false,
      failedReason: 'Cash provider does not accept external webhooks',
    };
  }

  async refundPayment(
    providerPaymentId: string,
    _amount: number,
    _reason?: string
  ): Promise<NormalizedRefundResponse> {
    return {
      refundId: `cash-refund-${providerPaymentId}`,
      status: 'REFUNDED',
      refundedAt: new Date().toISOString(),
    };
  }
}

/**
 * Mock Digital Payment Provider for Architecture & End-to-End Testing
 * Supports both immediate settlement and async webhook flow (COMPLETED -> PENDING -> Webhook -> PAID)
 */
export class MockDigitalPaymentProvider implements PaymentProvider {
  readonly providerName = 'MOCK_DIGITAL_GATEWAY';
  private readonly secretKey: string;
  private readonly maxTimestampDriftMs: number;
  private asyncMode: boolean;

  constructor(
    secretKey = 'mock-webhook-secret-kawai0511',
    maxTimestampDriftMs = 300000,
    asyncMode = false
  ) {
    this.secretKey = secretKey;
    this.maxTimestampDriftMs = maxTimestampDriftMs;
    this.asyncMode = asyncMode;
  }

  setAsyncMode(enabled: boolean) {
    this.asyncMode = enabled;
  }

  isAsyncMode(): boolean {
    return this.asyncMode;
  }

  /**
   * Helper utility to generate valid test signatures for mock testing
   */
  generateSignature(payload: any, timestamp: number): string {
    const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(`${timestamp}.${payloadStr}`)
      .digest('hex');
  }

  async createPayment(request: ProviderPaymentRequest): Promise<NormalizedPaymentResponse> {
    const now = new Date().toISOString();
    const providerPaymentId = `mock-digital-${request.paymentId}`;

    if (this.asyncMode) {
      // Phase 6B Flow: returns PENDING awaiting customer interaction / webhook confirmation
      return {
        providerPaymentId,
        status: 'PENDING',
        actionUrl: `https://mock-gateway.kawai.id/pay/qris/${request.paymentId}`,
        rawResponse: {
          provider: this.providerName,
          idempotencyKey: request.idempotencyKey,
          amount: request.amount,
          currency: request.currency,
        },
      };
    }

    // Immediate Settlement (Phase 6A compatibility)
    return {
      providerPaymentId,
      status: 'PAID',
      paidAt: now,
      actionUrl: `https://mock-gateway.kawai.id/pay/qris/${request.paymentId}`,
      rawResponse: {
        provider: this.providerName,
        idempotencyKey: request.idempotencyKey,
        amount: request.amount,
        currency: request.currency,
      },
    };
  }

  async getPaymentStatus(providerPaymentId: string): Promise<NormalizedPaymentResponse> {
    return {
      providerPaymentId,
      status: 'PAID',
      paidAt: new Date().toISOString(),
    };
  }

  async verifyWebhook(
    headers: Record<string, any>,
    payload: any
  ): Promise<NormalizedWebhookResult> {
    const signature =
      headers['x-webhook-signature'] ||
      headers['x-signature'] ||
      headers['authorization'];
    const timestampHeader =
      headers['x-webhook-timestamp'] || headers['x-timestamp'];

    if (!signature) {
      return {
        verified: false,
        failedReason: 'Missing webhook signature header',
      };
    }

    if (!timestampHeader) {
      return {
        verified: false,
        failedReason: 'Missing webhook timestamp header for replay protection',
      };
    }

    const timestamp = parseInt(String(timestampHeader), 10);
    if (isNaN(timestamp)) {
      return {
        verified: false,
        failedReason: 'Invalid webhook timestamp format',
      };
    }

    const now = Date.now();
    // Replay attack protection: check timestamp drift (neither too old nor in future > 60s)
    if (Math.abs(now - timestamp) > this.maxTimestampDriftMs) {
      return {
        verified: false,
        failedReason: `Webhook timestamp expired or drifted beyond tolerance (${Math.round(
          Math.abs(now - timestamp) / 1000
        )}s drift, max ${this.maxTimestampDriftMs / 1000}s allowed)`,
      };
    }

    // Verify HMAC-SHA256 signature
    const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const expectedSignature = crypto
      .createHmac('sha256', this.secretKey)
      .update(`${timestamp}.${payloadStr}`)
      .digest('hex');

    const signatureMatch =
      signature.toLowerCase() === expectedSignature.toLowerCase();

    if (!signatureMatch) {
      return {
        verified: false,
        failedReason: 'Invalid webhook signature',
      };
    }

    // Normalized parsing
    const eventId = payload.eventId || payload.id;
    const providerPaymentId =
      payload.providerPaymentId || payload.paymentId || payload.orderId;
    const eventStatus = payload.status || (payload.success ? 'PAID' : 'FAILED');

    let normalizedStatus: 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUNDED' = 'PAID';
    if (['SUCCESS', 'PAID', 'SETTLEMENT'].includes(String(eventStatus).toUpperCase())) {
      normalizedStatus = 'PAID';
    } else if (['FAILED', 'EXPIRED', 'DENIED'].includes(String(eventStatus).toUpperCase())) {
      normalizedStatus = 'FAILED';
    } else if (['CANCELLED', 'CANCELED'].includes(String(eventStatus).toUpperCase())) {
      normalizedStatus = 'CANCELLED';
    } else if (['REFUND', 'REFUNDED'].includes(String(eventStatus).toUpperCase())) {
      normalizedStatus = 'REFUNDED';
    }

    return {
      verified: true,
      eventId,
      providerPaymentId,
      status: normalizedStatus,
      paidAt: payload.paidAt || (normalizedStatus === 'PAID' ? new Date().toISOString() : undefined),
      amount: payload.amount,
      rawPayload: payload,
    };
  }

  async refundPayment(
    providerPaymentId: string,
    amount: number,
    reason?: string
  ): Promise<NormalizedRefundResponse> {
    return {
      refundId: `mock-refund-${providerPaymentId}-${Date.now()}`,
      status: 'REFUNDED',
      refundedAt: new Date().toISOString(),
      rawResponse: {
        providerPaymentId,
        amount,
        reason: reason || 'Customer requested refund',
      },
    };
  }
}

/**
 * Backward compatibility alias for Phase 6A
 */
export const MockPaymentProvider = MockDigitalPaymentProvider;
