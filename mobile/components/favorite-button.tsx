import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button, Icon } from "@/components/ui";
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
        <Icon name="heart" size={19} color={active ? theme.colors.danger : theme.colors.muted} accessibilityHidden />
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

