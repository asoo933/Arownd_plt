import { ClientOnly, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import {
  ArrowLeft,
  ArrowRight,
  Crosshair,
  Minus,
  Navigation,
  Plus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { ALGIERS, formatKm, geoErrorMessage, isOpenNow, useGeo } from "@/lib/geo";
import { fetchNearStores } from "@/lib/sooqy";
import { OpenBadge, VerifiedBadge } from "@/components/sooqy/badges";
import { ErrorState } from "@/components/sooqy/error-state";
import { InAppNavigation } from "@/components/sooqy/InAppNavigation";
import { RatingStars } from "@/components/sooqy/rating-stars";
import { useTranslation } from "@/lib/i18n";
import { useRealtimeSubscription } from "@/hooks/use-realtime";

const StoreMap = lazy(() => import("@/components/sooqy/StoreMap"));

export function MapPage() {
  const { pos, locating, ask } = useGeo();
  useRealtimeSubscription({ table: "stores", queryKeys: [["near-stores"]] });
  const { t, isRTL } = useTranslation();
  const [active, setActive] = useState<string | null>(null);
  const [navigationOrigin, setNavigationOrigin] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [navigationTarget, setNavigationTarget] = useState<{
    lat: number;
    lng: number;
    name?: string;
  } | null>(null);
  const [center, setCenter] = useState(ALGIERS);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const stores = useQuery({
    queryKey: ["near-stores", null, pos?.lat, pos?.lng],
    queryFn: () => fetchNearStores(null, pos?.lat, pos?.lng),
  });

  const selectedStore =
    stores.data?.find((store) => store.id === active) ?? null;

  const locateUser = async () => {
    const result = await ask();
    if (!result.pos) {
      toast.error(geoErrorMessage(result.reason));
      return;
    }

    setCenter(result.pos);
    setActive(null);
    mapRef.current?.flyTo({
      center: [result.pos.lng, result.pos.lat],
      zoom: Math.max(mapRef.current.getZoom(), 15),
      duration: 700,
    });
  };

  const zoomIn = () => mapRef.current?.zoomIn({ duration: 220 });
  const zoomOut = () => mapRef.current?.zoomOut({ duration: 220 });

  return (
    <main className="fixed inset-0 z-[100] h-[100dvh] w-full overflow-hidden bg-[#F5F5F5]">
      <ClientOnly fallback={<div className="size-full animate-pulse bg-muted" />}>
        <Suspense fallback={<div className="size-full animate-pulse bg-muted" />}>
          <StoreMap
            ref={mapRef}
            center={pos && center === ALGIERS ? pos : center}
            user={pos}
            stores={stores.data ?? []}
            activeId={active}
            onSelect={setActive}
          />
        </Suspense>
      </ClientOnly>

      <Link
        to="/explore"
        aria-label={t("back")}
        className="absolute start-4 top-[max(env(safe-area-inset-top),1rem)] z-[1000] inline-flex size-12 items-center justify-center rounded-2xl border border-white/80 bg-white/95 text-slate-900 shadow-[0_8px_28px_rgba(15,23,42,.18)] backdrop-blur-xl transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {isRTL ? <ArrowRight className="size-5" /> : <ArrowLeft className="size-5" />}
      </Link>

      <div
        className={`absolute end-4 z-[1000] flex flex-col gap-2 transition-[bottom] duration-200 ${selectedStore ? "bottom-64" : "bottom-[max(env(safe-area-inset-bottom),1.25rem)]"}`}
      >
        <button
          type="button"
          aria-label={t("map_zoom_in")}
          onClick={zoomIn}
          className="inline-flex size-12 items-center justify-center rounded-2xl border border-white/80 bg-white/95 text-slate-900 shadow-[0_8px_28px_rgba(15,23,42,.16)] backdrop-blur-xl transition active:scale-95"
        >
          <Plus className="size-5" />
        </button>
        <button
          type="button"
          aria-label={t("map_zoom_out")}
          onClick={zoomOut}
          className="inline-flex size-12 items-center justify-center rounded-2xl border border-white/80 bg-white/95 text-slate-900 shadow-[0_8px_28px_rgba(15,23,42,.16)] backdrop-blur-xl transition active:scale-95"
        >
          <Minus className="size-5" />
        </button>
        <button
          type="button"
          aria-label={t("map_my_location")}
          aria-busy={locating}
          disabled={locating}
          onClick={() => void locateUser()}
          className="inline-flex size-12 items-center justify-center rounded-2xl border border-white/80 bg-[#C6F135] text-[#0A0A0A] shadow-[0_8px_28px_rgba(15,23,42,.2)] transition active:scale-95 disabled:opacity-60"
        >
          <Crosshair className={`size-5 ${locating ? "animate-pulse" : ""}`} />
        </button>
      </div>

      {stores.isError && (
        <div className="absolute inset-x-4 top-20 z-[1000]">
          <ErrorState
            scope="map:stores"
            error={stores.error}
            onRetry={() => void stores.refetch()}
          />
        </div>
      )}

      {selectedStore && !navigationTarget && (
        <section
          aria-label={selectedStore.name}
          className="absolute inset-x-3 bottom-[max(env(safe-area-inset-bottom),0.75rem)] z-[1000] rounded-[26px] border border-white/90 bg-white/95 p-3.5 shadow-[0_18px_55px_rgba(15,23,42,.24)] backdrop-blur-2xl sm:inset-x-auto sm:end-5 sm:w-[min(420px,calc(100vw-2.5rem))]"
        >
          <button
            type="button"
            aria-label={t("close")}
            onClick={() => setActive(null)}
            className="absolute end-3 top-3 inline-flex size-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
          >
            <X className="size-4" />
          </button>

          <div className="flex gap-3">
            <div className="size-[92px] shrink-0 overflow-hidden rounded-2xl bg-slate-100">
              {selectedStore.cover_url ? (
                <img
                  src={selectedStore.cover_url}
                  alt=""
                  className="size-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="size-full bg-gradient-to-br from-[#EAF5C8] to-[#F3F4F6]" />
              )}
            </div>

            <div className="min-w-0 flex-1 pe-8">
              <h2 className="line-clamp-2 text-[15px] font-extrabold leading-6 text-slate-950">
                {selectedStore.name}
              </h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <OpenBadge open={isOpenNow(selectedStore.opening_hours)} />
                {selectedStore.is_verified && <VerifiedBadge />}
              </div>
              <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                {Number(selectedStore.rating) > 0 && (
                  <RatingStars rating={Number(selectedStore.rating)} size="size-3" showValue />
                )}
                {selectedStore.commune && <span className="truncate">{selectedStore.commune}</span>}
                {selectedStore.distance != null && (
                  <span className="font-bold text-slate-800">{formatKm(selectedStore.distance)}</span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link
              to="/stores/$storeId"
              params={{ storeId: selectedStore.id }}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 transition hover:bg-slate-50"
            >
              {t("map_view_store")}
            </Link>
            <button
              type="button"
              onClick={async () => {
                let start = pos;
                if (!start) {
                  const result = await ask();
                  start = result.pos;
                  if (!start) {
                    toast.error(geoErrorMessage(result.reason));
                    return;
                  }
                }
                setNavigationOrigin({ lat: start.lat, lng: start.lng });
                setNavigationTarget({
                  lat: Number(selectedStore.latitude),
                  lng: Number(selectedStore.longitude),
                  name: selectedStore.name,
                });
              }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#C6F135] px-3 text-sm font-extrabold text-[#0A0A0A] shadow-sm transition hover:bg-[#b8e52a]"
            >
              <Navigation className="size-4" />
              {t("map_directions")}
            </button>
          </div>
        </section>
      )}

      {navigationTarget && (
        <InAppNavigation
          map={mapRef.current}
          origin={navigationOrigin}
          destination={navigationTarget}
          onClose={() => {
            setNavigationTarget(null);
            setNavigationOrigin(null);
          }}
        />
      )}
    </main>
  );
}
