// src/app/homeconnect/homeconnect.constants.ts

import { QuickAction, ColorUniverse, InboxMessage, InboxFilter, Testimonial, WhyPillar } from "../homeconnect.model";

 

/* ═══════════════════════════════════════════════════════
   ACTIONS RAPIDES
   ═══════════════════════════════════════════════════════ */

export const QUICK_ACTIONS: readonly QuickAction[] = [
  { label: 'Jouer', icon: '🎮', route: '/play', description: 'Accéder à tous les jeux', color: 'primary' },
  { label: 'Documents', icon: '📚', route: '/academie', description: 'Méthodes, partitions, livres', color: 'gold' },
  { label: 'Nos offres', icon: '👑', route: '/abonnement', description: 'Packs pédagogiques', color: 'success' },
  { label: 'Live', icon: '📺', route: '/live', description: 'Sessions interactives', color: 'danger' },
  { label: 'Mon profil', icon: '👤', route: '/profil', description: 'Gérer mon compte', color: 'violet' },
];

/* ═══════════════════════════════════════════════════════
   UNIVERS COULEURS — 7 DIMENSIONS
   ═══════════════════════════════════════════════════════ */

export const COLOR_UNIVERSES: readonly ColorUniverse[] = [
  { name: 'Blanc', route: '/blanc', emoji: '⚪', color: '#e2e8f0', description: 'Pureté' },
  { name: 'Bleu', route: '/bleu', emoji: '🔵', color: '#2563eb', description: 'Sérénité' },
  { name: 'Vert', route: '/vert', emoji: '🟢', color: '#16a34a', description: 'Nature' },
  { name: 'Rouge', route: '/rouge', emoji: '🔴', color: '#dc2626', description: 'Passion' },
  { name: 'Noir', route: '/noir', emoji: '⚫', color: '#0f172a', description: 'Mystère' },
  { name: 'Violet', route: '/violet', emoji: '🟣', color: '#7c3aed', description: 'Créativité' },
  { name: 'Pourpre', route: '/pourpre', emoji: '🟪', color: '#be185d', description: 'Royauté' },
];

/* ═══════════════════════════════════════════════════════
   MESSAGES — Données mockées (à remplacer par Firebase)
   ═══════════════════════════════════════════════════════
   ⚠️ PLUS de `as const` : on veut un tableau MUTABLE
   pour pouvoir le passer à des fonctions qui attendent
   InboxMessage[] (ex. sortByRecent, filterMessages).
   ═══════════════════════════════════════════════════════ */

export const MOCK_INBOX_MESSAGES: InboxMessage[] = [
  {
    id: 'msg-1',
    from: 'Charly Guitare',
    fromRole: 'admin',
    avatarEmoji: '🎸',
    subject: 'Bienvenue dans l’Académie Offolomou',
    preview: 'Ravi de t’accueillir dans l’écosystème. Voici par où commencer pour progresser rapidement…',
    body: `Ravi de t’accueillir dans l’écosystème Offolomou.

Pour bien démarrer :
1. Choisis ton premier univers de couleur
2. Termine la leçon d’introduction
3. Rejoins le prochain live hebdomadaire

À très vite sur les cordes.`,
    receivedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    isUnread: true,
    isStarred: true,
    category: 'academie',
  },
  {
    id: 'msg-2',
    from: 'Support Offolomou',
    fromRole: 'support',
    avatarEmoji: '🛠️',
    subject: 'Votre abonnement Premium est actif',
    preview: 'Merci pour votre confiance. Votre accès Premium est désormais actif jusqu’au…',
    body: `Bonjour,

Votre abonnement Premium a bien été activé.
Vous avez maintenant accès à :
• Toutes les masterclass
• Les partitions téléchargeables
• Le suivi personnalisé

Merci pour votre confiance.`,
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    isUnread: true,
    isStarred: false,
    category: 'abonnement',
  },
  {
    id: 'msg-3',
    from: 'Sarah M.',
    fromRole: 'student',
    avatarEmoji: '🎵',
    subject: 'Question sur l’exercice des arpèges',
    preview: 'Salut ! Je bloque sur l’exercice 3 du module Guitare Rythmique, tu peux m’aider ?',
    body: `Salut !

Je bloque sur l’exercice 3 du module "Guitare Rythmique".
Est-ce que tu aurais une astuce pour mieux sentir le ternaire ?

Merci d’avance 🙏`,
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    isUnread: false,
    isStarred: false,
    category: 'contenu',
  },
  {
    id: 'msg-4',
    from: 'Charly Guitare',
    fromRole: 'admin',
    avatarEmoji: '🎸',
    subject: 'Ton premier live : vendredi 20h',
    preview: 'Note bien la date ! Vendredi 20h, on décortique ensemble la Mélodie des Origines…',
    body: `Note bien la date dans ton agenda :

📅 Vendredi 20h — Live "La Mélodie des Origines"
On décortique ensemble les 4 accords, le rythme en 4/4 et la croche ternaire.

Prépare ta guitare, ça va vibrer.`,
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    isUnread: false,
    isStarred: true,
    category: 'evenement',
  },
  {
    id: 'msg-5',
    from: 'Système Offolomou',
    fromRole: 'system',
    avatarEmoji: '⚙️',
    subject: 'Votre progression hebdomadaire',
    preview: 'Vous avez complété 4 leçons cette semaine. Bravo, continuez sur cette lancée !',
    body: `Résumé de votre semaine :

✅ 4 leçons complétées
🎯 2 exercices parfaits
⏱️ 2h15 de pratique
🏆 Série de 7 jours consécutifs

Continuez comme ça !`,
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    isUnread: false,
    isStarred: false,
    category: 'systeme',
  },
];

/* ═══════════════════════════════════════════════════════
   FILTRES DE LA BOÎTE DE RÉCEPTION
   ═══════════════════════════════════════════════════════ */

export const INBOX_FILTERS: readonly {
  value: InboxFilter;
  label: string;
  icon: string;
}[] = [
  { value: 'all', label: 'Tous', icon: '📥' },
  { value: 'unread', label: 'Non lus', icon: '✉️' },
  { value: 'starred', label: 'Suivis', icon: '⭐' },
  { value: 'academie', label: 'Académie', icon: '📚' },
  { value: 'abonnement', label: 'Abonnement', icon: '💳' },
];

/* ═══════════════════════════════════════════════════════
   ICÔNES PAR CATÉGORIE
   ═══════════════════════════════════════════════════════ */

export const CATEGORY_ICON: Readonly<Record<string, string>> = {
  academie: '📚',
  abonnement: '💳',
  contenu: '🎬',
  evenement: '📅',
  systeme: '⚙️',
  autre: '💬',
};

/* ═══════════════════════════════════════════════════════
   CONTRAINTES UI
   ═══════════════════════════════════════════════════════ */

export const INBOX_PAGE_SIZE = 3;
export const INBOX_PREVIEW_MAX_LENGTH = 140; 

export const WHY_PILLARS: readonly WhyPillar[] = [
  {
    icon: '🎯',
    title: 'Méthode éprouvée',
    description:
      "Un parcours progressif, structuré par niveaux, pensé par Charly Guitare lui-même."
  },
  {
    icon: '🎮',
    title: 'Apprendre en jouant',
    description:
      "Des jeux interactifs qui transforment chaque exercice en défi ludique et mémorable."
  },
  {
    icon: '🚀',
    title: 'Communauté active',
    description:
      "Masterclass, lives, entraide : progressez entouré de passionnés, pas seul face à votre écran."
  }
];

/* ═════════════════════════════════════════════════════════════════════
   TÉMOIGNAGES
   ═════════════════════════════════════════════════════════════════════ */

export const TESTIMONIALS: readonly Testimonial[] = [
  {
    quote:
      "En 6 mois, j'ai progressé plus qu'en 3 ans seul avec YouTube. La méthode est claire et motivante.",
    avatar: '🎸',
    author: 'Sarah M.',
    role: 'Élève depuis 2026'
  },
  {
    quote:
      "Les jeux pédagogiques sont géniaux. On apprend sans s'en rendre compte, c'est addictif !",
    avatar: '🎵',
    author: 'Thomas L.',
    role: 'Membre Premium'
  },
  {
    quote:
      "Enfin une plateforme complète : cours, lives, suivi. Charly a créé une vraie école numérique.",
    avatar: '🎼',
    author: 'Amina K.',
    role: 'Élève depuis 2026'
  }
];