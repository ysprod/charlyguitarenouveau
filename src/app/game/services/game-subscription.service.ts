import { Injectable, inject } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';

import type {
  CreateCheckoutResponse,
  PaymentMethod,
} from '../../academie/services/purchase.service';

export const GAME_SUBSCRIPTION_PLANS = [
  { id: 'one-month', title: '1 mois', durationMonths: 1, priceXof: 1_000 },
  { id: 'three-months', title: '3 mois', durationMonths: 3, priceXof: 2_500 },
  { id: 'twelve-months', title: '12 mois', durationMonths: 12, priceXof: 10_000 },
] as const;

export type GameSubscriptionPlanId =
  (typeof GAME_SUBSCRIPTION_PLANS)[number]['id'];

export interface GameSubscriptionStatus {
  readonly active: boolean;
  readonly expiresAt: number | null;
  readonly planId: string | null;
}

@Injectable({ providedIn: 'root' })
export class GameSubscriptionService {
  private readonly functions = inject(Functions);

  async getMySubscription(): Promise<GameSubscriptionStatus> {
    const call = httpsCallable<void, GameSubscriptionStatus>(
      this.functions,
      'getMyGameSubscription',
    );
    const result = await call();
    return result.data;
  }

  async createCheckout(
    planId: GameSubscriptionPlanId,
    paymentMethod: PaymentMethod,
  ): Promise<CreateCheckoutResponse> {
    const call = httpsCallable<
      { subscriptionPlanId: GameSubscriptionPlanId; paymentMethod: PaymentMethod },
      CreateCheckoutResponse
    >(this.functions, 'createCheckout');
    const result = await call({ subscriptionPlanId: planId, paymentMethod });
    const redirectUrl = new URL(result.data.redirectUrl);
    if (redirectUrl.protocol !== 'https:') {
      throw new Error('L’URL de paiement reçue n’est pas sécurisée.');
    }

    return result.data;
  }
}
