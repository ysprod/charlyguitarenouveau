// src/environments/environment.ts

/**
 * Configuration pour le DÉVELOPPEMENT.
 * Utilisé par `ng serve` et `ng build` (configuration dev).
 *
 * ⚠️ production: false — sinon le Service Worker s'active en dev
 *    et sert un ancien bundle en cache.
 */

export const environment = {
  production: false,
  firebase: {
    apiKey: "AIzaSyDP1HVLme_3smuwzaDCWax-Bjd-DK1AeSA",
    authDomain: "charly-guitare.firebaseapp.com",
    databaseURL: "https://charly-guitare-default-rtdb.firebaseio.com",
    projectId: "charly-guitare",
    storageBucket: "charly-guitare.appspot.com",
    messagingSenderId: "799887580459",
    appId: "1:799887580459:web:a998466f151d494ec6b96e",
    measurementId: "G-4L50T9ZMWJ"
  }
};