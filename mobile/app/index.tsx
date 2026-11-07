import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";

import { getSupabaseClient } from "@/lib/supabase";

type Destination = "/login" | "/home";

export default function IndexRoute() {
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

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F5F5F5" }}>
      <ActivityIndicator color="#829E19" />
    </View>
  );
}