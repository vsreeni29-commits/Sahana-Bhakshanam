# Sahana Bhakshanam Android app

This is a small, secure Android shell for the live Sahana Bhakshanam web application. It preserves the same OTP, ordering, slot, payment-at-delivery, and chef-notification behavior without duplicating business logic.

## Build locally

Use JDK 17 and Gradle 8.9:

```bash
gradle --no-daemon :app:assembleDebug
```

The installable debug APK is created under `app/build/outputs/apk/debug/`.

## Change to a custom domain

The default site address is in `gradle.properties`. Override it for a build without editing source:

```bash
gradle --no-daemon :app:assembleDebug -PWEB_APP_URL=https://food.example.com/
```

The URL must use HTTPS. The app only keeps navigation for that configured host inside the WebView; external links open in the appropriate Android application or browser.

## Production signing

GitHub Actions publishes a debug-signed APK that is suitable for direct testing and sideload installation. Before Play Store distribution, configure a permanent release keystore, increment `versionCode`, and build the release variant so updates retain one stable signing identity.
