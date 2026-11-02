import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

const authEmulatorUrl = 'http://127.0.0.1:9099';
const callableUrl =
  'http://127.0.0.1:5001/demo-charly-guitare/us-central1/createCheckout';
const webhookUrl =
  'http://127.0.0.1:5001/demo-charly-guitare/us-central1/jekoWebhook';
const purchaseHistoryUrl =
  'http://127.0.0.1:5001/demo-charly-guitare/us-central1/listMyPurchases';
const downloadPurchaseUrl =
  'http://127.0.0.1:5001/demo-charly-guitare/us-central1/downloadPurchase';
const webhookSecret = 'emulator-webhook-placeholder-not-a-credential';

process.env.FIREBASE_DATABASE_EMULATOR_HOST =
  process.env.DATABASE_EMULATOR_HOST ?? '127.0.0.1:9000';
const databaseApp = initializeApp(
  {
    projectId: 'demo-charly-guitare',
    databaseURL:
      'https://demo-charly-guitare-default-rtdb.firebaseio.com',
  },
  'checkout-emulator-smoke',
);
const database = getDatabase(databaseApp);
const adminDocuments = [
  ['-P2nOLBr94Bq9rQ10NQV', 'Cours de guitare', 30_000, '1790789893725_LA_METHODE_GUITARE___PROGRAMME_PRIVE.docx.pdf'],
  ['-P2oMKyrVlmo9MtDhyn7', "L'ESSENTIEL GUITARE", 30_000, '1790806144570_L_ESSENTIELLE_GUITARE_vol_1.pdf'],
  ['-P2oZp0LWt5PxeICNVbT', 'LE JEU EN ORCHESTRE - NIVEAU 1', 25_000, '1790809681109_MASTER_class_orchestration_niv1.pdf'],
  ['-P4LaC5e2tmf-P3lthHL', "LA BIBLE D'OFFOLAND", 30_000, '1792460467554_LA_GRANDE_BIBLE_D_OFFOLAND__2_.pdf'],
  ['-P4PMUnvrUabv8f3cAKw', 'La dimension du coupé décalé - Formule Jeune', 20_000, '1792517461600_LA_DIMENSION_du_Coupe_Decale_Jeune.pdf'],
  ['-P4XY2XG-9LN1ghEy3jo', 'OFFOLOMOU', 20_000, '1792654710806_Offolomou_-le_don_des_sept_dimensions___1_.pdf'],
  ['-P4XZilA_6dxoExrl3on', "Charly Guitare et l'orchestration du coupé décalé", 20_000, '1792655148562_CHARLY_GUITARE_ET_L_ORCHESTRATION_DU_COUPE-DECALE.pdf'],
  ['-P5KTOu2HyDkyr1XMVnm', 'L-b3d dyal COUPÉ-DÉCALÉ N-noskha dyal chabab', 50_000, '1793509124253_Tandih.pdf'],
  ['-P5KZbDko8fQoo5aWjjn', '奥福兰圣经', 50_000, '1793510734693_______1_.pdf'],
].map(([id, title, price, fileName]) => [
  id,
  {
    title,
    price,
    storagePath: `documents/${fileName}`,
    description: 'Produit de test du catalogue administré',
    type: 'Livre Numérique',
    typeClass: 'type-livre',
    icon: '📘',
    format: 'PDF',
    level: 'Tous niveaux',
  },
]);
await database.ref('documents').set(Object.fromEntries(adminDocuments));

const signUpResponse = await fetch(
  `${authEmulatorUrl}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'checkout-test@example.invalid',
      password: 'local-emulator-only-password',
      returnSecureToken: true,
    }),
  },
);
assert.equal(signUpResponse.status, 200);
const { idToken, localId } = await signUpResponse.json();
assert.equal(typeof idToken, 'string');
assert.equal(typeof localId, 'string');

const otherUserResponse = await fetch(
  `${authEmulatorUrl}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'another-checkout-test@example.invalid',
      password: 'local-emulator-only-password',
      returnSecureToken: true,
    }),
  },
);
assert.equal(otherUserResponse.status, 200);
const { idToken: otherUserIdToken } = await otherUserResponse.json();
assert.equal(typeof otherUserIdToken, 'string');

const unauthenticatedResponse = await fetch(callableUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ data: { productId: 'not-configured' } }),
});
assert.equal(unauthenticatedResponse.status, 401);
assert.equal(
  (await unauthenticatedResponse.json()).error.status,
  'UNAUTHENTICATED',
);

const catalogResponse = await fetch(
  'http://127.0.0.1:5001/demo-charly-guitare/us-central1/listAvailableProducts',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ data: {} }),
  },
);
assert.equal(catalogResponse.status, 200);
const availableProducts = (await catalogResponse.json()).result.products;
assert.equal(availableProducts.length, 9);
assert.deepEqual(
  availableProducts.map(({ id, priceXof }) => ({ id, priceXof })),
  [
    { id: '-P2nOLBr94Bq9rQ10NQV', priceXof: 30_000 },
    { id: '-P2oMKyrVlmo9MtDhyn7', priceXof: 30_000 },
    { id: '-P2oZp0LWt5PxeICNVbT', priceXof: 25_000 },
    { id: '-P4LaC5e2tmf-P3lthHL', priceXof: 30_000 },
    { id: '-P4PMUnvrUabv8f3cAKw', priceXof: 20_000 },
    { id: '-P4XY2XG-9LN1ghEy3jo', priceXof: 20_000 },
    {
      id: '-P4XZilA_6dxoExrl3on',
      priceXof: 20_000,
    },
    { id: '-P5KTOu2HyDkyr1XMVnm', priceXof: 50_000 },
    { id: '-P5KZbDko8fQoo5aWjjn', priceXof: 50_000 },
  ],
);
assert.ok(
  availableProducts.every((product) => !('storagePath' in product)),
);

const publicCatalogResponse = await fetch(
  'http://127.0.0.1:5001/demo-charly-guitare/us-central1/listAvailableProducts',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: {} }),
  },
);
assert.equal(publicCatalogResponse.status, 200);
assert.equal(
  (await publicCatalogResponse.json()).result.products.length,
  9,
);

const unavailableProductResponse = await fetch(callableUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${idToken}`,
  },
  body: JSON.stringify({
    data: {
      productId: '-P2nOLBr94Bq9rQ10NQV',
      paymentMethod: 'wave',
    },
  }),
});
assert.equal(unavailableProductResponse.status, 400);
assert.match(
  (await unavailableProductResponse.json()).error.message,
  /paiements Jèko réels sont désactivés dans les émulateurs/i,
);

const orderId = '550e8400-e29b-41d4-a716-446655440000';
const reference = `CG-${orderId}`;
const order = {
  userId: localId,
  productId: 'emulator-only-test-product',
  productTitle: 'Emulator-only test fixture',
  amountXof: 1250,
  currency: 'XOF',
  storagePath: 'emulator-only/private.pdf',
  status: 'payment_pending',
  paymentMethod: 'wave',
  reference,
  createdAt: Date.now(),
  jekoPaymentRequestId: 'payment-request-smoke',
};

await database.ref(`orders/${orderId}`).remove();
await database.ref(`orderReferences/${reference}`).remove();
const historyKey = `${String(order.createdAt).padStart(13, '0')}_${orderId}`;
await database.ref().update({
  [`orders/${orderId}`]: order,
  [`orderReferences/${reference}`]: orderId,
  [`ordersByUser/${localId}/${historyKey}`]: {
    orderId,
    productId: order.productId,
    productTitle: order.productTitle,
    amountXof: order.amountXof,
    currency: order.currency,
    status: order.status,
    reference,
    createdAt: order.createdAt,
  },
});
assert.equal(
  (await database.ref(`orderReferences/${reference}`).get()).val(),
  orderId,
);

function signWebhook(body) {
  return createHmac('sha256', webhookSecret)
    .update(body)
    .digest('hex');
}

async function postWebhook(payload, event = 'TRANSACTION_COMPLETED') {
  const body = JSON.stringify(payload);
  return fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Jeko-Event': event,
      'Jeko-Signature': signWebhook(body),
    },
    body,
  });
}

const successfulPayment = {
  id: 'transaction-smoke-1',
  amount: { amount: 125_000, currency: 'XOF' },
  fees: { amount: 100, currency: 'XOF' },
  status: 'success',
  transactionType: 'payment',
  transactionDetails: {
    id: 'payment-request-smoke',
    reference,
  },
};

const invalidSignatureResponse = await fetch(webhookUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Jeko-Event': 'TRANSACTION_COMPLETED',
    'Jeko-Signature': '0'.repeat(64),
  },
  body: JSON.stringify(successfulPayment),
});
assert.equal(invalidSignatureResponse.status, 401);

const ignoredEventResponse = await postWebhook(
  successfulPayment,
  'UNSUPPORTED_EVENT',
);
assert.equal(ignoredEventResponse.status, 200);
assert.equal(
  (
    await database
      .ref(`orders/${orderId}/status`)
      .get()
  ).val(),
  'payment_pending',
);

const pendingWebhookResponse = await postWebhook({
  ...successfulPayment,
  status: 'pending',
});
assert.equal(pendingWebhookResponse.status, 200);
assert.equal(
  (await database.ref(`entitlements/${localId}/${orderId}`).get()).exists(),
  false,
);

const mismatchedPaymentResponse = await postWebhook({
  ...successfulPayment,
  amount: { amount: 1_000, currency: 'XOF' },
  id: 'transaction-smoke-mismatched',
});
assert.equal(mismatchedPaymentResponse.status, 400);
assert.equal(
  (await database.ref(`entitlements/${localId}/${orderId}`).get()).exists(),
  false,
);

const successResponse = await postWebhook(successfulPayment);
assert.equal(successResponse.status, 200);
assert.equal(
  (await database.ref(`orders/${orderId}/status`).get()).val(),
  'paid',
);
const entitlementRef = database.ref(`entitlements/${localId}/${orderId}`);
const entitlement = (await entitlementRef.get()).val();
assert.equal(entitlement.productId, order.productId);
assert.equal(entitlement.storagePath, order.storagePath);
assert.equal(entitlement.transactionId, successfulPayment.id);

const confirmedPurchaseDownloadResponse = await fetch(downloadPurchaseUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${idToken}`,
  },
  body: JSON.stringify({ data: { orderId } }),
});
assert.equal(confirmedPurchaseDownloadResponse.status, 400);
assert.equal(
  (await confirmedPurchaseDownloadResponse.json()).error.status,
  'FAILED_PRECONDITION',
);

const otherUserDownloadResponse = await fetch(downloadPurchaseUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${otherUserIdToken}`,
  },
  body: JSON.stringify({ data: { orderId } }),
});
assert.equal(otherUserDownloadResponse.status, 403);

const duplicateResponses = await Promise.all([
  postWebhook(successfulPayment),
  postWebhook(successfulPayment),
]);
assert.equal(duplicateResponses.every((result) => result.status === 200), true);
assert.equal(
  (await database.ref(`orders/${orderId}/jekoTransactionId`).get()).val(),
  successfulPayment.id,
);
assert.equal(
  (await entitlementRef.get()).val().transactionId,
  successfulPayment.id,
);
const updatedHistory = await fetch(purchaseHistoryUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${idToken}`,
  },
  body: JSON.stringify({ data: {} }),
});
assert.equal((await updatedHistory.json()).result.purchases[0].status, 'paid');

const ownHistoryResponse = await fetch(purchaseHistoryUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${idToken}`,
  },
  body: JSON.stringify({ data: {} }),
});
assert.equal(ownHistoryResponse.status, 200);
const historyResult = await ownHistoryResponse.json();
assert.equal(historyResult.result.purchases.length, 1);
assert.equal(historyResult.result.purchases[0].orderId, orderId);
assert.equal('storagePath' in historyResult.result.purchases[0], false);

const otherUserHistoryResponse = await fetch(purchaseHistoryUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${otherUserIdToken}`,
  },
  body: JSON.stringify({ data: {} }),
});
assert.equal(otherUserHistoryResponse.status, 200);
assert.deepEqual(
  (await otherUserHistoryResponse.json()).result.purchases,
  [],
);

const unavailableDownloadResponse = await fetch(downloadPurchaseUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${idToken}`,
  },
  body: JSON.stringify({ data: { orderId } }),
});
assert.equal(unavailableDownloadResponse.status, 400);
assert.equal(
  (await unavailableDownloadResponse.json()).error.status,
  'FAILED_PRECONDITION',
);

const invalidOrderDownloadResponse = await fetch(downloadPurchaseUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${idToken}`,
  },
  body: JSON.stringify({
    data: { orderId: 'not-an-order' },
  }),
});
assert.equal(invalidOrderDownloadResponse.status, 400);
assert.equal(
  (await invalidOrderDownloadResponse.json()).error.status,
  'INVALID_ARGUMENT',
);

const errorOrderId = '550e8400-e29b-41d4-a716-446655440001';
const errorReference = `CG-${errorOrderId}`;
await database.ref().update({
  [`orders/${errorOrderId}`]: {
    ...order,
    reference: errorReference,
    jekoPaymentRequestId: 'payment-request-failed',
  },
  [`orderReferences/${errorReference}`]: errorOrderId,
});
const failedPaymentResponse = await postWebhook({
  ...successfulPayment,
  id: 'transaction-smoke-failed',
  status: 'error',
  transactionDetails: {
    id: 'payment-request-failed',
    reference: errorReference,
  },
});
assert.equal(failedPaymentResponse.status, 200);
assert.equal(
  (await database.ref(`orders/${errorOrderId}/status`).get()).val(),
  'payment_failed',
);
assert.equal(
  (await database.ref(`entitlements/${localId}/${errorOrderId}`).get()).exists(),
  false,
);

await databaseApp.delete();

console.log(
  'Emulator tests passed: checkout is auth-gated and cannot call live Jèko; webhook signatures, amount checks, fulfillment and concurrent retries are enforced.',
);
