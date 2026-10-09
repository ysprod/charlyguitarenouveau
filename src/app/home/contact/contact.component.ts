import {
  Component,
  OnDestroy,
  OnInit,
  inject
} from '@angular/core';

import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

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
  CommonModule
} from '@angular/common';

import {
  Observable,
  Subject,
  firstValueFrom
} from 'rxjs';

import {
  takeUntil
} from 'rxjs/operators';

interface ContactForm {
  subject: FormControl<string>;
  message: FormControl<string>;
}

interface MessageData {
  userId: string;
  userEmail: string;
  userName: string;
  userPhoto: string;
  subject: string;
  message: string;
  createdAt: string;
  status: 'unread';
}

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.css']
})
export class ContactComponent implements OnInit, OnDestroy {

  private readonly formBuilder = inject(FormBuilder);
  private readonly database = inject(Database);
  private readonly auth = inject(Auth);

  private readonly destroy$ = new Subject<void>();

  contactForm!: FormGroup<ContactForm>;

  isSubmitting = false;
  submitSuccess = false;
  submitError = false;
  errorMessage = '';

  currentUser: User | null = null;
  authLoading = true;

  ngOnInit(): void {
    window.scrollTo({
      top: 0,
      behavior: 'auto'
    });

    this.initForm();
    this.checkCurrentUser();
  }

  /**
   * Initialise le formulaire de contact.
   */
  private initForm(): void {
    this.contactForm = this.formBuilder.group<ContactForm>({
      subject: this.formBuilder.nonNullable.control(
        '',
        [
          Validators.required,
          Validators.minLength(3)
        ]
      ),

      message: this.formBuilder.nonNullable.control(
        '',
        [
          Validators.required,
          Validators.minLength(10)
        ]
      )
    });
  }

  /**
   * Surveille l'état d'authentification Firebase.
   */
  private checkCurrentUser(): void {
    authState(this.auth)
      .pipe(
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (user: User | null) => {
          this.currentUser = user;
          this.authLoading = false;
        },

        error: (error: unknown) => {
          console.error(
            'Erreur lors de la récupération de l’utilisateur :',
            error
          );

          this.currentUser = null;
          this.authLoading = false;
        }
      });
  }

  /**
   * Envoie le message dans Firebase Realtime Database.
   */
  async onSubmit(): Promise<void> {

    this.submitSuccess = false;
    this.submitError = false;
    this.errorMessage = '';

    if (this.authLoading) {
      this.submitError = true;
      this.errorMessage =
        'Veuillez patienter pendant la vérification de votre connexion.';
      return;
    }

    if (!this.currentUser) {
      this.submitError = true;
      this.errorMessage =
        'Vous devez être connecté pour envoyer un message.';
      return;
    }

    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;

    const user = this.currentUser;

    const messageData: MessageData = {
      userId: user.uid,
      userEmail: user.email ?? '',
      userName: user.displayName ?? 'Utilisateur',
      userPhoto: user.photoURL ?? '',
      subject: this.contactForm.controls.subject.value.trim(),
      message: this.contactForm.controls.message.value.trim(),
      createdAt: new Date().toISOString(),
      status: 'unread'
    };

    try {
      const messagesRef = ref(this.database, 'messages');

      await push(messagesRef, messageData);

      this.submitSuccess = true;

      this.contactForm.reset({
        subject: '',
        message: ''
      });

    } catch (error: unknown) {

      this.submitError = true;

      this.errorMessage =
        'Une erreur est survenue lors de l’envoi. Veuillez réessayer.';

      console.error(
        'Erreur Realtime Database :',
        error
      );

    } finally {
      this.isSubmitting = false;
    }
  }

  /**
   * Accès pratique aux contrôles du formulaire
   * depuis le template HTML.
   */
  get f(): FormGroup<ContactForm>['controls'] {
    return this.contactForm.controls;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
