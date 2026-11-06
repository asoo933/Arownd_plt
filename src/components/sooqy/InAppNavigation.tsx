import { useCallback, useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import { AlertCircle, LoaderCircle, Navigation, RotateCcw, X } from "lucide-react";
import { formatKm } from "@/lib/geo";

interface InAppNavigationProps {
  map: maplibregl.Map | null;
  origin: { lng: number; lat: number } | null;
  destination: { lng: number; lat: number; name?: string } | null;
  onClose: () => void;
}

const ROUTER = "https://router.project-osrm.org/route/v1/driving";
const SOURCE = "arownd-navigation-route";
const LAYER = "arownd-navigation-route-layer";

export function InAppNavigation({ map, origin, destination, onClose }: InAppNavigationProps) {
  const [coordinates, setCoordinates] = useState<[number, number][] | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [minutes, setMinutes] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);

  const loadRoute = useCallback(async () => {
    if (!origin || !destination) {
      setError("يلزم تحديد موقع الانطلاق والوجهة.");
      return;
    }

    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setLoading(true);
    setError(null);
    setCoordinates(null);

    try {
      const url = `${ROUTER}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
      const response = await fetch(url, { signal: current.signal });
      if (!response.ok) throw new Error("تعذّر الاتصال بخدمة المسارات.");

      const data = await response.json();
      const route = data.routes?.[0];
      if (data.code !== "Ok" || !route?.geometry?.coordinates?.length) {
        throw new Error("لم يتم العثور على مسار لهذه الوجهة.");
      }

      setDistance(route.distance / 1000);
      setMinutes(route.duration / 60);
      setCoordinates(route.geometry.coordinates);
    } catch (cause) {
      if (cause instanceof Error && cause.name === "AbortError") return;
      setError(cause instanceof Error ? cause.message : "فشل تحميل المسار.");
    } finally {
      if (controller.current === current) {
        controller.current = null;
        setLoading(false);
      }
    }
  }, [origin, destination]);

  useEffect(() => {
    void loadRoute();
    return () => controller.current?.abort();
  }, [loadRoute]);

  useEffect(() => {
    if (!map) return;

    const remove = () => {
      if (map.getLayer(LAYER)) map.removeLayer(LAYER);
      if (map.getSource(SOURCE)) map.removeSource(SOURCE);
    };

    const add = () => {
      if (!coordinates || !map.isStyleLoaded()) return;
      remove();
      map.addSource(SOURCE, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates },
        },
      });
      map.addLayer({
        id: LAYER,
        type: "line",
        source: SOURCE,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#C6F135",
          "line-width": 5,
          "line-opacity": 0.92,
        },
      });

      const first = coordinates[0] as maplibregl.LngLatLike;
      const bounds = coordinates.reduce(
        (result, point) => result.extend(point as maplibregl.LngLatLike),
        new maplibregl.LngLatBounds(first, first),
      );
      map.fitBounds(bounds, { padding: 72, maxZoom: 16, duration: 700 });
    };

    if (coordinates) {
      if (map.isStyleLoaded()) add();
      else map.once("load", add);
    } else {
      remove();
    }

    return () => {
      map.off("load", add);
      remove();
    };
  }, [map, coordinates]);

  if (!destination) return null;

  return (
    <section
      className="absolute inset-x-3 bottom-3 z-[1050] rounded-[var(--radius-card)] border border-border bg-card p-4 shadow-xl sm:inset-x-5 sm:bottom-5"
      aria-label="الملاحة إلى الوجهة"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-accent-ink">
          <Navigation className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground">المسار إلى الوجهة</p>
          <p className="truncate text-xs text-muted-foreground">
            {destination.name ?? "الوجهة المحددة"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق الملاحة"
          className="icon-btn -me-2 -mt-2"
        >
          <X className="size-4" />
        </button>
      </div>

      {loading && (
        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" />
          جارٍ حساب المسار...
        </div>
      )}
      {error && (
        <div className="mt-3 flex items-start gap-2 text-sm text-danger" role="alert">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => void loadRoute()} className="font-bold underline">
            إعادة المحاولة
          </button>
        </div>
      )}
      {!loading && !error && distance !== null && minutes !== null && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-background px-3 py-3">
          <div>
            <p className="text-xs text-muted-foreground">المسافة</p>
            <p className="text-base font-extrabold text-foreground">{formatKm(distance)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">المدة التقديرية بالسيارة</p>
            <p className="text-base font-extrabold text-foreground">
              {Math.max(1, Math.round(minutes))} دقيقة
            </p>
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => map?.zoomIn()}
              aria-label="تكبير الخريطة"
              className="icon-btn"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => map?.zoomOut()}
              aria-label="تصغير الخريطة"
              className="icon-btn"
            >
              −
            </button>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => void loadRoute()}
        disabled={loading || !origin}
        className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-border text-sm font-semibold text-foreground disabled:opacity-50"
      >
        <RotateCcw className="size-4" />
        تحديث المسار
      </button>
    </section>
  );
}
