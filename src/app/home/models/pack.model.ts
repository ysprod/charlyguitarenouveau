/* ============================================================
   TYPES & INTERFACES — Packs pédagogiques
   ============================================================ */

export type PackCategoryId = 'debutant' | 'intermediaire' | 'solo' | 'chansons';
export type PackBadgeColor = 'blue' | 'green' | 'gold';

export interface Pack {
    id: string;
    category: PackCategoryId;
    badge?: string;
    badgeColor?: PackBadgeColor;
    name: string;
    price: number;
    priceUnit: string;
    session: string;
    duration: string;
    features: string[];
    highlight?: boolean;
    premium?: boolean;
}

export interface PackCategory {
    id: PackCategoryId;
    title: string;
    subtitle: string;
    objective: string;
    icon: string;
    accentColor: string;
    image: string;
    packs: Pack[];
}