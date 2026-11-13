const { withAndroidManifest } = require("@expo/config-plugins");

/**
 * Harden the generated Android manifest for distributable builds.
 *
 * Development builds remain unchanged so Metro can use the local dev server.
 * Release controls are applied to both EAS preview and production profiles.
 */
module.exports = function withOptionalCameraFeature(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const application = manifest.application?.[0];
    if (!application) {
      throw new Error("Android manifest is missing its application element.");
    }

    const buildProfile = process.env.EAS_BUILD_PROFILE;
    const isDistributableBuild =
      buildProfile === "preview" || buildProfile === "production";

    if (isDistributableBuild) {
      application.$ = application.$ ?? {};

      // Do not allow app data to be included in Android backup/transfer flows.
      // SecureStore's own backup exclusions remain configured by its Expo plugin.
      application.$["android:allowBackup"] = "false";

      // Android Gradle automatically sets debuggable=false for release variants.
      // Do not hardcode android:debuggable in the source manifest: Android Lint
      // correctly rejects that attribute because it can undermine build-type defaults.

      // Block cleartext HTTP traffic in preview and production APK/AAB builds.
      application.$["android:usesCleartextTraffic"] = "false";
    }

    const features = manifest["uses-feature"] ?? [];

    const cameraFeature = features.find(
      (feature) => feature?.$?.["android:name"] === "android.hardware.camera"
    );

    if (cameraFeature) {
      cameraFeature.$["android:required"] = "false";
    } else {
      features.push({
        $: {
          "android:name": "android.hardware.camera",
          "android:required": "false",
        },
      });
    }

    manifest["uses-feature"] = features;
    return config;
  });
};
