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
/* ✅ NOUVEAU — Trigger RTDB */
import { onValueUpdated } from 'firebase-functions/v2/database';

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
  getCoursePack,
  getCoursePackManualBenefit,
  isCoursePackOrder,
} from './course-packs.js';
import {
  addCalendarMonths,
  getGameSubscriptionPlan,
  isGameSubscriptionOrder,
} from './game-subscriptions.js';
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
  readonly coursePackId?: unknown;
  readonly subscriptionPlanId?: unknown;
  readonly paymentMethod?: unknown;
}

interface GameSubscriptionStatus {
  readonly active: boolean;
  readonly expiresAt: number | null;
  readonly planId: string | null;
}

interface DownloadPurchaseInput {
  readonly orderId?: unknown;
}

interface RedeemCoursePackDocumentCreditInput {
  readonly coursePackOrderId?: unknown;
  readonly productId?: unknown;
}

interface CompleteCoursePackBenefitInput {
  readonly fulfillmentId?: unknown;
}

interface PurchaseHistoryItem {
  readonly orderId: string;
  readonly productId: string;
  readonly productTitle: string;
  readonly amountXof: number;
  readonly currency: 'XOF';
  readonly status: string;
  readonly orderType?:
    | 'document'
    | 'document_credit'
    | 'game_subscription'
    | 'course_pack';
  readonly reference: string;
  readonly createdAt: number;
  readonly paidAt?: number;
}

interface CoursePackBenefitSummary {
  readonly orderId: string;
  readonly packTitle: string;
  readonly paidAt: number;
  readonly documentCreditsGranted: number;
  readonly documentCreditsRemaining: number;
  readonly gameAccessMonths: number;
  readonly gameAccessExpiresAt?: number;
  readonly manualBenefits: readonly {
    readonly id: string;
    readonly title: string;
    readonly status: 'pending' | 'needs_definition' | 'fulfilled';
    readonly fulfilledAt?: number;
  }[];
  readonly pendingRedemption?: {
    readonly productId: string;
    readonly productTitle: string;
  };
}

/**
 * ✅ ENRICHI — La tâche de livraison contient maintenant :
 *   - les infos de base (id, orderId, userId, packTitle, benefitId, title, createdAt)
 *   - les infos client enrichies (userName, userEmail)
 *   - les infos commande enrichies (amountXof, orderProductTitle)
 */
interface CoursePackFulfillmentTask {
  readonly id: string;
  readonly orderId: string;
  readonly userId: string;
  readonly packTitle: string;
  readonly benefitId: string;
  readonly title: string;
  readonly createdAt: number;
  readonly userName?: string;
  readonly userEmail?: string;
  readonly amountXof?: number;
  readonly orderProductTitle?: string;
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

    const subscriptionPlanId = request.data?.subscriptionPlanId;
    const productId = request.data?.productId;
    const coursePackId = request.data?.coursePackId;
    const hasSubscriptionPlan = subscriptionPlanId !== undefined;
    const hasProduct = productId !== undefined;
    const hasCoursePack = coursePackId !== undefined;
    if (
      Number(hasSubscriptionPlan) +
        Number(hasProduct) +
        Number(hasCoursePack) !==
      1
    ) {
      throw new HttpsError(
        'invalid-argument',
        'Choisissez un document, un pack de cours ou une formule de jeux.',
      );
    }

    const subscriptionPlan = hasSubscriptionPlan
      ? getGameSubscriptionPlan(subscriptionPlanId)
      : undefined;
    if (hasSubscriptionPlan && !subscriptionPlan) {
      throw new HttpsError(
        'invalid-argument',
        'La formule de jeux sélectionnée est invalide.',
      );
    }

    const coursePack = hasCoursePack ? getCoursePack(coursePackId) : undefined;
    if (hasCoursePack && !coursePack) {
      throw new HttpsError(
        'invalid-argument',
        'Le pack de cours sélectionné est invalide.',
      );
    }

    const product =
      subscriptionPlan || coursePack ? undefined : await getProduct(productId);
    if (!subscriptionPlan && !coursePack && !product) {
      throw new HttpsError(
        'failed-precondition',
        'Ce produit n’est pas disponible à la vente.',
      );
    }
    const checkoutItem = subscriptionPlan ?? coursePack ?? product;
    if (!checkoutItem) {
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
      orderType: subscriptionPlan
        ? 'game_subscription'
        : coursePack
          ? 'course_pack'
          : 'document',
      productId: subscriptionPlan
        ? `games-${subscriptionPlan.id}`
        : coursePack
          ? `course-pack-${coursePack.id}`
          : checkoutItem.id,
      productTitle: subscriptionPlan
        ? `Abonnement jeux — ${subscriptionPlan.title}`
        : coursePack
          ? `Pack de cours — ${coursePack.title} (1 mois)`
          : checkoutItem.title,
      amountXof: checkoutItem.priceXof,
      currency: 'XOF',
      ...(product && { storagePath: product.storagePath }),
      ...(coursePack && {
        coursePackId: coursePack.id,
        coursePackDurationMonths: 1,
      }),
      ...(subscriptionPlan && {
        subscriptionPlanId: subscriptionPlan.id,
        subscriptionDurationMonths: subscriptionPlan.durationMonths,
      }),
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
      checkoutItem,
      orderId,
      request.data.paymentMethod,
      storeId,
      subscriptionPlan
        ? '/game/play'
        : coursePack
          ? '/academie/offres'
          : '/academie/documents',
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
        const entitlementUpdates: Record<string, unknown> = {};
        if (isGameSubscriptionOrder(updatedOrder)) {
          await grantGameSubscription(
            database,
            orderId,
            updatedOrder,
            transaction.id,
          );
        } else if (isCoursePackOrder(updatedOrder)) {
          await grantCoursePackBenefits(
            database,
            orderId,
            updatedOrder,
            transaction.id,
          );
        } else {
          entitlementUpdates[
            `entitlements/${updatedOrder['userId']}/${orderId}`
          ] = {
            productId: updatedOrder['productId'],
            storagePath: updatedOrder['storagePath'],
            transactionId: transaction.id,
            grantedAt: updatedOrder['paidAt'],
          };
        }

        await database.ref().update({
          ...entitlementUpdates,
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

export const getMyGameSubscription = onCall(
  async (request): Promise<GameSubscriptionStatus> => {
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'Connectez-vous pour vérifier votre accès aux jeux.',
      );
    }

    const snapshot = await getDatabase()
      .ref(`gameSubscriptions/${request.auth.uid}`)
      .get();
    const value: unknown = snapshot.val();
    const expiresAt =
      isRecord(value) &&
      typeof value['expiresAt'] === 'number' &&
      Number.isSafeInteger(value['expiresAt'])
        ? value['expiresAt']
        : null;
    const planId =
      isRecord(value) && typeof value['planId'] === 'string'
        ? value['planId']
        : null;

    return {
      active: expiresAt !== null && expiresAt > Date.now(),
      expiresAt,
      planId,
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

/**
 * ✅ CORRIGÉ + ENRICHI
 *
 * - Lecture pure (aucune livraison ici)
 * - limitToLast(500) pour les admins
 * - Enrichissement des tâches avec userName, userEmail, amountXof
 * - Try/catch défensif pour ne jamais renvoyer 500
 */
export const listMyCoursePackBenefits = onCall(
  async (
    request,
  ): Promise<{
    benefits: CoursePackBenefitSummary[];
    isAdministrator: boolean;
    pendingFulfillments: CoursePackFulfillmentTask[];
  }> => {
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'Connectez-vous pour consulter les avantages de vos packs.',
      );
    }

    const database = getDatabase();

    try {
      /* 1. Lecture des entitlements de l'utilisateur */
      const entitlementSnapshot = await database
        .ref(`coursePackEntitlements/${request.auth.uid}`)
        .get();

      const benefits: CoursePackBenefitSummary[] = [];
      entitlementSnapshot.forEach((child) => {
        try {
          const benefit = parseCoursePackBenefitSummary(child.key, child.val());
          if (benefit) {
            benefits.push(benefit);
          }
        } catch (e) {
          logger.error('Failed to parse course pack benefit', {
            key: child.key,
            error: e instanceof Error ? e.message : 'Unknown error',
          });
        }
      });
      benefits.sort((a, b) => b.paidAt - a.paidAt);

      /* 2. Vérification admin (tolérante aux erreurs) */
      let isAdministrator = false;
      try {
        const adminSnap = await database
          .ref(`administrators/${request.auth.uid}`)
          .get();
        isAdministrator = adminSnap.exists();
      } catch (e) {
        logger.warn('Failed to check administrator status', {
          error: e instanceof Error ? e.message : 'Unknown error',
        });
      }

      /* 3. Lecture des tâches pending (admin seulement) + enrichissement */
      const pendingFulfillments: CoursePackFulfillmentTask[] = [];
      if (isAdministrator) {
        try {
          const fulfillmentSnapshot = await database
            .ref('coursePackFulfillments')
            .orderByChild('status')
            .equalTo('pending')
            .limitToLast(500)
            .get();

          const rawTasks: Array<{
            task: CoursePackFulfillmentTask;
            userId: string;
            orderId: string;
          }> = [];

          fulfillmentSnapshot.forEach((child) => {
            try {
              const task = parseCoursePackFulfillmentTask(
                child.key,
                child.val(),
              );
              if (task) {
                rawTasks.push({
                  task,
                  userId: task.userId,
                  orderId: task.orderId,
                });
              }
            } catch (e) {
              logger.error('Failed to parse fulfillment task', {
                key: child.key,
                error: e instanceof Error ? e.message : 'Unknown error',
              });
            }
          });

          /* 4. Enrichissement : nom/email du client + montant payé */
          const uniqueUserIds = [...new Set(rawTasks.map((t) => t.userId))];
          const uniqueOrderIds = [...new Set(rawTasks.map((t) => t.orderId))];

          const [userSnapshots, orderSnapshots] = await Promise.all([
            Promise.all(
              uniqueUserIds.map((uid) =>
                database
                  .ref(`users/${uid}`)
                  .get()
                  .catch(() => null),
              ),
            ),
            Promise.all(
              uniqueOrderIds.map((orderId) =>
                database
                  .ref(`orders/${orderId}`)
                  .get()
                  .catch(() => null),
              ),
            ),
          ]);

          const userMap = new Map<
            string,
            { displayName: string; email: string }
          >();
          uniqueUserIds.forEach((uid, i) => {
            const snap = userSnapshots[i];
            if (snap && snap.exists()) {
              const val = snap.val() as Record<string, unknown>;
              userMap.set(uid, {
                displayName:
                  typeof val['displayName'] === 'string'
                    ? val['displayName']
                    : '',
                email: typeof val['email'] === 'string' ? val['email'] : '',
              });
            }
          });

          const orderMap = new Map<
            string,
            { amountXof: number; productTitle: string }
          >();
          uniqueOrderIds.forEach((orderId, i) => {
            const snap = orderSnapshots[i];
            if (snap && snap.exists()) {
              const val = snap.val() as Record<string, unknown>;
              orderMap.set(orderId, {
                amountXof:
                  typeof val['amountXof'] === 'number'
                    ? val['amountXof']
                    : 0,
                productTitle:
                  typeof val['productTitle'] === 'string'
                    ? val['productTitle']
                    : '',
              });
            }
          });

          for (const { task, userId, orderId } of rawTasks) {
            const userInfo = userMap.get(userId);
            const orderInfo = orderMap.get(orderId);
            pendingFulfillments.push({
              ...task,
              ...(userInfo && {
                userName: userInfo.displayName,
                userEmail: userInfo.email,
              }),
              ...(orderInfo && {
                amountXof: orderInfo.amountXof,
                orderProductTitle: orderInfo.productTitle,
              }),
            });
          }

          pendingFulfillments.sort((a, b) => a.createdAt - b.createdAt);
        } catch (e) {
          logger.warn('Failed to load pending fulfillments', {
            error: e instanceof Error ? e.message : 'Unknown error',
          });
        }
      }

      return { benefits, isAdministrator, pendingFulfillments };
    } catch (error) {
      logger.error('listMyCoursePackBenefits failed completely', {
        uid: request.auth.uid,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      return {
        benefits: [],
        isAdministrator: false,
        pendingFulfillments: [],
      };
    }
  },
);

export const redeemCoursePackDocumentCredit =
  onCall<RedeemCoursePackDocumentCreditInput>(
    async (request): Promise<{ orderId: string }> => {
      if (!request.auth) {
        throw new HttpsError(
          'unauthenticated',
          'Connectez-vous pour utiliser vos crédits document.',
        );
      }

      const coursePackOrderId = request.data?.coursePackOrderId;
      if (
        typeof coursePackOrderId !== 'string' ||
        !isOrderId(coursePackOrderId)
      ) {
        throw new HttpsError('invalid-argument', 'Commande de pack invalide.');
      }
      const requestedProductId = request.data?.productId;
      if (!isValidProductId(requestedProductId)) {
        throw new HttpsError('invalid-argument', 'Document invalide.');
      }

      const database = getDatabase();
      const uid = request.auth.uid;
      const coursePackRef = database.ref(
        `coursePackEntitlements/${uid}/${coursePackOrderId}`,
      );
      const orderSnapshot = await database
        .ref(`orders/${coursePackOrderId}`)
        .get();
      const coursePackOrder: unknown = orderSnapshot.val();
      if (
        !isRecord(coursePackOrder) ||
        coursePackOrder['userId'] !== uid ||
        coursePackOrder['status'] !== 'paid' ||
        !isCoursePackOrder(coursePackOrder)
      ) {
        throw new HttpsError(
          'permission-denied',
          'Aucun avantage valide pour cette commande de pack.',
        );
      }

      const existingBenefits: unknown = (await coursePackRef.get()).val();
      const existingPending =
        isRecord(existingBenefits) &&
        isRecord(existingBenefits['pendingRedemption'])
          ? existingBenefits['pendingRedemption']
          : undefined;
      let product:
        | { id: string; title: string; storagePath: string }
        | undefined;
      if (
        existingPending?.['productId'] === requestedProductId &&
        typeof existingPending['productTitle'] === 'string' &&
        isValidStoragePath(existingPending['storagePath'])
      ) {
        product = {
          id: requestedProductId,
          title: existingPending['productTitle'],
          storagePath: existingPending['storagePath'],
        };
      } else {
        const catalogProduct = await getProduct(requestedProductId);
        if (catalogProduct) {
          product = catalogProduct;
        }
      }
      if (!product) {
        throw new HttpsError(
          'failed-precondition',
          'Ce document n’est pas disponible.',
        );
      }

      const reservedOrderId = randomUUID();
      const reservation = await coursePackRef.transaction(
        (current: unknown) => {
          if (!isRecord(current) || current['orderId'] !== coursePackOrderId) {
            return;
          }
          const pending = current['pendingRedemption'];
          if (isRecord(pending)) {
            return pending['productId'] === product.id ? current : undefined;
          }
          const remaining = current['documentCreditsRemaining'];
          if (
            typeof remaining !== 'number' ||
            !Number.isSafeInteger(remaining) ||
            remaining < 1
          ) {
            return;
          }
          return {
            ...current,
            documentCreditsRemaining: remaining - 1,
            pendingRedemption: {
              orderId: reservedOrderId,
              productId: product.id,
              productTitle: product.title,
              storagePath: product.storagePath,
              createdAt: Date.now(),
            },
          };
        },
      );
      if (!reservation.committed) {
        throw new HttpsError(
          'failed-precondition',
          'Aucun crédit document disponible, ou une autre utilisation est en cours.',
        );
      }

      const reservedBenefits: unknown = reservation.snapshot.val();
      const pending =
        isRecord(reservedBenefits) &&
        isRecord(reservedBenefits['pendingRedemption'])
          ? reservedBenefits['pendingRedemption']
          : undefined;
      if (
        !pending ||
        pending['productId'] !== product.id ||
        pending['productTitle'] !== product.title ||
        !isValidStoragePath(pending['storagePath']) ||
        typeof pending['orderId'] !== 'string' ||
        !isOrderId(pending['orderId']) ||
        typeof pending['createdAt'] !== 'number'
      ) {
        throw new HttpsError(
          'failed-precondition',
          'La réservation du crédit document est invalide.',
        );
      }

      const redemptionOrderId = pending['orderId'];
      const redemptionOrder = {
        userId: uid,
        orderType: 'document_credit',
        productId: product.id,
        productTitle: pending['productTitle'],
        amountXof: 0,
        currency: 'XOF',
        storagePath: pending['storagePath'],
        sourceCoursePackOrderId: coursePackOrderId,
        status: 'paid',
        reference: `CG-${redemptionOrderId}`,
        createdAt: pending['createdAt'],
        paidAt: pending['createdAt'],
      };
      await database.ref().update({
        [`orders/${redemptionOrderId}`]: redemptionOrder,
        [`entitlements/${uid}/${redemptionOrderId}`]: {
          productId: product.id,
          storagePath: pending['storagePath'],
          sourceCoursePackOrderId: coursePackOrderId,
          grantedAt: pending['createdAt'],
        },
        [`ordersByUser/${uid}/${createOrderHistoryKey(redemptionOrder)}`]:
          toPurchaseHistoryItem(redemptionOrderId, redemptionOrder),
      });

      const finalized = await coursePackRef.transaction(
        (current: unknown) => {
          if (!isRecord(current)) {
            return;
          }
          const redemptions = isRecord(current['redemptions'])
            ? current['redemptions']
            : {};
          if (redemptions[redemptionOrderId] === true) {
            return current;
          }
          const activeReservation = current['pendingRedemption'];
          if (
            !isRecord(activeReservation) ||
            activeReservation['orderId'] !== redemptionOrderId
          ) {
            return;
          }
          return {
            ...current,
            pendingRedemption: null,
            redemptions: {
              ...redemptions,
              [redemptionOrderId]: true,
            },
          };
        },
      );
      if (!finalized.committed) {
        throw new HttpsError(
          'unavailable',
          'Le document est prêt, mais la validation du crédit est en cours. Actualisez vos achats.',
        );
      }

      return { orderId: redemptionOrderId };
    },
  );

export const completeCoursePackBenefit =
  onCall<CompleteCoursePackBenefitInput>(async (request): Promise<void> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Connexion requise.');
    }
    if (typeof request.data?.fulfillmentId !== 'string') {
      throw new HttpsError('invalid-argument', 'Avantage invalide.');
    }

    const database = getDatabase();
    const administratorSnapshot = await database
      .ref(`administrators/${request.auth.uid}`)
      .get();
    if (!administratorSnapshot.exists()) {
      throw new HttpsError('permission-denied', 'Action réservée à l’équipe.');
    }

    const fulfillmentId = request.data.fulfillmentId;
    if (!/^[0-9a-f-]{36}_[a-z0-9-]+$/i.test(fulfillmentId)) {
      throw new HttpsError('invalid-argument', 'Avantage invalide.');
    }
    const taskSnapshot = await database
      .ref(`coursePackFulfillments/${fulfillmentId}`)
      .get();
    const task = parseCoursePackFulfillmentTask(
      taskSnapshot.key,
      taskSnapshot.val(),
    );
    if (!task) {
      throw new HttpsError('not-found', 'Avantage à livrer introuvable.');
    }

    const orderSnapshot = await database.ref(`orders/${task.orderId}`).get();
    const order: unknown = orderSnapshot.val();
    if (
      !isRecord(order) ||
      order['userId'] !== task.userId ||
      order['status'] !== 'paid' ||
      !isCoursePackOrder(order)
    ) {
      throw new HttpsError(
        'failed-precondition',
        'La commande ne correspond plus à cet avantage.',
      );
    }
    const benefit = getCoursePackManualBenefit(
      order['coursePackId'],
      task.benefitId,
    );
    if (!benefit) {
      throw new HttpsError(
        'failed-precondition',
        'La commande ne correspond plus à cet avantage.',
      );
    }

    const entitlementPath = `coursePackEntitlements/${task.userId}/${task.orderId}`;
    const entitlementSnapshot = await database.ref(entitlementPath).get();
    const entitlement: unknown = entitlementSnapshot.val();
    const manualBenefits =
      isRecord(entitlement) && isRecord(entitlement['manualBenefits'])
        ? entitlement['manualBenefits']
        : undefined;
    const manualBenefit = manualBenefits?.[task.benefitId];
    if (
      !manualBenefits ||
      !isRecord(manualBenefit) ||
      manualBenefit['status'] === 'needs_definition'
    ) {
      throw new HttpsError(
        'failed-precondition',
        'Cet avantage doit être précisé avant sa livraison.',
      );
    }

    const fulfilledAt = Date.now();
    await database.ref().update({
      [`coursePackFulfillments/${fulfillmentId}/status`]: 'fulfilled',
      [`coursePackFulfillments/${fulfillmentId}/fulfilledAt`]: fulfilledAt,
      [`${entitlementPath}/manualBenefits/${task.benefitId}/status`]:
        'fulfilled',
      [`${entitlementPath}/manualBenefits/${task.benefitId}/fulfilledAt`]:
        fulfilledAt,
    });
  });

/* ═════════════════════════════════════════════════════════════════════
   ✅ NOUVELLE CLOUD FUNCTION — Notification livraison avantage
   ═════════════════════════════════════════════════════════════════════ */

/**
 * Déclenchée quand un avantage de pack passe de `pending` → `fulfilled`.
 * Écrit une notification dans `/notifications/{uid}`.
 * Idempotent : ne recrée pas la notification si elle existe déjà.
 */
export const onCoursePackFulfillmentUpdated = onValueUpdated(
  '/coursePackFulfillments/{fulfillmentId}',
  async (event) => {
    const before = event.data.before.val() as unknown;
    const after = event.data.after.val() as unknown;

    if (!isRecord(after) || !isRecord(before)) {
      return;
    }

    const previousStatus =
      typeof before['status'] === 'string' ? before['status'] : null;
    const newStatus =
      typeof after['status'] === 'string' ? after['status'] : null;

    if (previousStatus !== 'pending' || newStatus !== 'fulfilled') {
      return;
    }

    const userId = typeof after['userId'] === 'string' ? after['userId'] : null;
    const orderId =
      typeof after['orderId'] === 'string' ? after['orderId'] : null;
    const benefitId =
      typeof after['benefitId'] === 'string' ? after['benefitId'] : null;
    const title = typeof after['title'] === 'string' ? after['title'] : null;
    const packTitle =
      typeof after['packTitle'] === 'string' ? after['packTitle'] : null;
    const fulfillmentId = event.params.fulfillmentId;

    if (!userId || !orderId || !benefitId || !title || !packTitle) {
      logger.warn('Course pack fulfillment is missing required data', {
        fulfillmentId,
      });
      return;
    }

    const database = getDatabase();
    const notificationKey = `cp-fulfilled-${orderId}-${benefitId}`;
    const notificationRef = database.ref(
      `notifications/${userId}/${notificationKey}`,
    );

    try {
      const existing = await notificationRef.get();
      if (existing.exists()) {
        logger.info('Notification already exists, skipping', {
          fulfillmentId,
          userId,
        });
        return;
      }

      const now = Date.now();

      await notificationRef.set({
        type: 'course_pack_benefit_fulfilled',
        title: `Votre « ${title} » a été livré ✅`,
        body: `L’avantage « ${title} » de votre pack « ${packTitle} » est maintenant disponible.`,
        orderId,
        benefitId,
        packTitle,
        read: false,
        createdAt: now,
      });

      logger.info('Course pack fulfillment notification sent', {
        fulfillmentId,
        userId,
        orderId,
        benefitId,
      });
    } catch (error) {
      logger.error('Failed to send course pack fulfillment notification', {
        fulfillmentId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
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
    const sourcePackOrderId =
      isRecord(order) && typeof order['sourceCoursePackOrderId'] === 'string'
        ? order['sourceCoursePackOrderId']
        : undefined;
    const sourcePackEntitlementSnapshot = sourcePackOrderId
      ? await database
          .ref(`coursePackEntitlements/${uid}/${sourcePackOrderId}`)
          .get()
      : undefined;
    const sourcePackEntitlement: unknown =
      sourcePackEntitlementSnapshot?.val();
    const isPaidDocumentEntitlement =
      isRecord(order) &&
      order['orderType'] !== 'document_credit' &&
      isRecord(entitlement) &&
      typeof order['jekoTransactionId'] === 'string' &&
      entitlement['transactionId'] === order['jekoTransactionId'];
    const isCreditDocumentEntitlement =
      isRecord(order) &&
      order['orderType'] === 'document_credit' &&
      isRecord(entitlement) &&
      entitlement['sourceCoursePackOrderId'] === sourcePackOrderId &&
      isRecord(sourcePackEntitlement) &&
      isRecord(sourcePackEntitlement['redemptions']) &&
      sourcePackEntitlement['redemptions'][orderId] === true;

    if (
      !isRecord(order) ||
      order['userId'] !== uid ||
      order['status'] !== 'paid' ||
      !isRecord(entitlement) ||
      (!isPaidDocumentEntitlement && !isCreditDocumentEntitlement)
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

async function grantGameSubscription(
  database: ReturnType<typeof getDatabase>,
  orderId: string,
  order: Record<string, unknown>,
  transactionId: string,
): Promise<void> {
  if (
    typeof order['userId'] !== 'string' ||
    !isGameSubscriptionOrder(order)
  ) {
    throw new Error('Cannot grant an invalid game subscription order.');
  }

  const plan = getGameSubscriptionPlan(order['subscriptionPlanId']);
  if (!plan) {
    throw new Error('Cannot grant an unknown game subscription plan.');
  }

  await extendGameSubscription(
    database,
    order['userId'],
    orderId,
    transactionId,
    plan.id,
    plan.durationMonths,
  );
}

async function extendGameSubscription(
  database: ReturnType<typeof getDatabase>,
  uid: string,
  orderId: string,
  transactionId: string,
  planId: string,
  durationMonths: number,
): Promise<number> {
  const now = Date.now();
  const subscriptionRef = database.ref(`gameSubscriptions/${uid}`);
  const result = await subscriptionRef.transaction((current: unknown) => {
    const existing = isRecord(current) ? current : {};
    const appliedOrders = isRecord(existing['appliedOrders'])
      ? existing['appliedOrders']
      : {};

    if (appliedOrders[orderId] === transactionId) {
      return existing;
    }

    const previousExpiry =
      typeof existing['expiresAt'] === 'number' &&
      Number.isSafeInteger(existing['expiresAt'])
        ? existing['expiresAt']
        : now;
    const startsAt = Math.max(now, previousExpiry);

    return {
      planId,
      startedAt: previousExpiry > now ? existing['startedAt'] ?? now : now,
      expiresAt: addCalendarMonths(startsAt, durationMonths),
      lastOrderId: orderId,
      updatedAt: now,
      appliedOrders: {
        ...appliedOrders,
        [orderId]: transactionId,
      },
    };
  });

  if (!result.committed) {
    throw new Error('The game subscription could not be activated.');
  }
  const expiresAt: unknown = result.snapshot.child('expiresAt').val();
  if (typeof expiresAt !== 'number' || !Number.isSafeInteger(expiresAt)) {
    throw new Error('The game subscription expiry is invalid.');
  }
  return expiresAt;
}

async function grantCoursePackBenefits(
  database: ReturnType<typeof getDatabase>,
  orderId: string,
  order: Record<string, unknown>,
  transactionId: string,
): Promise<void> {
  if (typeof order['userId'] !== 'string' || !isCoursePackOrder(order)) {
    throw new Error('Cannot grant benefits for an invalid course pack order.');
  }
  const pack = getCoursePack(order['coursePackId']);
  if (!pack || typeof order['paidAt'] !== 'number') {
    throw new Error('Cannot grant benefits for an unknown course pack.');
  }

  // ✅ GARANTIE : manualBenefits existe toujours (tableau vide si absent)
  const packManualBenefits = pack.manualBenefits ?? [];

  const entitlementRef = database.ref(
    `coursePackEntitlements/${order['userId']}/${orderId}`,
  );
  const manualBenefits = Object.fromEntries(
    packManualBenefits.map((benefit) => [
      benefit.id,
      {
        title: benefit.title,
        status:
          benefit.id === 'platform-premium-duration'
            ? 'needs_definition'
            : 'pending',
      },
    ]),
  );
  const entitlementResult = await entitlementRef.transaction(
    (current: unknown) => {
      if (current !== null) {
        return isRecord(current) &&
          current['orderId'] === orderId &&
          current['transactionId'] === transactionId
          ? current
          : undefined;
      }
      return {
        orderId,
        transactionId,
        coursePackId: pack.id,
        packTitle: order['productTitle'],
        paidAt: order['paidAt'],
        status: 'granted',
        documentCreditsGranted: pack.documentCredits,
        documentCreditsRemaining: pack.documentCredits,
        gameAccessMonths: pack.gameAccessMonths,
        manualBenefits,
      };
    },
  );
  if (!entitlementResult.committed) {
    throw new Error('The course pack benefits could not be granted.');
  }
  const savedEntitlement: unknown = entitlementResult.snapshot.val();
  if (
    !isRecord(savedEntitlement) ||
    savedEntitlement['orderId'] !== orderId ||
    savedEntitlement['transactionId'] !== transactionId
  ) {
    throw new Error('Course pack entitlement does not match the paid order.');
  }

  for (const benefit of packManualBenefits) {
    if (benefit.id === 'platform-premium-duration') {
      continue;
    }
    const fulfillmentId = `${orderId}_${benefit.id}`;
    const fulfillmentRef = database.ref(
      `coursePackFulfillments/${fulfillmentId}`,
    );
    const result = await fulfillmentRef.transaction((current: unknown) => {
      if (current !== null) {
        return current;
      }
      return {
        orderId,
        userId: order['userId'],
        coursePackId: pack.id,
        packTitle: order['productTitle'],
        benefitId: benefit.id,
        title: benefit.title,
        status: 'pending',
        createdAt: order['paidAt'],
      };
    });
    if (!result.committed) {
      throw new Error('A course pack fulfillment task could not be created.');
    }
  }

  if (pack.gameAccessMonths > 0) {
    const expiresAt = await extendGameSubscription(
      database,
      order['userId'],
      orderId,
      transactionId,
      `course-pack-${pack.id}`,
      pack.gameAccessMonths,
    );
    await entitlementRef.update({ gameAccessExpiresAt: expiresAt });
  }
}

function parseCoursePackBenefitSummary(
  orderId: string | null,
  value: unknown,
): CoursePackBenefitSummary | undefined {
  if (
    typeof orderId !== 'string' ||
    !isOrderId(orderId) ||
    !isRecord(value) ||
    value['orderId'] !== orderId ||
    typeof value['packTitle'] !== 'string' ||
    typeof value['paidAt'] !== 'number' ||
    typeof value['documentCreditsGranted'] !== 'number' ||
    typeof value['documentCreditsRemaining'] !== 'number' ||
    typeof value['gameAccessMonths'] !== 'number' ||
    !isRecord(value['manualBenefits'])
  ) {
    return undefined;
  }

  const manualBenefits: CoursePackBenefitSummary['manualBenefits'][number][] =
    [];
  for (const [id, rawBenefit] of Object.entries(value['manualBenefits'])) {
    if (
      !isRecord(rawBenefit) ||
      typeof rawBenefit['title'] !== 'string' ||
      (rawBenefit['status'] !== 'pending' &&
        rawBenefit['status'] !== 'needs_definition' &&
        rawBenefit['status'] !== 'fulfilled')
    ) {
      continue;
    }
    manualBenefits.push({
      id,
      title: rawBenefit['title'],
      status: rawBenefit['status'],
      ...(typeof rawBenefit['fulfilledAt'] === 'number' && {
        fulfilledAt: rawBenefit['fulfilledAt'],
      }),
    });
  }

  const pendingRedemption = isRecord(value['pendingRedemption'])
    ? value['pendingRedemption']
    : undefined;
  return {
    orderId,
    packTitle: value['packTitle'],
    paidAt: value['paidAt'],
    documentCreditsGranted: value['documentCreditsGranted'],
    documentCreditsRemaining: value['documentCreditsRemaining'],
    gameAccessMonths: value['gameAccessMonths'],
    ...(typeof value['gameAccessExpiresAt'] === 'number' && {
      gameAccessExpiresAt: value['gameAccessExpiresAt'],
    }),
    manualBenefits,
    ...(pendingRedemption &&
      typeof pendingRedemption['productId'] === 'string' &&
      typeof pendingRedemption['productTitle'] === 'string' && {
        pendingRedemption: {
          productId: pendingRedemption['productId'],
          productTitle: pendingRedemption['productTitle'],
        },
      }),
  };
}

function parseCoursePackFulfillmentTask(
  id: string | null,
  value: unknown,
): CoursePackFulfillmentTask | undefined {
  if (
    typeof id !== 'string' ||
    !isRecord(value) ||
    typeof value['orderId'] !== 'string' ||
    !isOrderId(value['orderId']) ||
    typeof value['userId'] !== 'string' ||
    typeof value['coursePackId'] !== 'string' ||
    typeof value['packTitle'] !== 'string' ||
    typeof value['benefitId'] !== 'string' ||
    typeof value['title'] !== 'string' ||
    value['status'] !== 'pending' ||
    typeof value['createdAt'] !== 'number' ||
    id !== `${value['orderId']}_${value['benefitId']}`
  ) {
    return undefined;
  }
  return {
    id,
    orderId: value['orderId'],
    userId: value['userId'],
    packTitle: value['packTitle'],
    benefitId: value['benefitId'],
    title: value['title'],
    createdAt: value['createdAt'],
  };
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
    ...(isPurchaseOrderType(order['orderType']) && {
      orderType: order['orderType'],
    }),
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
    (value['orderType'] !== undefined &&
      !isPurchaseOrderType(value['orderType'])) ||
    typeof value['reference'] !== 'string' ||
    typeof value['createdAt'] !== 'number' ||
    !Number.isSafeInteger(value['createdAt']) ||
    value['amountXof'] < 0 ||
    (value['amountXof'] === 0 && value['orderType'] !== 'document_credit')
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
    ...(isPurchaseOrderType(value['orderType']) && {
      orderType: value['orderType'],
    }),
    reference: value['reference'],
    createdAt: value['createdAt'],
    ...(typeof value['paidAt'] === 'number' && {
      paidAt: value['paidAt'],
    }),
  };
}

function isPurchaseOrderType(
  value: unknown,
): value is
  | 'document'
  | 'document_credit'
  | 'game_subscription'
  | 'course_pack' {
  return (
    value === 'document' ||
    value === 'document_credit' ||
    value === 'game_subscription' ||
    value === 'course_pack'
  );
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
  const isGameSubscription = isGameSubscriptionOrder(order);
  const isCoursePack = isCoursePackOrder(order);
  if (
    typeof order['userId'] !== 'string' ||
    typeof order['productId'] !== 'string' ||
    (order['orderType'] !== undefined &&
      order['orderType'] !== 'document' &&
      order['orderType'] !== 'game_subscription' &&
      order['orderType'] !== 'course_pack') ||
    (order['orderType'] === 'game_subscription'
      ? !isGameSubscription
      : order['orderType'] === 'course_pack'
        ? !isCoursePack
        : typeof order['storagePath'] !== 'string')
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