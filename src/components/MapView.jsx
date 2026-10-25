
import React, { useEffect, useRef, useState } from 'react';

import {
  Map,
  NavigationControl,
  setWorkerUrl,
} from 'maplibre-gl';

import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';

// Register the Vite-bundled worker before creating the map.
setWorkerUrl(workerUrl);

const DATA_ROOT = '/data/floodsar/2024';

const DEFAULT_BOUNDS = [90.8, 22.5, 91.8, 23.5];

const OSM_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: [
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'osm-base',
      type: 'raster',
      source: 'osm',
      minzoom: 0,
      maxzoom: 22,
    },
  ],
};

const RASTER_LAYERS = [
  {
    id: 'opera_reference',
    title: 'OPERA reference classification',
    description: 'Reference observation: 21 Aug 2024',
    defaultVisible: true,
  },
  {
    id: 'common_valid_coverage',
    title: 'Common-valid coverage',
    description: 'Valid observations on both dates',
    defaultVisible: false,
  },
  {
    id: 'candidate_gain_m18',
    title: 'Candidate water gain (-18 dB)',
    description: 'Exploratory threshold transition',
    defaultVisible: false,
  },
  {
    id: 'candidate_loss_m18',
    title: 'Candidate water loss (-18 dB)',
    description: 'Exploratory threshold transition',
    defaultVisible: false,
  },
  {
    id: 'candidate_gain_m16',
    title: 'Candidate water gain (-16 dB)',
    description: 'Exploratory threshold transition',
    defaultVisible: false,
  },
  {
    id: 'candidate_loss_m16',
    title: 'Candidate water loss (-16 dB)',
    description: 'Exploratory threshold transition',
    defaultVisible: false,
  },
];

const INITIAL_VISIBLE_LAYERS = RASTER_LAYERS
  .filter((layer) => layer.defaultVisible)
  .map((layer) => layer.id);

function isSupportedEvent(event) {
  if (event?.id === 'feni-noakhali-2024') {
    return true;
  }

  const text = [
    event?.id,
    event?.name,
    event?.title,
    event?.label,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return text.includes('feni') && text.includes('noakhali');
}

// Accept geographic bounds in [west, south, east, north] order.
function normalizeBounds(value) {
  if (Array.isArray(value) && value.length === 4) {
    const bounds = value.map(Number);

    if (
      bounds.every(Number.isFinite) &&
      bounds[0] < bounds[2] &&
      bounds[1] < bounds[3] &&
      bounds[0] >= -180 &&
      bounds[2] <= 180 &&
      bounds[1] >= -90 &&
      bounds[3] <= 90
    ) {
      return bounds;
    }
  }

  if (value && typeof value === 'object') {
    const west =
      value.west ?? value.min_lon ?? value.minLng;

    const south =
      value.south ?? value.min_lat ?? value.minLat;

    const east =
      value.east ?? value.max_lon ?? value.maxLng;

    const north =
      value.north ?? value.max_lat ?? value.maxLat;

    if (
      [west, south, east, north].every(
        (item) => item !== undefined && item !== null
      )
    ) {
      return normalizeBounds([
        west,
        south,
        east,
        north,
      ]);
    }
  }

  return null;
}

function boundsFromManifest(manifest) {
  const candidates = [
    manifest?.bounds_wgs84,
    manifest?.boundsWgs84,
    manifest?.bbox_wgs84,
    manifest?.bbox,
    manifest?.bounds,
  ];

  for (const candidate of candidates) {
    const bounds = normalizeBounds(candidate);

    if (bounds) {
      return bounds;
    }
  }

  return null;
}

function validEventBounds(event) {
  if (
    !Array.isArray(event?.bbox) ||
    event.bbox.length !== 4
  ) {
    return null;
  }

  return normalizeBounds(event.bbox);
}

function MapView({ event }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);

  const [mapReady, setMapReady] = useState(false);
  const [rasterBounds, setRasterBounds] = useState(null);
  const [boundsError, setBoundsError] = useState('');
  const [mapError, setMapError] = useState('');
  const [layoutVersion, setLayoutVersion] = useState(0);

  const [visibleLayers, setVisibleLayers] = useState(
    INITIAL_VISIBLE_LAYERS
  );

  const supportedEvent = isSupportedEvent(event);

  // ----------------------------------------------------------
  // 1. Load the manifest independently of map initialization.
  // ----------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function loadRasterBounds() {
      try {
        const response = await fetch(
          `${DATA_ROOT}/manifest.json`
        );

        if (!response.ok) {
          throw new Error(
            `Manifest request failed: HTTP ${response.status}`
          );
        }

        const manifest = await response.json();
        const bounds = boundsFromManifest(manifest);

        if (!cancelled) {
          setRasterBounds(bounds);

          if (!bounds) {
            setBoundsError(
              'The manifest has no recognized geographic bounds. ' +
              'The event bounding box will be used instead.'
            );

            console.warn(
              '[FloodSAR] No valid WGS84 bounds found in manifest.',
              manifest
            );
          } else {
            setBoundsError('');
          }
        }
      } catch (error) {
        if (!cancelled) {
          setRasterBounds(null);
          setBoundsError(error.message);

          console.error(
            '[FloodSAR] Could not load raster bounds:',
            error
          );
        }
      }
    }

    loadRasterBounds();

    return () => {
      cancelled = true;
    };
  }, []);

  // ----------------------------------------------------------
  // 2. Initialize MapLibre and add the six local raster layers.
  // ----------------------------------------------------------
  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return undefined;
    }

    const map = new Map({
      container,
      style: OSM_STYLE,
      center: [91.3, 23.0],
      zoom: 7,
      minZoom: 5,
      maxZoom: 15,
      attributionControl: true,
    });

    mapRef.current = map;

    map.addControl(
      new NavigationControl(),
      'top-right'
    );

    const handleMapError = (event) => {
      const errorMessage =
        event.error?.message ??
        String(event.error ?? 'Unknown MapLibre error');

      console.error('[FloodSAR MapLibre error]', {
        message: errorMessage,
        sourceId: event.sourceId ?? null,
        source: event.source ?? null,
        tile: event.tile?.tileID?.canonical ?? null,
        error: event.error ?? null,
      });

      if (
        /could not be decoded|worker failed|webgl/i.test(
          errorMessage
        )
      ) {
        setMapError(errorMessage);
      }
    };

    const handleLoad = () => {
      if (mapRef.current !== map) {
        return;
      }

      try {
        RASTER_LAYERS.forEach((layer) => {
          const sourceId = `source-${layer.id}`;
          const mapLayerId = `layer-${layer.id}`;


map.addSource(sourceId, {
  type: 'raster',

  tiles: [
    `${DATA_ROOT}/tiles/${layer.id}/{z}/{x}/{y}.png`,
  ],

  // Exact WGS84 bounds from the verified tile manifest.
  // Prevent MapLibre from requesting tiles outside
  // the exported raster footprint.
  bounds: [
    90.8820305773257,
    22.020908899222206,
    91.58450881808984,
    23.26098175405549,
  ],

  tileSize: 256,
  minzoom: 6,
  maxzoom: 13,
  scheme: 'xyz',

  attribution:
    'OPERA DSWx-S1, NASA/JPL-Caltech; ' +
    'Sentinel-1, ESA/Copernicus.',
});


          map.addLayer({
            id: mapLayerId,
            type: 'raster',
            source: sourceId,
            minzoom: 6,
            maxzoom: 22,
            layout: {
              visibility: 'none',
            },
            paint: {
              'raster-opacity': 1,
              'raster-fade-duration': 0,
            },
          });
        });

        setMapError('');
        setMapReady(true);
      } catch (error) {
        console.error(
          '[FloodSAR] Could not initialize raster layers:',
          error
        );

        setMapError(error.message);
      }
    };

    map.on('error', handleMapError);
    map.on('load', handleLoad);

    // Resize the map when its parent or viewport changes.
    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current !== map) {
        return;
      }

      map.resize();
      setLayoutVersion((version) => version + 1);
    });

    resizeObserver.observe(container);

    if (container.parentElement) {
      resizeObserver.observe(container.parentElement);
    }

    return () => {
      resizeObserver.disconnect();

      map.off('error', handleMapError);
      map.off('load', handleLoad);

      map.remove();

      if (mapRef.current === map) {
        mapRef.current = null;
      }
    };
  }, []);

  // ----------------------------------------------------------
  // 3. Synchronize checkbox state with MapLibre visibility.
  // ----------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;

    if (!map || !mapReady) {
      return;
    }

    RASTER_LAYERS.forEach((layer) => {
      const mapLayerId = `layer-${layer.id}`;

      if (!map.getLayer(mapLayerId)) {
        return;
      }

      const shouldBeVisible =
        supportedEvent &&
        visibleLayers.includes(layer.id);

      map.setLayoutProperty(
        mapLayerId,
        'visibility',
        shouldBeVisible ? 'visible' : 'none'
      );
    });
  }, [mapReady, visibleLayers, supportedEvent]);

  // ----------------------------------------------------------
  // 4. Fit the map only after it has a usable canvas size.
  // ----------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;

    if (!map || !mapReady) {
      return;
    }

    map.resize();

    const rect = map.getContainer().getBoundingClientRect();

    // DevTools can temporarily shrink the application.
    // Avoid calling fitBounds with a near-zero canvas.
    if (rect.width < 240 || rect.height < 240) {
      return;
    }

    const eventBounds = validEventBounds(event);

    // Prefer the actual exported raster footprint for the
    // supported event. Fall back to the event bbox if needed.
    const bounds =
      supportedEvent && rasterBounds
        ? rasterBounds
        : eventBounds ?? DEFAULT_BOUNDS;

    try {
      map.fitBounds(
        [
          [bounds[0], bounds[1]],
          [bounds[2], bounds[3]],
        ],
        {
          padding: {
            top: 40,
            right: 40,
            bottom: 40,
            left: 40,
          },
          maxZoom: 9,
          duration: 0,
        }
      );
    } catch (error) {
      console.error(
        '[FloodSAR] Could not fit map to study bounds:',
        error
      );
    }
  }, [
    mapReady,
    rasterBounds,
    event,
    supportedEvent,
    layoutVersion,
  ]);

  // ----------------------------------------------------------
  // 5. Layer checkbox handler.
  // ----------------------------------------------------------
  const toggleLayer = (layerId) => {
    setVisibleLayers((current) =>
      current.includes(layerId)
        ? current.filter((id) => id !== layerId)
        : [...current, layerId]
    );
  };

  return (
    <section className="relative w-full overflow-hidden rounded-xl border border-[#1e2d4a] bg-[#0a192f] shadow-2xl">

      {/* Explicit dimensions prevent a zero-height MapLibre canvas. */}
      <div className="relative h-[65vh] min-h-[520px] w-full">

        <div
          ref={containerRef}
          className="h-full w-full"
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            minHeight: '520px',
          }}
          aria-label="FloodSAR satellite reference and candidate-change map"
        />

        {/* Observation dates */}
        <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-lg border border-slate-600 bg-[#0a192f]/95 px-3 py-2 text-xs text-white shadow-lg sm:text-sm">
          <div className="font-semibold">
            Sentinel-1 comparison
          </div>

          <div className="mt-1 text-slate-300">
            09 Aug → 21 Aug 2024
          </div>
        </div>

        {/* Raster layer controls */}
        <div className="absolute left-4 top-24 z-10 max-h-[55%] w-[min(290px,calc(100%-32px))] overflow-y-auto rounded-lg border border-slate-600 bg-[#0a192f]/95 p-3 text-white shadow-xl">

          <h3 className="mb-1 text-sm font-semibold">
            Map layers
          </h3>

          <p className="mb-3 text-xs leading-relaxed text-slate-400">
            Select the reference classification or an
            exploratory candidate-change layer.
          </p>

          <div className="space-y-3">
            {RASTER_LAYERS.map((layer) => (
              <label
                key={layer.id}
                className={`flex cursor-pointer items-start gap-2 ${
                  supportedEvent
                    ? ''
                    : 'cursor-not-allowed opacity-50'
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-1 accent-cyan-400"
                  checked={visibleLayers.includes(layer.id)}
                  disabled={!supportedEvent || !mapReady}
                  onChange={() => toggleLayer(layer.id)}
                />

                <span className="min-w-0">
                  <span className="block text-xs font-medium">
                    {layer.title}
                  </span>

                  <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-400">
                    {layer.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Scientific interpretation notice */}
        <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-10 rounded-lg border border-amber-400/40 bg-[#0a192f]/95 p-3 text-xs leading-relaxed text-amber-100 shadow-lg sm:left-auto sm:right-4 sm:max-w-sm">
          <strong>Interpretation notice:</strong>{' '}
          Candidate gains and losses indicate exploratory
          backscatter changes. They are not confirmed flood
          extent. OPERA is a satellite-derived reference
          product, not independent ground truth.
        </div>

        {/* Unsupported event */}
        {!supportedEvent && (
          <div className="absolute inset-x-4 top-1/2 z-20 mx-auto max-w-md -translate-y-1/2 rounded-lg border border-amber-400/50 bg-[#0a192f]/95 p-4 text-center text-sm text-white shadow-xl">
            Verified raster layers are currently available
            only for Feni and Noakhali, August 2024.
            Select that event to display the satellite data.
          </div>
        )}

        {/* Loading indicator */}
        {!mapReady && (
          <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-[#0a192f]/60">
            <div className="rounded-lg bg-[#0a192f] px-4 py-3 text-sm text-white">
              Loading satellite map…
            </div>
          </div>
        )}

        {/* Map rendering error */}
        {mapError && (
          <div className="absolute bottom-4 left-4 right-4 z-40 rounded-lg border border-red-400/50 bg-[#450a0a]/95 p-3 text-xs text-red-100 shadow-xl sm:bottom-24">
            <strong>Map rendering error:</strong>{' '}
            {mapError}
            <p className="mt-1">
              Check the browser console for the source and tile details.
            </p>
          </div>
        )}

        {/* Bounds warning */}
        {boundsError && (
          <div className="pointer-events-none absolute bottom-4 left-4 z-10 max-w-sm rounded-lg border border-slate-600 bg-[#0a192f]/90 p-2 text-[10px] text-slate-300">
            Raster bounds unavailable; using event bounds.
          </div>
        )}
      </div>

      {/* Legends */}
      <div className="grid grid-cols-1 gap-4 border-t border-[#1e2d4a] bg-[#0a192f] p-4 sm:grid-cols-2">

        <div>
          <h4 className="mb-2 text-sm font-semibold text-white">
            OPERA reference legend
          </h4>

          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded-sm bg-[#237df5]" />
              Open water
            </div>

            <div className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded-sm bg-[#2aaa5a]" />
              Inundated vegetation
            </div>

            <div className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded-sm border border-slate-500 bg-transparent" />
              Transparent: non-water or unavailable data
            </div>
          </div>
        </div>

        <div>
          <h4 className="mb-2 text-sm font-semibold text-white">
            Candidate-change legend
          </h4>

          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded-sm bg-[#ef4444]" />
              Candidate gain, −18 dB
            </div>

            <div className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded-sm bg-[#f59e0b]" />
              Candidate loss, −18 dB
            </div>

            <div className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded-sm bg-[#fb7185]" />
              Candidate gain, −16 dB
            </div>

            <div className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded-sm bg-[#facc15]" />
              Candidate loss, −16 dB
            </div>

            <div className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded-sm bg-[#22d3ee]" />
              Common-valid observation coverage
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default MapView;
