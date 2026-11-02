import { createHmac, timingSafeEqual } from 'node:crypto';

export interface JekoTransaction {
  readonly id: string;
  readonly transactionType: 'payment' | 'transfer';
  readonly status: 'pending' | 'success' | 'error';
  readonly amount: {
    readonly amount: number;
    readonly currency: string;
  };
  readonly transactionDetails: {
    readonly id?: string;
    readonly reference?: string;
  };
}

export function verifyJekoSignature(
  rawBody: Buffer,
  signature: string | undefined,
  secret: string,
): boolean {
  if (!signature || !/^[0-9a-f]{64}$/.test(signature)) {
    return false;
  }

  const expected = createHmac('sha256', secret).update(rawBody).digest();
  const received = Buffer.from(signature, 'hex');

  return received.length === expected.length && timingSafeEqual(expected, received);
}

export function parseJekoTransaction(
  value: unknown,
): JekoTransaction | undefined {
  if (!isRecord(value) || !isRecord(value['amount'])) {
    return undefined;
  }

  const amount = value['amount']['amount'];
  const currency = value['amount']['currency'];
  const details = value['transactionDetails'];
  if (
    !isRecord(details) ||
    typeof value['id'] !== 'string' ||
    value['id'].length < 1 ||
    value['id'].length > 256 ||
    (value['transactionType'] !== 'payment' &&
      value['transactionType'] !== 'transfer') ||
    (value['status'] !== 'pending' &&
      value['status'] !== 'success' &&
      value['status'] !== 'error') ||
    typeof amount !== 'number' ||
    !Number.isSafeInteger(amount) ||
    typeof currency !== 'string' ||
    (details['reference'] !== undefined &&
      (typeof details['reference'] !== 'string' ||
        !/^CG-[0-9a-f-]{36}$/.test(details['reference']))) ||
    (details['id'] !== undefined &&
      (typeof details['id'] !== 'string' ||
        details['id'].length < 1 ||
        details['id'].length > 256))
  ) {
    return undefined;
  }

  return {
    id: value['id'],
    transactionType: value['transactionType'],
    status: value['status'],
    amount: {
      amount,
      currency,
    },
    transactionDetails: {
      ...(typeof details['id'] === 'string' && { id: details['id'] }),
      ...(typeof details['reference'] === 'string' && {
        reference: details['reference'],
      }),
    },
  };
}

export function matchesOrderPayment(
  order: unknown,
  transaction: JekoTransaction,
): order is Record<string, unknown> {
  if (
    !isRecord(order) ||
    typeof order['userId'] !== 'string' ||
    typeof order['productId'] !== 'string' ||
    typeof order['storagePath'] !== 'string' ||
    typeof order['amountXof'] !== 'number' ||
    !Number.isSafeInteger(order['amountXof']) ||
    order['amountXof'] < 1 ||
    order['currency'] !== 'XOF' ||
    order['reference'] !== transaction.transactionDetails.reference ||
    transaction.transactionType !== 'payment' ||
    transaction.amount.currency !== order['currency'] ||
    transaction.amount.amount !== order['amountXof'] * 100 ||
    (typeof order['jekoPaymentRequestId'] === 'string' &&
      transaction.transactionDetails.id !== undefined &&
      transaction.transactionDetails.id !== order['jekoPaymentRequestId'])
  ) {
    return false;
  }

  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
