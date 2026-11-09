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
    void getSupabaseClient().auth.getSession()
      .then(({ data, error }) => {
        if (!active) return;
        setDestination(!error && data.session ? "/home" : "/login");
      })
      .catch(() => {
        if (active) setDestination("/login");
      });
    return () => {
      active = false;
    };
  }, []);

  if (destination) return <Redirect href={destination} />;

  return <LoadingState label={translate("stateLoading")} />;
}