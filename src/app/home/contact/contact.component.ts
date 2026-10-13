import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal
} from '@angular/core';

import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { toSignal } from '@angular/core/rxjs-interop';

import {
  Auth,
  User,
  authState
} from '@angular/fire/auth';

import {
  Database,
  push,
  ref
} from '@angular/fire/database';

import {
  ContactForm,
  MessageData
} from 'src/app/home/models/contact.model';

import {
  MESSAGE_MAX_LENGTH,
  MESSAGE_MIN_LENGTH,
  SUBJECT_MAX_LENGTH,
  SUBJECT_MIN_LENGTH
} from 'src/app/home/constants/contact.constants';

/* ═════════════════════════════════════════════════════════════════════
   COMPOSANT
   ═════════════════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContactComponent {

  /* ─── Injection ─── */
  private readonly formBuilder = inject(FormBuilder);
  private readonly database = inject(Database);
  private readonly auth = inject(Auth);

  /* ─── Formulaire ─── */
  readonly contactForm: FormGroup<ContactForm> = this.formBuilder.group<ContactForm>({
    subject: this.formBuilder.nonNullable.control(
      '',
      [
        Validators.required,
        Validators.minLength(SUBJECT_MIN_LENGTH),
        Validators.maxLength(SUBJECT_MAX_LENGTH)
      ]
    ),
    message: this.formBuilder.nonNullable.control(
      '',
      [
        Validators.required,
        Validators.minLength(MESSAGE_MIN_LENGTH),
        Validators.maxLength(MESSAGE_MAX_LENGTH)
      ]
    )
  });

  /* ─── Constantes exposées au template ─── */
  readonly messageMaxLength = MESSAGE_MAX_LENGTH;
  readonly subjectMaxLength = SUBJECT_MAX_LENGTH;

  /* ─── États UI ─── */
  readonly isSubmitting = signal(false);
  readonly submitSuccess = signal(false);
  readonly submitError = signal(false);
  readonly errorMessage = signal('');

  /* ─── Utilisateur courant ─── */
  readonly currentUser = toSignal(authState(this.auth), {
    initialValue: null as User | null
  });

  /* ═══════════════════════════════════════════════════════════════════
     SOUMISSION
     ═══════════════════════════════════════════════════════════════════ */

  async onSubmit(): Promise<void> {

    this.submitSuccess.set(false);
    this.submitError.set(false);
    this.errorMessage.set('');

    const user = this.currentUser();
    if (!user) {
      this.submitError.set(true);
      this.errorMessage.set(
        'Vous devez être connecté pour envoyer un message.'
      );
      return;
    }

    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    const messageData: MessageData = {
      userId: user.uid,
      userEmail: user.email ?? '',
      userName: user.displayName ?? 'Utilisateur',
      userPhoto: user.photoURL ?? '',
      subject: this.contactForm.controls.subject.value.trim(),
      message: this.contactForm.controls.message.value.trim(),
      createdAt: new Date().toISOString(),
      status: 'unread',
      to: 'admin'
    };

    try {
      const messagesRef = ref(this.database, 'messages');
      await push(messagesRef, messageData);

      this.submitSuccess.set(true);

      this.contactForm.reset({
        subject: '',
        message: ''
      });

    } catch (error: unknown) {

      this.submitError.set(true);
      this.errorMessage.set(
        'Une erreur est survenue lors de l’envoi. Veuillez réessayer.'
      );

      console.error('Erreur Realtime Database :', error);

    } finally {
      this.isSubmitting.set(false);
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     ACCÈS RAPIDE AUX CONTRÔLES
     ═══════════════════════════════════════════════════════════════════ */

  get f(): FormGroup<ContactForm>['controls'] {
    return this.contactForm.controls;
  }

  /* ═══════════════════════════════════════════════════════════════════
     HELPERS TEMPLATE — compteur de caractères
     ═══════════════════════════════════════════════════════════════════ */

  get messageLength(): number {
    return this.contactForm.controls.message.value.length;
  }
}