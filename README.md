# AquaPure

A mobile-first water-purifier shop demo built with Expo, React Native, and Expo Router. The same app runs on Android and exports as a static website for Vercel.

## Run locally

```sh
npm install
npm run start
```

Press `a` to open Android (Android Studio/emulator required) or `w` for the web preview. Expo Go can be used for a physical Android device.

## Demo features

- 50 catalog products across purifiers, dispensers, pumps, filters, and spares.
- Search, category filters, item quantities, wholesale dealer pricing, a cart, delivery details, demo payment selection, checkout, and order history.
- Service booking with customer and admin views.
- Admin views for order status changes and dealer approval/rejection.
- Use the role pill in the top-right to cycle through Customer, Dealer, and Admin previews.

Without Firebase configuration, the app runs in clearly labeled demo mode: preview roles cycle locally and sample orders, dealer applications, and services live only in memory. With Firebase configured, email/password accounts, user roles, dealer applications, orders, and service requests use Firebase Auth and Firestore. Catalog products remain local mock data. Checkout records an order but does not charge a payment method.

## Firebase setup

Firebase values are public client configuration, not server credentials. Copy `.env.example` to `.env.local` and fill in the web-app config from Firebase Console → Project settings → Your apps. Do not add a service-account key to the app.

1. Create a Firebase project on the Spark plan, add a Web app, and enable **Authentication → Email/Password**.
2. Create the Cloud Firestore database.
3. Copy `.env.example` to `.env.local`, fill in the six `EXPO_PUBLIC_FIREBASE_*` settings, and restart Expo.
4. Deploy the rules and indexes with Firebase CLI: `firebase deploy --only firestore:rules,firestore:indexes`.
5. Create a normal user account in the app. To provision the first admin, find that account’s UID in Firebase Authentication and set `users/{uid}.role` to `Admin` in Firestore Console. Admin access is protected by Firestore rules; do not let client users set their own role.
6. Dealers create a normal account and submit a dealer application. An admin can approve/reject it in the admin dashboard. Approved users then see wholesale pricing.

The Firebase web API key is intentionally a client-side value. Restrict it in Google Cloud if desired; Firestore Security Rules enforce data access. Email/password profiles and order/service data persist across app sessions.

## Web build and Vercel

```sh
npm run export:web
```

The static site is written to `dist/`. The included `vercel.json` configures that build command and output directory. Import this folder/repository into a Vercel account and deploy; you can set the same Firebase `EXPO_PUBLIC_FIREBASE_*` variables in Vercel Project Settings → Environment Variables. A live deployment needs a Vercel account and was not published from this workspace.

## Open on Android

This project uses Expo SDK 58. Install a compatible Expo Go version on the phone, connect the phone and computer to the same Wi-Fi, and run `npm run start`. Scan the QR code in Expo Go. If LAN discovery is blocked by the network, try `npx expo start --tunnel`.

An installable APK can instead be produced with an Expo/EAS account and Android signing/build configuration; no APK has been built or submitted here.

```sh
npx eas-cli login
npx eas-cli build --profile preview --platform android
```

The preview profile in `eas.json` requests an installable APK. EAS account access is required to start that cloud build.

## Daily Instagram workflow

Import [`n8n/daily-instagram-product.json`](./n8n/daily-instagram-product.json) into an n8n instance. The workflow chooses one product per day from the `Products` Google Sheet, generates a caption with Groq and a square product image with Hugging Face, uploads the image to Cloudinary, then creates and publishes an Instagram media post.

Before activating it:

1. Create a `Products` sheet with `Name`, `Description`, and optional `ImagePrompt` columns, then configure Google Sheets OAuth and replace the sheet ID.
2. Add your Groq and Hugging Face API tokens to their HTTP Request nodes.
3. Configure a Cloudinary unsigned upload preset and replace the Cloudinary cloud name and preset.
4. Replace the Instagram Business Account ID and Meta Graph API token. The account must be eligible for Graph API publishing.
5. Run a manual test, then activate the workflow. It is scheduled for 9:00 AM Asia/Kolkata; once activated and credentials are configured, it runs without a daily manual post.

Tokens are placeholders and are not included in the workflow. Use n8n credentials or a secrets manager for production rather than committing real keys.

## Remaining external integrations

Razorpay is not connected: the checkout is a demo order flow and no payment is collected. A secure live/test payment integration needs Razorpay test keys and a trusted server endpoint to create orders and verify signatures. FCM push alerts are not connected: Android remote push requires Firebase Android app configuration, a development/production build, and a trusted sender for notifications. Location, email, and SMS are also not connected. Do not present these as working until the corresponding accounts, secrets, server-side verification, and device testing are complete.
