export const COURSE_PACKS = [
  {
    id: 'deb-jeune',
    title: 'Jeunesse — Débutants',
    priceXof: 100_000,
    documentCredits: 1,
    gameAccessMonths: 0,
    manualBenefits: [],
  },
  {
    id: 'deb-adulte',
    title: 'Adulte — Débutants',
    priceXof: 120_000,
    documentCredits: 2,
    gameAccessMonths: 3,
    manualBenefits: [
      { id: 'personalized-follow-up', title: 'Suivi personnalisé' },
    ],
  },
  {
    id: 'deb-premium',
    title: 'Premium — Débutants',
    priceXof: 200_000,
    documentCredits: 4,
    gameAccessMonths: 12,
    manualBenefits: [
      { id: 'gold-status', title: 'Statut Gold affiché' },
      { id: 'course-certificate', title: 'Certificat de fin de cycle' },
      { id: 'premium-follow-up', title: 'Suivi haut de gamme' },
      { id: 'masterclasses', title: 'Accès aux masterclass' },
    ],
  },
  {
    id: 'int-jeune',
    title: 'Jeune — Intermédiaire',
    priceXof: 90_000,
    documentCredits: 0,
    gameAccessMonths: 0,
    manualBenefits: [],
  },
  {
    id: 'int-adulte',
    title: 'Adulte — Intermédiaire',
    priceXof: 110_000,
    documentCredits: 1,
    gameAccessMonths: 0,
    manualBenefits: [],
  },
  {
    id: 'int-premium',
    title: 'Premium — Intermédiaire',
    priceXof: 160_000,
    documentCredits: 4,
    gameAccessMonths: 0,
    manualBenefits: [
      {
        id: 'platform-premium-duration',
        title: 'Accès premium à la plateforme — durée à préciser',
      },
      {
        id: 'intermediate-gold-status',
        title: 'Statut Élève Intermédiaire Gold',
      },
    ],
  },
  {
    id: 'solo-jeune',
    title: 'Jeune — Solo et Techniques',
    priceXof: 70_000,
    documentCredits: 0,
    gameAccessMonths: 0,
    manualBenefits: [],
  },
  {
    id: 'solo-adulte',
    title: 'Adulte — Solo et Techniques',
    priceXof: 80_000,
    documentCredits: 1,
    gameAccessMonths: 0,
    manualBenefits: [],
  },
  {
    id: 'solo-premium',
    title: 'Premium — Solo et Techniques',
    priceXof: 150_000,
    documentCredits: 3,
    gameAccessMonths: 12,
    manualBenefits: [
      { id: 'gold-status', title: 'Statut Élève Gold affiché' },
    ],
  },
  {
    id: 'chan-jeune',
    title: 'Jeune — Chansons et Accompagnement',
    priceXof: 140_000,
    documentCredits: 2,
    gameAccessMonths: 0,
    manualBenefits: [
      { id: 'personalized-follow-up', title: 'Suivi personnalisé inclus' },
      { id: 'age-appropriate-repertoire', title: 'Répertoire adapté à l’âge' },
    ],
  },
  {
    id: 'chan-adulte',
    title: 'Adulte — Chansons et Accompagnement',
    priceXof: 160_000,
    documentCredits: 4,
    gameAccessMonths: 0,
    manualBenefits: [
      { id: 'personalized-follow-up', title: 'Suivi personnalisé inclus' },
      { id: 'home-course-option', title: 'Possibilité de cours à domicile privé' },
      { id: 'shirt-and-pen', title: 'Tee-shirt et stylo offerts' },
      { id: 'course-certificate', title: 'Certificat de formation' },
      { id: 'stage-accompaniment', title: 'Accompagnement scénique' },
    ],
  },
  {
    id: 'chan-premium',
    title: 'Premium — Chansons et Accompagnement',
    priceXof: 250_000,
    documentCredits: 5,
    gameAccessMonths: 12,
    manualBenefits: [
      { id: 'weekly-taekwondo', title: '1 h de Taekwondo offerte par semaine' },
      {
        id: 'gold-singing-status',
        title: 'Affichage Gold chant et accompagnement',
      },
      { id: 'course-certificate', title: 'Certificat de fin de cycle' },
      { id: 'premium-follow-up', title: 'Suivi haut de gamme' },
    ],
  },
] as const;

export type CoursePack = (typeof COURSE_PACKS)[number];
export type CoursePackManualBenefit = CoursePack['manualBenefits'][number];

export function getCoursePack(value: unknown): CoursePack | undefined {
  return COURSE_PACKS.find((pack) => pack.id === value);
}

export function getCoursePackManualBenefit(
  packId: unknown,
  benefitId: unknown,
): CoursePackManualBenefit | undefined {
  const pack = getCoursePack(packId);
  return pack?.manualBenefits.find((benefit) => benefit.id === benefitId);
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