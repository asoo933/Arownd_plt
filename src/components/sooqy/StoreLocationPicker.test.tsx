import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mapState = vi.hoisted(() => ({
  latestPosition: null as readonly [number, number] | null,
  onLoad: null as (() => void) | null,
}));

vi.mock("maplibre-gl", () => ({
  setWorkerUrl: vi.fn(),
  Map: class {
    on() {}
    once(_event: string, callback: () => void) {
      mapState.onLoad = callback;
    }
    resize() {}
    remove() {}
  },
  Marker: class {
    setLngLat(position: readonly [number, number]) {
      mapState.latestPosition = position;
      return this;
    }
    addTo() {
      return this;
    }
    remove() {}
  },
}));

vi.mock("maplibre-gl/dist/maplibre-gl-worker.mjs?url", () => ({
  default: "worker.js",
}));

import { StoreLocationPicker } from "./StoreLocationPicker";

describe("StoreLocationPicker", () => {
  beforeEach(() => {
    mapState.latestPosition = null;
    mapState.onLoad = null;
  });

  afterEach(() => cleanup());

  it("uses the latest selected location when the map finishes loading", () => {
    const { rerender } = render(
      <StoreLocationPicker value={{ lat: 36.7, lng: 3.1 }} onChange={vi.fn()} />,
    );

    rerender(<StoreLocationPicker value={{ lat: 35.7, lng: 2.1 }} onChange={vi.fn()} />);
    act(() => mapState.onLoad?.());

    expect(mapState.latestPosition).toEqual([2.1, 35.7]);
  });
});
