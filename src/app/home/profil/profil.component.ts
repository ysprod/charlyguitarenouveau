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
  authState,
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

import {
  MatSnackBar,
  MatSnackBarModule
} from '@angular/material/snack-bar';

import {
  CommonModule
} from '@angular/common';

import {
  Observable,
  Subject,
  of
} from 'rxjs';

import {
  map,
  switchMap,
  takeUntil
} from 'rxjs/operators';


/**
 * Profil utilisateur stocké dans Firebase Realtime Database.
 */
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


/**
 * Contrôles typés du formulaire.
 */
interface ProfileFormControls {
  fullName: FormControl<string>;
  email: FormControl<string>;
  phone: FormControl<string>;
  currentPassword: FormControl<string>;
  newPassword: FormControl<string>;
  confirmPassword: FormControl<string>;
}

@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatSnackBarModule
  ],
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

  private readonly destroy$ = new Subject<void>();

  profileForm!: FormGroup<ProfileFormControls>;

  selectedFile: File | null = null;

  avatarPreview: string | null = null;

  isSubmitting = false;

  isDragging = false;

  currentUser$: Observable<User | null>;

  private currentUid: string | null = null;

  private cachedProfile: Partial<UserProfile> = {};

  private readonly roleLabels: Record<
    'admin' | 'user' | 'subscriber',
    string
  > = {
    admin: 'Administrateur',
    user: 'Utilisateur',
    subscriber: 'Abonné'
  };

  userRole: 'admin' | 'user' | 'subscriber' = 'user';

  userCreatedAt?: number;


  constructor() {
    this.currentUser$ = runInInjectionContext(
      this.environmentInjector,
      () => authState(this.auth)
    );
  }


  // =========================================================
  // INITIALISATION
  // =========================================================

  ngOnInit(): void {
    this.initForm();
    this.loadUserProfile();
  }


  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }


  /**
   * Initialise le formulaire.
   */
  private initForm(): void {
    this.profileForm =
      this.formBuilder.group<ProfileFormControls>(
        {
          fullName: this.formBuilder.nonNullable.control(
            '',
            [
              Validators.required,
              Validators.minLength(2)
            ]
          ),

          email: this.formBuilder.nonNullable.control(
            '',
            [
              Validators.required,
              Validators.email
            ]
          ),

          phone: this.formBuilder.nonNullable.control(
            '',
            [
              Validators.pattern(
                /^\+?[0-9\s\-()]{8,20}$/
              )
            ]
          ),

          currentPassword: this.formBuilder.nonNullable.control(
            ''
          ),

          newPassword: this.formBuilder.nonNullable.control(
            '',
            [
              Validators.minLength(8)
            ]
          ),

          confirmPassword: this.formBuilder.nonNullable.control(
            ''
          )
        },
        {
          validators: this.passwordMatchValidator
        }
      );


    /**
     * Le mot de passe actuel devient obligatoire
     * lorsqu'un nouveau mot de passe est saisi.
     */
    this.profileForm.controls.newPassword.valueChanges
      .pipe(
        takeUntil(this.destroy$)
      )
      .subscribe((newPassword: string) => {

        const currentPasswordControl =
          this.profileForm.controls.currentPassword;

        if (newPassword.trim().length > 0) {
          currentPasswordControl.setValidators([
            Validators.required
          ]);
        } else {
          currentPasswordControl.clearValidators();
        }

        currentPasswordControl.updateValueAndValidity({
          emitEvent: false
        });
      });
  }


  // =========================================================
  // CHARGEMENT DU PROFIL
  // =========================================================

  private loadUserProfile(): void {

    this.currentUser$
      .pipe(
        switchMap((currentUser: User | null) => {

          if (!currentUser) {
            this.currentUid = null;
            this.cachedProfile = {};
            this.userRole = 'user';
            this.userCreatedAt = undefined;
            this.avatarPreview = null;

            return of(null);
          }

          this.currentUid = currentUser.uid;
          this.avatarPreview = currentUser.photoURL ?? null;

          const profileReference = ref(
            this.database,
            `users/${currentUser.uid}`
          );

          return runInInjectionContext(
            this.environmentInjector,
            () =>
              objectVal<UserProfile>(profileReference)
          ).pipe(
            map((profileData: UserProfile | null) => ({
              currentUser,
              profileData
            }))
          );
        }),

        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (
          result: {
            currentUser: User;
            profileData: UserProfile | null;
          } | null
        ) => {

          if (!result) {
            return;
          }

          const {
            currentUser,
            profileData
          } = result;

          if (profileData) {

            this.cachedProfile = profileData;

            this.userRole =
              profileData.role ?? 'user';

            this.userCreatedAt =
              profileData.createdAt;

            this.profileForm.patchValue({
              fullName:
                profileData.fullName ??
                profileData.displayName ??
                currentUser.displayName ??
                '',

              email:
                profileData.email ??
                currentUser.email ??
                '',

              phone:
                profileData.phone ?? ''
            });

            this.avatarPreview =
              profileData.photoURL ??
              currentUser.photoURL ??
              null;

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

        error: (error: unknown) => {
          console.error(
            'Erreur lors du chargement du profil :',
            error
          );

          this.showToast(
            '✕ Impossible de charger votre profil.',
            'error'
          );
        }
      });
  }


  // =========================================================
  // VALIDATION MOT DE PASSE
  // =========================================================

  private passwordMatchValidator(
    group: AbstractControl
  ): ValidationErrors | null {

    const newPassword =
      group.get('newPassword')?.value as string | undefined;

    const confirmPassword =
      group.get('confirmPassword')?.value as string | undefined;

    if (
      newPassword &&
      newPassword !== confirmPassword
    ) {
      return {
        passwordMismatch: true
      };
    }

    return null;
  }


  // =========================================================
  // VALIDATION DES CHAMPS
  // =========================================================

  isFieldInvalid(fieldName: keyof ProfileFormControls): boolean {

    const field =
      this.profileForm.controls[fieldName];

    const formHasPasswordMismatch =
      fieldName === 'confirmPassword' &&
      this.profileForm.hasError('passwordMismatch');

    return (
      (
        field.invalid ||
        formHasPasswordMismatch
      ) &&
      (
        field.dirty ||
        field.touched
      )
    );
  }


  getFieldError(
    fieldName: keyof ProfileFormControls
  ): string {

    const field =
      this.profileForm.controls[fieldName];

    if (
      fieldName === 'confirmPassword' &&
      this.profileForm.hasError('passwordMismatch')
    ) {
      return 'Les mots de passe ne correspondent pas.';
    }

    if (!field.errors) {
      return '';
    }

    if (field.hasError('required')) {
      return 'Ce champ est obligatoire.';
    }

    if (field.hasError('email')) {
      return "Format d'email invalide.";
    }

    if (field.hasError('minlength')) {

      const minlengthError =
        field.getError('minlength') as {
          requiredLength: number;
        };

      return `Minimum ${minlengthError.requiredLength} caractères.`;
    }

    if (field.hasError('pattern')) {
      return 'Format invalide.';
    }

    return 'Champ invalide.';
  }


  // =========================================================
  // AVATAR
  // =========================================================

  onAvatarSelected(event: Event): void {

    const input =
      event.target as HTMLInputElement;

    const file =
      input.files?.[0];

    if (file) {
      this.processAvatarFile(file);
    }
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

    const file =
      event.dataTransfer?.files?.[0];

    if (!file) {
      return;
    }

    this.processAvatarFile(file);
  }


  private processAvatarFile(file: File): void {

    if (!file.type.startsWith('image/')) {

      this.showToast(
        '✕ Seules les images sont acceptées.',
        'error'
      );

      return;
    }

    if (file.size > 2 * 1024 * 1024) {

      this.showToast(
        "✕ L'image ne doit pas dépasser 2 Mo.",
        'error'
      );

      return;
    }

    this.selectedFile = file;

    const reader = new FileReader();

    reader.onload = (): void => {

      if (typeof reader.result === 'string') {
        this.avatarPreview = reader.result;
      }
    };

    reader.onerror = (): void => {

      this.showToast(
        "✕ Impossible de lire l'image.",
        'error'
      );
    };

    reader.readAsDataURL(file);
  }


  triggerFileInput(): void {

    document
      .getElementById('avatar-input')
      ?.click();
  }


  removeAvatar(): void {

    this.selectedFile = null;
    this.avatarPreview = null;

    this.showToast(
      "✓ Photo retirée. N'oubliez pas d'enregistrer.",
      'success'
    );
  }


  // =========================================================
  // SOUMISSION DU PROFIL
  // =========================================================

  async onSubmit(): Promise<void> {

    if (this.profileForm.invalid) {

      this.profileForm.markAllAsTouched();

      this.showToast(
        '✕ Veuillez corriger les erreurs du formulaire.',
        'error'
      );

      return;
    }

    const currentUser =
      this.auth.currentUser;

    if (!currentUser || !this.currentUid) {

      this.showToast(
        '✕ Utilisateur non authentifié.',
        'error'
      );

      return;
    }

    this.isSubmitting = true;

    const {
      fullName,
      email,
      phone,
      currentPassword,
      newPassword
    } = this.profileForm.getRawValue();

    try {

      // =====================================================
      // 1. DÉTERMINATION DES CHANGEMENTS
      // =====================================================

      const normalizedEmail =
        email.trim();

      const normalizedFullName =
        fullName.trim();

      const normalizedPhone =
        phone.trim();

      const emailChanged =
        normalizedEmail !==
        (currentUser.email ?? '');

      const passwordChanged =
        newPassword.trim().length > 0;


      // =====================================================
      // 2. RÉAUTHENTIFICATION
      // =====================================================

      if (emailChanged || passwordChanged) {

        if (!currentPassword.trim()) {

          this.showToast(
            '✕ Votre mot de passe actuel est requis.',
            'error'
          );

          return;
        }

        if (!currentUser.email) {
          throw new Error(
            "Impossible de récupérer l'email du compte."
          );
        }

        const credential =
          EmailAuthProvider.credential(
            currentUser.email,
            currentPassword
          );

        await runInInjectionContext(
          this.environmentInjector,
          () =>
            reauthenticateWithCredential(
              currentUser,
              credential
            )
        );
      }


      // =====================================================
      // 3. UPLOAD AVATAR
      // =====================================================

      let photoURL =
        this.avatarPreview ??
        currentUser.photoURL ??
        '';

      if (this.selectedFile) {

        const avatarPath =
          `avatars/${this.currentUid}`;

        const avatarReference =
          runInInjectionContext(
            this.environmentInjector,
            () =>
              storageRef(
                this.storage,
                avatarPath
              )
          );

        await runInInjectionContext(
          this.environmentInjector,
          () =>
            uploadBytes(
              avatarReference,
              this.selectedFile as File
            )
        );

        photoURL =
          await runInInjectionContext(
            this.environmentInjector,
            () =>
              getDownloadURL(
                avatarReference
              )
          );
      }


      // =====================================================
      // 4. FIREBASE AUTH
      // =====================================================

      if (emailChanged) {

        await runInInjectionContext(
          this.environmentInjector,
          () =>
            updateEmail(
              currentUser,
              normalizedEmail
            )
        );
      }

      if (passwordChanged) {

        await runInInjectionContext(
          this.environmentInjector,
          () =>
            updatePassword(
              currentUser,
              newPassword
            )
        );
      }

      const displayNameChanged =
        normalizedFullName !==
        (currentUser.displayName ?? '');

      const photoChanged =
        photoURL !==
        (currentUser.photoURL ?? '');

      if (
        displayNameChanged ||
        photoChanged
      ) {

        await runInInjectionContext(
          this.environmentInjector,
          () =>
            updateProfile(
              currentUser,
              {
                displayName:
                  normalizedFullName,

                photoURL:
                  photoURL || null
              }
            )
        );
      }


      // =====================================================
      // 5. REALTIME DATABASE
      // =====================================================

      const updatedProfile: UserProfile = {

        ...this.cachedProfile,

        uid: this.currentUid,

        email: normalizedEmail,

        fullName:
          normalizedFullName,

        displayName:
          normalizedFullName,

        phone:
          normalizedPhone,

        photoURL,

        updatedAt:
          Date.now()
      };

      const profileReference =
        ref(
          this.database,
          `users/${this.currentUid}`
        );

      await runInInjectionContext(
        this.environmentInjector,
        () =>
          set(
            profileReference,
            updatedProfile
          )
      );


      // =====================================================
      // 6. RESET DES CHAMPS SENSIBLES
      // =====================================================

      this.profileForm.patchValue({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      this.profileForm.markAsPristine();
      this.profileForm.markAsUntouched();

      this.selectedFile = null;

      this.cachedProfile =
        updatedProfile;

      this.userRole =
        updatedProfile.role ?? 'user';

      this.userCreatedAt =
        updatedProfile.createdAt;

      this.avatarPreview =
        updatedProfile.photoURL ?? null;


      this.showToast(
        '✓ Profil mis à jour avec succès !',
        'success'
      );

    } catch (error: unknown) {

      console.error(
        'Erreur profil :',
        error
      );

      const firebaseError =
        this.getFirebaseError(error);

      let errorMessage =
        'Erreur lors de la mise à jour.';

      switch (firebaseError.code) {

        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          errorMessage =
            'Mot de passe actuel incorrect.';
          break;

        case 'auth/requires-recent-login':
          errorMessage =
            'Veuillez vous reconnecter avant de poursuivre.';
          break;

        case 'auth/email-already-in-use':
          errorMessage =
            'Cet email est déjà utilisé.';
          break;

        case 'auth/invalid-email':
          errorMessage =
            'Email invalide.';
          break;

        case 'auth/weak-password':
          errorMessage =
            'Mot de passe trop faible.';
          break;

        case 'auth/network-request-failed':
          errorMessage =
            'Problème de connexion réseau.';
          break;

        case 'storage/unauthorized':
          errorMessage =
            "Vous n'êtes pas autorisé à modifier cette photo.";
          break;

        case 'storage/canceled':
          errorMessage =
            "L'envoi de la photo a été annulé.";
          break;

        case 'storage/quota-exceeded':
          errorMessage =
            'La capacité de stockage est dépassée.';
          break;
      }

      this.showToast(
        `✕ ${errorMessage}`,
        'error'
      );

    } finally {

      this.isSubmitting = false;
    }
  }


  // =========================================================
  // RESET
  // =========================================================

  async onReset(): Promise<void> {

    const currentUser =
      this.auth.currentUser;

    this.selectedFile = null;

    this.avatarPreview =
      currentUser?.photoURL ?? null;

    this.profileForm.reset({
      fullName:
        this.cachedProfile.fullName ??
        this.cachedProfile.displayName ??
        currentUser?.displayName ??
        '',

      email:
        this.cachedProfile.email ??
        currentUser?.email ??
        '',

      phone:
        this.cachedProfile.phone ??
        '',

      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });

    this.profileForm.markAsPristine();
    this.profileForm.markAsUntouched();

    this.showToast(
      '✓ Formulaire réinitialisé.',
      'success'
    );
  }


  // =========================================================
  // HELPERS
  // =========================================================

  getInitials(): string {

    const name =
      this.profileForm.controls.fullName.value;

    if (!name.trim()) {
      return '?';
    }

    const parts =
      name.trim().split(/\s+/);

    if (parts.length === 1) {
      return parts[0]
        .charAt(0)
        .toUpperCase();
    }

    return (
      parts[0].charAt(0) +
      parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  }


  getRoleLabel(): string {

    return (
      this.roleLabels[this.userRole] ??
      'Utilisateur'
    );
  }


  formatMemberSince(): string {

    if (!this.userCreatedAt) {
      return 'Récemment';
    }

    return new Date(
      this.userCreatedAt
    ).toLocaleDateString(
      'fr-FR',
      {
        year: 'numeric',
        month: 'long'
      }
    );
  }


  /**
   * Extrait proprement le code d'une erreur Firebase.
   */
  private getFirebaseError(
    error: unknown
  ): {
    code?: string;
    message?: string;
  } {

    if (
      typeof error === 'object' &&
      error !== null
    ) {

      const firebaseError =
        error as {
          code?: unknown;
          message?: unknown;
        };

      return {
        code:
          typeof firebaseError.code === 'string'
            ? firebaseError.code
            : undefined,

        message:
          typeof firebaseError.message === 'string'
            ? firebaseError.message
            : undefined
      };
    }

    return {};
  }


  // =========================================================
  // NOTIFICATION
  // =========================================================

  private showToast(
    message: string,
    type: 'success' | 'error'
  ): void {

    this.snackBar.open(
      message,
      'Fermer',
      {
        duration: 4000,
        panelClass:
          type === 'success'
            ? ['snack-success']
            : ['snack-error']
      }
    );
  }
} 