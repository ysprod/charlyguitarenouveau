export const COURSE_PACKS = [
  { id: 'deb-jeune', title: 'Jeunesse — Débutants', priceXof: 100_000 },
  { id: 'deb-adulte', title: 'Adulte — Débutants', priceXof: 120_000 },
  { id: 'deb-premium', title: 'Premium — Débutants', priceXof: 200_000 },
  { id: 'int-jeune', title: 'Jeune — Intermédiaire', priceXof: 90_000 },
  { id: 'int-adulte', title: 'Adulte — Intermédiaire', priceXof: 110_000 },
  { id: 'int-premium', title: 'Premium — Intermédiaire', priceXof: 160_000 },
  { id: 'solo-jeune', title: 'Jeune — Solo et Techniques', priceXof: 70_000 },
  { id: 'solo-adulte', title: 'Adulte — Solo et Techniques', priceXof: 80_000 },
  { id: 'solo-premium', title: 'Premium — Solo et Techniques', priceXof: 150_000 },
  { id: 'chan-jeune', title: 'Jeune — Chansons et Accompagnement', priceXof: 140_000 },
  { id: 'chan-adulte', title: 'Adulte — Chansons et Accompagnement', priceXof: 160_000 },
  { id: 'chan-premium', title: 'Premium — Chansons et Accompagnement', priceXof: 250_000 },
] as const;

export type CoursePack = (typeof COURSE_PACKS)[number];

export function getCoursePack(value: unknown): CoursePack | undefined {
  return COURSE_PACKS.find((pack) => pack.id === value);
}

export function isCoursePackOrder(
  order: unknown,
): order is Record<string, unknown> & {
  readonly coursePackId: CoursePack['id'];
  readonly coursePackDurationMonths: 1;
  readonly amountXof: number;
} {
  if (!isRecord(order) || order['orderType'] !== 'course_pack') {
    return false;
  }

  const pack = getCoursePack(order['coursePackId']);
  return (
    pack !== undefined &&
    order['coursePackDurationMonths'] === 1 &&
    order['productId'] === `course-pack-${pack.id}` &&
    order['productTitle'] === `Pack de cours — ${pack.title} (1 mois)` &&
    order['amountXof'] === pack.priceXof
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
