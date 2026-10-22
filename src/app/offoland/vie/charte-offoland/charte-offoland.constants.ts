// src/app/charte/charte-offoland.constants.ts

/** Points d'ancrage (ids) des sections de la Charte. */
export const CHARTER_SECTION_IDS = {
  HERO: 'accueil',
  PREAMBULE: 'preambule',
  PRINCIPES: 'principes',
  ARTICLES: 'articles',
  DIMENSIONS: 'dimensions',
  GARDIENS: 'gardiens',
  SERMENT: 'serment',
} as const;

/** Navigation interne — utilisée par le composant principal. */
export const CHARTER_NAVIGATION = [
  { label: 'Préambule', id: CHARTER_SECTION_IDS.PREAMBULE },
  { label: 'Les principes', id: CHARTER_SECTION_IDS.PRINCIPES },
  { label: 'Les articles', id: CHARTER_SECTION_IDS.ARTICLES },
  { label: 'Les dimensions', id: CHARTER_SECTION_IDS.DIMENSIONS },
  { label: 'Les gardiens', id: CHARTER_SECTION_IDS.GARDIENS },
  { label: 'Le serment', id: CHARTER_SECTION_IDS.SERMENT },
] as const;

/** Textes du hero. */
export const CHARTER_HERO = {
  title: 'La Charte',
  titleAccent: 'd’Offoland',
  motto: 'Le monde où l’écoute est sacrée.',
  description:
    'Une vision du monde fondée sur l’écoute, la connaissance, le respect de la vie et la transmission.',
  footerTags: ['ÉCOUTER', 'COMPRENDRE', 'TRANSMETTRE'] as const,
  footerSeparator: '◆',
} as const;

/** Textes du préambule. */
export const CHARTER_PREAMBULE = {
  eyebrow: '01 — LE PRÉAMBULE',
  title: 'Tout commence par',
  titleAccent: 'l’écoute.',
  paragraphs: [
    'Offoland repose sur un principe fondamental : l’écoute est la valeur cardinale de toute existence.',
    'Avant la parole, il y a l’écoute. Avant le jugement, il y a la compréhension. Avant l’action, il y a l’attention portée à ce qui nous entoure.',
    'Écouter, ce n’est pas simplement entendre un son. C’est accueillir une parole, reconnaître une émotion, observer un silence, comprendre une différence et chercher le sens de ce qui se manifeste.',
    'Dans l’univers d’Offoland, l’écoute est le premier chemin vers la connaissance, la sagesse et l’harmonie.',
  ],
  quote: {
    text: 'Celui qui apprend à écouter commence à comprendre. Celui qui comprend apprend à vivre en harmonie.',
    cite: 'La pensée fondamentale d’Offoland',
  },
} as const;

/** Textes de la section principes. */
export const CHARTER_PRINCIPES = {
  eyebrow: '02 — LA VALEUR CARDINALE',
  title: 'Les trois dimensions de',
  titleAccent: 'l’écoute',
  lead:
    'L’écoute se vit en soi, dans la relation aux autres et dans notre rapport au monde.',
} as const;

/** Textes de la section articles. */
export const CHARTER_ARTICLES = {
  eyebrow: '03 — LES FONDEMENTS',
  title: 'Les douze articles',
  titleAccent: 'fondamentaux',
  lead:
    'Douze principes pour guider les actes, préserver la mémoire et cultiver une harmonie consciente.',
} as const;

/** Textes de la section dimensions. */
export const CHARTER_DIMENSIONS = {
  eyebrow: '04 — LA COSMOLOGIE',
  title: 'Les Sept',
  titleAccent: 'Dimensions',
  lead:
    'Sept dimensions composent l’univers d’Offoland. Chacune possède sa voie et son sens dans la cosmologie de la Grande Bible.',
  pending: {
    note: '•••',
    name: 'Quatre dimensions',
    principle: 'À compléter selon les fondements originaux d’Offoland.',
    color: 'Correspondances à confirmer',
  },
  footnote:
    'Les correspondances présentées sont partielles. Les autres noms, couleurs, notes et principes restent à confirmer par le créateur de l’univers.',
} as const;

/** Textes de la section gardiens. */
export const CHARTER_GARDIENS = {
  eyebrow: '05 — LA TRANSMISSION',
  title: 'Les gardiens',
  titleAccent: 'd’Offoland',
  lead:
    'Être gardien, c’est faire vivre la Charte par ses actes, et non seulement par ses paroles.',
  quote:
    'La sagesse ne se mesure pas à la capacité d’imposer le silence, mais à celle de créer les conditions d’une écoute véritable.',
} as const;

/** Textes de la section serment. */
export const CHARTER_SERMENT = {
  eyebrow: '06 — L’ENGAGEMENT',
  title: 'Le serment',
  titleAccent: 'de l’écoute',
  final: 'À OFFOLAND, TOUT COMMENCE PAR L’ÉCOUTE.',
} as const;

/** Textes du footer. */
export const CHARTER_FOOTER = {
  brand: 'OFFOLAND',
  motto: 'Le monde où l’écoute est sacrée.',
  note: 'La Charte fondamentale d’Offoland · Univers de création',
  backToTop: 'Retour en haut ↑',
} as const;