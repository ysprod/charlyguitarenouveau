// src/environments/environment.ts

/**
 * Configuration pour le DÉVELOPPEMENT.
 * Utilisé par `ng serve`.
 */

export const environment = {
  production: false,
  firebase: {
    apiKey: "demo-api-key",
    authDomain: "demo-charly-guitare.firebaseapp.com",
    databaseURL: "https://demo-charly-guitare-default-rtdb.firebaseio.com",
    projectId: "demo-charly-guitare",
    storageBucket: "demo-charly-guitare.appspot.com",
    messagingSenderId: "000000000000",
    appId: "1:000000000000:web:0000000000000000000000",
    measurementId: ""
  },
  youtube: {
    apiKey: 'AIzaSyD19kbfxLHG365zkPZ7av8AxMcE4RttQj8-iZ1YGHPg_yU2X2SoCwtFAZI',
    playlistId: 'PLY4Ohx8IPP3KVikGEK3QHkNL8zYUVfqoO'
  }
};