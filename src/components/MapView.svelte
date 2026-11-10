<script>
  import { onMount } from "svelte";
  import { GlobeControl, Map as MapLibreMap, NavigationControl, Popup, setWorkerUrl } from "maplibre-gl";
  import "maplibre-gl/dist/maplibre-gl.css";
  import { TerraDraw, TerraDrawPolygonMode, TerraDrawRenderMode } from "terra-draw";
  import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";
  import * as api from "../lib/api.js";
  import { config } from "../lib/config.js";
  import { fillColorExpression, legendSwatch, pointColor, schemeFor, LEGEND_LABELS } from "../lib/palettes.js";
  import { popupNode } from "../lib/popup.js";
  import { cellsPerTile, encodeGeohash, gridPrecision } from "../lib/grid.js";
  import { createQuery, criteriaFromLayer, describe, polygonToWkt, wktToPolygon } from "../lib/query.js";
  import { app, toast } from "../lib/state.svelte.js";

  // Served from public/ so Vite does not inject its client into the worker.
  setWorkerUrl(`${import.meta.env.BASE_URL}maplibre-gl-worker.mjs`);

  let container;
  let map;
  let draw;
  let mapReady = $state(false);
  let suppressClicksUntil = 0;
  const tileUrls = new Map();
  const hoverBound = new Set();

  const renderStyles = {
    pointColor: "#5D757E",
    pointWidth: 4,
    pointOpacity: 1,
    pointOutlineColor: "#ffffff",
    pointOutlineWidth: 1,
    pointOutlineOpacity: 1,
    polygonFillColor: "#5D757E",
    polygonFillOpacity: 0.15,
    polygonOutlineColor: "#5D757E",
    polygonOutlineWidth: 2,
    lineStringColor: "#5D757E",
    lineStringWidth: 2,
    lineStringOpacity: 1,
    zIndex: 1,
  };

  function style() {
    return {
      version: 8,
      glyphs: config.glyphs,
      sources: {
        land: { type: "vector", tiles: [config.landTiles], minzoom: 0, maxzoom: config.maxZoom },
        coastlines: { type: "vector", tiles: [config.coastlineTiles], minzoom: 0, maxzoom: config.maxZoom },
        selection: { type: "geojson", data: emptyCollection() },
      },
      layers: [
        { id: "background", type: "background", paint: { "background-color": config.mapSurface } },
        {
          id: "land",
          type: "fill",
          source: "land",
          "source-layer": "land",
          paint: { "fill-color": config.mapSurface, "fill-opacity": 1 },
        },
        {
          id: "selection-fill",
          type: "fill",
          source: "selection",
          paint: { "fill-color": "#5D757E", "fill-opacity": 0.12 },
        },
        {
          id: "coastlines",
          type: "line",
          source: "coastlines",
          "source-layer": "coastlines",
          paint: { "line-color": config.coastline, "line-width": 0.4, "line-opacity": 0.85 },
        },
        {
          id: "selection-line",
          type: "line",
          source: "selection",
          paint: { "line-color": "#5D757E", "line-width": 2 },
        },
      ],
    };
  }

  function emptyCollection() {
    return { type: "FeatureCollection", features: [] };
  }

  function occurrenceUrl(query, points) {
    const prefix = points ? `tiletype=point&cellspertile=${cellsPerTile(true)}&` : "";
    return `${config.tiles}?${prefix}${query}`;
  }

  function removeOccurrence(id) {
    for (const suffix of ["labels", "geom"]) {
      const layerId = `occ-${id}-${suffix}`;
      if (map.getLayer(layerId)) map.removeLayer(layerId);
    }
    const sourceId = `occ-${id}`;
    if (map.getSource(sourceId)) map.removeSource(sourceId);
    tileUrls.delete(sourceId);
  }

  function bindHover(layerId) {
    if (hoverBound.has(layerId)) return;
    hoverBound.add(layerId);
    map.on("mouseenter", layerId, () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", layerId, () => {
      if (!app.drawing) map.getCanvas().style.cursor = "";
    });
  }

  function ensureSource(sourceId, url) {
    const existing = map.getSource(sourceId);
    if (!existing) {
      map.addSource(sourceId, { type: "vector", tiles: [url] });
      tileUrls.set(sourceId, url);
      return;
    }
    if (tileUrls.get(sourceId) !== url && existing.setTiles) {
      existing.setTiles([url]);
      tileUrls.set(sourceId, url);
    }
  }

  function syncSelection(wkt) {
    const geometry = wktToPolygon(wkt);
    const data = geometry
      ? { type: "Feature", geometry, properties: {} }
      : emptyCollection();
    map.getSource("selection")?.setData(data);
  }

  function syncLayers(snapshot) {
    const live = new Set(snapshot.map((layer) => layer.id));
    const stale = new Set();
    for (const layer of map.getStyle().layers) {
      const match = layer.id.match(/^occ-(\d+)-/);
      if (match && !live.has(Number(match[1]))) stale.add(Number(match[1]));
    }
    for (const id of stale) removeOccurrence(id);

    for (const layer of snapshot) {
      const sourceId = `occ-${layer.id}`;
      const geomId = `occ-${layer.id}-geom`;
      const labelId = `occ-${layer.id}-labels`;
      const url = occurrenceUrl(layer.query, layer.pointsMode);
      const colors = schemeFor(layer.scale).colors;
      const color = layer.pointsMode ? pointColor(layer.scale) : fillColorExpression(colors);
      const kind = layer.pointsMode ? "circle" : "fill";
      ensureSource(sourceId, url);
      const current = map.getLayer(geomId);
      if (current && current.type !== kind) {
        if (map.getLayer(labelId)) map.removeLayer(labelId);
        map.removeLayer(geomId);
      }
      if (!map.getLayer(geomId)) {
        const paint = layer.pointsMode
          ? {
              "circle-radius": 3.5,
              "circle-color": color,
              "circle-opacity": layer.opacity,
              "circle-stroke-width": 1,
              "circle-stroke-color": "#ffffff",
              "circle-stroke-opacity": 0.9,
            }
          : {
              "fill-color": color,
              "fill-opacity": layer.opacity,
              "fill-outline-color": "rgba(255,255,255,0.35)",
            };
        map.addLayer(
          {
            id: geomId,
            type: kind,
            source: sourceId,
            "source-layer": "grid",
            layout: { visibility: layer.visible ? "visible" : "none" },
            paint,
          },
          map.getLayer("coastlines") ? "coastlines" : undefined
        );
      } else if (layer.pointsMode) {
        map.setPaintProperty(geomId, "circle-color", color);
        map.setPaintProperty(geomId, "circle-opacity", layer.opacity);
      } else {
        map.setPaintProperty(geomId, "fill-color", color);
        map.setPaintProperty(geomId, "fill-opacity", layer.opacity);
      }
      map.setLayoutProperty(geomId, "visibility", layer.visible ? "visible" : "none");
      bindHover(geomId);

      if (!layer.showLabels || layer.pointsMode) {
        if (map.getLayer(labelId)) map.removeLayer(labelId);
      } else if (!map.getLayer(labelId)) {
        map.addLayer({
          id: labelId,
          type: "symbol",
          source: sourceId,
          "source-layer": "grid",
          layout: {
            visibility: layer.visible ? "visible" : "none",
            "text-field": ["coalesce", ["to-string", ["get", "doc_count"]], ""],
            "text-size": 11,
            "text-font": ["Noto Sans Regular"],
            "text-anchor": "center",
          },
          paint: {
            "text-color": "#0f172a",
            "text-halo-color": "rgba(255,255,255,0.9)",
            "text-halo-width": 1,
          },
        }, "selection-line");
      } else {
        map.setLayoutProperty(labelId, "visibility", layer.visible ? "visible" : "none");
      }
    }
  }

  function sync(snapshot, wkt) {
    syncSelection(wkt);
    syncLayers(snapshot);
  }

  $effect(() => {
    if (!mapReady || !map) return;
    const snapshot = app.layers.map((layer) => ({
      id: layer.id,
      pointsMode: layer.pointsMode,
      scale: layer.scale,
      opacity: Number(layer.opacity),
      showLabels: layer.showLabels,
      visible: layer.visible !== false,
      query: createQuery(criteriaFromLayer(layer)),
    }));
    const wkt = app.criteria.wkt;
    const frame = requestAnimationFrame(() => {
      try {
        sync(snapshot, wkt);
      } catch (error) {
        console.error(error);
      }
    });
    return () => cancelAnimationFrame(frame);
  });

  $effect(() => {
    if (!mapReady || !draw) return;
    if (app.drawing) {
      if (draw.getMode() !== "polygon") draw.setMode("polygon");
    } else if (draw.getMode() === "polygon") {
      draw.setMode("static");
    }
  });

  onMount(() => {
    map = new MapLibreMap({
      container,
      style: style(),
      center: [0, 18],
      zoom: 1.4,
      maxZoom: config.maxZoom,
      attributionControl: false,
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new GlobeControl(), "top-right");

    map.on("load", () => {
      draw = new TerraDraw({
        adapter: new TerraDrawMapLibreGLAdapter({ map }),
        modes: [
          new TerraDrawPolygonMode(),
          new TerraDrawRenderMode({ modeName: "static", styles: renderStyles }),
        ],
      });
      draw.start();
      draw.setMode("static");
      draw.on("finish", (id) => {
        suppressClicksUntil = performance.now() + 400;
        const feature = draw.getSnapshotFeature(id);
        const ring = feature?.geometry?.type === "Polygon" ? feature.geometry.coordinates[0] : null;
        if (ring) app.criteria.wkt = polygonToWkt(ring);
        draw.clear();
        app.drawing = false;
      });
      mapReady = true;
    });

    map.on("click", async (event) => {
      if (app.drawing || performance.now() < suppressClicksUntil) return;
      const layerIds = app.layers
        .map((layer) => `occ-${layer.id}-geom`)
        .filter((id) => map.getLayer(id));
      if (!layerIds.length) return;
      const features = map.queryRenderedFeatures(event.point, { layers: layerIds });
      if (!features.length) return;
      const match = features[0].layer.id.match(/^occ-(\d+)-/);
      const layer = app.layers.find((item) => String(item.id) === match?.[1]);
      if (!layer) return;
      try {
        const criteria = criteriaFromLayer(layer);
        criteria.geometry = encodeGeohash(
          event.lngLat.lat,
          event.lngLat.lng,
          gridPrecision(map.getZoom(), layer.pointsMode),
        );
        const pageQuery = (index) => ({ ...criteria, size: config.datasetPageSize, skip: index * config.datasetPageSize });
        const [statistics, datasets] = await Promise.all([
          api.statistics(criteria, createQuery),
          api.datasets(pageQuery(0), createQuery),
        ]);
        new Popup({ maxWidth: "360px" })
          .setLngLat(event.lngLat)
          .setDOMContent(popupNode({
            statistics,
            title: describe(layer).join(" · "),
            pageSize: config.datasetPageSize,
            firstPage: datasets.results || [],
            loadPage: (index) => api.datasets(pageQuery(index), createQuery).then((data) => data.results || []),
          }))
          .addTo(map);
      } catch {
        toast("Could not load records for this location");
      }
    });

    const observer = new ResizeObserver(() => map.resize());
    observer.observe(container);
    const onKey = (event) => {
      if (event.key === "Escape") app.drawing = false;
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      observer.disconnect();
      draw?.stop();
      map.remove();
    };
  });

  </script>

<div class="map-frame">
  <div class="map" bind:this={container}></div>
</div>
<div class="map-ui">
  {#if app.drawing}
    <p class="draw-hint">Click to add corners, then click the first point to close. Esc cancels.</p>
  {/if}
  <div class="legends">
    {#each app.layers.filter((layer) => layer.visible !== false) as layer (layer.id)}
      <div class="legend">
        {#if describe(layer).length}
          <span class="legend-title">{describe(layer).join(" · ")}</span>
        {/if}
        <div class="legend-bar">
          {#if layer.pointsMode}
            <i style:background={legendSwatch(pointColor(layer.scale), Number(layer.opacity))}></i>
          {:else}
            {#each schemeFor(layer.scale).colors as color}
              <i style:background={legendSwatch(color, Number(layer.opacity))}></i>
            {/each}
          {/if}
        </div>
        {#if !layer.pointsMode}
          <div class="legend-labels">
            {#each LEGEND_LABELS as label}
              <span>{label}</span>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>
