// src/app/features/contact/contact.component.ts

import {
  ChangeDetectionStrategy,
  Component,
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

import {
  ContactForm,
} from 'src/app/home/models/contact.model';

import {
  MESSAGE_MAX_LENGTH,
  MESSAGE_MIN_LENGTH,
  SUBJECT_MAX_LENGTH,
  SUBJECT_MIN_LENGTH,
  SUPPORT_UID,
  SUPPORT_NAME,
} from '../constants/contact.constants';
import { MessagerieService } from '../services/messagerie.service';
 
 
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

  async onSubmit(): Promise<void> {
    this.submitSuccess.set(false);
    this.submitError.set(false);
    this.errorMessage.set('');

    const user = this.currentUser();
    if (!user) {
      this.submitError.set(true);
      this.errorMessage.set('Vous devez être connecté pour envoyer un message.');
      return;
    }

    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }

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
        'Une erreur est survenue lors de l’envoi. Veuillez réessayer.',
      );
      console.error('Erreur Realtime Database :', error);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  get f(): FormGroup<ContactForm>['controls'] {
    return this.contactForm.controls;
  }

  get messageLength(): number {
    return this.contactForm.controls.message.value.length;
  }
}