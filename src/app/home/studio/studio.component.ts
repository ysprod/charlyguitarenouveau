// src/app/studio/studio.component.ts

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';

import { Auth, authState } from '@angular/fire/auth';
import { toSignal } from '@angular/core/rxjs-interop';

import { MessagerieService } from '../services/messagerie.service';

/* ═════════════════════════════════════════════════════════════════════
   TYPES
   ═════════════════════════════════════════════════════════════════════ */

type IconKind = 'acoustic' | 'electric' | 'wave';

interface Formule {
  id: string;
  label: string;
  pistes: string;
  prix: number;
  tag?: string;
}

interface Service {
  id: string;
  title: string;
  text: string;
  icon: IconKind;
  tone: 'cyan' | 'gold';
}

/* ═════════════════════════════════════════════════════════════════════
   COMPOSANT
   ═════════════════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-studio',
  imports: [],
  templateUrl: './studio.component.html',
  styleUrl: './studio.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioComponent {

  /* ─── Injection ─── */
  private readonly auth = inject(Auth);
  private readonly messagerie = inject(MessagerieService);

  /* ─── Constante support ─── */
  private readonly SUPPORT_UID = '4gKIsx61Ief3iIvNgWgIy8PKVpm2';
  private readonly SUPPORT_NAME = 'Studio Charly Guitare';

  /* ─── État UI ─── */
  protected readonly cartCount = signal(0);
  protected readonly isSending = signal(false);

  /* ─── Utilisateur courant ─── */
  private readonly currentUser = toSignal(authState(this.auth), {
    initialValue: null,
  });

  /* ═══════════════════════════════════════════════════════════════════
     DONNÉES
     ═══════════════════════════════════════════════════════════════════ */

  protected readonly services: Service[] = [
    {
      id: 'acoustique',
      title: 'Prise de Son Acoustique',
      text: "Captation par micros d'exception, cabine traitée acoustiquement.",
      icon: 'acoustic',
      tone: 'cyan',
    },
    {
      id: 'electrique',
      title: 'Prise de Son Électrique',
      text: 'Amplis à lampes et modélisation de pointe, direction artistique.',
      icon: 'electric',
      tone: 'gold',
    },
    {
      id: 'export',
      title: 'Export WAV & Audio',
      text: 'Mélangez et exportez vos projets en haute qualité studio.',
      icon: 'wave',
      tone: 'gold',
    },
  ];

  protected readonly formules: Formule[] = [
    { id: 'capitale', label: 'Prise de Guitare', pistes: "5 pistes d'audio", prix: 50000, tag: 'Essentiel' },
    { id: 'electrique', label: 'Prise de voix', pistes: "5 pistes d'audio", prix: 30000, tag: 'Populaire' },
    { id: 'mastering', label: 'Mastering & Export WAV', pistes: '1 projet stéréo', prix: 35000, tag: 'Finalisation' },
  ];

  protected readonly creneaux: string[] = ['09h – 12h', '13h – 16h', '17h – 20h'];

  /* ═══════════════════════════════════════════════════════════════════
     SIGNAUX DU FORMULAIRE
     ═══════════════════════════════════════════════════════════════════ */

  protected readonly formuleId = signal(this.formules[1].id);
  protected readonly date = signal('');
  protected readonly creneau = signal(this.creneaux[0]);
  protected readonly contact = signal('');
  protected readonly confirmation = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly contactError = signal<string | null>(null);

  protected readonly today = new Date().toISOString().slice(0, 10);

  /* ═══════════════════════════════════════════════════════════════════
     COMPUTED
     ═══════════════════════════════════════════════════════════════════ */

  protected readonly formule = computed(
    () => this.formules.find((f) => f.id === this.formuleId()) ?? this.formules[0],
  );

  protected readonly prixAffiche = computed(
    () =>
      new Intl.NumberFormat('fr-FR')
        .format(this.formule().prix)
        .replace(/ /g, ' ') + ' FCFA',
  );

  protected readonly valide = computed(
    () =>
      this.date() !== '' &&
      this.date() >= this.today &&
      this.isContactValid(this.contact()),
  );

  /* ═══════════════════════════════════════════════════════════════════
     VALIDATION CONTACT
     ═══════════════════════════════════════════════════════════════════ */

  /**
   * ✅ Accepte soit un email valide, soit un numéro de téléphone (10+ chiffres).
   */
  protected  isContactValid(value: string): boolean {
    const trimmed = value.trim();
    if (!trimmed) return false;

    // Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(trimmed)) return true;

    // Téléphone (chiffres, espaces, +, -, parenthèses) — au moins 8 chiffres
    const phoneRegex = /^[\d\s+\-()]{8,}$/;
    if (phoneRegex.test(trimmed)) {
      const digits = trimmed.replace(/\D/g, '');
      if (digits.length >= 8) return true;
    }

    return false;
  }

  /* ═══════════════════════════════════════════════════════════════════
     HANDLERS
     ═══════════════════════════════════════════════════════════════════ */

  protected onFormule(event: Event): void {
    this.formuleId.set((event.target as HTMLSelectElement).value);
    this.confirmation.set(null);
    this.errorMessage.set(null);
  }

  protected onDate(event: Event): void {
    this.date.set((event.target as HTMLInputElement).value);
    this.confirmation.set(null);
    this.errorMessage.set(null);
  }

  protected onCreneau(event: Event): void {
    this.creneau.set((event.target as HTMLSelectElement).value);
    this.confirmation.set(null);
    this.errorMessage.set(null);
  }

  protected onContact(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.contact.set(value);
    this.confirmation.set(null);
    this.errorMessage.set(null);

    /* ✅ Validation en temps réel (seulement si non vide) */
    if (value.trim() && !this.isContactValid(value)) {
      this.contactError.set('Entrez un email ou un numéro valide.');
    } else {
      this.contactError.set(null);
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     RÉSERVATION → ENVOI AU SUPPORT
     ═══════════════════════════════════════════════════════════════════ */

  protected async reserver(): Promise<void> {
    if (this.isSending()) return;

    this.confirmation.set(null);
    this.errorMessage.set(null);
    this.contactError.set(null);

    if (!this.valide()) {
      if (!this.isContactValid(this.contact())) {
        this.contactError.set('Entrez un email ou un numéro valide.');
      }
      return;
    }

    const user = this.currentUser();
    if (!user?.uid) {
      this.errorMessage.set(
        'Vous devez être connecté pour réserver une session.',
      );
      return;
    }

    this.isSending.set(true);

    try {
      const [y, m, d] = this.date().split('-');
      const dateFormatted = `${d}/${m}/${y}`;
      const contactTrimmed = this.contact().trim();

      /* ✅ Construction du message */
      const subject = `Réservation du studio — UID: ${user.uid}`;

      const body = [
        `🎸 Nouvelle demande de réservation studio`,
        ``,
        `👤 Utilisateur : ${user.displayName ?? user.email ?? 'Inconnu'}`,
        `📧 Email du compte : ${user.email ?? '—'}`,
        `📞 Contact fourni : ${contactTrimmed}`,
        `🆔 UID : ${user.uid}`,
        ``,
        `📋 Formule : ${this.formule().label}`,
        `🎼 Contenu : ${this.formule().pistes}`,
        `💰 Tarif : ${this.prixAffiche()}`,
        `📅 Date souhaitée : ${dateFormatted}`,
        `⏰ Créneau : ${this.creneau()}`,
        ``,
        `Message envoyé depuis le formulaire de réservation studio.`,
      ].join('\n');

      /* ✅ Envoi via MessagerieService */
      await this.messagerie.sendMessage(
        this.SUPPORT_UID,
        this.SUPPORT_NAME,
        { subject, body },
      );

      /* ✅ Confirmation locale */
      this.confirmation.set(
        `Session « ${this.formule().label} » demandée le ${dateFormatted}, créneau ${this.creneau()} — ${this.prixAffiche()}. Le support a été notifié.`,
      );

      /* ✅ Incrément du "panier" pour feedback visuel */
      this.cartCount.update((n) => n + 1);

      /* ✅ Reset du champ contact après succès */
      this.contact.set('');
    } catch (error) {
      console.error('[Studio] Erreur envoi réservation :', error);
      this.errorMessage.set(
        'Impossible d\'envoyer la demande. Veuillez réessayer.',
      );
    } finally {
      this.isSending.set(false);
    }
  }
}