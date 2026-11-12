import { useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";

import { LoadingState } from "@/components/ui";
import { savePendingInviteCode } from "@/lib/invite-service";
import { translate, useLanguage } from "@/lib/i18n";

export default function InviteRoute() {
  useLanguage();
  const { code } = useLocalSearchParams<{ code?: string | string[] }>();

  useEffect(() => {
    let active = true;

    void savePendingInviteCode(code)
      .catch(() => undefined)
      .finally(() => {
        if (active) router.replace("/account-type");
      });

    return () => {
      active = false;
    };
  }, [code]);

  return <LoadingState label={translate("stateLoading")} />;
}
