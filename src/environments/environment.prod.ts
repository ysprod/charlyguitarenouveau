// src/environments/environment.prod.ts

/**
 * Configuration pour la PRODUCTION.
 * Utilisé par `ng build --configuration production`.
 */

export const environment = {
  production: true,
  firebase: {
    apiKey: "AIzaSyDP1HVLme_3smuwzaDCWax-Bjd-DK1AeSA",
    authDomain: "charly-guitare.firebaseapp.com",
    databaseURL: "https://charly-guitare-default-rtdb.firebaseio.com",
    projectId: "charly-guitare",
    storageBucket: "charly-guitare.appspot.com",
    messagingSenderId: "799887580459",
    appId: "1:799887580459:web:a998466f151d494ec6b96e",
    measurementId: "G-4L50T9ZMWJ"
  },
  youtube: {
    apiKey: 'AIzaSyD19kbfxLHG365zkPZ7av8AxMcE4RttQj8-iZ1YGHPg_yU2X2SoCwtFAZI',
    playlistId: 'PLY4Ohx8IPP3KVikGEK3QHkNL8zYUVfqoO'
  }
};