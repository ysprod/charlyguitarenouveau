import { Component, OnInit, OnDestroy } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { AngularFireDatabase } from '@angular/fire/compat/database';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';

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

  contactForm!: UntypedFormGroup;
  isSubmitting = false;
  submitSuccess = false;
  submitError = false;
  errorMessage = '';

  currentUser: any = null;
  authLoading = true;
  private authSubscription!: Subscription;

  constructor(
    private fb: UntypedFormBuilder,
    private db: AngularFireDatabase,
    private afAuth: AngularFireAuth
  ) { }

  ngOnInit(): void {
    window.scrollTo(0, 0);
    this.initForm();
    this.checkCurrentUser();
  }

  private initForm(): void {
    this.contactForm = this.fb.group({
      subject: ['', [Validators.required, Validators.minLength(3)]],
      message: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  private checkCurrentUser(): void {
    this.authSubscription = this.afAuth.authState.subscribe(user => {
      this.currentUser = user;
      this.authLoading = false;
    });
  }

  async onSubmit(): Promise<void> {
    if (!this.currentUser) {
      this.submitError = true;
      this.errorMessage = "Vous devez être connecté pour envoyer un message.";
      return;
    }

    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.submitSuccess = false;
    this.submitError = false;

    const messageData = {
      userId: this.currentUser.uid,
      userEmail: this.currentUser.email || '',
      userName: this.currentUser.displayName || 'Utilisateur',
      userPhoto: this.currentUser.photoURL || '',
      subject: this.contactForm.value.subject,
      message: this.contactForm.value.message,
      createdAt: new Date().toISOString(),
      status: 'unread'
    };

    try {
      // Enregistrement dans le nœud "messages" au lieu de "contacts"
      await this.db.list('messages').push(messageData);
      this.submitSuccess = true;
      this.contactForm.reset();
    } catch (error: any) {
      this.submitError = true;
      this.errorMessage = "Une erreur est survenue lors de l'envoi. Veuillez réessayer.";
      console.error('Erreur Realtime Database :', error);
    } finally {
      this.isSubmitting = false;
    }
  }

  get f() {
    return this.contactForm.controls;
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }
}