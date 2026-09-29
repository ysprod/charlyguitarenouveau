import { NgModule } from '@angular/core';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CookieService } from 'ngx-cookie-service';

// Firebase Compat Globals (Empêche l'erreur app.auth is not a function)
import 'firebase/compat/auth';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

// Composants
import { AbonnementComponent } from './abonnement/abonnement.component';
import { AcademieComponent } from './academie/academie.component';
import { AnnoncesComponent } from './academie/annonces/annonces.component';
import { ApprendreComponent } from './academie/apprendre/apprendre.component';
import { BoutiqueComponent } from './academie/boutique/boutique.component';
import { CoursprivesComponent } from './academie/coursprives/coursprives.component';
import { DocumentsComponent } from './academie/documents/documents.component';
import { EvenementsComponent } from './academie/evenements/evenements.component';
import { MasterclassComponent } from './academie/masterclass/masterclass.component';
import { FooterComponent } from './features/footer/footer.component';
import { LvideoComponent } from './features/lvideo/lvideo.component';
import { CardgameComponent } from './game/cardgame/cardgame.component';
import { RdialogComponent } from './game/cardgame/rdialog/rdialog.component';
import { KronosComponent } from './game/kronos/kronos.component';
import { TictactoeComponent } from './game/tictactoe/tictactoe.component';
import { AccueilComponent } from './home/accueil/accueil.component';
import { AgainComponent } from './home/again/again.component';
import { HomeComponent } from './home/home.component';
import { EncemomentComponent } from './live/encemoment/encemoment.component';
import { LiveComponent } from './live/live.component';
import { LoginComponent } from './login/login.component';
import { OffolandComponent } from './offoland/offoland.component';
import { PlayComponent } from './game/play/play.component';
import { BlancComponent } from './univers/blanc/blanc.component';
import { BleuComponent } from './univers/bleu/bleu.component';
import { CharlyguitaregameComponent } from './univers/charlyguitaregame/charlyguitaregame.component';
import { NoirComponent } from './univers/noir/noir.component';
import { RougeComponent } from './univers/rouge/rouge.component';
import { VertComponent } from './univers/vert/vert.component';

// Material Modules
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';

// Firebase Modules
import { AngularFireModule } from '@angular/fire/compat';
import {
  AngularFireAnalyticsModule,
  ScreenTrackingService,
  UserTrackingService
} from '@angular/fire/compat/analytics'; // <-- Ajout Analytics
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import { AngularFireAuthGuardModule } from '@angular/fire/compat/auth-guard';
import { AngularFireDatabaseModule } from '@angular/fire/compat/database';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';

// Services & Environment
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../environments/environment';
import { AcousticComponent } from './game/acoustic/acoustic.component';
import { GamecardComponent } from './game/cardgame/gamecard/gamecard.component';
import { ChordComponent } from './game/chord/chord.component';
import { FretboardComponent } from './game/fretboard/fretboard.component';
import { LykoComponent } from './game/lyko/lyko.component';
import { MemoryComponent } from './game/memory/memory.component';
import { MetronomeComponent } from './game/metronome/metronome.component';
import { TictacduoComponent } from './game/tictacduo/tictacduo.component';
import { ContactComponent } from './home/contact/contact.component';
import { MentionsComponent } from './home/mentions/mentions.component';
import { MessagerieComponent } from './home/messagerie/messagerie.component';
import { PrivacyComponent } from './home/privacy/privacy.component';
import { ProfilComponent } from './home/profil/profil.component';
import { RegisterComponent } from './register/register.component';
import { GameService } from './services/game.service';
import { TictactoeserviceService } from './services/tictactoeservice.service';
import { LykomodeComponent } from './game/lykomode/lykomode.component';
@NgModule({
  declarations: [
    AppComponent,
    AccueilComponent,
    CharlyguitaregameComponent,
    RougeComponent,
    VertComponent,
    BleuComponent,
    BlancComponent,
    NoirComponent,
    PlayComponent,
    AgainComponent,
    LvideoComponent,
    TictactoeComponent,
    CardgameComponent,
    GamecardComponent,
    RdialogComponent,
    KronosComponent,
    HomeComponent,
    LiveComponent,
    AcademieComponent,
    AbonnementComponent,
    OffolandComponent,
    FooterComponent,
    EncemomentComponent,
    DocumentsComponent,
    ApprendreComponent,
    MasterclassComponent,
    EvenementsComponent,
    BoutiqueComponent,
    CoursprivesComponent,
    AnnoncesComponent,
    LoginComponent,
    ProfilComponent,
    RegisterComponent,
    PrivacyComponent,
    MentionsComponent,
    ContactComponent,
    MessagerieComponent,
    LykoComponent,
    FretboardComponent,
    MemoryComponent,
    AcousticComponent,
    ChordComponent,
    MetronomeComponent,
    TictacduoComponent,
    LykomodeComponent,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    MatSnackBarModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatGridListModule,
    MatMenuModule,
    MatDividerModule,
    AngularFireModule.initializeApp(environment.firebase),
    AngularFireDatabaseModule,
    AngularFireAuthModule,
    AngularFirestoreModule,
    AngularFireAuthGuardModule,
    AngularFireAnalyticsModule, // <-- Ajout Analytics dans les imports
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: environment.production,
      registrationStrategy: 'registerWhenStable:30000'
    })
  ],
  providers: [
    CookieService,
    TictactoeserviceService,
    GameService,
    ScreenTrackingService, // <-- Suivi automatique de la navigation de page
    UserTrackingService   // <-- Suivi automatique de la connexion utilisateur
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }