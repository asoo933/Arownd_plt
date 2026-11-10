import type { ConfigContext, ExpoConfig } from "expo/config";

const googleServicesFile = process.env.GOOGLE_SERVICES_JSON;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  android: {
    ...config.android,
    ...(googleServicesFile ? { googleServicesFile } : {})
  }
});
