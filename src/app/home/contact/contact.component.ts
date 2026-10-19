// src/app/features/contact/contact.component.ts

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';

import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { toSignal } from '@angular/core/rxjs-interop';

import { Auth, User, authState } from '@angular/fire/auth';

import { ContactForm } from 'src/app/home/models/contact.model';

import {
  MESSAGE_MAX_LENGTH,
  MESSAGE_MIN_LENGTH,
  SUBJECT_MAX_LENGTH,
  SUBJECT_MIN_LENGTH,
  SUPPORT_UID,
  SUPPORT_NAME,
} from '../constants/contact.constants';

import { MessagerieService } from '../services/messagerie.service';

/* ═════════════════════════════════════════════════════════════════════
   COMPOSANT
   ═════════════════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-contact',
  imports: [ReactiveFormsModule],
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactComponent {

  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(Auth);
  private readonly messagerie = inject(MessagerieService);

  readonly contactForm: FormGroup<ContactForm> = this.formBuilder.group<ContactForm>({
    subject: this.formBuilder.nonNullable.control(
      '',
      [
        Validators.required,
        Validators.minLength(SUBJECT_MIN_LENGTH),
        Validators.maxLength(SUBJECT_MAX_LENGTH),
      ],
    ),
    message: this.formBuilder.nonNullable.control(
      '',
      [
        Validators.required,
        Validators.minLength(MESSAGE_MIN_LENGTH),
        Validators.maxLength(MESSAGE_MAX_LENGTH),
      ],
    ),
  });

  readonly messageMaxLength = MESSAGE_MAX_LENGTH;
  readonly subjectMaxLength = SUBJECT_MAX_LENGTH;

  readonly isSubmitting = signal(false);
  readonly submitSuccess = signal(false);
  readonly submitError = signal(false);
  readonly errorMessage = signal('');

  readonly currentUser = toSignal(authState(this.auth), {
    initialValue: null as User | null,
  });

  /* ✅ Signal réactif du textarea */
  private readonly messageValue = toSignal(
    this.contactForm.controls.message.valueChanges,
    { initialValue: this.contactForm.controls.message.value },
  );

  readonly messageLength = computed(() => this.messageValue()?.length ?? 0);

  readonly isNearLimit = computed(
    () => this.messageLength() > MESSAGE_MAX_LENGTH * 0.85,
  );

  /**
   * ✅ Bouton actif en permanence SAUF pendant l'envoi
   *    (évite les doubles soumissions).
   */
  readonly isDisabled = computed(() => this.isSubmitting());

  /* ═══════════════════════════════════════════════════════
     SOUMISSION
     ═══════════════════════════════════════════════════════ */

  async onSubmit(): Promise<void> {
    if (this.isSubmitting()) return;

    this.submitSuccess.set(false);
    this.submitError.set(false);
    this.errorMessage.set('');

    /* ─── 1. Utilisateur connecté ? ─── */
    const user = this.currentUser();
    if (!user) {
      this.submitError.set(true);
      this.errorMessage.set(
        'Vous devez être connecté pour envoyer un message.',
      );
      return;
    }

    /* ─── 2. Formulaire valide ? ─── */
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      this.submitError.set(true);
      this.errorMessage.set(
        'Veuillez corriger les erreurs du formulaire avant d\'envoyer.',
      );

      /* ✅ Focus sur le premier champ invalide */
      const firstInvalid = this.getFirstInvalidField();
      if (firstInvalid) {
        const el = document.getElementById(firstInvalid);
        el?.focus();
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    /* ─── 3. Envoi ─── */
    this.isSubmitting.set(true);

    try {
      await this.messagerie.sendMessage(
        SUPPORT_UID,
        SUPPORT_NAME,
        {
          subject: this.contactForm.controls.subject.value.trim(),
          body: this.contactForm.controls.message.value.trim(),
        },
      );

      this.submitSuccess.set(true);
      this.contactForm.reset({ subject: '', message: '' });
    } catch (error: unknown) {
      this.submitError.set(true);
      this.errorMessage.set(
        'Une erreur est survenue lors de l\'envoi. Veuillez réessayer.',
      );
      console.error('Erreur Realtime Database :', error);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  /* ═══════════════════════════════════════════════════════
     HELPERS
     ═══════════════════════════════════════════════════════ */

  private getFirstInvalidField(): string | null {
    if (this.contactForm.controls.subject.invalid) return 'subject';
    if (this.contactForm.controls.message.invalid) return 'message';
    return null;
  }

  get f(): FormGroup<ContactForm>['controls'] {
    return this.contactForm.controls;
  }
}