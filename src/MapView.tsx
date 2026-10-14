import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
maplibregl.setWorkerUrl(workerUrl);
import type { Place } from "./solver";
import "maplibre-gl/dist/maplibre-gl.css";
type Props = {
  places: Place[];
  order?: number[];
  color?: string;
  editable?: boolean;
  adding?: boolean;
  onMove?: (id: string, lng: number, lat: number) => void;
  onAdd?: (lng: number, lat: number) => void;
};
export default function MapView(props: Props) {
  const container = useRef<HTMLDivElement>(null),
    map = useRef<maplibregl.Map>(),
    latest = useRef(props);
  const [ready, setReady] = useState(false),
    [error, setError] = useState(false);
  latest.current = props;
  useEffect(() => {
    if (!container.current) return;
    let instance: maplibregl.Map;
    try {
      instance = new maplibregl.Map({
        container: container.current,
        center: [106.8002, -6.2445],
        zoom: 10.2,
        style: {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              attribution:
                '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            },
          },
          layers: [
            {
              id: "osm",
              type: "raster",
              source: "osm",
              paint: { "raster-saturation": -0.85, "raster-opacity": 0.85 },
            },
          ],
        },
      });
      map.current = instance;
      instance.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        "top-right",
      );
      instance.on("load", () => setReady(true));
      instance.on("error", () => setError(true));
      instance.on("click", (event) => {
        if (latest.current.adding)
          latest.current.onAdd?.(event.lngLat.lng, event.lngLat.lat);
      });
      const observer = new ResizeObserver(() => instance.resize());
      observer.observe(container.current);
      return () => {
        observer.disconnect();
        instance.remove();
      };
    } catch {
      setError(true);
    }
  }, []);
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const markers = props.places.map((p, i) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = `map-pin ${i === 0 ? "origin-pin" : ""} ${props.order?.at(-1) === i && i !== 0 ? "end-pin" : ""}`;
      el.textContent = i === 0 ? "O" : String(i);
      el.title = `${p.name}${props.editable ? " — drag to move" : ""}`;
      el.setAttribute("aria-label", el.title);
      const marker = new maplibregl.Marker({
        element: el,
        draggable: props.editable,
      })
        .setLngLat([p.lng, p.lat])
        .addTo(m);
      marker.on("dragend", () => {
        const pos = marker.getLngLat();
        latest.current.onMove?.(p.id, pos.lng, pos.lat);
      });
      return marker;
    });
    return () => markers.forEach((marker) => marker.remove());
  }, [props.places, props.editable, props.order]);
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    if (m.getLayer("route-line")) m.removeLayer("route-line");
    if (m.getSource("route")) m.removeSource("route");
    if (props.order) {
      m.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: props.order.map((i) => [
              props.places[i].lng,
              props.places[i].lat,
            ]),
          },
        },
      });
      m.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": props.color || "#226857",
          "line-width": 4,
          "line-opacity": 0.85,
        },
      });
    }
  }, [ready, props.order, props.places, props.color]);
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    const bounds = new maplibregl.LngLatBounds();
    if (props.editable) {
      const origin = props.places[0],
        dx = Math.max(
          0.005,
          ...props.places.map((p) => Math.abs(p.lng - origin.lng)),
        ),
        dy = Math.max(
          0.005,
          ...props.places.map((p) => Math.abs(p.lat - origin.lat)),
        );
      bounds.extend([
        Math.max(-180, origin.lng - dx),
        Math.max(-85, origin.lat - dy),
      ]);
      bounds.extend([
        Math.min(180, origin.lng + dx),
        Math.min(85, origin.lat + dy),
      ]);
    } else {
      props.places.forEach((p) => bounds.extend([p.lng, p.lat]));
    }
    m.fitBounds(bounds, { padding: 45, maxZoom: 12, duration: 0 });
  }, [ready]);
  return (
    <div className={`map-wrap ${props.adding ? "adding" : ""}`}>
      <div ref={container} className="map" />
      {error && (
        <div className="map-warning">
          Some map tiles could not load. Coordinate editing and optimization
          still work.
        </div>
      )}
      {props.adding && (
        <div className="map-hint">Click the map to place a waypoint</div>
      )}
    </div>
  );
}
