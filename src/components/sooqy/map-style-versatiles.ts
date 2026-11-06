import type { StyleSpecification } from "maplibre-gl";

/**
 * Arownd experimental map style — VersaTiles / Shortbread.
 *
 * This is intentionally isolated from the production OpenMapTiles style.
 * The public VersaTiles demo endpoint is for prototyping only; production
 * should use a self-hosted or SLA-backed tile service.
 */
export const VERSATILES_SOURCE_ID = "arownd-shortbread";

const COLORS = {
  land: "#F4F6FA",
  residential: "#E9EDF4",
  green: "#DCEFE2",
  greenSoft: "#EAF5EC",
  water: "#C5D9F4",
  waterLine: "#9DBCEB",
  building: "#E1E7F0",
  buildingEdge: "#D0D9E7",
  road: "#FFFFFF",
  roadCase: "#CCD6E6",
  roadCaseStrong: "#BFCDE2",
  boundary: "#AAB8D5",
  city: "#202A3A",
  place: "#46556D",
  minor: "#63718A",
  waterLabel: "#6684B6",
  halo: "#FFFFFF",
};

const polygon = ["match", ["geometry-type"], ["Polygon", "MultiPolygon"], true, false];
const line = ["match", ["geometry-type"], ["LineString", "MultiLineString"], true, false];
const localName = ["coalesce", ["get", "name_ar"], ["get", "name"], ["get", "name_en"]];

const layers: unknown[] = [
  { id: "arownd-background", type: "background", paint: { "background-color": COLORS.land } },

  {
    id: "arownd-land",
    type: "fill",
    source: VERSATILES_SOURCE_ID,
    "source-layer": "land",
    filter: polygon,
    paint: {
      "fill-color": [
        "match",
        ["get", "kind"],
        ["forest", "park", "garden", "recreation_ground", "grass", "meadow", "grassland"],
        COLORS.green,
        ["residential", "commercial", "retail"],
        COLORS.residential,
        COLORS.land,
      ],
      "fill-opacity": 0.9,
    },
  },
  {
    id: "arownd-water",
    type: "fill",
    source: VERSATILES_SOURCE_ID,
    "source-layer": "water_polygons",
    filter: polygon,
    paint: { "fill-color": COLORS.water, "fill-antialias": true },
  },
  {
    id: "arownd-water-lines",
    type: "line",
    source: VERSATILES_SOURCE_ID,
    "source-layer": "water_lines",
    filter: line,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": COLORS.waterLine,
      "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.6, 14, 2.2, 19, 5],
    },
  },
  {
    id: "arownd-boundaries",
    type: "line",
    source: VERSATILES_SOURCE_ID,
    "source-layer": "boundaries",
    filter: ["<=", ["to-number", ["get", "admin_level"]], 4],
    paint: {
      "line-color": COLORS.boundary,
      "line-width": ["interpolate", ["linear"], ["zoom"], 3, 0.7, 10, 1.5],
      "line-dasharray": [3, 2],
    },
  },

  // Road casings first, then road surfaces.
  {
    id: "arownd-road-casing",
    type: "line",
    source: VERSATILES_SOURCE_ID,
    "source-layer": "streets",
    filter: [
      "all",
      line,
      [
        "match",
        ["get", "kind"],
        ["motorway", "trunk", "primary", "secondary", "tertiary"],
        true,
        false,
      ],
    ],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": COLORS.roadCase,
      "line-width": ["interpolate", ["exponential", 1.35], ["zoom"], 5, 1, 10, 2.8, 16, 9, 20, 24],
    },
  },
  {
    id: "arownd-roads-major",
    type: "line",
    source: VERSATILES_SOURCE_ID,
    "source-layer": "streets",
    filter: [
      "all",
      line,
      [
        "match",
        ["get", "kind"],
        ["motorway", "trunk", "primary", "secondary", "tertiary"],
        true,
        false,
      ],
    ],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": COLORS.road,
      "line-width": [
        "interpolate",
        ["exponential", 1.35],
        ["zoom"],
        5,
        0.6,
        10,
        1.8,
        16,
        6,
        20,
        18,
      ],
    },
  },
  {
    id: "arownd-roads-local",
    type: "line",
    source: VERSATILES_SOURCE_ID,
    "source-layer": "streets",
    minzoom: 11,
    filter: [
      "all",
      line,
      [
        "match",
        ["get", "kind"],
        [
          "residential",
          "unclassified",
          "service",
          "pedestrian",
          "living_street",
          "footway",
          "path",
        ],
        true,
        false,
      ],
    ],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": COLORS.road,
      "line-width": ["interpolate", ["linear"], ["zoom"], 11, 0.55, 14, 1.35, 16, 2.5, 20, 8],
    },
  },

  {
    id: "arownd-buildings-footprint",
    type: "fill",
    source: VERSATILES_SOURCE_ID,
    "source-layer": "buildings",
    minzoom: 13.5,
    filter: ["!", ["has", "part"]],
    paint: {
      "fill-color": COLORS.building,
      "fill-outline-color": COLORS.buildingEdge,
      "fill-opacity": ["interpolate", ["linear"], ["zoom"], 13.5, 0.18, 15, 0.72, 17, 0.96],
    },
  },
  {
    id: "arownd-buildings-3d",
    type: "fill-extrusion",
    source: VERSATILES_SOURCE_ID,
    "source-layer": "buildings",
    minzoom: 14,
    filter: [
      "all",
      ["!=", ["get", "hide_3d"], true],
      ["!=", ["get", "part"], true],
      [">", ["to-number", ["get", "height"], 0], 0],
    ],
    paint: {
      "fill-extrusion-color": [
        "interpolate",
        ["linear"],
        ["to-number", ["get", "height"], 0],
        4,
        "#E7ECF3",
        18,
        "#D5DFEC",
        55,
        "#C4D2E3",
      ],
      "fill-extrusion-height": [
        "interpolate",
        ["linear"],
        ["zoom"],
        14,
        0,
        15,
        ["max", ["to-number", ["get", "height"], 0], ["to-number", ["get", "min_height"], 0]],
      ],
      "fill-extrusion-base": ["coalesce", ["to-number", ["get", "min_height"]], 0],
      "fill-extrusion-opacity": 0.94,
      "fill-extrusion-vertical-gradient": true,
    },
  },

  {
    id: "arownd-water-labels",
    type: "symbol",
    source: VERSATILES_SOURCE_ID,
    "source-layer": "water_polygons_labels",
    minzoom: 10,
    layout: {
      "text-field": localName,
      "text-font": ["Noto Sans Regular"],
      "text-size": 12,
      "text-max-width": 8,
    },
    paint: {
      "text-color": COLORS.waterLabel,
      "text-halo-color": COLORS.halo,
      "text-halo-width": 1.4,
    },
  },
  {
    id: "arownd-place-labels",
    type: "symbol",
    source: VERSATILES_SOURCE_ID,
    "source-layer": "place_labels",
    minzoom: 5,
    layout: {
      "text-field": localName,
      "text-font": ["Noto Sans Regular"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 5, 11, 9, 15, 14, 19],
      "text-max-width": 9,
      "text-padding": 5,
    },
    paint: {
      "text-color": [
        "match",
        ["get", "kind"],
        ["city", "capital", "state_capital"],
        COLORS.city,
        COLORS.place,
      ],
      "text-halo-color": COLORS.halo,
      "text-halo-width": 1.6,
    },
  },
];

export const AROWND_VERSATILES_STYLE = {
  version: 8,
  name: "Arownd · VersaTiles prototype",
  glyphs: "https://tiles.versatiles.org/fonts/{fontstack}/{range}.pbf",
  sources: {
    // Loaded only when the user enables terrain through map.setTerrain().
    // Public open-data DEM tiles; no terrain requests are made in the default view.
    "arownd-terrain-dem": {
      type: "raster-dem",
      tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
      tileSize: 256,
      maxzoom: 15,
      encoding: "terrarium",
      attribution:
        'Terrain data: <a href="https://registry.opendata.aws/terrain-tiles/" target="_blank" rel="noreferrer">Mapzen / AWS Terrain Tiles</a>',
    },
    [VERSATILES_SOURCE_ID]: {
      type: "vector",
      tiles: ["https://tiles.versatiles.org/tiles/osm/{z}/{x}/{y}"],
      minzoom: 0,
      maxzoom: 14,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors · Land cover <a href="https://esa-worldcover.org/" target="_blank" rel="noreferrer">ESA WorldCover</a>',
    },
  },
  layers,
} as unknown as StyleSpecification;
