import { useQuery } from "@tanstack/react-query";
import { BottomNav } from "@/components/sooqy/BottomNav";
import { DeliveryNav } from "@/components/sooqy/DeliveryNav";
import { StudioNav } from "@/components/sooqy/StudioNav";
import { useAuth } from "@/lib/auth";
import { fetchMyAccountType } from "@/lib/sooqy";

export function AccountBottomNav() {
  const { user, ready } = useAuth();
  const accountType = useQuery({
    queryKey: ["my-account-type", user?.id],
    queryFn: fetchMyAccountType,
    enabled: ready && !!user,
  });
  if (!ready) return null;
  if (!user) return <BottomNav />;
  if (accountType.data === "merchant") return <StudioNav />;
  if (accountType.isLoading) return null;
  if (accountType.data === "delivery_company") return <DeliveryNav />;
  if (accountType.isError || !accountType.isSuccess) return <BottomNav />;
  if (accountType.data === "personal") return <BottomNav />;
  return null;
}
