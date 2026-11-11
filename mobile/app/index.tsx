import { useEffect, useState } from "react";

import { Redirect } from "expo-router";

import { getSupabaseClient } from "@/lib/supabase";
import { getSelectedCountryCode, syncSelectedCountryCodeFromProfile } from "@/lib/country-service";
import { LoadingState } from "@/components/ui";
import { translate, useLanguage } from "@/lib/i18n";

type Destination = "/country-selection" | "/login" | "/home";

export default function IndexRoute() {
  useLanguage();
  const [destination, setDestination] = useState<Destination | null>(null);

  useEffect(() => {
    let active = true;

    const resolveDestination = async (): Promise<void> => {
      try {
        const { data, error } = await getSupabaseClient().auth.getSession();
        if (active) {
          if (!error && data.session) {
            await syncSelectedCountryCodeFromProfile(data.session.user.id);
            if (active) setDestination("/home");
            return;
          }
          const selectedCountryCode = await getSelectedCountryCode();
          if (active) setDestination(selectedCountryCode ? "/login" : "/country-selection");
        }
      } catch {
        if (active) setDestination("/login");
      }
    };

    void resolveDestination();

    return () => {
      active = false;
    };
  }, []);

  if (destination) return <Redirect href={destination} />;

  return <LoadingState label={translate("stateLoading")} />;
}