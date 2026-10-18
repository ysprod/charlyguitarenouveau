// src/app/app.routes.ts

import { Routes } from '@angular/router';

import { AuthGuard } from './guards/auth/auth.guard';

/* ═════════════════════════════════════════════════════════════════════
   ROUTES PUBLIQUES (statiques — chargés immédiatement)
   ═════════════════════════════════════════════════════════════════════ */

import { HomeComponent } from './home/home.component';
import { LoginComponent } from './home/login/login.component';
import { RegisterComponent } from './home/register/register.component';

/* ═════════════════════════════════════════════════════════════════════
   ROUTES UTILISATEUR (protégées par AuthGuard)
   ═════════════════════════════════════════════════════════════════════ */

import { AccueilComponent } from './home/accueil/accueil.component';
import { AgainComponent } from './home/again/again.component';
import { ContactComponent } from './home/contact/contact.component';
import { MentionsComponent } from './home/mentions/mentions.component';
import { MessagerieComponent } from './home/messagerie/messagerie.component';
import { NotificationsComponent } from './home/notifications/notifications.component';
import { PrivacyComponent } from './home/privacy/privacy.component';
import { ProfilComponent } from './home/profil/profil.component';
import { HomeconnectComponent } from './home/homeconnect/homeconnect.component';
import { LiveComponent } from './live/live.component';

import { AcademieComponent } from './academie/academie.component';
import { OffresComponent } from './academie/offres/offres.component';

/* ═════════════════════════════════════════════════════════════════════
   ROUTES OFFOLAND
   ═════════════════════════════════════════════════════════════════════ */

import { OffolandComponent } from './offoland/offoland.component';
import { BcoComponent } from './offoland/bco/bco.component';
import { FinanceComponent } from './offoland/finance/finance.component';
import { BlancComponent } from './offoland/dimensions/blanc/blanc.component';
import { BleuComponent } from './offoland/dimensions/bleu/bleu.component';
import { CharlyguitaregameComponent } from './offoland/dimensions/charlyguitaregame/charlyguitaregame.component';
import { NoirComponent } from './offoland/dimensions/noir/noir.component';
import { PourpreComponent } from './offoland/dimensions/pourpre/pourpre.component';
import { RougeComponent } from './offoland/dimensions/rouge/rouge.component';
import { VertComponent } from './offoland/dimensions/vert/vert.component';
import { VioletComponent } from './offoland/dimensions/violet/violet.component';

/* ═════════════════════════════════════════════════════════════════════
   ROUTES
   ═════════════════════════════════════════════════════════════════════ */

export const routes: Routes = [

  /* ═══════════════════════════════════════════════════════
     AUTH (publiques)
     ═══════════════════════════════════════════════════════ */

  {
    path: 'login',
    component: LoginComponent,
    title: 'Connexion — Charly Guitare',
  },
  {
    path: 'register',
    component: RegisterComponent,
    title: 'Inscription — Charly Guitare',
  },

  /* ═══════════════════════════════════════════════════════
     HOME (publiques)
     ═══════════════════════════════════════════════════════ */

  {
    path: '',
    component: HomeComponent,
    title: 'Charly Guitare — Apprendre la guitare',
    pathMatch: 'full',
  },
  {
    path: 'home',
    component: HomeComponent,
    title: 'Charly Guitare — Accueil',
  },

  /* ═══════════════════════════════════════════════════════
     GAME (lazy loading)
     ═══════════════════════════════════════════════════════ */

  {
    path: 'game',
    loadChildren: () =>
      import('./game/game.routes').then((m) => m.gameRoutes),
  },

  /* ═══════════════════════════════════════════════════════
     REDIRECTIONS ANCIENNES URLS → /game/...
     ═══════════════════════════════════════════════════════ */

  { path: 'play', redirectTo: 'game/play', pathMatch: 'full' },
  { path: 'fretboard', redirectTo: 'game/fretboard', pathMatch: 'full' },
  { path: 'memory', redirectTo: 'game/memory', pathMatch: 'full' },
  { path: 'metronome', redirectTo: 'game/metronome', pathMatch: 'full' },
  { path: 'acoustic', redirectTo: 'game/acoustic', pathMatch: 'full' },
  { path: 'chord', redirectTo: 'game/chord', pathMatch: 'full' },
  { path: 'piano', redirectTo: 'game/piano', pathMatch: 'full' },
  { path: 'pianovirtuel', redirectTo: 'game/pianovirtuel', pathMatch: 'full' },
  { path: 'guitar-live', redirectTo: 'game/guitar-live', pathMatch: 'full' },
  { path: 'oracle', redirectTo: 'game/oracle', pathMatch: 'full' },
  { path: 'tictac', redirectTo: 'game/tictac', pathMatch: 'full' },
  { path: 'tictacduo', redirectTo: 'game/tictacduo', pathMatch: 'full' },
  { path: 'cards', redirectTo: 'game/cards', pathMatch: 'full' },
  { path: 'kronos', redirectTo: 'game/kronos', pathMatch: 'full' },
  { path: 'lykomode', redirectTo: 'game/lykomode', pathMatch: 'full' },

  /* ═══════════════════════════════════════════════════════
     USER (protégées par AuthGuard) — regroupées
     ═══════════════════════════════════════════════════════ */

  /* ─── Accueil & navigation ─── */
  { path: 'accueil', component: AccueilComponent, canActivate: [AuthGuard], title: 'Accueil — Charly Guitare' },
  { path: 'amanda', component: HomeconnectComponent, canActivate: [AuthGuard], title: 'Mon espace' },
  { path: 'again', component: AgainComponent, canActivate: [AuthGuard], title: 'Again' },

  /* ─── Messagerie ─── */
  { path: 'inbox', component: MessagerieComponent, canActivate: [AuthGuard], title: 'Messages' },
  { path: 'inbox/:key', component: MessagerieComponent, canActivate: [AuthGuard], title: 'Conversation' },
  { path: 'notifications', component: NotificationsComponent, canActivate: [AuthGuard], title: 'Notifications' },
  { path: 'contact', component: ContactComponent, canActivate: [AuthGuard], title: 'Contact' },

  /* ─── Académie & abonnements ─── */
  { path: 'academie', component: AcademieComponent, canActivate: [AuthGuard], title: 'Académie' },
  { path: 'abonnement', component: OffresComponent, canActivate: [AuthGuard], title: 'Abonnement' },
  { path: 'offres', component: OffresComponent, canActivate: [AuthGuard], title: 'Offres' },

  /* ─── Profil & légal ─── */
  { path: 'profil', component: ProfilComponent, canActivate: [AuthGuard], title: 'Mon profil' },
  { path: 'privacy', component: PrivacyComponent, canActivate: [AuthGuard], title: 'Confidentialité' },
  { path: 'mentions', component: MentionsComponent, canActivate: [AuthGuard], title: 'Mentions légales' },

  /* ─── Live ─── */
  { path: 'live', component: LiveComponent, canActivate: [AuthGuard], title: 'Live' },

  /* ═══════════════════════════════════════════════════════
     OFFOLAND (protégées par AuthGuard)
     ═══════════════════════════════════════════════════════ */

  { path: 'offoland', component: OffolandComponent, canActivate: [AuthGuard], title: 'Offoland' },
  { path: 'charlyguitaregame', component: CharlyguitaregameComponent, canActivate: [AuthGuard], title: 'Charly Guitare Game' },
  { path: 'finance', component: FinanceComponent, canActivate: [AuthGuard], title: 'Finance' },
  { path: 'bco', component: BcoComponent, canActivate: [AuthGuard], title: 'BCO' },
  { path: 'blanc', component: BlancComponent, canActivate: [AuthGuard], title: 'Blanc' },
  { path: 'bleu', component: BleuComponent, canActivate: [AuthGuard], title: 'Bleu' },
  { path: 'noir', component: NoirComponent, canActivate: [AuthGuard], title: 'Noir' },
  { path: 'pourpre', component: PourpreComponent, canActivate: [AuthGuard], title: 'Pourpre' },
  { path: 'rouge', component: RougeComponent, canActivate: [AuthGuard], title: 'Rouge' },
  { path: 'vert', component: VertComponent, canActivate: [AuthGuard], title: 'Vert' },
  { path: 'violet', component: VioletComponent, canActivate: [AuthGuard], title: 'Violet' },

  /* ═══════════════════════════════════════════════════════
     FALLBACK
     ═══════════════════════════════════════════════════════ */

  {
    path: '**',
    redirectTo: 'home',
  },
];