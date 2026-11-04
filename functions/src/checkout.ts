import type { Product } from './catalog.js';

export const PAYMENT_METHODS = [
  'orange',
  'wave',
  'mtn',
  'moov',
  'djamo',
  'jeko',
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface JekoPaymentRequest {
  readonly amountCents: number;
  readonly currency: 'XOF';
  readonly reference: string;
  readonly storeId: string;
  readonly paymentDetails: {
    readonly type: 'redirect';
    readonly data: {
      readonly paymentMethod: PaymentMethod;
      readonly successUrl: string;
      readonly errorUrl: string;
    };
  };
}

export interface JekoPaymentRequestResponse {
  readonly id: string;
  readonly status: 'pending' | 'error' | 'success';
  readonly redirectUrl: string;
}

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return PAYMENT_METHODS.some((method) => method === value);
}

export function isJekoPaymentRequestResponse(
  value: unknown,
): value is JekoPaymentRequestResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const response = value as Record<string, unknown>;
  if (
    typeof response['id'] !== 'string' ||
    response['id'].length === 0 ||
    (response['status'] !== 'pending' &&
      response['status'] !== 'error' &&
      response['status'] !== 'success') ||
    typeof response['redirectUrl'] !== 'string'
  ) {
    return false;
  }

  try {
    return new URL(response['redirectUrl']).protocol === 'https:';
  } catch {
    return false;
  }
}

export function buildPaymentRequest(
  product: Pick<Product, 'priceXof'>,
  orderId: string,
  paymentMethod: PaymentMethod,
  storeId: string,
  returnPath = '/academie/documents',
): JekoPaymentRequest {
  if (!Number.isSafeInteger(product.priceXof) || product.priceXof < 1) {
    throw new Error('The server-side product price is invalid.');
  }

  const amountCents = product.priceXof * 100;
  if (!Number.isSafeInteger(amountCents) || amountCents < 100) {
    throw new Error('The server-side payment amount is invalid.');
  }

  const reference = `CG-${orderId}`;

  return {
    amountCents,
    currency: 'XOF',
    reference,
    storeId,
    paymentDetails: {
      type: 'redirect',
      data: {
        paymentMethod,
        successUrl: `https://www.charlyguitare.com${returnPath}?payment=success&reference=${encodeURIComponent(reference)}`,
        errorUrl: `https://www.charlyguitare.com${returnPath}?payment=error&reference=${encodeURIComponent(reference)}`,
      },
    },
  };
}
