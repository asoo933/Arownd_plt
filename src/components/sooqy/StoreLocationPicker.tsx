import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import maplibreglWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import "maplibre-gl/dist/maplibre-gl.css";
import { OSM_RASTER_FALLBACK } from "./map-style";
import { AROWND_VERSATILES_STYLE } from "./map-style-versatiles";
import type { LatLng } from "@/lib/geo";

type Props = {
  value: LatLng | null;
  onChange: (value: LatLng) => void;
};

export function StoreLocationPicker({ value, onChange }: Props) {
  const [mapUnavailable, setMapUnavailable] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;
  const selectedLatitude = value?.lat;
  const selectedLongitude = value?.lng;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    maplibregl.setWorkerUrl(maplibreglWorkerUrl);
    const initialValue = valueRef.current;
    const initial: [number, number] = initialValue
      ? [initialValue.lng, initialValue.lat]
      : [3.0588, 36.7538];
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container,
        style: AROWND_VERSATILES_STYLE as maplibregl.StyleSpecification,
        center: initial,
        zoom: initialValue ? 15 : 12,
        attributionControl: { compact: true },
        dragRotate: false,
        touchPitch: false,
      });
    } catch {
      // WebGL may be unavailable in older devices and test browsers.
      // Store address fields remain usable without the optional map picker.
      setMapUnavailable(true);
      return;
    }
    mapRef.current = map;

    const placeMarker = (lngLat: maplibregl.LngLat) => {
      markerRef.current?.remove();
      markerRef.current = new maplibregl.Marker({ color: "#C6F135" }).setLngLat(lngLat).addTo(map);
      onChangeRef.current({ lat: lngLat.lat, lng: lngLat.lng });
    };

    map.on("click", (event) => placeMarker(event.lngLat));
    map.on("error", (event) => {
      const message = (event as unknown as { error?: { message?: string; url?: string } }).error;
      if (
        message?.url?.includes("openfreemap.org") ||
        message?.url?.includes("tiles.versatiles.org") ||
        message?.message?.includes("tile")
      ) {
        try {
          map.setStyle(OSM_RASTER_FALLBACK as maplibregl.StyleSpecification);
        } catch {
          // Keep the map's built-in error state; users can still use address fields.
        }
      }
    });
    map.once("load", () => {
      const currentValue = valueRef.current;
      if (currentValue) {
        markerRef.current = new maplibregl.Marker({ color: "#C6F135" })
          .setLngLat([currentValue.lng, currentValue.lat])
          .addTo(map);
      }
      requestAnimationFrame(() => map.resize());
    });

    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(container);
    return () => {
      resizeObserver.disconnect();
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const currentValue = valueRef.current;
    if (!map || !currentValue) return;
    if (markerRef.current) {
      markerRef.current.setLngLat([currentValue.lng, currentValue.lat]);
    } else {
      markerRef.current = new maplibregl.Marker({ color: "#C6F135" })
        .setLngLat([currentValue.lng, currentValue.lat])
        .addTo(map);
    }
  }, [selectedLatitude, selectedLongitude]);

  return (
    <div className="space-y-2">
      {mapUnavailable ? (
        <div className="rounded-xl border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
          الخريطة غير متاحة على هذا الجهاز. يمكنك متابعة إعداد المتجر باستخدام العنوان والبلدية.
        </div>
      ) : (
        <div className="h-72 overflow-hidden rounded-xl border border-border bg-muted">
          <div ref={containerRef} className="size-full" />
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        اضغط على الخريطة لتحديد موقع متجرك، أو حرّك الخريطة ثم اضغط على الموقع الصحيح.
      </p>
    </div>
  );
}
