import { Routes } from '@angular/router';

import { AbonnementComponent } from './abonnement/abonnement.component';
import { AcademieComponent } from './academie/academie.component';
import { DocumentsComponent } from './academie/documents/documents.component';
import { AcousticComponent } from './game/acoustic/acoustic.component';
import { CardgameComponent } from './game/cardgame/cardgame.component';
import { ChordComponent } from './game/chord/chord.component';
import { FretboardComponent } from './game/fretboard/fretboard.component';
import { KronosComponent } from './game/kronos/kronos.component';
import { LykoComponent } from './game/lyko/lyko.component';
import { LykomodeComponent } from './game/lykomode/lykomode.component';
import { MemoryComponent } from './game/memory/memory.component';
import { MetronomeComponent } from './game/metronome/metronome.component';
import { PlayComponent } from './game/play/play.component';
import { TictacduoComponent } from './game/tictacduo/tictacduo.component';
import { TictactoeComponent } from './game/tictactoe/tictactoe.component';
import { AuthGuard } from './guards/auth/auth.guard';
import { AccueilComponent } from './home/accueil/accueil.component';
import { AgainComponent } from './home/again/again.component';
import { ContactComponent } from './home/contact/contact.component';
import { HomeComponent } from './home/home.component';
import { MentionsComponent } from './home/mentions/mentions.component';
import { MessagerieComponent } from './home/messagerie/messagerie.component';
import { PrivacyComponent } from './home/privacy/privacy.component';
import { ProfilComponent } from './home/profil/profil.component';
import { LiveComponent } from './live/live.component';
import { LoginComponent } from './login/login.component';
import { FinanceComponent } from './offoland/finance/finance.component';
import { OffolandComponent } from './offoland/offoland.component';
import { OffresComponent } from './abonnement/offres/offres.component';
import { PianoComponent } from './game/piano/piano.component';
import { RegisterComponent } from './register/register.component';
import { BlancComponent } from './univers/blanc/blanc.component';
import { BleuComponent } from './univers/bleu/bleu.component';
import { CharlyguitaregameComponent } from './univers/charlyguitaregame/charlyguitaregame.component';
import { NoirComponent } from './univers/noir/noir.component';
import { RougeComponent } from './univers/rouge/rouge.component';
import { VertComponent } from './univers/vert/vert.component';
import { BcoComponent } from './offoland/bco/bco.component';
import { PianovirtuelComponent } from './game/pianovirtuel/pianovirtuel.component';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent
  },

  {
    path: 'register',
    component: RegisterComponent
  },

  {
    path: 'home',
    component: HomeComponent
  },

  {
    path: 'accueil',
    component: AccueilComponent,
    canActivate: [AuthGuard]
  },

  {
    path: 'fretboard',
    component: FretboardComponent,
    canActivate: [AuthGuard]
  },

  {
    path: 'memory',
    component: MemoryComponent,
    canActivate: [AuthGuard]
  },

  {
    path: 'metronome',
    component: MetronomeComponent,
    canActivate: [AuthGuard]
  },

  {
    path: 'acoustic',
    component: AcousticComponent,
    canActivate: [AuthGuard]
  },

  {
    path: 'chord',
    component: ChordComponent,
    canActivate: [AuthGuard]
  },

  {
    path: 'play',
    component: PlayComponent,
    canActivate: [AuthGuard]
  },

  {
    path: 'offoland',
    component: OffolandComponent,
    canActivate: [AuthGuard]
  },

  {
    path: 'game',
    component: CharlyguitaregameComponent,
    canActivate: [AuthGuard]
  },

  {
    path: 'privacy',
    component: PrivacyComponent,
    canActivate: [AuthGuard]
  },

  {
    path: 'mentions',
    component: MentionsComponent,
    canActivate: [AuthGuard]
  },

  {
    path: 'contact',
    component: ContactComponent,
    canActivate: [AuthGuard]
  },

  {
    path: 'inbox',
    component: MessagerieComponent,
    canActivate: [AuthGuard]
  },

  {
    path: 'academie',
    component: AcademieComponent,
    canActivate: [AuthGuard]
  },

  {
    path: 'profil',
    component: ProfilComponent,
    canActivate: [AuthGuard]
  },

  {
    path: 'documents',
    component: DocumentsComponent,
    canActivate: [AuthGuard]
  },

  {
    path: 'abonnement',
    component: AbonnementComponent,
    canActivate: [AuthGuard]
  },

  {
    path: 'finance',
    component: FinanceComponent,
    canActivate: [AuthGuard]
  },

  {
    path: 'bco',
    component: BcoComponent,
    canActivate: [AuthGuard]
  },

  {
    path: 'pianovirtuel',
    component: PianovirtuelComponent,
    canActivate: [AuthGuard]
  },

  {
    path: 'offres',
    component: OffresComponent,
    canActivate: [AuthGuard]
  },

  {
    path: 'piano',
    component: PianoComponent,
    canActivate: [AuthGuard]
  },

  {
    path: 'live',
    component: LiveComponent,
    canActivate: [AuthGuard]
  },

  {
    path: 'rouge',
    component: RougeComponent,
    canActivate: [AuthGuard]
  },

  {
    path: 'vert',
    component: VertComponent,
    canActivate: [AuthGuard]
  },

  {
    path: 'bleu',
    component: BleuComponent,
    canActivate: [AuthGuard]
  },

  {
    path: 'blanc',
    component: BlancComponent,
    canActivate: [AuthGuard]
  },

  {
    path: 'noir',
    component: NoirComponent,
    canActivate: [AuthGuard]
  },

  {
    path: 'tictac',
    component: TictactoeComponent,
    canActivate: [AuthGuard]
  },

  {
    path: 'cards',
    component: CardgameComponent,
    canActivate: [AuthGuard]
  },

  {
    path: 'kronos',
    component: KronosComponent,
    canActivate: [AuthGuard]
  },

  {
    path: 'again',
    component: AgainComponent,
    canActivate: [AuthGuard]
  },

  {
    path: 'lyko',
    component: LykoComponent,
    canActivate: [AuthGuard]
  },

  {
    path: 'tictacduo',
    component: TictacduoComponent,
    canActivate: [AuthGuard]
  },

  {
    path: 'lykomode',
    component: LykomodeComponent,
    canActivate: [AuthGuard]
  },

  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },

  {
    path: '**',
    redirectTo: 'home'
  }
];