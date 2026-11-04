export const GAME_SUBSCRIPTION_PLANS = [
  { id: 'one-month', title: '1 mois', durationMonths: 1, priceXof: 1_000 },
  { id: 'three-months', title: '3 mois', durationMonths: 3, priceXof: 2_500 },
  { id: 'twelve-months', title: '12 mois', durationMonths: 12, priceXof: 10_000 },
] as const;

export type GameSubscriptionPlan =
  (typeof GAME_SUBSCRIPTION_PLANS)[number];

export function getGameSubscriptionPlan(
  planId: unknown,
): GameSubscriptionPlan | undefined {
  return GAME_SUBSCRIPTION_PLANS.find((plan) => plan.id === planId);
}

export function addCalendarMonths(timestamp: number, months: number): number {
  const date = new Date(timestamp);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.getTime();
}

export function isGameSubscriptionOrder(
  order: unknown,
): order is Record<string, unknown> & {
  readonly subscriptionPlanId: GameSubscriptionPlan['id'];
  readonly subscriptionDurationMonths: number;
  readonly amountXof: number;
} {
  if (!isRecord(order) || order['orderType'] !== 'game_subscription') {
    return false;
  }

  const plan = getGameSubscriptionPlan(order['subscriptionPlanId']);
  return (
    plan !== undefined &&
    order['subscriptionDurationMonths'] === plan.durationMonths &&
    order['productId'] === `games-${plan.id}` &&
    order['productTitle'] === `Abonnement jeux — ${plan.title}` &&
    order['amountXof'] === plan.priceXof
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
