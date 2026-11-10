import type { ExpoConfig } from "expo/config";

import appJson from "./app.json";

const expo = appJson.expo;
const googleServicesFile = process.env.GOOGLE_SERVICES_JSON;

const config: ExpoConfig = {
  ...expo,
  android: {
    ...expo.android,
    softwareKeyboardLayoutMode: "resize",
    ...(googleServicesFile ? { googleServicesFile } : {})
  }
};

export default config;
