import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pressable, StyleSheet, Text } from "react-native";

import { getFavorites, toggleFavorite } from "@/lib/favorites";
import { hasFavorite, type FavoriteKind } from "@/lib/favorites-state";
import { translate } from "@/lib/i18n";
import { useAppTheme } from "@/lib/theme";

export const FAVORITES_QUERY_KEY = ["customer-favorites"] as const;

export function FavoriteButton({ kind, id }: { kind: FavoriteKind; id: string }) {
  const theme = useAppTheme();
  const style = styles(theme);
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
      style={[style.button, active && style.active]}
    >
      <Text style={[style.icon, active && style.activeIcon]}>{active ? "♥" : "♡"}</Text>
      <Text style={[style.label, active && style.activeIcon]}>
        {translate(active ? "favoriteSaved" : "favoriteAdd")}
      </Text>
    </Pressable>
  );
}

const styles = (theme: ReturnType<typeof useAppTheme>) => StyleSheet.create({
  button: {
    minHeight: 44,
    minWidth: 112,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 12
  },
  active: { borderColor: theme.colors.accentMuted, backgroundColor: theme.colors.successSurface },
  icon: { color: theme.colors.muted, fontSize: 19, fontWeight: "900" },
  label: { color: theme.colors.foreground, fontSize: 11, fontWeight: "800" },
  activeIcon: { color: theme.colors.accentMuted }
});
