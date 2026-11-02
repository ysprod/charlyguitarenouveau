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
  readonly reference: string;
  readonly createdAt: number;
  readonly paidAt?: number;
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
    const call = httpsCallable<
      { productId: string; paymentMethod: PaymentMethod },
      CreateCheckoutResponse
    >(this.functions, 'createCheckout');
    const result = await call({ productId, paymentMethod });
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
