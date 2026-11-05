import { Injectable, inject } from '@angular/core';
import { getApps, initializeApp } from 'firebase/app';
import {
  getFunctions,
  httpsCallable as firebaseHttpsCallable,
} from 'firebase/functions';
import { Functions, httpsCallable } from '@angular/fire/functions';

import { environment as productionEnvironment } from '../../../environments/environment.prod';

export interface CheckoutProduct {
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

export interface PurchaseHistoryItem {
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

export interface CoursePackManualBenefit {
  readonly id: string;
  readonly title: string;
  readonly status: 'pending' | 'needs_definition' | 'fulfilled';
  readonly fulfilledAt?: number;
}

export interface CoursePackBenefitSummary {
  readonly orderId: string;
  readonly packTitle: string;
  readonly paidAt: number;
  readonly documentCreditsGranted: number;
  readonly documentCreditsRemaining: number;
  readonly gameAccessMonths: number;
  readonly gameAccessExpiresAt?: number;
  readonly manualBenefits: readonly CoursePackManualBenefit[];
  readonly pendingRedemption?: {
    readonly productId: string;
    readonly productTitle: string;
  };
}

export interface CoursePackFulfillmentTask {
  readonly id: string;
  readonly orderId: string;
  readonly userId: string;
  readonly packTitle: string;
  readonly benefitId: string;
  readonly title: string;
  readonly createdAt: number;
}

export interface CoursePackBenefitsResponse {
  readonly benefits: CoursePackBenefitSummary[];
  readonly isAdministrator: boolean;
  readonly pendingFulfillments: CoursePackFulfillmentTask[];
}

export type PaymentMethod = 'orange' | 'wave' | 'mtn' | 'moov' | 'djamo' | 'jeko';

export interface CreateCheckoutResponse {
  readonly orderId: string;
  readonly redirectUrl: string;
  readonly status: 'payment_pending';
}

@Injectable({ providedIn: 'root' })
export class PurchaseService {
  private readonly functions = inject(Functions);

  async listProducts(): Promise<readonly CheckoutProduct[]> {
    const app =
      getApps().find(({ name }) => name === 'production-catalog') ??
      initializeApp(productionEnvironment.firebase, 'production-catalog');
    const call = firebaseHttpsCallable<
      void,
      { products: CheckoutProduct[] }
    >(getFunctions(app, 'us-central1'), 'listAvailableProducts');
    const result = await call();
    return result.data.products;
  }

  async createCheckout(
    productId: string,
    paymentMethod: PaymentMethod,
  ): Promise<CreateCheckoutResponse> {
    return this.requestCheckout({ productId, paymentMethod });
  }

  async createCoursePackCheckout(
    coursePackId: string,
    paymentMethod: PaymentMethod,
  ): Promise<CreateCheckoutResponse> {
    return this.requestCheckout({ coursePackId, paymentMethod });
  }

  private async requestCheckout(input: {
    readonly productId?: string;
    readonly coursePackId?: string;
    readonly paymentMethod: PaymentMethod;
  }): Promise<CreateCheckoutResponse> {
    const call = httpsCallable<
      {
        productId?: string;
        coursePackId?: string;
        paymentMethod: PaymentMethod;
      },
      CreateCheckoutResponse
    >(this.functions, 'createCheckout');
    const result = await call(input);
    const redirectUrl = new URL(result.data.redirectUrl);
    if (redirectUrl.protocol !== 'https:') {
      throw new Error('L’URL de paiement reçue n’est pas sécurisée.');
    }

    return result.data;
  }

  async listPurchases(): Promise<readonly PurchaseHistoryItem[]> {
    const call = httpsCallable<void, { purchases: PurchaseHistoryItem[] }>(
      this.functions,
      'listMyPurchases',
    );
    const result = await call();
    return result.data.purchases;
  }

  async listMyCoursePackBenefits(): Promise<CoursePackBenefitsResponse> {
    const call = httpsCallable<void, CoursePackBenefitsResponse>(
      this.functions,
      'listMyCoursePackBenefits',
    );
    try {
      const result = await call();
      return result.data;
    } catch (error) {
      console.error(
        '[PurchaseService] listMyCoursePackBenefits a échoué :',
        error,
      );
      // ✅ Retour gracieux : la page ne crash pas
      return {
        benefits: [],
        isAdministrator: false,
        pendingFulfillments: [],
      };
    }
  }

  async redeemCoursePackDocumentCredit(
    coursePackOrderId: string,
    productId: string,
  ): Promise<{ orderId: string }> {
    const call = httpsCallable<
      { coursePackOrderId: string; productId: string },
      { orderId: string }
    >(this.functions, 'redeemCoursePackDocumentCredit');
    const result = await call({ coursePackOrderId, productId });
    return result.data;
  }

  async completeCoursePackBenefit(fulfillmentId: string): Promise<void> {
    const call = httpsCallable<{ fulfillmentId: string }, void>(
      this.functions,
      'completeCoursePackBenefit',
    );
    await call({ fulfillmentId });
  }

  async getDownloadUrl(orderId: string): Promise<string> {
    const call = httpsCallable<
      { orderId: string },
      { downloadUrl: string }
    >(this.functions, 'downloadPurchase');
    const result = await call({ orderId });
    const downloadUrl = new URL(result.data.downloadUrl);
    if (downloadUrl.protocol !== 'https:') {
      throw new Error('L’URL de téléchargement reçue n’est pas sécurisée.');
    }

    return downloadUrl.toString();
  }
}