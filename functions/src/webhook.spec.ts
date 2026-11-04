import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';

import {
  matchesOrderPayment,
  parseJekoTransaction,
  verifyJekoSignature,
} from './webhook.js';

const reference = 'CG-550e8400-e29b-41d4-a716-446655440000';
const payment = {
  id: 'transaction-123',
  amount: { amount: 125_000, currency: 'XOF' },
  fees: { amount: 100, currency: 'XOF' },
  status: 'success',
  transactionType: 'payment',
  transactionDetails: {
    id: 'payment-request-123',
    reference,
  },
};

test('verifies Jèko signatures over the exact raw body', () => {
  const secret = 'local-webhook-test-secret';
  const rawBody = Buffer.from('{"status":"success"}');
  const signature = createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  assert.equal(verifyJekoSignature(rawBody, signature, secret), true);
  assert.equal(
    verifyJekoSignature(Buffer.from('{"status": "success"}'), signature, secret),
    false,
  );
  assert.equal(verifyJekoSignature(rawBody, signature.toUpperCase(), secret), false);
  assert.equal(verifyJekoSignature(rawBody, undefined, secret), false);
});

test('parses the flat transaction payload documented for webhooks', () => {
  assert.deepEqual(parseJekoTransaction(payment), {
    id: 'transaction-123',
    transactionType: 'payment',
    status: 'success',
    amount: { amount: 125_000, currency: 'XOF' },
    transactionDetails: {
      id: 'payment-request-123',
      reference,
    },
  });
});

test('ignores a transfer without a payment reference', () => {
  const transfer = parseJekoTransaction({
    id: 'transfer-123',
    amount: { amount: 125_000, currency: 'XOF' },
    status: 'success',
    transactionType: 'transfer',
    transactionDetails: { id: 'transfer-123' },
  });

  assert.equal(transfer?.transactionType, 'transfer');
  assert.equal(transfer?.transactionDetails.reference, undefined);
});

test('rejects malformed or enveloped payment payloads', () => {
  assert.equal(parseJekoTransaction(null), undefined);
  assert.equal(parseJekoTransaction({ transaction: payment }), undefined);
  assert.equal(
    parseJekoTransaction({
      ...payment,
      transactionDetails: { reference: 'orders/attacker' },
    }),
    undefined,
  );
  assert.equal(
    parseJekoTransaction({
      ...payment,
      amount: { amount: '125000', currency: 'XOF' },
    }),
    undefined,
  );
});

test('matches only the order reference, XOF amount and payment request ID', () => {
  const transaction = parseJekoTransaction(payment);
  assert.ok(transaction);

  const order = {
    userId: 'authenticated-user',
    productId: 'book-123',
    storagePath: 'products/book-123.pdf',
    amountXof: 1250,
    currency: 'XOF',
    reference,
    jekoPaymentRequestId: 'payment-request-123',
  };

  assert.equal(matchesOrderPayment(order, transaction), true);
  assert.equal(
    matchesOrderPayment({ ...order, amountXof: 1 }, transaction),
    false,
  );
  assert.equal(
    matchesOrderPayment(
      { ...order, jekoPaymentRequestId: 'different-request' },
      transaction,
    ),
    false,
  );
  assert.equal(
    matchesOrderPayment({ ...order, currency: 'EUR' }, transaction),
    false,
  );
});

test('matches a valid subscription payment without document storage metadata', () => {
  const transaction = parseJekoTransaction({
    ...payment,
    amount: { amount: 250_000, currency: 'XOF' },
  });
  assert.ok(transaction);

  const order = {
    orderType: 'game_subscription',
    userId: 'authenticated-user',
    productId: 'games-three-months',
    productTitle: 'Abonnement jeux — 3 mois',
    subscriptionPlanId: 'three-months',
    subscriptionDurationMonths: 3,
    amountXof: 2_500,
    currency: 'XOF',
    reference,
    jekoPaymentRequestId: 'payment-request-123',
  };

  assert.equal(matchesOrderPayment(order, transaction), true);
  assert.equal(
    matchesOrderPayment({ ...order, amountXof: 1_000 }, transaction),
    false,
  );
  assert.equal(
    matchesOrderPayment({ ...order, subscriptionPlanId: 'unknown' }, transaction),
    false,
  );
});

test('matches a valid one-month course pack payment without document metadata', () => {
  const transaction = parseJekoTransaction({
    ...payment,
    amount: { amount: 10_000_000, currency: 'XOF' },
  });
  assert.ok(transaction);

  const order = {
    orderType: 'course_pack',
    userId: 'authenticated-user',
    productId: 'course-pack-deb-jeune',
    productTitle: 'Pack de cours — Jeunesse — Débutants (1 mois)',
    coursePackId: 'deb-jeune',
    coursePackDurationMonths: 1,
    amountXof: 100_000,
    currency: 'XOF',
    reference,
    jekoPaymentRequestId: 'payment-request-123',
  };

  assert.equal(matchesOrderPayment(order, transaction), true);
  assert.equal(
    matchesOrderPayment({ ...order, amountXof: 1 }, transaction),
    false,
  );
  assert.equal(
    matchesOrderPayment({ ...order, coursePackDurationMonths: 12 }, transaction),
    false,
  );
  assert.equal(
    matchesOrderPayment({ ...order, coursePackId: 'unknown' }, transaction),
    false,
  );
});
