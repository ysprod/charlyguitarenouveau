import assert from 'node:assert/strict';
import test from 'node:test';

import {
  GAME_SUBSCRIPTION_PLANS,
  addCalendarMonths,
  getGameSubscriptionPlan,
  isGameSubscriptionOrder,
} from './game-subscriptions.js';

test('defines the published game subscription prices', () => {
  assert.deepEqual(
    GAME_SUBSCRIPTION_PLANS.map(({ id, durationMonths, priceXof }) => ({
      id,
      durationMonths,
      priceXof,
    })),
    [
      { id: 'one-month', durationMonths: 1, priceXof: 1_000 },
      { id: 'three-months', durationMonths: 3, priceXof: 2_500 },
      { id: 'twelve-months', durationMonths: 12, priceXof: 10_000 },
    ],
  );
  assert.equal(getGameSubscriptionPlan('invalid-plan'), undefined);
});

test('adds calendar months in UTC and clamps to the last day of the month', () => {
  const januaryThirtyFirst = Date.UTC(2024, 0, 31, 12, 30);
  assert.equal(
    addCalendarMonths(januaryThirtyFirst, 1),
    Date.UTC(2024, 1, 29, 12, 30),
  );
  assert.equal(
    addCalendarMonths(januaryThirtyFirst, 3),
    Date.UTC(2024, 3, 30, 12, 30),
  );
});

test('accepts only orders whose plan, duration, title and price match', () => {
  const order = {
    orderType: 'game_subscription',
    productId: 'games-three-months',
    productTitle: 'Abonnement jeux — 3 mois',
    subscriptionPlanId: 'three-months',
    subscriptionDurationMonths: 3,
    amountXof: 2_500,
  };

  assert.equal(isGameSubscriptionOrder(order), true);
  assert.equal(
    isGameSubscriptionOrder({ ...order, amountXof: 1 }),
    false,
  );
  assert.equal(
    isGameSubscriptionOrder({ ...order, subscriptionDurationMonths: 1 }),
    false,
  );
});
