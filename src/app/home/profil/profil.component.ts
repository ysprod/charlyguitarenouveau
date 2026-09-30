import { Component, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, ValidationErrors, Validators } from '@angular/forms';

import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFireDatabase } from '@angular/fire/compat/database';
import { AngularFireStorage } from '@angular/fire/compat/storage';

import firebase from 'firebase/compat/app';

import { MatSnackBar } from '@angular/material/snack-bar';

import { Observable, Subject, of } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { CommonModule } from '@angular/common';

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

@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './profil.component.html',
  styleUrls: ['./profil.component.scss']
})
export class ProfilComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  profileForm!: UntypedFormGroup;

  selectedFile: File | null = null;
  avatarPreview: string | null = null;

  isSubmitting = false;
  isDragging = false;

  currentUser$: Observable<firebase.User | null> = this.auth.user;

  private currentUid: string | null = null;
  private cachedProfile: Partial<UserProfile> = {};

  private roleLabels: Record<string, string> = {
    admin: 'Administrateur',
    user: 'Utilisateur',
    subscriber: 'Abonné'
  };

  userRole = 'user';
  userCreatedAt?: number;

  constructor(
    private fb: UntypedFormBuilder,
    private auth: AngularFireAuth,
    private db: AngularFireDatabase,
    private storage: AngularFireStorage,
    private snackBar: MatSnackBar
  ) { }

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

  private initForm(): void {
    this.profileForm = this.fb.group(
      {
        fullName: [
          '',
          [
            Validators.required,
            Validators.minLength(2)
          ]
        ],

        email: [
          '',
          [
            Validators.required,
            Validators.email
          ]
        ],

        phone: [
          '',
          [
            Validators.pattern(/^\+?[0-9\s\-()]{8,20}$/)
          ]
        ],

        currentPassword: [''],

        newPassword: [
          '',
          [
            Validators.minLength(8)
          ]
        ],

        confirmPassword: ['']
      },
      {
        validators: this.passwordMatchValidator
      }
    );

    /*
     * Rendre le mot de passe actuel obligatoire si un nouveau est saisi
     */
    this.profileForm
      .get('newPassword')
      ?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((newPassword: string) => {

        const currentPasswordControl = this.profileForm.get('currentPassword');

        if (newPassword) {
          currentPasswordControl?.setValidators([Validators.required]);
        } else {
          currentPasswordControl?.clearValidators();
        }

        currentPasswordControl?.updateValueAndValidity();
      });
  }

  // =========================================================
  // CHARGEMENT DU PROFIL
  // =========================================================

  private loadUserProfile(): void {
    this.currentUser$
      .pipe(
        switchMap((currentUser: firebase.User | null) => {
          if (!currentUser) {
            return of(null);
          }

          this.currentUid = currentUser.uid;
          this.avatarPreview = currentUser.photoURL || null;

          return this.db
            .object<UserProfile>(`users/${currentUser.uid}`)
            .valueChanges()
            .pipe(
              switchMap((profileData) => of({ currentUser, profileData }))
            );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((result) => {
        if (!result) return;

        const { currentUser, profileData } = result;

        if (profileData) {
          this.cachedProfile = profileData;
          this.userRole = profileData.role || 'user';
          this.userCreatedAt = profileData.createdAt;

          this.profileForm.patchValue({
            fullName: profileData.fullName || profileData.displayName || currentUser.displayName || '',
            email: profileData.email || currentUser.email || '',
            phone: profileData.phone || ''
          });
        } else {
          this.profileForm.patchValue({
            email: currentUser.email || '',
            fullName: currentUser.displayName || ''
          });
        }
      });
  }

  // =========================================================
  // VALIDATION MOT DE PASSE (CORRIGÉE SANS BUGS DE ZONE)
  // =========================================================

  private passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const newPassword = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;

    if (newPassword && newPassword !== confirmPassword) {
      return { passwordMismatch: true };
    }

    return null;
  }

  // =========================================================
  // VALIDATION DES CHAMPS
  // =========================================================

  isFieldInvalid(fieldName: string): boolean {
    const field = this.profileForm.get(fieldName);
    const formHasPasswordMismatch =
      fieldName === 'confirmPassword' && this.profileForm.hasError('passwordMismatch');

    return !!(
      field &&
      (field.invalid || formHasPasswordMismatch) &&
      (field.dirty || field.touched)
    );
  }

  getFieldError(fieldName: string): string {
    const field = this.profileForm.get(fieldName);

    if (fieldName === 'confirmPassword' && this.profileForm.hasError('passwordMismatch')) {
      return 'Les mots de passe ne correspondent pas.';
    }

    if (!field || !field.errors) {
      return '';
    }

    if (field.errors.required) return 'Ce champ est obligatoire.';
    if (field.errors.email) return 'Format d\'email invalide.';
    if (field.errors.minlength) return `Minimum ${field.errors.minlength.requiredLength} caractères.`;
    if (field.errors.pattern) return 'Format invalide.';

    return 'Champ invalide.';
  }

  // =========================================================
  // AVATAR
  // =========================================================

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

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

    const file = event.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      this.processAvatarFile(file);
    }
  }

  private processAvatarFile(file: File): void {
    if (!file.type.startsWith('image/')) {
      this.showToast('✕ Seules les images sont acceptées.', 'error');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      this.showToast('✕ L\'image ne doit pas dépasser 2 Mo.', 'error');
      return;
    }

    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.avatarPreview = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  triggerFileInput(): void {
    document.getElementById('avatar-input')?.click();
  }

  removeAvatar(): void {
    this.selectedFile = null;
    this.avatarPreview = null;
    this.showToast('✓ Photo retirée. N\'oubliez pas d\'enregistrer.', 'success');
  }

  // =========================================================
  // SOUMISSION DU PROFIL
  // =========================================================

  async onSubmit(): Promise<void> {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.showToast('✕ Veuillez corriger les erreurs du formulaire.', 'error');
      return;
    }

    const currentUser = await this.auth.currentUser;

    if (!currentUser || !this.currentUid) {
      this.showToast('✕ Utilisateur non authentifié.', 'error');
      return;
    }

    this.isSubmitting = true;

    const { fullName, email, phone, currentPassword, newPassword } = this.profileForm.value;

    try {
      // 1. RÉAUTHENTIFICATION
      const emailChanged = email !== currentUser.email;
      const passwordChanged = !!newPassword;

      if (emailChanged || passwordChanged) {
        if (!currentPassword) {
          this.showToast('✕ Votre mot de passe actuel est requis.', 'error');
          this.isSubmitting = false;
          return;
        }

        if (!currentUser.email) {
          throw new Error('Impossible de récupérer l\'email du compte.');
        }

        const credential = firebase.auth.EmailAuthProvider.credential(
          currentUser.email,
          currentPassword
        );

        await currentUser.reauthenticateWithCredential(credential);
      }

      // 2. UPLOAD AVATAR
      let photoURL = this.avatarPreview || currentUser.photoURL || '';

      if (this.selectedFile) {
        const avatarPath = `avatars/${this.currentUid}`;
        const avatarRef = this.storage.ref(avatarPath);

        await avatarRef.put(this.selectedFile);
        photoURL = await avatarRef.getDownloadURL().toPromise();
      }

      // 3. FIREBASE AUTH
      if (emailChanged) {
        await currentUser.updateEmail(email);
      }

      if (passwordChanged) {
        await currentUser.updatePassword(newPassword);
      }

      if (fullName !== currentUser.displayName || photoURL !== currentUser.photoURL) {
        await currentUser.updateProfile({
          displayName: fullName,
          photoURL: photoURL || null
        });
      }

      // 4. REALTIME DATABASE
      const updatedProfile: UserProfile = {
        ...this.cachedProfile,
        uid: this.currentUid,
        email,
        fullName,
        displayName: fullName,
        phone: phone || '',
        photoURL,
        updatedAt: Date.now()
      };

      await this.db.object<UserProfile>(`users/${this.currentUid}`).set(updatedProfile);

      // 5. RESET CHAMPS SENSIBLES
      this.profileForm.patchValue({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      this.profileForm.markAsPristine();
      this.profileForm.markAsUntouched();

      this.selectedFile = null;
      this.cachedProfile = updatedProfile;
      this.userRole = updatedProfile.role || 'user';
      this.userCreatedAt = updatedProfile.createdAt;

      this.showToast('✓ Profil mis à jour avec succès !', 'success');

    } catch (error: unknown) {
      console.error('Erreur profil :', error);

      const firebaseError = error as { code?: string };
      let errorMsg = 'Erreur lors de la mise à jour.';

      switch (firebaseError.code) {
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          errorMsg = 'Mot de passe actuel incorrect.';
          break;
        case 'auth/requires-recent-login':
          errorMsg = 'Veuillez vous reconnecter avant de poursuivre.';
          break;
        case 'auth/email-already-in-use':
          errorMsg = 'Cet email est déjà utilisé.';
          break;
        case 'auth/invalid-email':
          errorMsg = 'Email invalide.';
          break;
        case 'auth/weak-password':
          errorMsg = 'Mot de passe trop faible.';
          break;
        case 'storage/unauthorized':
          errorMsg = 'Vous n\'êtes pas autorisé à modifier cette photo.';
          break;
      }

      this.showToast(`✕ ${errorMsg}`, 'error');

    } finally {
      this.isSubmitting = false;
    }
  }

  // =========================================================
  // RESET (CORRIGÉ AVEC LES PROMISSES FIREBASE)
  // =========================================================

  async onReset(): Promise<void> {
    this.selectedFile = null;

    const currentUser = await this.auth.currentUser;
    this.avatarPreview = currentUser?.photoURL || null;

    this.profileForm.reset();
    this.loadUserProfile();

    this.showToast('✓ Formulaire réinitialisé.', 'success');
  }

  // =========================================================
  // HELPERS
  // =========================================================

  getInitials(): string {
    const name = this.profileForm?.get('fullName')?.value;
    if (!name) return '?';

    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();

    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  getRoleLabel(): string {
    return this.roleLabels[this.userRole] || 'Utilisateur';
  }

  formatMemberSince(): string {
    if (!this.userCreatedAt) return 'Récemment';

    return new Date(this.userCreatedAt).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long'
    });
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    this.snackBar.open(message, 'Fermer', {
      duration: 4000,
      panelClass: type === 'success' ? ['snack-success'] : ['snack-error']
    });
  }
}