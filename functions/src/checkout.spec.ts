import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isValidProduct,
  isValidStoragePath,
  parseProduct,
} from './catalog.js';
import {
  PAYMENT_METHODS,
  buildPaymentRequest,
  isJekoPaymentRequestResponse,
  isPaymentMethod,
} from './checkout.js';

const product = {
  id: '-P2nOLBr94Bq9rQ10NQV',
  title: 'Méthode de guitare',
  priceXof: 1250,
  storagePath: 'documents/method.pdf',
  description: 'Méthode pédagogique',
  type: 'Méthode',
  typeClass: 'type-methode',
  icon: '📙',
  format: 'PDF',
  level: 'Tous niveaux',
} as const;

test('parses products published by the admin site from the documents database node', () => {
  const parsed = parseProduct(product.id, {
    title: product.title,
    price: product.priceXof,
    storagePath: product.storagePath,
    description: product.description,
    type: product.type,
    typeClass: product.typeClass,
    icon: product.icon,
    format: '📄 PDF',
    level: product.level,
    imageUrl:
      'https://firebasestorage.googleapis.com/v0/b/example/o/cover.jpg?alt=media&token=public-token',
    createdAt: '2026-09-30T17:38:22.703Z',
    views: 0,
    downloads: 0,
    downloadUrl: 'https://example.com/public-file.pdf',
  });

  assert.ok(parsed);
  assert.equal(parsed.id, product.id);
  assert.equal(parsed.priceXof, product.priceXof);
  assert.equal(parsed.format, '📄 PDF');
  assert.equal(parsed.imageUrl?.startsWith('https://'), true);
  assert.equal('downloadUrl' in parsed, false);
  assert.equal(isValidProduct(parsed), true);
  assert.equal(parseProduct({ id: product.id }, {}), undefined);
});

test('only accepts PDF files in the admin documents storage directory', () => {
  assert.equal(isValidProduct(product), true);
  assert.equal(
    isValidStoragePath('public/method.pdf'),
    false,
  );
  assert.equal(
    isValidStoragePath('documents/../public/method.pdf'),
    false,
  );
  assert.equal(isValidStoragePath('documents/folder/method.pdf'), false);
  assert.equal(isValidStoragePath('documents/method.exe'), false);
  assert.equal(
    isValidProduct({ ...product, storagePath: 'documents/method.exe' }),
    false,
  );
  assert.equal(parseProduct(product.id, { ...product, price: 0 }), undefined);
  assert.equal(parseProduct('../outside', product), undefined);
});

test('builds a redirect checkout using only the server-side XOF price', () => {
  assert.deepEqual(
    buildPaymentRequest(product, 'order-123', 'wave', 'store-123'),
    {
      amountCents: 125_000,
      currency: 'XOF',
      reference: 'CG-order-123',
      storeId: 'store-123',
      paymentDetails: {
        type: 'redirect',
        data: {
          paymentMethod: 'wave',
          successUrl:
            'https://www.charlyguitare.com/academie/documents?payment=success&reference=CG-order-123',
          errorUrl:
            'https://www.charlyguitare.com/academie/documents?payment=error&reference=CG-order-123',
        },
      },
    },
  );
});

test('sends game subscription payments back to the game dashboard', () => {
  const paymentRequest = buildPaymentRequest(
    { priceXof: 1_000 },
    'order-456',
    'wave',
    'store-123',
    '/game/play',
  );

  assert.equal(
    paymentRequest.paymentDetails.data.successUrl,
    'https://www.charlyguitare.com/game/play?payment=success&reference=CG-order-456',
  );
  assert.equal(
    paymentRequest.paymentDetails.data.errorUrl,
    'https://www.charlyguitare.com/game/play?payment=error&reference=CG-order-456',
  );
});

test('sends course pack payment results back to the offers page', () => {
  const paymentRequest = buildPaymentRequest(
    { priceXof: 100_000 },
    'order-789',
    'wave',
    'store-123',
    '/academie/offres',
  );

  assert.equal(paymentRequest.amountCents, 10_000_000);
  assert.equal(
    paymentRequest.paymentDetails.data.successUrl,
    'https://www.charlyguitare.com/academie/offres?payment=success&reference=CG-order-789',
  );
  assert.equal(
    paymentRequest.paymentDetails.data.errorUrl,
    'https://www.charlyguitare.com/academie/offres?payment=error&reference=CG-order-789',
  );
});

test('accepts only documented Jèko Checkout payment methods', () => {
  assert.deepEqual(PAYMENT_METHODS, [
    'orange',
    'wave',
    'mtn',
    'moov',
    'djamo',
    'jeko',
  ]);
  assert.equal(isPaymentMethod('wave'), true);
  assert.equal(isPaymentMethod('bank'), false);
  assert.equal(isPaymentMethod(undefined), false);
});

test('rejects invalid prices rather than creating a free or malformed checkout', () => {
  assert.throws(
    () =>
      buildPaymentRequest(
        { ...product, priceXof: 0 },
        'order-123',
        'wave',
        'store-123',
      ),
    /product price is invalid/,
  );

  assert.throws(
    () =>
      buildPaymentRequest(
        { ...product, priceXof: Number.MAX_SAFE_INTEGER },
        'order-123',
        'wave',
        'store-123',
      ),
    /payment amount is invalid/,
  );
});

test('accepts only documented checkout responses with an HTTPS redirect URL', () => {
  assert.equal(
    isJekoPaymentRequestResponse({
      id: 'payment-request-123',
      status: 'pending',
      redirectUrl: 'https://checkout.jeko.example/pay/123',
    }),
    true,
  );
  assert.equal(
    isJekoPaymentRequestResponse({
      id: 'payment-request-123',
      status: 'success',
      redirectUrl: 'https://checkout.jeko.example/pay/123',
    }),
    true,
  );
  assert.equal(
    isJekoPaymentRequestResponse({
      id: 'payment-request-123',
      status: 'pending',
      redirectUrl: 'javascript:alert(1)',
    }),
    false,
  );
  assert.equal(
    isJekoPaymentRequestResponse({
      id: 'payment-request-123',
      status: 'processing',
      redirectUrl: 'https://checkout.jeko.example/pay/123',
    }),
    false,
  );
  assert.equal(isJekoPaymentRequestResponse(null), false);
});
