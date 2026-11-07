import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pressable, StyleSheet, Text } from "react-native";

import { getFavorites, toggleFavorite } from "@/lib/favorites";
import { hasFavorite, type FavoriteKind } from "@/lib/favorites-state";
import { translate } from "@/lib/i18n";

export const FAVORITES_QUERY_KEY = ["customer-favorites"] as const;

export function FavoriteButton({ kind, id }: { kind: FavoriteKind; id: string }) {
  const queryClient = useQueryClient();
  const favorites = useQuery({
    queryKey: FAVORITES_QUERY_KEY,
    queryFn: getFavorites
  });
  const mutation = useMutation({
    mutationFn: () => toggleFavorite(kind, id),
    onSuccess: (next) => {
      queryClient.setQueryData(FAVORITES_QUERY_KEY, next);
      void queryClient.invalidateQueries({ queryKey: ["customer-favorites-content"] });
    }
  });

  const active = favorites.data ? hasFavorite(favorites.data, kind, id) : false;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={translate(active ? "favoriteRemove" : "favoriteAdd")}
      accessibilityState={{ selected: active, disabled: favorites.isPending || mutation.isPending }}
      disabled={favorites.isPending || mutation.isPending || favorites.isError}
      onPress={() => mutation.mutate()}
      style={[styles.button, active && styles.active]}
    >
      <Text style={[styles.icon, active && styles.activeIcon]}>{active ? "♥" : "♡"}</Text>
      <Text style={[styles.label, active && styles.activeIcon]}>
        {translate(active ? "favoriteSaved" : "favoriteAdd")}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 42,
    minWidth: 112,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#D6D6D6",
    backgroundColor: "#FFFFFF",
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 12
  },
  active: { borderColor: "#C6F135", backgroundColor: "#F4F9E4" },
  icon: { color: "#737373", fontSize: 19, fontWeight: "900" },
  label: { color: "#555555", fontSize: 11, fontWeight: "800" },
  activeIcon: { color: "#536B0E" }
});
