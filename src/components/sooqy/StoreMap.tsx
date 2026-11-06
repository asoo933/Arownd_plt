import React, { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import maplibreglWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import "maplibre-gl/dist/maplibre-gl.css";
import { MAP_COLORS, OSM_RASTER_FALLBACK } from "./map-style";
import { AROWND_VERSATILES_STYLE, VERSATILES_SOURCE_ID } from "./map-style-versatiles";
import type { LatLng } from "@/lib/geo";
import type { Store } from "@/lib/sooqy";


const C = MAP_COLORS;

function hasWebGL2(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2"));
  } catch {
    return false;
  }
}

function gpuInfo(): string {
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    if (!gl) return "لا يوجد WebGL2";
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : "غير معروف";
    return renderer;
  } catch {
    return "تعذّر القراءة";
  }
}

const DEBUG = (() => {
  if (import.meta.env.DEV) return true;
  try {
    if (typeof window === "undefined") return false;
    if (/[?&]mapdebug/.test(window.location.search)) return true;
    return window.localStorage.getItem("sooqy:mapdebug") === "1";
  } catch {
    return false;
  }
})();

function dbg(...args: unknown[]) {
  if (DEBUG) console.log("[StoreMap]", ...args);
}

function createMarkerElement(): HTMLElement {
  const root = document.createElement("div");
  root.style.cssText =
    "display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer;outline:none;";

  const pill = document.createElement("div");
  pill.className = "arownd-pin-pill";
  pill.style.cssText = [
    "max-width:176px",
    "padding:5px 11px",
    "border-radius:12px",
    "background:rgba(255,255,255,.98)",
    "border:1px solid rgba(157,187,24,.42)",
    "color:" + C.ink,
    "font-size:12px",
    "font-weight:800",
    "line-height:1.35",
    "white-space:nowrap",
    "overflow:hidden",
    "text-overflow:ellipsis",
    "box-shadow:0 5px 16px rgba(15,23,42,.18)",
    "opacity:0",
    "transform:translateY(4px) scale(.94)",
    "transition:opacity .18s ease, transform .18s ease",
    "pointer-events:none",
  ].join(";");

  const pin = document.createElement("div");
  pin.className = "arownd-pin-dot";
  pin.style.cssText =
    "display:flex;align-items:center;justify-content:center;border-radius:50%;color:#172033;border:3px solid #fff;transition:transform .18s ease, box-shadow .18s ease, border-width .18s ease;";

  const glyph = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  glyph.setAttribute("viewBox", "0 0 24 24");
  glyph.setAttribute("width", "18");
  glyph.setAttribute("height", "18");
  glyph.setAttribute("fill", "none");
  glyph.setAttribute("stroke", "#26320D");
  glyph.setAttribute("stroke-width", "1.9");
  glyph.setAttribute("stroke-linecap", "round");
  glyph.setAttribute("stroke-linejoin", "round");
  glyph.setAttribute("aria-hidden", "true");
  const body = document.createElementNS("http://www.w3.org/2000/svg", "path");
  body.setAttribute("d", "M15 21v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5M2 10h20M3.5 6 2 10v2a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0v-2l-1.5-4ZM4 21h16M4 10v11M20 10v11");
  glyph.append(body);
  pin.append(glyph);
  root.append(pill, pin);
  return root;
}

function applyMarkerStyle(el: HTMLElement, active: boolean, label = ""): HTMLElement {
  const pill = el.querySelector(".arownd-pin-pill") as HTMLElement | null;
  const pin = el.querySelector(".arownd-pin-dot") as HTMLElement | null;
  if (!pill || !pin) return el;

  if (label && pill.textContent !== label) pill.textContent = label;
  pill.style.opacity = active ? "1" : "0";
  pill.style.transform = active ? "translateY(0) scale(1)" : "translateY(4px) scale(.94)";
  pill.style.pointerEvents = active ? "auto" : "none";

  const size = active ? 42 : 34;
  const border = active ? 4 : 3;
  const shadow = active
    ? "0 10px 28px rgba(157,187,24,.42), 0 0 0 7px rgba(223,255,69,.3)"
    : "0 5px 16px rgba(15,23,42,.24), 0 0 0 3px rgba(255,255,255,.72)";
  pin.style.width = size + "px";
  pin.style.height = size + "px";
  pin.style.borderWidth = border + "px";
  pin.style.boxShadow = shadow;
  pin.style.background = active
    ? C.primaryDeep
    : `linear-gradient(135deg, ${C.primary} 0%, ${C.primaryDark} 100%)`;
  pin.style.transform = active ? "scale(1.12)" : "scale(1)";
  pin.style.background = active ? "#C6F135" : "#FFFFFF";
  pin.style.borderColor = "#FFFFFF";
  el.style.zIndex = active ? "20" : "1";

  return el;
}

const StoreMapComponent = React.memo(
  React.forwardRef<
    maplibregl.Map | null,
    {
      center: LatLng;
      user?: LatLng | null;
      stores?: Store[];
      activeId?: string | null;
      onSelect?: (id: string | null) => void;
    }
  >(function StoreMapComponent({ center, user, stores = [], activeId, onSelect }, ref) {
    const mapRef = useRef<maplibregl.Map | null>(null);
    const initialCenterRef = useRef(center);
    const containerRef = useRef<HTMLDivElement>(null);
    const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
    const userMarkerRef = useRef<maplibregl.Marker | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);
    const [tilesWarn, setTilesWarn] = useState(false);
    const [usedFallback, setUsedFallback] = useState(false);
    const [mapReady, setMapReady] = useState(false);
    const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
    const usedFallbackRef = useRef(false);

    useEffect(() => {
      maplibregl.setWorkerUrl(maplibreglWorkerUrl);
      usedFallbackRef.current = false;
      if (DEBUG) dbg("عنوان الـ worker:", maplibreglWorkerUrl);
    }, []);

    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const cr = entry.contentRect;
          setContainerSize({ w: Math.round(cr.width), h: Math.round(cr.height) });
          if (mapRef.current && cr.width > 0 && cr.height > 0) {
            requestAnimationFrame(() => mapRef.current?.resize());
          }
        }
      });
      ro.observe(el);
      const cr = el.getBoundingClientRect();
      setContainerSize({ w: Math.round(cr.width), h: Math.round(cr.height) });
      return () => ro.disconnect();
    }, []);

    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      const markers = markersRef.current;
      if (!hasWebGL2()) {
        setError("متصفحك لا يدعم WebGL2 — لا يمكن عرض الخريطة.");
        return;
      }
      if (el.clientWidth === 0 || el.clientHeight === 0) {
        dbg("تحذير: الحاوية بلا مقاس فعلي — الخريطة لن تظهر مهما كان الإعداد صحيحًا");
      }
      dbg("مقاس الحاوية:", el.clientWidth, "×", el.clientHeight);
      dbg("WebGL2:", hasWebGL2(), "· كرت الرسوميات:", gpuInfo());
      dbg("سياق آمن:", window.isSecureContext, "· متصل:", navigator.onLine);

      // إجبار العنصر على العرض الكامل (قد يكون محصوراً بـ Suspense/ClientOnly)
      el.style.width = "100%";
      el.style.height = "100%";
      el.style.minWidth = "100%";
      el.style.minHeight = "100%";
      // تعيين ارتفاع أدنى للخريطة على الأجهزة المتحركة لضمان الرؤية
      if (el.clientWidth < 768) {
        el.style.minHeight = "400px";
      }

      const map = new maplibregl.Map({
        container: el,
        style: AROWND_VERSATILES_STYLE as maplibregl.StyleSpecification,
        center: [initialCenterRef.current.lng, initialCenterRef.current.lat] as [number, number],
        zoom: 13,
        attributionControl: { compact: true },
        dragRotate: true,
        touchPitch: true,
        pitch: 55,
        bearing: -12,
        maxPitch: 60,
        cooperativeGestures: true,
        maxZoom: 19,
        minZoom: 4,
        maxCanvasSize: [4096, 4096],
      });

      mapRef.current = map;
      if (typeof ref === "function") ref(map);
      else if (ref && typeof ref === "object") ref.current = map;

      // إجبار تغيير الحجم بعد إنشاء الخريطة (الحاوية قد تكون 1px أثناء Suspense)
      requestAnimationFrame(() => map.resize());

      map.on("style.load", () => {
        dbg("حدث style.load — النمط المتجهي حُمّل");
        setUsedFallback(usedFallbackRef.current);
        // Keep the map in 3D and enable terrain whenever a style is (re)loaded.
        // The fallback raster style has no DEM source, so add it before enabling relief.
        try {
          if (!map.getSource("arownd-terrain-dem")) {
            map.addSource("arownd-terrain-dem", {
              type: "raster-dem",
              tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
              tileSize: 256,
              maxzoom: 15,
              encoding: "terrarium",
              attribution:
                'Terrain data: <a href="https://registry.opendata.aws/terrain-tiles/" target="_blank" rel="noreferrer">Mapzen / AWS Terrain Tiles</a>',
            });
          }
          map.setTerrain({ source: "arownd-terrain-dem", exaggeration: 1.15 });
          map.easeTo({ pitch: 55, duration: 0 });
        } catch (terrainError) {
          console.warn("[StoreMap] تعذّر تفعيل التضاريس تلقائياً:", terrainError);
        }
        setTilesWarn(false);
        setMapReady(true);
        requestAnimationFrame(() => map.resize());
      });

      map.on("error", (e) => {
        const err = (
          e as unknown as { error?: { message?: string; url?: string; status?: number } }
        ).error;
        const msg = err?.message ?? String(e);
        const url = err?.url ?? "";
        console.error("[StoreMap] خطأ في الخريطة:", msg, url);
        // A terrain tile failure must never replace the working basemap.
        if (url.includes("elevation-tiles-prod")) {
          console.warn("[StoreMap] تعذّر تحميل بلاطات التضاريس؛ ستبقى الخريطة الأساسية متاحة.");
          try {
            map.setTerrain(null);
          } catch {
            // The style may already be changing.
          }
          return;
        }
        if (usedFallbackRef.current) return;
        if (
          url.includes("openfreemap.org/planet") ||
          url.includes("tiles.versatiles.org/tiles/osm") ||
          url.includes("tiles.versatiles.org/fonts") ||
          msg.includes("source") ||
          msg.includes("tile") ||
          msg.includes("Style")
        ) {
          console.warn(
            "[StoreMap] فشل تحميل البلاطات المتجهية — التحويل للنمط الاحتياطي (OSM نقطي)",
          );
          try {
            setMapReady(false);
            usedFallbackRef.current = true;
            setUsedFallback(true);
            map.setStyle(OSM_RASTER_FALLBACK as maplibregl.StyleSpecification);
            setTilesWarn(true);
          } catch (err2) {
            console.error("[StoreMap] فشل التحويل للـ fallback:", err2);
            setError("تعذّر عرض الخريطة بسبب مشكلة في مصدر البلاطات.");
          }
        }
      });

      map.on("load", () => {
        dbg("حدث load — الخريطة جاهزة");
        setMapReady(true);
        setTimeout(() => {
          try {
            if (!map.areTilesLoaded()) {
              setTilesWarn(true);
              dbg("tiles: لم تصل بلاطات بعد (areTilesLoaded=false)");
            } else {
              dbg("tiles: وصلت أول بلاطة بنجاح ✔");
            }
          } catch {
            /* ignore */
          }
        }, 7000);
      });

      map.on("idle", () => {
        const cw = Math.round(map.getCanvas().width);
        const ch = Math.round(map.getCanvas().height);
        dbg("حدث idle · canvas:", cw, "×", ch, "· loaded:", map.areTilesLoaded());
        if (cw < 100) {
          // العرض صغير جداً — إجبار resize
          requestAnimationFrame(() => map.resize());
        }
      });

      // مراقبة تغيير مقاس الحاوية فعلياً (ResizeObserver إضافي للخريطة نفسها)
      const roMap = new ResizeObserver(() => {
        if (mapRef.current) {
          const cw = mapRef.current.getCanvas().width;
          if (cw < 100) {
            requestAnimationFrame(() => mapRef.current!.resize());
          }
        }
      });
      roMap.observe(el);

      // فحص دوري احتياطي: إذا بقي العرض صغيراً بعد تحميل النمط، نعيد المحاولة
      const checkInterval = setInterval(() => {
        if (mapRef.current && mapRef.current.getCanvas().width < 100) {
          mapRef.current.resize();
        } else {
          clearInterval(checkInterval);
        }
      }, 500);
      setTimeout(() => clearInterval(checkInterval), 10000);

      map.on("data", (e) => {
        if (e.dataType === "source" && e.sourceId === VERSATILES_SOURCE_ID && e.isSourceLoaded) {
          dbg("وصلت بيانات البلاطات المتجهية ✔");
        }
      });

      return () => {
        markers.forEach((m) => m.remove());
        markers.clear();
        userMarkerRef.current?.remove();
        userMarkerRef.current = null;
        mapRef.current?.remove();
        mapRef.current = null;
        if (typeof ref === "function") ref(null);
        else if (ref && typeof ref === "object") ref.current = null;
        roMap.disconnect();
        clearInterval(checkInterval);
      };
    }, [attempt, ref]);

    useEffect(() => {
      const map = mapRef.current;
      if (!map) return;
      map.setCenter([center.lng, center.lat]);
    }, [center.lat, center.lng]);

    // Cluster store coordinates in a GeoJSON source. Detailed DOM pins are
    // mounted only at neighborhood zoom to keep wide-area views responsive.
    useEffect(() => {
      const map = mapRef.current;
      if (!mapReady || !map) return;

      const sourceId = "arownd-store-points";
      const clusterLayerId = "arownd-store-clusters";
      const countLayerId = "arownd-store-cluster-count";
      const pointLayerId = "arownd-store-unclustered";

      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 48,
          clusterMinPoints: 2,
        });
      }
      if (!map.getLayer(clusterLayerId)) {
        map.addLayer({
          id: clusterLayerId,
          type: "circle",
          source: sourceId,
          filter: ["has", "point_count"],
          paint: {
            "circle-color": [
              "step",
              ["get", "point_count"],
              "#B9D84B",
              10,
              "#8FBF3D",
              30,
              "#638F36",
            ],
            "circle-radius": ["step", ["get", "point_count"], 21, 10, 25, 30, 30],
            "circle-stroke-color": "#FFFFFF",
            "circle-stroke-width": 3.5,
            "circle-opacity": 0.98,
            "circle-blur": 0.02,
          },
        });
      }
      if (!map.getLayer(countLayerId)) {
        map.addLayer({
          id: countLayerId,
          type: "symbol",
          source: sourceId,
          filter: ["has", "point_count"],
          layout: {
            "text-field": ["to-string", ["get", "point_count_abbreviated"]],
            "text-size": 13,
            "text-font": ["Noto Sans Bold"],
            "text-allow-overlap": true,
          },
          paint: { "text-color": "#24311B" },
        });
      }
      if (!map.getLayer(pointLayerId)) {
        map.addLayer({
          id: pointLayerId,
          type: "circle",
          source: sourceId,
          filter: ["!", ["has", "point_count"]],
          maxzoom: 14,
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 5, 12, 7, 14, 9],
            "circle-color": "#DFFF45",
            "circle-stroke-color": "#FFFFFF",
            "circle-stroke-width": 2.5,
            "circle-opacity": 1,
          },
        });
      }

      const onClusterClick = (event: maplibregl.MapMouseEvent) => {
        const features = map.queryRenderedFeatures(event.point, { layers: [clusterLayerId] });
        const feature = features[0];
        if (!feature) return;
        const clusterId = Number(feature.properties?.["cluster_id"]);
        const source = map.getSource(sourceId) as maplibregl.GeoJSONSource;
        const coordinates = (feature.geometry as { coordinates: [number, number] }).coordinates;
        void source
          .getClusterExpansionZoom(clusterId)
          .then((zoom) => {
            map.easeTo({
              center: coordinates,
              zoom: Math.min(zoom + 0.35, 17),
              duration: 520,
            });
          })
          .catch((clusterError: unknown) => {
            dbg("تعذّر توسيع مجموعة المتاجر:", clusterError);
          });
      };
      const onClusterEnter = () => {
        map.getCanvas().style.cursor = "pointer";
      };
      const onClusterLeave = () => {
        map.getCanvas().style.cursor = "";
      };
      const onStorePointClick = (event: maplibregl.MapMouseEvent) => {
        const features = map.queryRenderedFeatures(event.point, { layers: [pointLayerId] });
        const storeId = features[0]?.properties?.["id"];
        if (typeof storeId !== "string" && typeof storeId !== "number") return;
        onSelect?.(String(storeId));
      };
      const onStorePointEnter = () => {
        map.getCanvas().style.cursor = "pointer";
      };
      const onStorePointLeave = () => {
        map.getCanvas().style.cursor = "";
      };

      map.on("click", clusterLayerId, onClusterClick);
      map.on("mouseenter", clusterLayerId, onClusterEnter);
      map.on("mouseleave", clusterLayerId, onClusterLeave);
      map.on("click", pointLayerId, onStorePointClick);
      map.on("mouseenter", pointLayerId, onStorePointEnter);
      map.on("mouseleave", pointLayerId, onStorePointLeave);

      const features = stores.flatMap((store) => {
        const item = store as Store & {
          latitude?: number | null;
          longitude?: number | null;
          category?: string | null;
        };
        if (
          typeof item.latitude !== "number" ||
          typeof item.longitude !== "number" ||
          !Number.isFinite(item.latitude) ||
          !Number.isFinite(item.longitude) ||
          Math.abs(item.latitude) > 90 ||
          Math.abs(item.longitude) > 180
        ) {
          return [];
        }
        return [
          {
            type: "Feature" as const,
            geometry: {
              type: "Point" as const,
              coordinates: [item.longitude, item.latitude],
            },
            properties: {
              id: String(store.id),
              name: store.name ?? "",
              category: item.category ?? "",
            },
          },
        ];
      });
      (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData({
        type: "FeatureCollection",
        features,
      });

      const renderDetailMarkers = () => {
        const visibleIds = new Set<string>();
        if (map.getZoom() >= 14.5) {
          stores.forEach((store) => {
            const item = store as Store & {
              latitude?: number | null;
              longitude?: number | null;
              category?: string | null;
            };
            const id = String(store.id);
            if (
              typeof item.latitude !== "number" ||
              typeof item.longitude !== "number" ||
              !Number.isFinite(item.latitude) ||
              !Number.isFinite(item.longitude) ||
              Math.abs(item.latitude) > 90 ||
              Math.abs(item.longitude) > 180
            ) {
              return;
            }
            visibleIds.add(id);
            let marker = markersRef.current.get(id);
            if (!marker) {
              const el = createMarkerElement();
              el.setAttribute("role", "button");
              el.setAttribute("tabindex", "0");
              el.setAttribute("aria-label", store.name ? `فتح متجر ${store.name}` : "فتح المتجر");
              el.title = store.name ?? "متجر";
              el.addEventListener("keydown", (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect?.(id);
                }
              });
              marker = new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat([
                item.longitude,
                item.latitude,
              ]);
              el.addEventListener("click", () => onSelect?.(id));
              marker.addTo(map);
              markersRef.current.set(id, marker);
            } else {
              marker.setLngLat([item.longitude, item.latitude]);
              const glyph = marker.getElement().querySelector(".arownd-pin-dot span");
              
              marker
                .getElement()
                .setAttribute("aria-label", store.name ? `فتح متجر ${store.name}` : "فتح المتجر");
              marker.getElement().title = store.name ?? "متجر";
            }
            applyMarkerStyle(marker.getElement(), activeId === id, String(store.name ?? ""));
          });
        }
        markersRef.current.forEach((marker, id) => {
          if (!visibleIds.has(id)) {
            marker.remove();
            markersRef.current.delete(id);
          }
        });
      };
      renderDetailMarkers();
      map.on("zoomend", renderDetailMarkers);
      return () => {
        map.off("click", clusterLayerId, onClusterClick);
        map.off("mouseenter", clusterLayerId, onClusterEnter);
        map.off("mouseleave", clusterLayerId, onClusterLeave);
        map.off("click", pointLayerId, onStorePointClick);
        map.off("mouseenter", pointLayerId, onStorePointEnter);
        map.off("mouseleave", pointLayerId, onStorePointLeave);
        map.off("zoomend", renderDetailMarkers);
      };
    }, [stores, activeId, mapReady, onSelect]);

    useEffect(() => {
      const map = mapRef.current;
      if (!mapReady || !map) return;
      if (userMarkerRef.current) userMarkerRef.current.remove();
      if (!user) return;
      const el = document.createElement("div");
      el.style.cssText =
        "width:14px;height:14px;border-radius:9999px;background:#2563EB;border:2px solid #fff;box-shadow:0 0 0 4px rgba(37,99,235,.22),0 6px 16px rgba(37,99,235,.3);animation:arownd-pulse 1.8s ease-in-out infinite;";
      userMarkerRef.current = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([user.lng, user.lat])
        .addTo(map);
    }, [user, mapReady]);

    if (error) {
      return (
        <div className="relative size-full flex flex-col items-center justify-center gap-3 text-center px-4 bg-[#F8FAFC]">
          <div className="text-base font-bold text-[#111827]">{error}</div>
          <div className="text-xs text-[#64748B]">كرت الرسوميات: {gpuInfo()}</div>
          <button
            onClick={() => {
              setError(null);
              setAttempt((a) => a + 1);
            }}
            className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#DFFF45] px-4 py-2 text-sm font-bold text-[#17191C] shadow-soft"
          >
            إعادة المحاولة
          </button>
        </div>
      );
    }

    return (
      <div className="relative size-full" style={{ width: "100%", height: "100%" }}>
        <div
          ref={containerRef}
          className="absolute inset-0"
          style={{ width: "100%", height: "100%" }}
        />
        {DEBUG && containerSize.w === 0 && containerSize.h === 0 && (
          <div className="absolute end-2 top-2 z-10 rounded-md bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-900 shadow-soft">
            الحاوية 0×0 — تحقق من ارتفاع المسار (bottom-16 + calc(100vh-4rem))
          </div>
        )}
        {tilesWarn && !usedFallback && (
          <div className="absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full bg-white/95 px-3 py-1 text-[11px] font-bold text-[#334155] shadow-soft ring-1 ring-[#E2E8F0]">
            لم تصل بلاطات الخريطة بعد — قد يستغرق بضع ثوانٍ أو يظهر عند تحريك الخريطة
          </div>
        )}
        {usedFallback && (
          <div className="absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-900 shadow-soft ring-1 ring-amber-200">
            تم التحويل لنمط OSM احتياطيًا (بلاطات متجهية غير متاحة مؤقتًا)
          </div>
        )}
        <style>{`
        @keyframes arownd-pulse {
          0% { box-shadow: 0 0 0 0 rgba(37,99,235,.45), 0 6px 16px rgba(37,99,235,.3); }
          70% { box-shadow: 0 0 0 10px rgba(37,99,235,0), 0 6px 16px rgba(37,99,235,.3); }
          100% { box-shadow: 0 0 0 0 rgba(37,99,235,0), 0 6px 16px rgba(37,99,235,.3); }
        }
      `}</style>
      </div>
    );
  }),
);

StoreMapComponent.displayName = "StoreMap";

export default StoreMapComponent;
