import {
  Component,
  EnvironmentInjector,
  OnDestroy,
  OnInit,
  inject,
  runInInjectionContext
} from '@angular/core';

import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';

import {
  Auth,
  EmailAuthProvider,
  User,
  user,
  reauthenticateWithCredential,
  updateEmail,
  updatePassword,
  updateProfile
} from '@angular/fire/auth';

import {
  Database,
  objectVal,
  ref,
  set
} from '@angular/fire/database';

import {
  Storage,
  getDownloadURL,
  ref as storageRef,
  uploadBytes
} from '@angular/fire/storage';

import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { CommonModule } from '@angular/common';

import { Router } from '@angular/router';

import { Observable, Subject, of } from 'rxjs';
import { map, switchMap, takeUntil } from 'rxjs/operators';


export interface UserProfile {
  uid: string;
  email: string;
  fullName?: string;
  displayName?: string;
  phone?: string;
  photoURL?: string;
  role?: 'admin' | 'user' | 'subscriber';
  updatedAt?: number;
  createdAt?: number;
}

interface ProfileFormControls {
  fullName: FormControl<string>;
  email: FormControl<string>;
  phone: FormControl<string>;
  currentPassword: FormControl<string>;
  newPassword: FormControl<string>;
  confirmPassword: FormControl<string>;
}

type UserRole = 'admin' | 'user' | 'subscriber';

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrateur',
  user: 'Utilisateur',
  subscriber: 'Abonné'
};

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const PHONE_PATTERN = /^\+?[0-9\s\-()]{8,20}$/;

const FIREBASE_ERROR_MESSAGES: Record<string, string> = {
  'auth/wrong-password': 'Mot de passe actuel incorrect.',
  'auth/invalid-credential': 'Mot de passe actuel incorrect.',
  'auth/requires-recent-login': 'Veuillez vous reconnecter avant de poursuivre.',
  'auth/email-already-in-use': 'Cet email est déjà utilisé.',
  'auth/invalid-email': 'Email invalide.',
  'auth/weak-password': 'Mot de passe trop faible.',
  'auth/network-request-failed': 'Problème de connexion réseau.',
  'storage/unauthorized': "Vous n'êtes pas autorisé à modifier cette photo.",
  'storage/canceled': "L'envoi de la photo a été annulé.",
  'storage/quota-exceeded': 'La capacité de stockage est dépassée.'
};


@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatSnackBarModule],
  templateUrl: './profil.component.html',
  styleUrls: ['./profil.component.scss']
})
export class ProfilComponent implements OnInit, OnDestroy {

  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(Auth);
  private readonly database = inject(Database);
  private readonly storage = inject(Storage);
  private readonly snackBar = inject(MatSnackBar);
  private readonly environmentInjector = inject(EnvironmentInjector);
  private readonly router = inject(Router);

  private readonly destroy$ = new Subject<void>();

  profileForm!: FormGroup<ProfileFormControls>;
  currentUser$: Observable<User | null>;

  selectedFile: File | null = null;
  avatarPreview: string | null = null;
  isSubmitting = false;
  isDragging = false;

  userRole: UserRole = 'user';
  userCreatedAt?: number;

  private currentUid: string | null = null;
  private cachedProfile: Partial<UserProfile> = {};

  constructor() {
    this.currentUser$ = runInInjectionContext(
      this.environmentInjector,
      () => user(this.auth)
    );
  }

  // =========================================================
  // CYCLE DE VIE
  // =========================================================

  ngOnInit(): void {
    this.initForm();
    this.loadUserProfile();
    this.redirectIfLoggedOut();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // =========================================================
  // REDIRECTION SI DÉCONNECTÉ
  // =========================================================

  private redirectIfLoggedOut(): void {
    this.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe((currentUser) => {
        if (!currentUser) {
          this.router.navigate(['/login'], {
            queryParams: { returnUrl: '/profil' },
            replaceUrl: true
          });
        }
      });
  }

  // =========================================================
  // FORMULAIRE
  // =========================================================

  private initForm(): void {
    this.profileForm = this.formBuilder.group<ProfileFormControls>(
      {
        fullName: this.formBuilder.nonNullable.control('', [
          Validators.required,
          Validators.minLength(2)
        ]),
        email: this.formBuilder.nonNullable.control('', [
          Validators.required,
          Validators.email
        ]),
        phone: this.formBuilder.nonNullable.control('', [
          Validators.pattern(PHONE_PATTERN)
        ]),
        currentPassword: this.formBuilder.nonNullable.control(''),
        newPassword: this.formBuilder.nonNullable.control('', [
          Validators.minLength(8)
        ]),
        confirmPassword: this.formBuilder.nonNullable.control('')
      },
      { validators: this.passwordMatchValidator }
    );

    // Le mot de passe actuel devient obligatoire si un nouveau est saisi
    this.profileForm.controls.newPassword.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((newPassword) => {
        const control = this.profileForm.controls.currentPassword;
        control.setValidators(
          newPassword.trim().length > 0 ? [Validators.required] : []
        );
        control.updateValueAndValidity({ emitEvent: false });
      });
  }

  private passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const newPassword = group.get('newPassword')?.value as string | undefined;
    const confirmPassword = group.get('confirmPassword')?.value as string | undefined;

    if (newPassword && newPassword !== confirmPassword) {
      return { passwordMismatch: true };
    }
    return null;
  }

  // =========================================================
  // CHARGEMENT DU PROFIL
  // =========================================================

  private loadUserProfile(): void {
    this.currentUser$
      .pipe(
        switchMap((currentUser) => {
          if (!currentUser) {
            this.resetLocalState();
            return of(null);
          }

          this.currentUid = currentUser.uid;
          this.avatarPreview = currentUser.photoURL ?? null;

          const profileReference = ref(this.database, `users/${currentUser.uid}`);

          return runInInjectionContext(
            this.environmentInjector,
            () => objectVal<UserProfile>(profileReference)
          ).pipe(
            map((profileData) => ({ currentUser, profileData }))
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (result) => {
          if (!result) return;

          const { currentUser, profileData } = result;

          if (profileData) {
            this.cachedProfile = profileData;
            this.userRole = profileData.role ?? 'user';
            this.userCreatedAt = profileData.createdAt;

            this.profileForm.patchValue({
              fullName:
                profileData.fullName ??
                profileData.displayName ??
                currentUser.displayName ??
                '',
              email: profileData.email ?? currentUser.email ?? '',
              phone: profileData.phone ?? ''
            });

            this.avatarPreview =
              profileData.photoURL ?? currentUser.photoURL ?? null;
          } else {
            this.cachedProfile = {};
            this.userRole = 'user';
            this.userCreatedAt = undefined;

            this.profileForm.patchValue({
              email: currentUser.email ?? '',
              fullName: currentUser.displayName ?? '',
              phone: ''
            });
          }
        },
        error: (error) => {
          console.error('Erreur lors du chargement du profil :', error);
          this.showToast('✕ Impossible de charger votre profil.', 'error');
        }
      });
  }

  private resetLocalState(): void {
    this.currentUid = null;
    this.cachedProfile = {};
    this.userRole = 'user';
    this.userCreatedAt = undefined;
    this.avatarPreview = null;
  }

  // =========================================================
  // VALIDATION DES CHAMPS
  // =========================================================

  isFieldInvalid(fieldName: keyof ProfileFormControls): boolean {
    const field = this.profileForm.controls[fieldName];

    const formHasPasswordMismatch =
      fieldName === 'confirmPassword' &&
      this.profileForm.hasError('passwordMismatch');

    return (
      (field.invalid || formHasPasswordMismatch) &&
      (field.dirty || field.touched)
    );
  }

  getFieldError(fieldName: keyof ProfileFormControls): string {
    const field = this.profileForm.controls[fieldName];

    if (
      fieldName === 'confirmPassword' &&
      this.profileForm.hasError('passwordMismatch')
    ) {
      return 'Les mots de passe ne correspondent pas.';
    }

    if (!field.errors) return '';
    if (field.hasError('required')) return 'Ce champ est obligatoire.';
    if (field.hasError('email')) return "Format d'email invalide.";

    if (field.hasError('minlength')) {
      const { requiredLength } = field.getError('minlength') as {
        requiredLength: number;
      };
      return `Minimum ${requiredLength} caractères.`;
    }

    if (field.hasError('pattern')) return 'Format invalide.';

    return 'Champ invalide.';
  }

  // =========================================================
  // AVATAR
  // =========================================================

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.processAvatarFile(file);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    const file = event.dataTransfer?.files?.[0];
    if (file) this.processAvatarFile(file);
  }

  private processAvatarFile(file: File): void {
    if (!file.type.startsWith('image/')) {
      this.showToast('✕ Seules les images sont acceptées.', 'error');
      return;
    }

    if (file.size > MAX_AVATAR_SIZE) {
      this.showToast("✕ L'image ne doit pas dépasser 2 Mo.", 'error');
      return;
    }

    this.selectedFile = file;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        this.avatarPreview = reader.result;
      }
    };
    reader.onerror = () => {
      this.showToast("✕ Impossible de lire l'image.", 'error');
    };
    reader.readAsDataURL(file);
  }

  triggerFileInput(): void {
    document.getElementById('avatar-input')?.click();
  }

  removeAvatar(): void {
    this.selectedFile = null;
    this.avatarPreview = null;
    this.showToast("✓ Photo retirée. N'oubliez pas d'enregistrer.", 'success');
  }

  // =========================================================
  // SOUMISSION
  // =========================================================

  async onSubmit(): Promise<void> {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.showToast('✕ Veuillez corriger les erreurs du formulaire.', 'error');
      return;
    }

    const currentUser = this.auth.currentUser;
    if (!currentUser || !this.currentUid) {
      this.showToast('✕ Utilisateur non authentifié.', 'error');
      return;
    }

    this.isSubmitting = true;

    const { fullName, email, phone, currentPassword, newPassword } =
      this.profileForm.getRawValue();

    try {
      const normalizedEmail = email.trim();
      const normalizedFullName = fullName.trim();
      const normalizedPhone = phone.trim();

      const emailChanged = normalizedEmail !== (currentUser.email ?? '');
      const passwordChanged = newPassword.trim().length > 0;

      // Réauthentification si nécessaire
      if (emailChanged || passwordChanged) {
        if (!currentPassword.trim()) {
          this.showToast('✕ Votre mot de passe actuel est requis.', 'error');
          return;
        }
        if (!currentUser.email) {
          throw new Error("Impossible de récupérer l'email du compte.");
        }

        const credential = EmailAuthProvider.credential(
          currentUser.email,
          currentPassword
        );

        await this.runInContext(() =>
          reauthenticateWithCredential(currentUser, credential)
        );
      }

      // Upload avatar
      let photoURL = this.avatarPreview ?? currentUser.photoURL ?? '';

      if (this.selectedFile) {
        const avatarReference = this.runInContext(() =>
          storageRef(this.storage, `avatars/${this.currentUid}`)
        );

        await this.runInContext(() =>
          uploadBytes(avatarReference, this.selectedFile as File)
        );

        photoURL = await this.runInContext(() =>
          getDownloadURL(avatarReference)
        );
      }

      // Firebase Auth
      if (emailChanged) {
        await this.runInContext(() => updateEmail(currentUser, normalizedEmail));
      }

      if (passwordChanged) {
        await this.runInContext(() => updatePassword(currentUser, newPassword));
      }

      const displayNameChanged =
        normalizedFullName !== (currentUser.displayName ?? '');
      const photoChanged = photoURL !== (currentUser.photoURL ?? '');

      if (displayNameChanged || photoChanged) {
        await this.runInContext(() =>
          updateProfile(currentUser, {
            displayName: normalizedFullName,
            photoURL: photoURL || null
          })
        );
      }

      // Realtime Database
      const updatedProfile: UserProfile = {
        ...this.cachedProfile,
        uid: this.currentUid,
        email: normalizedEmail,
        fullName: normalizedFullName,
        displayName: normalizedFullName,
        phone: normalizedPhone,
        photoURL,
        updatedAt: Date.now()
      };

      await this.runInContext(() =>
        set(ref(this.database, `users/${this.currentUid}`), updatedProfile)
      );

      // Reset champs sensibles
      this.profileForm.patchValue({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      this.profileForm.markAsPristine();
      this.profileForm.markAsUntouched();

      this.selectedFile = null;
      this.cachedProfile = updatedProfile;
      this.userRole = updatedProfile.role ?? 'user';
      this.userCreatedAt = updatedProfile.createdAt;
      this.avatarPreview = updatedProfile.photoURL ?? null;

      this.showToast('✓ Profil mis à jour avec succès !', 'success');

    } catch (error) {
      console.error('Erreur profil :', error);

      const { code } = this.getFirebaseError(error);
      const errorMessage =
        (code && FIREBASE_ERROR_MESSAGES[code]) ??
        'Erreur lors de la mise à jour.';

      this.showToast(`✕ ${errorMessage}`, 'error');
    } finally {
      this.isSubmitting = false;
    }
  }

  // =========================================================
  // RESET
  // =========================================================

  onReset(): void {
    const currentUser = this.auth.currentUser;

    this.selectedFile = null;
    this.avatarPreview = currentUser?.photoURL ?? null;

    this.profileForm.reset({
      fullName:
        this.cachedProfile.fullName ??
        this.cachedProfile.displayName ??
        currentUser?.displayName ??
        '',
      email: this.cachedProfile.email ?? currentUser?.email ?? '',
      phone: this.cachedProfile.phone ?? '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });

    this.profileForm.markAsPristine();
    this.profileForm.markAsUntouched();

    this.showToast('✓ Formulaire réinitialisé.', 'success');
  }

  // =========================================================
  // HELPERS
  // =========================================================

  getInitials(): string {
    const name = this.profileForm.controls.fullName.value;
    if (!name.trim()) return '?';

    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }

    return (
      parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  }

  getRoleLabel(): string {
    return ROLE_LABELS[this.userRole] ?? 'Utilisateur';
  }

  formatMemberSince(): string {
    if (!this.userCreatedAt) return 'Récemment';

    return new Date(this.userCreatedAt).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long'
    });
  }

  // =========================================================
  // UTILITAIRES PRIVÉS
  // =========================================================

  /** Enveloppe un appel Firebase dans le contexte d'injection Angular. */
  private runInContext<T>(fn: () => T): T {
    return runInInjectionContext(this.environmentInjector, fn);
  }

  private getFirebaseError(error: unknown): { code?: string; message?: string } {
    if (typeof error === 'object' && error !== null) {
      const { code, message } = error as { code?: unknown; message?: unknown };
      return {
        code: typeof code === 'string' ? code : undefined,
        message: typeof message === 'string' ? message : undefined
      };
    }
    return {};
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    this.snackBar.open(message, 'Fermer', {
      duration: 4000,
      panelClass: type === 'success' ? ['snack-success'] : ['snack-error']
    });
  }
}