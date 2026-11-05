# Toto

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 12.2.5.

## Firebase Functions

The backend source is in `functions/` and is built with:

```bash
npm --prefix functions install
npm run functions:build
npm --prefix functions test
```

Run local Firebase emulators using the emulator-only configuration and rules:

```bash
firebase emulators:start --only auth,database,functions,storage --project demo-charly-guitare --config firebase.emulator.json
```

Production Realtime Database rules are versioned in `database.rules.json` and
configured in `firebase.json`. Review the target Firebase project before
deploying them with `firebase deploy --only database`. The emulator config
continues to use the separate deny-by-default local rules.

The Angular development environment (`ng serve`) uses the demo project with
local Auth, Realtime Database, Storage and Functions emulators for development
flows. The store catalogue is the exception: it reads the production
`documents/` node directly, read-only, so current books published by the admin
site are visible locally. Other application features remain on the emulators.
The production environment remains configured for the production Firebase
project.

Check the callable checkout flow locally with:

```bash
npm --prefix functions run test:emulator
```

The emulator rules intentionally deny client reads and writes by default. They
are separate from production rules; do not deploy them as production rules.
The administration site is the source of truth for the store catalogue. The
callable reads entries from the Realtime Database `documents/` node, validates
their metadata and XOF price, and accepts only PDF Storage paths directly under
`documents/`. New and updated entries therefore appear without changing this
repository. Public download URLs from the database are never used for
purchases; confirmed purchases receive short-lived signed URLs from the
backend. Checkout remains blocked in the emulators and cannot create live
Jèko payments.
The webhook endpoint is `us-central1-jekoWebhook`. Configure
`JEKO_API_KEY`, `JEKO_API_KEY_ID` and `JEKO_WEBHOOK_SECRET` as Firebase
Functions secrets before enabling a real catalogue. Keep secret values out of
source files, Angular configuration and logs. The emulator secret file contains
test-only placeholders and is excluded from Git.

The store displays products and presentation metadata returned by the
server-side callable from the admin-managed Realtime Database catalogue.
Old client-side prices, credit balance   and direct file URLs
are not trusted for purchases or downloads. Existing credit records are kept
untouched; they are not converted into payment or entitlement records.
Confirmed purchases and short-lived private-file download links are served
through authenticated Functions callables.

Game subscriptions use the same authenticated Jèko checkout. The fixed plans
are 1 month (1,000 XOF), 3 months (2,500 XOF) and 12 months (10,000 XOF);
successful webhook confirmation activates access. Real checkout is disabled
when running with the local demo emulators. Deploy the updated Functions and
production frontend, and configure the Jèko secrets and `JEKO_STORE_ID`, before
expecting the subscription button to open a live payment.
`JEKO_STORE_ID` must contain the UUID of the Jèko store.

Academy course packs use the same authenticated Jèko checkout. The backend
validates pack IDs and prices against its fixed catalogue; each payment covers
one month at the price displayed on the offer and does not renew automatically.
Jèko webhook confirmation idempotently grants the published document credits
and explicit game-access durations. Customers can redeem document credits and
track manual benefits from their purchase history; administrators can mark
those benefits as delivered. The intermediate premium pack's platform-access
duration is intentionally left pending until it is specified. Opening the
purchase history also repairs entitlements for previously paid pack orders.
Deploy the updated Functions, production frontend and Realtime Database rules
before enabling the updated purchase flow.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.
