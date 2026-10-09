import {
  ApplicationConfig
} from '@angular/core';

import {
  provideRouter,
  withInMemoryScrolling
} from '@angular/router';

import {
  provideAnimations
} from '@angular/platform-browser/animations';

import {
  provideServiceWorker
} from '@angular/service-worker';

import {
  initializeApp,
  provideFirebaseApp
} from '@angular/fire/app';

import {
  getAuth,
  provideAuth
} from '@angular/fire/auth';

import {
  getDatabase,
  provideDatabase
} from '@angular/fire/database';

import {
  routes
} from './app.routes';

import {
  environment
} from '../environments/environment';

import {
  CookieService
} from 'ngx-cookie-service';

import {
  TictactoeserviceService
} from './services/tictactoeservice.service';

import {
  GameService
} from './services/game.service';

export const appConfig: ApplicationConfig = {
  providers: [

    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'top'
      })
    ),

    provideAnimations(),

    provideFirebaseApp(
      () => initializeApp(environment.firebase)
    ),

    provideAuth(
      () => getAuth()
    ),

    provideDatabase(
      () => getDatabase()
    ),

    provideServiceWorker(
      'ngsw-worker.js',
      {
        enabled: environment.production,
        registrationStrategy: 'registerWhenStable:30000'
      }
    ),
    CookieService,
    TictactoeserviceService,
    GameService
  ]
}; 