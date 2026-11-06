import * as Sentry from "@sentry/react";

// DSN is a public client-side identifier. Keep the env override for deployments,
// while retaining the configured project DSN for Android builds made outside Vercel.
const sentryDsn =
  (import.meta.env["VITE_SENTRY_DSN"] as string | undefined) ||
  "https://0e9fc5a01060c42f6799dc9907efb667@o4512249822052352.ingest.de.sentry.io/4512347498741840";

Sentry.init({
  dsn: sentryDsn,
  environment: import.meta.env.MODE,

  // Keep performance volume modest on the free tier.
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 0.1,

  beforeSend(event) {
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers;
      delete event.request.data;

      // Avoid sending query parameters that may contain OAuth codes or tokens.
      if (event.request.url) {
        try {
          const url = new URL(event.request.url);
          url.search = "";
          url.hash = "";
          event.request.url = url.toString();
        } catch {
          // Leave malformed URLs unchanged; other sensitive request fields are removed.
        }
      }
    }

    return event;
  },
});

export { Sentry };
