import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EnvironmentInjector,
  afterNextRender,
  inject,
  runInInjectionContext,
  signal,
} from '@angular/core';

import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { CommonModule } from '@angular/common';

import {
  Database,
  push,
  ref,
} from '@angular/fire/database';

@Component({
  selector: 'app-legal-help',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './help.component.html',
  styleUrls: ['./help.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HelpComponent {
  private readonly fb = inject(FormBuilder);
  private readonly db = inject(Database);
  private readonly destroyRef = inject(DestroyRef);
  private readonly environmentInjector = inject(EnvironmentInjector);

  readonly isSubmitting = signal(false);
  readonly submitSuccess = signal(false);
  readonly submitError = signal('');

  readonly subjectMaxLength = 120;
  readonly messageMaxLength = 2000;

  /* ─── Formulaire ─── */
  readonly helpForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(120)]],
    orderReference: ['', [Validators.maxLength(80)]],
    subject: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]],
    message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(2000)]],
  });

  get f() {
    return this.helpForm.controls;
  }

  readonly faq = [
    {
      q: 'Je n’arrive pas à me connecter à mon compte',
      a: 'Vérifiez votre adresse e-mail et votre mot de passe. Si vous avez oublié votre mot de passe, cliquez sur « Mot de passe oublié » sur la page de connexion. Si le problème persiste, utilisez le formulaire ci-dessous en précisant votre adresse e-mail.',
    },
    {
      q: 'Mon paiement a été débité mais je n’ai pas accès au contenu',
      a: 'Les paiements sont confirmés par Jèko via un webhook sécurisé, ce qui peut prendre jusqu’à 5 minutes. Actualisez votre page « Mes achats » dans votre espace. Si après 15 minutes vous n’avez toujours pas accès, contactez-nous avec votre référence de commande (commence par « CG- »).',
    },
    {
      q: 'Comment obtenir ma référence de commande ?',
      a: 'Votre référence de commande est visible dans « Mon espace > Mes achats ». Elle commence par « CG- » suivi d’un identifiant unique. Elle vous a également été envoyée par e-mail à la confirmation du paiement.',
    },
    {
      q: 'Puis-je obtenir un remboursement ?',
      a: 'Les contenus numériques fournis immédiatement ne sont pas remboursables après activation ou téléchargement (voir nos CGV). Un remboursement peut être accordé en cas d’erreur technique non résolue sous 7 jours, de double paiement ou de contenu non livré.',
    },
    {
      q: 'Comment télécharger mes documents achetés ?',
      a: 'Rendez-vous dans « Mon espace > Mes achats ». Chaque document payé dispose d’un bouton « Télécharger » qui génère un lien sécurisé valable 5 minutes.',
    },
    {
      q: 'J’ai changé d’e-mail, comment mettre à jour mon compte ?',
      a: 'Connectez-vous à votre espace, allez dans « Mon profil » et modifiez vos informations. Pour changer d’adresse e-mail de connexion, contactez-nous via le formulaire ci-dessous.',
    },
  ];

  constructor() {
    afterNextRender(() => {
      if (typeof window !== 'undefined') {
        window.scrollTo(0, 0);
      }
    });
  }

  async onSubmit(): Promise<void> {
    if (this.helpForm.invalid) {
      this.helpForm.markAllAsTouched();
      return;
    }

    if (this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.submitSuccess.set(false);
    this.submitError.set('');

    try {
      const value = this.helpForm.getRawValue();
      const now = Date.now();

      /* ✅ runInInjectionContext supprime le warning
         "Calling Firebase APIs outside of an Injection context" */
      await runInInjectionContext(this.environmentInjector, () =>
        push(ref(this.db, 'messages/support/inbox'), {
          subject: value.subject.trim(),
          body: value.message.trim(),
          from: 'public',
          fromName: value.name.trim(),
          fromEmail: value.email.trim(),
          to: 'support',
          toName: 'Charly Guitare',
          read: false,
          createdAt: now,
          ...(value.orderReference.trim() && {
            orderReference: value.orderReference.trim(),
          }),
          source: 'help-page',
        }),
      );

      this.submitSuccess.set(true);
      this.helpForm.reset({
        name: '',
        email: '',
        orderReference: '',
        subject: '',
        message: '',
      });

      setTimeout(() => this.submitSuccess.set(false), 12000);
    } catch (error) {
      console.error('[Help] Erreur envoi message :', error);
      this.submitError.set(
        'Impossible d’envoyer votre message. Réessayez ou écrivez-nous à contact@charlyguitare.com.',
      );
    } finally {
      this.isSubmitting.set(false);
    }
  }

  isFieldInvalid(field: 'name' | 'email' | 'subject' | 'message'): boolean {
    const ctrl = this.helpForm.controls[field];
    return ctrl.touched && ctrl.invalid;
  }
}