import React from "react";
import { Sentry } from "../utils/sentry";
import { useTranslation } from "@/lib/i18n";

export const AppErrorBoundary = Sentry.ErrorBoundary;

export const ErrorFallback = () => {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
      <div>
        <h1 className="text-h1 text-foreground">{t("error_unexpected_title")}</h1>
        <p className="mt-2 text-body text-muted-foreground">{t("error_unexpected_hint")}</p>
      </div>
    </div>
  );
};
