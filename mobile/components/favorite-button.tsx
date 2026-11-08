import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Text } from "react-native";

import { Button } from "@/components/ui";
import { getFavorites, toggleFavorite } from "@/lib/favorites";
import { hasFavorite, type FavoriteKind } from "@/lib/favorites-state";
import { translate } from "@/lib/i18n";
import { useAppTheme } from "@/lib/theme";

export const FAVORITES_QUERY_KEY = ["customer-favorites"] as const;

export function FavoriteButton({ kind, id }: { kind: FavoriteKind; id: string }) {
  const theme = useAppTheme();
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
  const disabled = favorites.isPending || mutation.isPending || favorites.isError;

  return (
    <Button
      label={translate(active ? "favoriteSaved" : "favoriteAdd")}
      onPress={() => mutation.mutate()}
      variant="outline"
      size="sm"
      disabled={disabled}
      startIcon={
        <Text style={{
          color: active ? theme.colors.accentMuted : theme.colors.muted,
          fontSize: 19,
          fontWeight: "900"
        }}>{active ? "♥" : "♡"}</Text>
      }
      textStyle={{ color: active ? theme.colors.accentMuted : theme.colors.foreground, fontSize: 11 }}
      style={{
        minHeight: 44,
        minWidth: 112,
        borderRadius: 13,
        backgroundColor: active ? theme.colors.successSurface : theme.colors.surface,
        borderColor: active ? theme.colors.accentMuted : theme.colors.border
      }}
    />
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
