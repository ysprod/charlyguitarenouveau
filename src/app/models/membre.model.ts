/* ============================================================
   MODÈLE — Membre de l'équipe technique
   ============================================================ */

export interface MembreEquipe {
  /** Nom complet ou pseudonyme affiché */
  nom: string;
  /** Rôle dans le projet */
  role: string;
  /** Emoji servant d'icône */
  icone: string;
  /** Couleur d'accent (format hex) */
  couleur: string;
  /** Membre mis en avant (carte large) */
  isFeatured?: boolean;
  /** Membre anonyme (mystère) */
  anonyme?: boolean;
}