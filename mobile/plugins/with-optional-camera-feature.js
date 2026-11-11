const { withAndroidManifest } = require("@expo/config-plugins");

/**
 * Keep the camera optional for devices that do not have camera hardware.
 * expo-image-picker removes the CAMERA permission when cameraPermission is
 * disabled; Android Lint still requires the corresponding optional feature
 * declaration for Play/ChromeOS device filtering.
 */
module.exports = function withOptionalCameraFeature(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
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
