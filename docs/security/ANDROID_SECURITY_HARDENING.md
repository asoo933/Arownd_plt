# Android Security Hardening

## Scope

This document records the Android-native hardening currently applied to the Expo app. The native Android project is generated from `mobile/app.json` and config plugins; do not edit or create a parallel root-level Android project for this app.

## Distributable build protections

The config plugin at `mobile/plugins/with-optional-camera-feature.js` applies the following manifest attributes when `EAS_BUILD_PROFILE` is `preview` or `production`:

- `android:allowBackup="false"`: disables the standard Android app-data backup path for distributable builds. Device-to-device transfer behavior can vary by Android version and manufacturer, so this is not represented as a universal data-transfer block.
- `android:debuggable="false"`: explicitly marks distributable builds as non-debuggable.
- `android:usesCleartextTraffic="false"`: blocks cleartext HTTP traffic in distributable builds.

Local development builds are intentionally not modified by these profile-specific settings so the Expo development server can continue to work.

The `expo-secure-store` config plugin remains enabled with `configureAndroidBackup: true`. This provides its own backup exclusions; it is retained as defense in depth and does not replace the application-wide backup restriction above.

## Existing protections retained

- Android authentication session storage uses the existing `expo-secure-store` integration.
- Release and preview network traffic is configured to reject cleartext HTTP.
- The camera hardware feature remains optional; this is a Play device-compatibility declaration, not a camera permission grant.
- No additional npm dependency or Android SDK library was introduced by this hardening change.

## Verification required for a distributable build

After generating the Android project with the existing Expo toolchain, inspect the merged manifest for the preview and production variants. Confirm the final merged application element contains:

- `android:allowBackup="false"`
- `android:debuggable="false"`
- `android:usesCleartextTraffic="false"`

Also inspect the merged manifest for exported activities, services, receivers, and providers. Keep only components that must be externally reachable; do not blindly set the launcher activity to non-exported because Android requires the launcher entry point to be exported.

The config plugin is profile-sensitive. A build that does not set `EAS_BUILD_PROFILE` to `preview` or `production` will not receive these three profile-specific attributes.

## Controls not yet implemented

The following controls are intentionally not claimed as complete:

- **App integrity / anti-tamper enforcement:** robust verification requires a trusted verification path and an Android distribution/integrity provider configuration. A client-only JavaScript check is bypassable and must not be treated as a security boundary.
- **Play Integrity API:** requires Play Console / Google Cloud configuration and server-side verification of integrity verdicts. It is not enabled by this change.
- **Certificate pinning:** not enabled; it needs a carefully managed certificate rotation and recovery strategy.
- **Root / hooking detection:** no standalone root or runtime-hook detector has been added. Such signals are bypassable and should not independently authorize or deny sensitive business actions.
- **APK/AAB inspection:** the generated merged manifest and signed release artifact still need build-time verification.

## Security boundary

Client-side protections raise the cost of casual tampering and reduce local data exposure. They cannot make an Android client a trusted authority. Sensitive operations must continue to be authorized by trusted server-side controls. Never embed service credentials, signing secrets, or private API keys in the mobile bundle.
