import { Routes } from '@angular/router';

import { AcademieComponent } from './academie/academie.component';
import { OffresComponent } from './academie/offres/offres.component';
import { AuthGuard } from './guards/auth/auth.guard';
import { AccueilComponent } from './home/accueil/accueil.component';
import { AgainComponent } from './home/again/again.component';
import { ContactComponent } from './home/contact/contact.component';
import { HomeComponent } from './home/home.component';
import { LoginComponent } from './home/login/login.component';
import { MentionsComponent } from './home/mentions/mentions.component';
import { MessagerieComponent } from './home/messagerie/messagerie.component';
import { PrivacyComponent } from './home/privacy/privacy.component';
import { ProfilComponent } from './home/profil/profil.component';
import { RegisterComponent } from './home/register/register.component';
import { HomeconnectComponent } from './home/homeconnect/homeconnect.component';
import { LiveComponent } from './live/live.component';

import { FinanceComponent } from './offoland/finance/finance.component';
import { OffolandComponent } from './offoland/offoland.component';
import { BcoComponent } from './offoland/bco/bco.component';
import { BlancComponent } from './offoland/dimensions/blanc/blanc.component';
import { BleuComponent } from './offoland/dimensions/bleu/bleu.component';
import { CharlyguitaregameComponent } from './offoland/dimensions/charlyguitaregame/charlyguitaregame.component';
import { NoirComponent } from './offoland/dimensions/noir/noir.component';
import { PourpreComponent } from './offoland/dimensions/pourpre/pourpre.component';
import { RougeComponent } from './offoland/dimensions/rouge/rouge.component';
import { VertComponent } from './offoland/dimensions/vert/vert.component';
import { VioletComponent } from './offoland/dimensions/violet/violet.component';

export const routes: Routes = [
  // -------------------- AUTH --------------------
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },

  // -------------------- HOME --------------------
  { path: '', component: HomeComponent },
  { path: 'home', component: HomeComponent },
  { path: 'accueil', component: AccueilComponent, canActivate: [AuthGuard] },

  // -------------------- GAME (lazy + shell) --------------------
  {
    path: 'game',
    loadChildren: () =>
      import('./game/game.routes').then((m) => m.gameRoutes),
  },

  // ------- Redirections des anciennes URLs vers /game/... -------
  { path: 'play',         redirectTo: 'game/play',         pathMatch: 'full' },
  { path: 'fretboard',    redirectTo: 'game/fretboard',    pathMatch: 'full' },
  { path: 'memory',       redirectTo: 'game/memory',       pathMatch: 'full' },
  { path: 'metronome',    redirectTo: 'game/metronome',    pathMatch: 'full' },
  { path: 'acoustic',     redirectTo: 'game/acoustic',     pathMatch: 'full' },
  { path: 'chord',        redirectTo: 'game/chord',        pathMatch: 'full' },
  { path: 'piano',        redirectTo: 'game/piano',        pathMatch: 'full' },
  { path: 'pianovirtuel', redirectTo: 'game/pianovirtuel', pathMatch: 'full' },
  { path: 'guitar-live',  redirectTo: 'game/guitar-live',  pathMatch: 'full' },
  { path: 'oracle',       redirectTo: 'game/oracle',       pathMatch: 'full' },
  { path: 'tictac',       redirectTo: 'game/tictac',       pathMatch: 'full' },
  { path: 'tictacduo',    redirectTo: 'game/tictacduo',    pathMatch: 'full' },
  { path: 'cards',        redirectTo: 'game/cards',        pathMatch: 'full' },
  { path: 'kronos',       redirectTo: 'game/kronos',       pathMatch: 'full' },
  { path: 'lykomode',     redirectTo: 'game/lykomode',     pathMatch: 'full' },

  // -------------------- OFFOLAND --------------------
  { path: 'offoland',          component: OffolandComponent,          canActivate: [AuthGuard] },
  { path: 'charlyguitaregame', component: CharlyguitaregameComponent, canActivate: [AuthGuard] },
  { path: 'finance',           component: FinanceComponent,           canActivate: [AuthGuard] },
  { path: 'bco',               component: BcoComponent,               canActivate: [AuthGuard] },
  { path: 'blanc',             component: BlancComponent,             canActivate: [AuthGuard] },
  { path: 'bleu',              component: BleuComponent,              canActivate: [AuthGuard] },
  { path: 'noir',              component: NoirComponent,              canActivate: [AuthGuard] },
  { path: 'pourpre',           component: PourpreComponent,           canActivate: [AuthGuard] },
  { path: 'rouge',             component: RougeComponent,             canActivate: [AuthGuard] },
  { path: 'vert',              component: VertComponent,              canActivate: [AuthGuard] },
  { path: 'violet',            component: VioletComponent,            canActivate: [AuthGuard] },

  // -------------------- DIVERS --------------------
  { path: 'privacy',    component: PrivacyComponent,    canActivate: [AuthGuard] },
  { path: 'mentions',   component: MentionsComponent,   canActivate: [AuthGuard] },
  { path: 'contact',    component: ContactComponent,    canActivate: [AuthGuard] },
  { path: 'inbox',      component: MessagerieComponent, canActivate: [AuthGuard] },
  { path: 'inbox/:key', component: MessagerieComponent, canActivate: [AuthGuard] },
  { path: 'academie',   component: AcademieComponent,   canActivate: [AuthGuard] },
  { path: 'profil',     component: ProfilComponent,     canActivate: [AuthGuard] },
  { path: 'amanda',     component: HomeconnectComponent,canActivate: [AuthGuard] },
  { path: 'abonnement', component: OffresComponent,     canActivate: [AuthGuard] },
  { path: 'offres',     component: OffresComponent,     canActivate: [AuthGuard] },
  { path: 'again',      component: AgainComponent,      canActivate: [AuthGuard] },
  { path: 'live',       component: LiveComponent,       canActivate: [AuthGuard] },

  // -------------------- FALLBACK --------------------
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: '**', redirectTo: 'home' },
];