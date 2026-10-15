import { DocumentItem } from 'src/app/academie/models/document.model';
import { SortOption } from 'src/app/academie/models/documents-ui.model';

/* ═════════════════════════════════════════════════════════════════════
   DOCUMENTS — Utilitaires purs
   ═════════════════════════════════════════════════════════════════════ */

/**
 * Vérifie si un document appartient à une catégorie donnée.
 * Basé sur une correspondance souple de `doc.type`.
 */
export function matchesCategory(doc: DocumentItem, category: string): boolean {
  const type = doc.type?.toLowerCase().trim() ?? '';

  switch (category) {
    case 'Méthodes':
      return type.includes('méthode');
    case 'Livres numériques':
      return type.includes('livre');
    case 'Partitions':
      return type.includes('partition');
    case 'Supports pédagogiques':
      return type.includes('support');
    default:
      return true;
  }
}

/**
 * Trie une liste de documents selon le mode demandé.
 * Retourne **une nouvelle liste** (immutabilité).
 */
export function sortDocuments(
  docs: DocumentItem[],
  sort: SortOption
): DocumentItem[] {
  const copy = [...docs];

  switch (sort) {
    case 'price-asc':
      return copy.sort((a, b) => (a.price || 0) - (b.price || 0));

    case 'price-desc':
      return copy.sort((a, b) => (b.price || 0) - (a.price || 0));

    case 'popular':
      return copy.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));

    case 'recent':
    default:
      return copy.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });
  }
}

/**
 * Formate un prix en FCFA.
 * - 0 ou `undefined` → « 0 FCFA »
 * - Sinon → « 12 500 FCFA »
 */
export function formatPrice(price: number | undefined | null): string {
  if (!price || price === 0) return '0 FCFA';
  return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
}