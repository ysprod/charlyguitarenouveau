 
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  EnvironmentInjector,
  afterNextRender,
  computed,
  inject,
  runInInjectionContext,
  signal,
  viewChild,
} from '@angular/core';

import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import {
  Auth,
  EmailAuthProvider,
  User,
  authState,
  reauthenticateWithCredential,
  updateEmail,
  updatePassword,
  updateProfile,
} from '@angular/fire/auth';

import {
  Database,
  objectVal,
  ref,
  update,
} from '@angular/fire/database';

import {
  Storage,
  getDownloadURL,
  ref as storageRef,
  uploadBytes,
} from '@angular/fire/storage';

import {
  MatSnackBar,
  MatSnackBarModule,
} from '@angular/material/snack-bar';

import { Router } from '@angular/router';

import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';

import { of, timer } from 'rxjs';
import { filter, map, switchMap, take } from 'rxjs/operators';

import { AvatarCropDialogComponent } from './avatar-crop-dialog/avatar-crop-dialog.component';

import {
  CropResult,
  MAX_SOURCE_FILE_SIZE,
} from '../models/avatar-crop.model';

import { ImageCropService } from '../services/image-crop.service';

import {
  ProfileFormControls,
  UserProfile,
  UserRole,
} from '../models/profile.model';

import {
  AUTH_GRACE_PERIOD_MS,
  FIREBASE_ERROR_MESSAGES,
  PHONE_PATTERN,
  ROLE_LABELS
} from '../constants/profile.constants';
import { ImmersiveCarouselComponent } from 'src/app/shared/immersive-carousel/immersive-carousel.component';

/* ═══════════════════════════════════════════════════════════
   COMPOSANT
   ═══════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-profil',
  imports: [
    ReactiveFormsModule,
    MatSnackBarModule,
    AvatarCropDialogComponent,ImmersiveCarouselComponent
  ],
  templateUrl: './profil.component.html',
  styleUrls: ['./profil.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilComponent {

  /* ═══════════════════════════════════════════════════════
     INJECTION
     ═══════════════════════════════════════════════════════ */

  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(Auth);
  private readonly database = inject(Database);
  private readonly storage = inject(Storage);
  private readonly snackBar = inject(MatSnackBar);
  private readonly environmentInjector = inject(EnvironmentInjector);
  private readonly router = inject(Router);
  private readonly cropService = inject(ImageCropService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly avatarInput =
    viewChild<ElementRef<HTMLInputElement>>('avatarInput');

  /* ═══════════════════════════════════════════════════════
     UTILISATEUR COURANT
     ═══════════════════════════════════════════════════════ */

  readonly currentUser = toSignal(authState(this.auth), {
    initialValue: null as User | null,
  });

  /* ═══════════════════════════════════════════════════════
     FORMULAIRE
     ═══════════════════════════════════════════════════════ */

  profileForm!: FormGroup<ProfileFormControls>;

  /* ═══════════════════════════════════════════════════════
     ÉTAT PROFIL
     ═══════════════════════════════════════════════════════ */

  selectedFile: File | null = null;
  avatarPreview: string | null = null;
  isSubmitting = false;
  isDragging = false;

  userRole: UserRole = 'user';
  userCreatedAt?: number;

  private currentUid: string | null = null;
  private cachedProfile: Partial<UserProfile> = {};

  /* ═══════════════════════════════════════════════════════
     RECADRAGE
     ═══════════════════════════════════════════════════════ */

  readonly pendingCropFile = signal<File | null>(null);
  private croppedResult: CropResult | null = null;

  /* ═══════════════════════════════════════════════════════
     COMPUTED
     ═══════════════════════════════════════════════════════ */

  readonly roleLabel = computed(
    () => ROLE_LABELS[this.userRole] ?? 'Utilisateur',
  );

  /* ═══════════════════════════════════════════════════════
     CONSTRUCTEUR
     ═══════════════════════════════════════════════════════ */

  constructor() {
    this.initForm();
    this.loadUserProfile();
    this.watchAuthState();
  }

  /* ═══════════════════════════════════════════════════════
     REDIRECTION DIFFÉRÉE
     ═══════════════════════════════════════════════════════ */

  private watchAuthState(): void {
    timer(AUTH_GRACE_PERIOD_MS)
      .pipe(
        switchMap(() => authState(this.auth).pipe(take(1))),
        filter((u) => !u),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        void this.router.navigate(['/login'], {
          queryParams: { returnUrl: '/profil' },
          replaceUrl: true,
        });
      });
  }

  /* ═══════════════════════════════════════════════════════
     FORMULAIRE
     ═══════════════════════════════════════════════════════ */

  private initForm(): void {
    this.profileForm = this.formBuilder.group<ProfileFormControls>(
      {
        fullName: this.formBuilder.nonNullable.control('', [
          Validators.required,
          Validators.minLength(2),
        ]),
        email: this.formBuilder.nonNullable.control('', [
          Validators.required,
          Validators.email,
        ]),
        phone: this.formBuilder.nonNullable.control('', [
          Validators.pattern(PHONE_PATTERN),
        ]),
        currentPassword: this.formBuilder.nonNullable.control(''),
        newPassword: this.formBuilder.nonNullable.control('', [
          Validators.minLength(8),
        ]),
        confirmPassword: this.formBuilder.nonNullable.control(''),
      },
      { validators: this.passwordMatchValidator },
    );

    this.profileForm.controls.newPassword.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((newPassword) => {
        const control = this.profileForm.controls.currentPassword;
        control.setValidators(
          newPassword.trim().length > 0 ? [Validators.required] : [],
        );
        control.updateValueAndValidity({ emitEvent: false });
      });
  }

  private passwordMatchValidator(
    group: AbstractControl,
  ): ValidationErrors | null {
    const newPassword = group.get('newPassword')?.value as string | undefined;
    const confirmPassword = group.get('confirmPassword')?.value as
      | string
      | undefined;

    if (newPassword && newPassword !== confirmPassword) {
      return { passwordMismatch: true };
    }
    return null;
  }

  /* ═══════════════════════════════════════════════════════
     CHARGEMENT DU PROFIL
     ═══════════════════════════════════════════════════════ */

  private loadUserProfile(): void {
    afterNextRender(() => {
      authState(this.auth)
        .pipe(
          switchMap((currentUser) => {
            if (!currentUser) {
              this.resetLocalState();
              return of(null);
            }

            this.currentUid = currentUser.uid;
            this.avatarPreview = currentUser.photoURL ?? null;

            const profileReference = ref(
              this.database,
              `users/${currentUser.uid}`,
            );

            return runInInjectionContext(this.environmentInjector, () =>
              objectVal<UserProfile>(profileReference),
            ).pipe(map((profileData) => ({ currentUser, profileData })));
          }),
          takeUntilDestroyed(this.destroyRef),
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
                phone: profileData.phone ?? '',
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
                phone: '',
              });
            }
          },
          error: () => {
            this.showToast(
              '✕ Impossible de charger votre profil.',
              'error',
            );
          },
        });
    });
  }

  private resetLocalState(): void {
    this.currentUid = null;
    this.cachedProfile = {};
    this.userRole = 'user';
    this.userCreatedAt = undefined;
    this.avatarPreview = null;
  }

  /* ═══════════════════════════════════════════════════════
     VALIDATION
     ═══════════════════════════════════════════════════════ */

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

  /* ═══════════════════════════════════════════════════════
     AVATAR
     ═══════════════════════════════════════════════════════ */

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

    if (file.size > MAX_SOURCE_FILE_SIZE) {
      this.showToast(
        "✕ L'image source ne doit pas dépasser 10 Mo.",
        'error',
      );
      return;
    }

    this.pendingCropFile.set(file);
  }

  onCropValidated(result: CropResult): void {
    this.pendingCropFile.set(null);
    this.croppedResult = result;

    this.avatarPreview = result.dataUrl;
    this.selectedFile = this.cropService.blobToFile(result.blob);

    this.showToast(
      "✓ Photo recadrée. N'oubliez pas d'enregistrer.",
      'success',
    );
  }

  onCropCancelled(): void {
    this.pendingCropFile.set(null);
  }

  triggerFileInput(): void {
    this.avatarInput()?.nativeElement.click();
  }

  removeAvatar(): void {
    this.selectedFile = null;
    this.croppedResult = null;
    this.avatarPreview = null;
    this.showToast(
      "✓ Photo retirée. N'oubliez pas d'enregistrer.",
      'success',
    );
  }

  /* ═══════════════════════════════════════════════════════
     SOUMISSION
     ═══════════════════════════════════════════════════════ */

  async onSubmit(): Promise<void> {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.showToast(
        '✕ Veuillez corriger les erreurs du formulaire.',
        'error',
      );
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

      if (emailChanged || passwordChanged) {
        if (!currentPassword.trim()) {
          this.showToast(
            '✕ Votre mot de passe actuel est requis.',
            'error',
          );
          return;
        }
        if (!currentUser.email) {
          throw new Error("Impossible de récupérer l'email du compte.");
        }

        const credential = EmailAuthProvider.credential(
          currentUser.email,
          currentPassword,
        );

        await this.runInContext(() =>
          reauthenticateWithCredential(currentUser, credential),
        );
      }

      let photoURL = this.avatarPreview ?? currentUser.photoURL ?? '';

      if (this.selectedFile) {
        const avatarReference = this.runInContext(() =>
          storageRef(this.storage, `avatars/${this.currentUid}`),
        );

        await this.runInContext(() =>
          uploadBytes(avatarReference, this.selectedFile as File, {
            contentType: 'image/jpeg',
            cacheControl: 'public, max-age=31536000',
          }),
        );

        photoURL = await this.runInContext(() =>
          getDownloadURL(avatarReference),
        );

        this.croppedResult = null;
      }

      if (emailChanged) {
        await this.runInContext(() =>
          updateEmail(currentUser, normalizedEmail),
        );
      }

      if (passwordChanged) {
        await this.runInContext(() =>
          updatePassword(currentUser, newPassword),
        );
      }

      const displayNameChanged =
        normalizedFullName !== (currentUser.displayName ?? '');
      const photoChanged = photoURL !== (currentUser.photoURL ?? '');

      if (displayNameChanged || photoChanged) {
        await this.runInContext(() =>
          updateProfile(currentUser, {
            displayName: normalizedFullName,
            photoURL: photoURL || null,
          }),
        );
      }

      /* ✅ CORRECTION CRITIQUE :
         On n'envoie QUE les champs autorisés par les règles Firebase.
         On utilise update() (patch) au lieu de set() (écrasement).
         → Ne touche JAMAIS role, disabled, credit, codepromo, codeparrain. */
      const profilePatch: Record<string, unknown> = {
        uid: this.currentUid,
        email: normalizedEmail,
        fullName: normalizedFullName,
        displayName: normalizedFullName,
        phone: normalizedPhone,
        photoURL,
        updatedAt: Date.now(),
      };

      // Si c'est le premier enregistrement, on ajoute createdAt
      if (!this.cachedProfile.createdAt) {
        profilePatch['createdAt'] = Date.now();
      }

      await this.runInContext(() =>
        update(
          ref(this.database, `users/${this.currentUid}`),
          profilePatch,
        ),
      );

      /* ✅ Mise à jour locale du cache (sans toucher aux champs admin) */
      this.cachedProfile = {
        ...this.cachedProfile,
        ...profilePatch,
      };

      this.profileForm.patchValue({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      this.profileForm.markAsPristine();
      this.profileForm.markAsUntouched();

      this.selectedFile = null;
      this.avatarPreview = (profilePatch['photoURL'] as string) ?? null;

      this.showToast('✓ Profil mis à jour avec succès !', 'success');
    } catch (error) {
      console.error('[Profil] Erreur mise à jour :', error);

      const { code } = this.getFirebaseError(error);
      const errorMessage =
        (code && FIREBASE_ERROR_MESSAGES[code]) ??
        'Erreur lors de la mise à jour.';

      this.showToast(`✕ ${errorMessage}`, 'error');
    } finally {
      this.isSubmitting = false;
    }
  }

  /* ═══════════════════════════════════════════════════════
     RESET
     ═══════════════════════════════════════════════════════ */

  onReset(): void {
    const currentUser = this.auth.currentUser;

    this.selectedFile = null;
    this.croppedResult = null;
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
      confirmPassword: '',
    });

    this.profileForm.markAsPristine();
    this.profileForm.markAsUntouched();

    this.showToast('✓ Formulaire réinitialisé.', 'success');
  }

  /* ═══════════════════════════════════════════════════════
     HELPERS
     ═══════════════════════════════════════════════════════ */

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

  formatMemberSince(): string {
    if (!this.userCreatedAt) return 'Récemment';

    return new Date(this.userCreatedAt).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
    });
  }

  /* ═══════════════════════════════════════════════════════
     UTILITAIRES PRIVÉS
     ═══════════════════════════════════════════════════════ */

  private runInContext<T>(fn: () => T): T {
    return runInInjectionContext(this.environmentInjector, fn);
  }

  private getFirebaseError(error: unknown): {
    code?: string;
    message?: string;
  } {
    if (typeof error === 'object' && error !== null) {
      const { code, message } = error as {
        code?: unknown;
        message?: unknown;
      };
      return {
        code: typeof code === 'string' ? code : undefined,
        message: typeof message === 'string' ? message : undefined,
      };
    }
    return {};
  }

  private showToast(
    message: string,
    type: 'success' | 'error',
  ): void {
    this.snackBar.open(message, 'Fermer', {
      duration: 4000,
      panelClass: type === 'success' ? ['snack-success'] : ['snack-error'],
    });
  }
}