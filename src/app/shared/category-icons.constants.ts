// src/app/shared/category-icons.constants.ts

import { InboxCategory } from "../models/homeconnect.model";
import { MessageCategory } from "../models/user-message.model";

 

/**
 * Union de TOUTES les catégories possibles dans l'application.
 * Permet d'indexer sans conflit de types.
 */
export type AnyCategory = MessageCategory | InboxCategory;

/**
 * Icônes par catégorie.
 * Typage `Record<string, string>` pour accepter n'importe quelle clé
 * sans lever d'erreur d'indexation.
 */
export const CATEGORY_ICON: Readonly<Record<string, string>> = {
  // Catégories UserMessage (messagerie)
  technique: '🛠️',
  abonnement: '💳',
  contenu: '🎬',
  autre: '💬',

  // Catégories InboxMessage (accueil)
  academie: '📚',
  evenement: '📅',
  systeme: '⚙️',
} as const;

/**
 * Retourne l'icône associée à une catégorie.
 * Fallback sur 💬 si la catégorie est inconnue ou indéfinie.
 */
export function getCategoryIcon(category: string | undefined | null): string {
  if (!category) return CATEGORY_ICON['autre'];
  return CATEGORY_ICON[category] ?? CATEGORY_ICON['autre'];
}