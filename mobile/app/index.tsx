import { useEffect, useState } from "react";

import { Redirect } from "expo-router";

import { getSupabaseClient } from "@/lib/supabase";
import { LoadingState } from "@/components/ui";
import { translate, useLanguage } from "@/lib/i18n";

type Destination = "/login" | "/home";

export default function IndexRoute() {
  useLanguage();
  const [destination, setDestination] = useState<Destination | null>(null);

  useEffect(() => {
    let active = true;

    const resolveDestination = async (): Promise<void> => {
      try {
        const { data, error } = await getSupabaseClient().auth.getSession();
        if (active) {
          setDestination(!error && data.session ? "/home" : "/login");
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