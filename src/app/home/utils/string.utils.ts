/**
 * Retourne les initiales d'un nom (max 2 caractères).
 *
 * Priorité :
 *  1. `primary` (ex: displayName)
 *  2. `fallback` (ex: email)
 *  3. `defaultInitials` si tout est vide
 */
export function getInitials(
  primary: string | null | undefined,
  fallback: string | null | undefined = '',
  defaultInitials = 'O'
): string {
  const source = (primary?.trim() || fallback?.trim() || '').trim();

  if (!source) return defaultInitials;

  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return parts[0].substring(0, 2).toUpperCase();
}