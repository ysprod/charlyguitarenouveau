import { createHash, randomUUID } from 'node:crypto';

import { initializeApp } from 'firebase-admin/app';
import {
  getDatabase,
  type DataSnapshot,
  type Reference,
} from 'firebase-admin/database';
import { getStorage } from 'firebase-admin/storage';
import { logger } from 'firebase-functions';
import { defineSecret, defineString } from 'firebase-functions/params';
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';

import {
  isValidProduct,
  isValidProductId,
  isValidStoragePath,
  parseProduct,
} from './catalog.js';
import {
  buildPaymentRequest,
  isJekoPaymentRequestResponse,
  isPaymentMethod,
} from './checkout.js';
import {
  matchesOrderPayment,
  parseJekoTransaction,
  verifyJekoSignature,
} from './webhook.js';
import type { JekoTransaction } from './webhook.js';

const databaseEmulatorHost = process.env['FIREBASE_DATABASE_EMULATOR_HOST'];
const projectId = process.env['GCLOUD_PROJECT'];

initializeApp(
  projectId
    ? {
        databaseURL: `https://${projectId}-default-rtdb.firebaseio.com`,
        projectId,
        storageBucket: `${projectId}.appspot.com`,
      }
    : {},
);

const jekoApiKey = defineSecret('JEKO_API_KEY');
const jekoApiKeyId = defineSecret('JEKO_API_KEY_ID');
const jekoWebhookSecret = defineSecret('JEKO_WEBHOOK_SECRET');
const jekoStoreId = defineString('JEKO_STORE_ID', { default: '' });

interface CreateCheckoutInput {
  readonly productId?: unknown;
  readonly paymentMethod?: unknown;
}

interface DownloadPurchaseInput {
  readonly orderId?: unknown;
}

interface PurchaseHistoryItem {
  readonly orderId: string;
  readonly productId: string;
  readonly productTitle: string;
  readonly amountXof: number;
  readonly currency: 'XOF';
  readonly status: string;
  readonly reference: string;
  readonly createdAt: number;
  readonly paidAt?: number;
}

interface PublicProduct {
  readonly id: string;
  readonly title: string;
  readonly priceXof: number;
  readonly description: string;
  readonly type: string;
  readonly typeClass: string;
  readonly icon: string;
  readonly format: string;
  readonly level: string;
  readonly imageUrl?: string;
  readonly createdAt?: string;
  readonly views?: number;
  readonly downloads?: number;
}

export const createCheckout = onCall<CreateCheckoutInput>(
  {
    secrets: [jekoApiKey, jekoApiKeyId],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'Connectez-vous pour créer une commande.',
      );
    }

    if (process.env['FUNCTIONS_EMULATOR'] === 'true') {
      throw new HttpsError(
        'failed-precondition',
        'Les paiements Jèko réels sont désactivés dans les émulateurs.',
      );
    }

    const product = await getProduct(request.data?.productId);
    if (!product) {
      throw new HttpsError(
        'failed-precondition',
        'Ce produit n’est pas disponible à la vente.',
      );
    }

    if (!isPaymentMethod(request.data?.paymentMethod)) {
      throw new HttpsError(
        'invalid-argument',
        'Le moyen de paiement sélectionné n’est pas pris en charge.',
      );
    }

    const storeId = jekoStoreId.value();
    const apiKey = jekoApiKey.value();
    const apiKeyId = jekoApiKeyId.value();
    if (!storeId || !apiKey || !apiKeyId) {
      logger.error('Jèko checkout credentials are not configured.');
      throw new HttpsError(
        'failed-precondition',
        'Le paiement est temporairement indisponible.',
      );
    }

    const orderId = randomUUID();
    const reference = `CG-${orderId}`;
    const database = getDatabase();
    const orderRef = database.ref(`orders/${orderId}`);
    const order = {
      userId: request.auth.uid,
      productId: product.id,
      productTitle: product.title,
      amountXof: product.priceXof,
      currency: 'XOF',
      storagePath: product.storagePath,
      status: 'creating_payment',
      paymentMethod: request.data.paymentMethod,
      reference,
      createdAt: Date.now(),
    };

    await database.ref().update({
      [`orders/${orderId}`]: order,
      [`orderReferences/${reference}`]: orderId,
      [`ordersByUser/${request.auth.uid}/${createOrderHistoryKey(order)}`]:
        toPurchaseHistoryItem(orderId, order),
    });

    const paymentRequest = buildPaymentRequest(
      product,
      orderId,
      request.data.paymentMethod,
      storeId,
    );

    let response: Response;
    try {
      response = await fetch(
        'https://api.jeko.africa/partner_api/payment_requests',
        {
          method: 'POST',
          headers: {
            'X-API-KEY': apiKey,
            'X-API-KEY-ID': apiKeyId,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(paymentRequest),
          signal: AbortSignal.timeout(15_000),
        },
      );
    } catch (error) {
      await updateCreatingOrder(orderRef, {
        status: 'payment_request_unknown',
        updatedAt: Date.now(),
      });
      logger.error('Jèko payment request outcome is unknown.', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new HttpsError(
        'unavailable',
        'Le résultat de la demande de paiement n’a pas pu être confirmé. Ne réessayez pas avant vérification.',
      );
    }

    if (!response.ok) {
      await updateCreatingOrder(orderRef, {
        status: 'payment_request_failed',
        updatedAt: Date.now(),
      });
      logger.error('Jèko rejected a payment request.', {
        status: response.status,
      });
      throw new HttpsError(
        'unavailable',
        'La demande de paiement a été refusée. Veuillez réessayer plus tard.',
      );
    }

    let paymentResponse: unknown;
    try {
      paymentResponse = await response.json();
    } catch (error) {
      await updateCreatingOrder(orderRef, {
        status: 'payment_request_unknown',
        updatedAt: Date.now(),
      });
      logger.error('Jèko returned an invalid payment response.', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new HttpsError(
        'unavailable',
        'La réponse de paiement est invalide. Ne réessayez pas avant vérification.',
      );
    }

    if (!isJekoPaymentRequestResponse(paymentResponse)) {
      await updateCreatingOrder(orderRef, {
        status: 'payment_request_unknown',
        updatedAt: Date.now(),
      });
      logger.error('Jèko returned an unexpected payment response.');
      throw new HttpsError(
        'unavailable',
        'La réponse de paiement est inattendue. Ne réessayez pas avant vérification.',
      );
    }

    if (paymentResponse.status === 'error') {
      await updateCreatingOrder(orderRef, {
        status: 'payment_request_failed',
        jekoPaymentRequestId: paymentResponse.id,
        updatedAt: Date.now(),
      });
      throw new HttpsError(
        'unavailable',
        'La demande de paiement a échoué. Veuillez réessayer plus tard.',
      );
    }

    const redirectUrl = new URL(paymentResponse.redirectUrl);
    await updateCreatingOrder(orderRef, {
      status: 'payment_pending',
      jekoPaymentRequestId: paymentResponse.id,
      redirectUrl: redirectUrl.toString(),
      updatedAt: Date.now(),
    });

    return {
      orderId,
      redirectUrl: redirectUrl.toString(),
      status: 'payment_pending',
    };
  },
);

export const jekoWebhook = onRequest(
  { secrets: [jekoWebhookSecret] },
  async (request, response) => {
    if (request.method !== 'POST') {
      response.set('Allow', 'POST').status(405).send('Method not allowed.');
      return;
    }

    const secret = jekoWebhookSecret.value();
    if (!secret) {
      logger.error('Jèko webhook secret is not configured.');
      response.status(500).send('Webhook unavailable.');
      return;
    }

    if (
      !Buffer.isBuffer(request.rawBody) ||
      !verifyJekoSignature(
        request.rawBody,
        request.get('Jeko-Signature'),
        secret,
      )
    ) {
      response.status(401).send('Invalid signature.');
      return;
    }

    if (request.get('Jeko-Event') !== 'TRANSACTION_COMPLETED') {
      response.status(200).json({ received: true, ignored: true });
      return;
    }

    let payload: unknown;
    try {
      payload = JSON.parse(request.rawBody.toString('utf8'));
    } catch {
      response.status(400).send('Invalid JSON payload.');
      return;
    }

    const transaction = parseJekoTransaction(payload);
    if (!transaction) {
      response.status(400).send('Invalid transaction payload.');
      return;
    }

    if (transaction.transactionType !== 'payment') {
      response.status(200).json({ received: true, ignored: true });
      return;
    }

    if (!transaction.transactionDetails.reference) {
      response.status(400).send('Payment reference is missing.');
      return;
    }

    if (transaction.status === 'pending') {
      response.status(200).json({ received: true, ignored: true });
      return;
    }

    try {
      const database = getDatabase();
      const orderIdSnapshot = await database
        .ref(`orderReferences/${transaction.transactionDetails.reference}`)
        .get();
      const orderId = orderIdSnapshot.val();

      if (typeof orderId !== 'string' || !isOrderId(orderId)) {
        logger.warn('Jèko webhook reference does not match an order.');
        response.status(200).json({ received: true, ignored: true });
        return;
      }

      const orderRef = database.ref(`orders/${orderId}`);
      const initialOrderSnapshot = await orderRef.get();
      const initialOrder: unknown = initialOrderSnapshot.val();
      if (!matchesOrderPayment(initialOrder, transaction)) {
        logger.error(
          `Jèko webhook does not match the stored order: ${orderMismatchReason(initialOrder, transaction)}.`,
        );
        response.status(400).send('Transaction does not match the order.');
        return;
      }

      if (
        transaction.status === 'success' &&
        !isPendingOrderStatus(initialOrder['status']) &&
        !(
          initialOrder['status'] === 'paid' &&
          initialOrder['jekoTransactionId'] === transaction.id
        )
      ) {
        logger.warn('Jèko success event cannot advance this order.');
        response.status(200).json({ received: true, ignored: true });
        return;
      }

      const transactionRef = database.ref(
        `processedJekoTransactions/${createTransactionKey(transaction.id)}`,
      );
      const claim = await transactionRef.transaction((current) => {
        if (current === null) {
          return {
            orderId,
            status: 'processing',
            receivedAt: Date.now(),
          };
        }

        if (
          isRecord(current) &&
          current['orderId'] === orderId &&
          current['status'] === 'processing'
        ) {
          return current;
        }

        return;
      });

      if (!claim.committed) {
        const existing: unknown = claim.snapshot.val();
        if (!isRecord(existing) || existing['orderId'] !== orderId) {
          logger.error(
            'Jèko transaction ID is already associated with another order.',
          );
        }
        response.status(200).json({ received: true, duplicate: true });
        return;
      }

      let abortReason = 'unknown';
      const { stopListening } = await listenForInitialValue(orderRef);
      let orderUpdate;
      try {
        orderUpdate = await orderRef.transaction((current) => {
          if (!matchesOrderPayment(current, transaction)) {
            abortReason = orderMismatchReason(current, transaction);
            return;
          }

          if (current['status'] === 'paid') {
            if (current['jekoTransactionId'] === transaction.id) {
              return current;
            }
            abortReason = 'already-paid';
            return;
          }

          if (!isPendingOrderStatus(current['status'])) {
            abortReason = 'invalid-order-status';
            return;
          }

          abortReason = 'none';
          return transaction.status === 'success'
            ? {
                ...current,
                status: 'paid',
                jekoTransactionId: transaction.id,
                paidAt: Date.now(),
              }
            : {
                ...current,
                status: 'payment_failed',
                jekoTransactionId: transaction.id,
                updatedAt: Date.now(),
              };
        });
      } finally {
        stopListening();
      }

      const updatedOrder: unknown = orderUpdate.snapshot.val();
      if (
        !orderUpdate.committed ||
        !matchesOrderPayment(updatedOrder, transaction) ||
        (transaction.status === 'success' &&
          updatedOrder['status'] !== 'paid') ||
        (transaction.status === 'error' &&
          updatedOrder['status'] !== 'payment_failed')
      ) {
        await transactionRef.update({
          status: 'ignored',
          processedAt: Date.now(),
        });
        logger.warn(
          `Jèko transaction could not advance its order: committed=${orderUpdate.committed}, status=${transaction.status}, reason=${abortReason}, resultingStatus=${isRecord(updatedOrder) ? String(updatedOrder['status']) : 'missing'}.`,
        );
        response.status(200).json({ received: true, ignored: true });
        return;
      }

      if (transaction.status === 'success') {
        await database.ref().update({
          [`entitlements/${updatedOrder['userId']}/${orderId}`]: {
            productId: updatedOrder['productId'],
            storagePath: updatedOrder['storagePath'],
            transactionId: transaction.id,
            grantedAt: updatedOrder['paidAt'],
          },
          [`ordersByUser/${updatedOrder['userId']}/${createOrderHistoryKey(updatedOrder)}`]:
            toPurchaseHistoryItem(orderId, updatedOrder),
          [`processedJekoTransactions/${createTransactionKey(transaction.id)}`]:
            {
              orderId,
              status: 'processed',
              processedAt: Date.now(),
            },
        });
      } else {
        await database.ref().update({
          [`ordersByUser/${updatedOrder['userId']}/${createOrderHistoryKey(updatedOrder)}`]:
            toPurchaseHistoryItem(orderId, updatedOrder),
          [`processedJekoTransactions/${createTransactionKey(transaction.id)}`]:
            {
              orderId,
              status: 'processed',
              processedAt: Date.now(),
            },
        });
      }

      response.status(200).json({ received: true });
    } catch (error) {
      logger.error('Failed to process a verified Jèko webhook.', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      response.status(500).send('Webhook processing failed.');
    }
  },
);

export const listAvailableProducts = onCall(
  async (): Promise<{ products: PublicProduct[] }> => {
    return {
      products: await getAvailableProducts(),
    };
  },
);

export const listMyPurchases = onCall(
  async (request): Promise<{ purchases: PurchaseHistoryItem[] }> => {
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'Connectez-vous pour consulter vos achats.',
      );
    }

    const snapshot = await getDatabase()
      .ref(`ordersByUser/${request.auth.uid}`)
      .limitToLast(50)
      .get();
    const purchases: PurchaseHistoryItem[] = [];

    snapshot.forEach((child) => {
      const item = parsePurchaseHistoryItem(child.val());
      if (item) {
        purchases.push(item);
      }
    });

    purchases.sort((first, second) => second.createdAt - first.createdAt);

    return { purchases };
  },
);

export const downloadPurchase = onCall<DownloadPurchaseInput>(
  async (request): Promise<{ downloadUrl: string }> => {
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'Connectez-vous pour télécharger vos achats.',
      );
    }

    const orderId = request.data?.orderId;
    if (typeof orderId !== 'string' || !isOrderId(orderId)) {
      throw new HttpsError('invalid-argument', 'Commande invalide.');
    }

    const uid = request.auth.uid;
    const database = getDatabase();
    const [orderSnapshot, entitlementSnapshot] = await Promise.all([
      database.ref(`orders/${orderId}`).get(),
      database.ref(`entitlements/${uid}/${orderId}`).get(),
    ]);
    const order: unknown = orderSnapshot.val();
    const entitlement: unknown = entitlementSnapshot.val();

    if (
      !isRecord(order) ||
      order['userId'] !== uid ||
      order['status'] !== 'paid' ||
      !isRecord(entitlement) ||
      entitlement['transactionId'] !== order['jekoTransactionId']
    ) {
      throw new HttpsError(
        'permission-denied',
        'Aucun droit de téléchargement valide pour cette commande.',
      );
    }

    const storagePath = order['storagePath'];
    if (
      typeof order['productId'] !== 'string' ||
      !isValidProductId(order['productId']) ||
      !isValidStoragePath(storagePath) ||
      entitlement['productId'] !== order['productId'] ||
      entitlement['storagePath'] !== storagePath
    ) {
      logger.error('A paid order does not match the current product catalog.', {
        orderId,
      });
      throw new HttpsError(
        'failed-precondition',
        'Le fichier de cet achat est temporairement indisponible.',
      );
    }

    const fileExtension = storagePath.match(/\.([a-z0-9]+)$/i)?.[1];
    if (!fileExtension || !/^[a-z0-9]{2,5}$/i.test(fileExtension)) {
      throw new HttpsError(
        'failed-precondition',
        'Le format du fichier est invalide.',
      );
    }

    const file = getStorage().bucket().file(storagePath);
    const [fileExists] = await file.exists();
    if (!fileExists) {
      throw new HttpsError(
        'not-found',
        'Le fichier de cet achat n’est plus disponible.',
      );
    }

    const [downloadUrl] = await file
      .getSignedUrl({
        action: 'read',
        expires: Date.now() + 5 * 60 * 1000,
        responseDisposition: `attachment; filename="${orderId}.${fileExtension.toLowerCase()}"`,
      });

    return { downloadUrl };
  },
);

function isOrderId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
    value,
  );
}

function isPendingOrderStatus(status: unknown): boolean {
  return (
    status === 'creating_payment' ||
    status === 'payment_pending' ||
    status === 'payment_request_unknown'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function createTransactionKey(transactionId: string): string {
  return createHash('sha256').update(transactionId).digest('hex');
}

function toPurchaseHistoryItem(
  orderId: string,
  order: Record<string, unknown>,
): PurchaseHistoryItem {
  if (
    typeof order['productId'] !== 'string' ||
    typeof order['productTitle'] !== 'string' ||
    typeof order['amountXof'] !== 'number' ||
    typeof order['status'] !== 'string' ||
    typeof order['reference'] !== 'string' ||
    typeof order['createdAt'] !== 'number'
  ) {
    throw new Error('Cannot index an incomplete purchase order.');
  }

  return {
    orderId,
    productId: order['productId'],
    productTitle: order['productTitle'],
    amountXof: order['amountXof'],
    currency: 'XOF',
    status: order['status'],
    reference: order['reference'],
    createdAt: order['createdAt'],
    ...(typeof order['paidAt'] === 'number' && {
      paidAt: order['paidAt'],
    }),
  };
}

function parsePurchaseHistoryItem(
  value: unknown,
): PurchaseHistoryItem | undefined {
  if (
    !isRecord(value) ||
    typeof value['orderId'] !== 'string' ||
    !isOrderId(value['orderId']) ||
    typeof value['productId'] !== 'string' ||
    typeof value['productTitle'] !== 'string' ||
    typeof value['amountXof'] !== 'number' ||
    !Number.isSafeInteger(value['amountXof']) ||
    value['amountXof'] < 1 ||
    value['currency'] !== 'XOF' ||
    typeof value['status'] !== 'string' ||
    typeof value['reference'] !== 'string' ||
    typeof value['createdAt'] !== 'number' ||
    !Number.isSafeInteger(value['createdAt'])
  ) {
    return undefined;
  }

  return {
    orderId: value['orderId'],
    productId: value['productId'],
    productTitle: value['productTitle'],
    amountXof: value['amountXof'],
    currency: 'XOF',
    status: value['status'],
    reference: value['reference'],
    createdAt: value['createdAt'],
    ...(typeof value['paidAt'] === 'number' && {
      paidAt: value['paidAt'],
    }),
  };
}

async function getProduct(productId: unknown) {
  if (!isValidProductId(productId)) {
    return undefined;
  }

  const snapshot = await getDatabase().ref(`documents/${productId}`).get();
  const product = parseProduct(productId, snapshot.val());
  return product && isValidProduct(product) ? product : undefined;
}

async function getAvailableProducts(): Promise<PublicProduct[]> {
  const snapshot = await getDatabase().ref('documents').get();
  const products: PublicProduct[] = [];

  snapshot.forEach((child) => {
    const product = parseProduct(child.key, child.val());
    if (!product || !isValidProduct(product)) {
      logger.warn('Ignoring an invalid document catalog entry.', {
        productId: child.key,
      });
      return;
    }

    const {
      id,
      title,
      priceXof,
      description,
      type,
      typeClass,
      icon,
      format,
      level,
      imageUrl,
      createdAt,
      views,
      downloads,
    } = product;
    products.push({
      id,
      title,
      priceXof,
      description,
      type,
      typeClass,
      icon,
      format,
      level,
      ...(imageUrl !== undefined && { imageUrl }),
      ...(createdAt !== undefined && { createdAt }),
      ...(views !== undefined && { views }),
      ...(downloads !== undefined && { downloads }),
    });
  });

  return products;
}

function createOrderHistoryKey(order: Record<string, unknown>): string {
  if (
    typeof order['createdAt'] !== 'number' ||
    !Number.isSafeInteger(order['createdAt'])
  ) {
    throw new Error('Cannot index an invalid purchase order.');
  }

  return `${String(order['createdAt']).padStart(13, '0')}_${getOrderIdFromOrder(order)}`;
}

function getOrderIdFromOrder(order: Record<string, unknown>): string {
  if (typeof order['reference'] !== 'string') {
    throw new Error('Cannot index a purchase without a reference.');
  }

  const orderId = order['reference'].slice('CG-'.length);
  if (!isOrderId(orderId)) {
    throw new Error('Cannot index a purchase without a valid order reference.');
  }

  return orderId;
}

async function updateCreatingOrder(
  orderRef: Reference,
  updates: Record<string, unknown>,
): Promise<void> {
  const { stopListening } = await listenForInitialValue(orderRef);
  try {
    const result = await orderRef.transaction((current) => {
      if (!isRecord(current)) {
        return;
      }

      if (current['status'] !== 'creating_payment') {
        return current;
      }

      return { ...current, ...updates };
    });

    if (!result.committed) {
      throw new Error('The pending order could not be updated.');
    }

    const order = result.snapshot.val();
    if (isRecord(order) && typeof order['userId'] === 'string') {
      await getDatabase()
        .ref(
          `ordersByUser/${order['userId']}/${createOrderHistoryKey(order)}`,
        )
        .set(
          toPurchaseHistoryItem(getOrderIdFromOrder(order), order),
        );
    }
  } finally {
    stopListening();
  }
}

async function listenForInitialValue(
  reference: Reference,
): Promise<{ stopListening: () => void }> {
  let listener: ((snapshot: DataSnapshot) => void) | undefined;
  const firstValue = new Promise<DataSnapshot>((resolve, reject) => {
    listener = (snapshot) => resolve(snapshot);
    reference.on('value', listener, (error) => {
      if (listener) {
        reference.off('value', listener);
      }
      reject(error ?? new Error('Realtime Database listener failed.'));
    });
  });

  await firstValue;

  return {
    stopListening: () => {
      if (listener) {
        reference.off('value', listener);
      }
    },
  };
}

function orderMismatchReason(
  order: unknown,
  transaction: JekoTransaction,
): string {
  if (!isRecord(order)) {
    return 'order is missing or is not an object';
  }
  if (
    typeof order['userId'] !== 'string' ||
    typeof order['productId'] !== 'string' ||
    typeof order['storagePath'] !== 'string'
  ) {
    return 'order identity or storage metadata is missing';
  }
  if (
    typeof order['amountXof'] !== 'number' ||
    order['amountXof'] < 1 ||
    !Number.isSafeInteger(order['amountXof']) ||
    order['currency'] !== 'XOF'
  ) {
    return 'order price is invalid';
  }
  if (order['reference'] !== transaction?.transactionDetails.reference) {
    return 'order reference differs';
  }
  if (
    transaction &&
    transaction.amount.amount !== order['amountXof'] * 100
  ) {
    return 'order amount differs';
  }
  if (
    transaction &&
    transaction.amount.currency !== order['currency']
  ) {
    return 'order currency differs';
  }
  if (
    transaction?.transactionType !== 'payment' ||
    (typeof order['jekoPaymentRequestId'] === 'string' &&
      transaction.transactionDetails.id !== undefined &&
      transaction.transactionDetails.id !== order['jekoPaymentRequestId'])
  ) {
    return 'payment request identity differs';
  }
  return 'order payment does not match';
}
