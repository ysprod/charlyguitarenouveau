import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideServiceWorker } from '@angular/service-worker';

import { routes } from './app.routes';
import { environment } from '../environments/environment';

import { AngularFireModule } from '@angular/fire/compat';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import { AngularFireAuthGuardModule } from '@angular/fire/compat/auth-guard';
import { AngularFireDatabaseModule } from '@angular/fire/compat/database';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { AngularFireAnalyticsModule } from '@angular/fire/compat/analytics';

import { CookieService } from 'ngx-cookie-service';

import { TictactoeserviceService } from './services/tictactoeservice.service';
import { GameService } from './services/game.service';

import {
  ScreenTrackingService,
  UserTrackingService
} from '@angular/fire/compat/analytics';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),

    provideAnimations(),

    importProvidersFrom(
      AngularFireModule.initializeApp(environment.firebase),
      AngularFireAuthModule,
      AngularFireAuthGuardModule,
      AngularFireDatabaseModule,
      AngularFirestoreModule,
      AngularFireAnalyticsModule
    ),

    provideServiceWorker('ngsw-worker.js', {
      enabled: environment.production,
      registrationStrategy: 'registerWhenStable:30000'
    }),

    CookieService,
    TictactoeserviceService,
    GameService,
    ScreenTrackingService,
    UserTrackingService
  ]
};