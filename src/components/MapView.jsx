import React, { useEffect, useRef, useState } from 'react';
import { Map, NavigationControl, setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';

setWorkerUrl(workerUrl);

const DEFAULT_BOUNDS = [90.8, 22.5, 91.8, 23.5];

const EVENT_CONFIGS = {
  'feni-noakhali-2024': {
    dataRoot: '/data/floodsar/2024',
    title: 'Sentinel-1 comparison',
    fallbackBounds: [90.8820305773257, 22.020908899222206, 91.58450881808984, 23.26098175405549],
  },
  'sylhet-2022': {
  dataRoot: '/data/Sylhet 2022',
  title: 'Sylhet cross-sensor comparison',
  fallbackBounds: [91.62613493234578, 24.594444480975483, 92.49543124788984, 25.187447682456046],
},
};

const OSM_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    },
  },
  layers: [
    { id: 'osm-base', type: 'raster', source: 'osm', minzoom: 0, maxzoom: 22 },
  ],
};

function normalizeBounds(value) {
  if (Array.isArray(value) && value.length === 4) {
    const bounds = value.map(Number);
    if (
      bounds.every(Number.isFinite) &&
      bounds[0] < bounds[2] && bounds[1] < bounds[3] &&
      bounds[0] >= -180 && bounds[2] <= 180 &&
      bounds[1] >= -90 && bounds[3] <= 90
    ) return bounds;
  }

  if (value && typeof value === 'object') {
    const west = value.west ?? value.min_lon ?? value.minLng;
    const south = value.south ?? value.min_lat ?? value.minLat;
    const east = value.east ?? value.max_lon ?? value.maxLng;
    const north = value.north ?? value.max_lat ?? value.maxLat;
    if ([west, south, east, north].every((item) => item !== undefined && item !== null)) {
      return normalizeBounds([west, south, east, north]);
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
    if (bounds) return bounds;
  }
  return null;
}

function validEventBounds(event) {
  return normalizeBounds(event?.bbox);
}

function formatDate(value) {
  if (!value || typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getDateLabel(manifest) {
  const dates = manifest?.observation_dates;
  if (dates?.before && dates?.after) {
    return `${formatDate(dates.before)} -> ${formatDate(dates.after)}`;
  }
  const comparisonDate = manifest?.comparison_date ?? dates?.comparison;
  if (comparisonDate) return `Comparison date: ${formatDate(comparisonDate)}`;
  return 'Comparison date not specified in manifest';
}

const FENI_LEGENDS = [
  {
    title: 'OPERA reference legend',
    items: [
      { color: '#237df5', label: 'Open water' },
      { color: '#2aaa5a', label: 'Inundated vegetation' },
      { color: 'transparent', border: true, label: 'Transparent: non-water or unavailable data' },
    ],
  },
  {
    title: 'Candidate-change legend',
    items: [
      { color: '#ef4444', label: 'Candidate gain, -18 dB' },
      { color: '#f59e0b', label: 'Candidate loss, -18 dB' },
      { color: '#fb7185', label: 'Candidate gain, -16 dB' },
      { color: '#facc15', label: 'Candidate loss, -16 dB' },
      { color: '#22d3ee', label: 'Common-valid observation coverage' },
    ],
  },
];

const SYLHET_LEGENDS = [
  {
    title: 'Reference and corroboration layers',
    items: [
      { color: '#2563eb', label: 'GFM flood classification (strict domain)' },
      { color: '#a855f7', label: 'ALOS-2 detected-water fraction (positive detections only)' },
    ],
  },
  {
    title: 'Sentinel-1 candidate-change layers',
    items: [
      { color: '#f59e0b', label: 'Candidate water gain, -18 dB' },
      { color: '#06b6d4', label: 'Candidate water gain, -16 dB' },
    ],
  },
  {
    title: 'Comparison-domain layer',
    items: [
      { color: '#14b8a6', label: 'Strict evaluation domain' },
      { color: '#64748b', label: 'Excluded / not eligible (combined codes 2-7)' },
    ],
  },
];

function MapView({ event }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const eventId = event?.id;
  const eventBBox = event?.bbox;
  const config = EVENT_CONFIGS[eventId] ?? null;

  const [mapReady, setMapReady] = useState(false);
  const [manifest, setManifest] = useState(null);
  const [visibleLayers, setVisibleLayers] = useState([]);
  const [mapError, setMapError] = useState('');
  const [boundsError, setBoundsError] = useState('');
  const [layoutVersion, setLayoutVersion] = useState(0);

  const supportedEvent = Boolean(config);
  const layers = Array.isArray(manifest?.layers) ? manifest.layers : [];
  const legendGroups = eventId === 'sylhet-2022'
    ? SYLHET_LEGENDS
    : eventId === 'feni-noakhali-2024'
      ? FENI_LEGENDS
      : [];

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    let cancelled = false;
    const eventBounds = normalizeBounds(eventBBox) ?? config?.fallbackBounds ?? DEFAULT_BOUNDS;
    setMapReady(false);
    setManifest(null);
    setVisibleLayers([]);
    setMapError('');
    setBoundsError('');

    const map = new Map({
      container,
      style: OSM_STYLE,
      center: [(eventBounds[0] + eventBounds[2]) / 2, (eventBounds[1] + eventBounds[3]) / 2],
      zoom: 7,
      minZoom: 5,
      maxZoom: 15,
      attributionControl: true,
    });
    mapRef.current = map;
    map.addControl(new NavigationControl(), 'top-right');

    const handleMapError = (mapEvent) => {
      const message = mapEvent.error?.message ?? String(mapEvent.error ?? 'Unknown MapLibre error');
      console.error('[FloodSAR MapLibre error]', {
        message,
        sourceId: mapEvent.sourceId ?? null,
        tile: mapEvent.tile?.tileID?.canonical ?? null,
      });
      if (/could not be decoded|worker failed|webgl|404|failed to fetch/i.test(message)) {
        if (!cancelled) setMapError(message);
      }
    };

    const handleLoad = async () => {
      if (cancelled || mapRef.current !== map) return;

      if (!config) {
        map.fitBounds([[eventBounds[0], eventBounds[1]], [eventBounds[2], eventBounds[3]]], {
          padding: 40,
          maxZoom: 9,
          duration: 0,
        });
        setMapReady(true);
        return;
      }

      try {
        const response = await fetch(`${config.dataRoot}/manifest.json`, { cache: 'no-store' });
        if (!response.ok) throw new Error(`Manifest request failed: HTTP ${response.status}`);
        const loadedManifest = await response.json();
        if (!Array.isArray(loadedManifest.layers) || loadedManifest.layers.length === 0) {
          throw new Error('The event manifest does not contain a valid layers array.');
        }
        if (cancelled || mapRef.current !== map) return;

        const rasterBounds = boundsFromManifest(loadedManifest);
        if (!rasterBounds) {
          setBoundsError('Manifest bounds unavailable; using the event bounding box.');
        }

        const defaultIds = [];
        loadedManifest.layers.forEach((layer) => {
          if (!layer?.id || !layer?.tile_template) {
            throw new Error('A manifest layer is missing id or tile_template.');
          }
          const sourceId = `source-${layer.id}`;
          const mapLayerId = `layer-${layer.id}`;
          const tileTemplate = String(layer.tile_template).replace(/^\/+/, '');
          const tileUrl = `${config.dataRoot}/${tileTemplate}`;
          const sourceOptions = {
            type: 'raster',
            tiles: [tileUrl],
            tileSize: Number(layer.tile_size ?? loadedManifest.tile_size ?? 256),
            minzoom: Number(layer.minzoom ?? loadedManifest.minzoom ?? 0),
            maxzoom: Number(layer.maxzoom ?? loadedManifest.maxzoom ?? 13),
            scheme: loadedManifest.tile_scheme === 'TMS' ? 'tms' : 'xyz',
            attribution: loadedManifest.attribution ?? '&copy; FloodSAR BD data providers',
          };
          if (rasterBounds) sourceOptions.bounds = rasterBounds;
          map.addSource(sourceId, sourceOptions);
          map.addLayer({
            id: mapLayerId,
            type: 'raster',
            source: sourceId,
            minzoom: Number(layer.minzoom ?? loadedManifest.minzoom ?? 0),
            maxzoom: 22,
            layout: { visibility: 'none' },
            paint: { 'raster-opacity': 1, 'raster-fade-duration': 0 },
          });
          if (layer.default_visibility) defaultIds.push(layer.id);
        });

        setManifest(loadedManifest);
        setVisibleLayers(defaultIds);
        const fitBounds = rasterBounds ?? eventBounds;
        map.resize();
        map.fitBounds([[fitBounds[0], fitBounds[1]], [fitBounds[2], fitBounds[3]]], {
          padding: { top: 40, right: 40, bottom: 40, left: 40 },
          maxZoom: 10,
          duration: 0,
        });
        setMapReady(true);
      } catch (error) {
        console.error('[FloodSAR] Could not initialize event raster layers:', error);
        if (!cancelled) {
          setMapError(error.message ?? String(error));
          setMapReady(true);
        }
      }
    };

    map.on('error', handleMapError);
    map.on('load', handleLoad);

    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current !== map) return;
      map.resize();
      setLayoutVersion((version) => version + 1);
    });
    resizeObserver.observe(container);
    if (container.parentElement) resizeObserver.observe(container.parentElement);

    return () => {
      cancelled = true;
      resizeObserver.disconnect();
      map.off('error', handleMapError);
      map.off('load', handleLoad);
      map.remove();
      if (mapRef.current === map) mapRef.current = null;
    };
  }, [eventId, eventBBox, config]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !manifest) return;
    manifest.layers.forEach((layer) => {
      const mapLayerId = `layer-${layer.id}`;
      if (!map.getLayer(mapLayerId)) return;
      map.setLayoutProperty(
        mapLayerId,
        'visibility',
        visibleLayers.includes(layer.id) ? 'visible' : 'none'
      );
    });
  }, [mapReady, manifest, visibleLayers, eventId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    map.resize();
    const rect = map.getContainer().getBoundingClientRect();
    if (rect.width < 240 || rect.height < 240) return;
    if (!manifest) return;
    const bounds = boundsFromManifest(manifest) ?? normalizeBounds(eventBBox) ?? config?.fallbackBounds;
    if (!bounds) return;
    map.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]], {
      padding: { top: 40, right: 40, bottom: 40, left: 40 },
      maxZoom: 10,
      duration: 0,
    });
  }, [mapReady, manifest, eventId, eventBBox, config, layoutVersion]);

  const toggleLayer = (layerId) => {
    setVisibleLayers((current) => current.includes(layerId)
      ? current.filter((id) => id !== layerId)
      : [...current, layerId]);
  };

  const dateLabel = manifest ? getDateLabel(manifest) : (eventId === 'feni-noakhali-2024'
    ? '09 Aug -> 21 Aug 2024'
    : eventId === 'sylhet-2022'
      ? 'Comparison date: 18 Jun 2022'
      : '');
  const interpretationNotice = manifest?.interpretation_warning ??
    'Candidate gains and losses indicate exploratory backscatter changes, not confirmed flood extent.';

  return (
    <section className="relative w-full overflow-hidden rounded-xl border border-[#1e2d4a] bg-[#0a192f] shadow-2xl">
      <div className="relative h-[65vh] min-h-[520px] w-full">
        <div
          ref={containerRef}
          className="h-full w-full"
          style={{ position: 'relative', width: '100%', height: '100%', minHeight: '520px' }}
          aria-label="FloodSAR satellite reference and candidate-change map"
        />

        <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-lg border border-slate-600 bg-[#0a192f]/95 px-3 py-2 text-xs text-white shadow-lg sm:text-sm">
          <div className="font-semibold">{config?.title ?? 'FloodSAR map'}</div>
          {dateLabel && <div className="mt-1 text-slate-300">{dateLabel}</div>}
        </div>

        {supportedEvent && manifest && (
          <div className="absolute left-4 top-24 z-10 max-h-[55%] w-[min(310px,calc(100%-32px))] overflow-y-auto rounded-lg border border-slate-600 bg-[#0a192f]/95 p-3 text-white shadow-xl">
            <h3 className="mb-1 text-sm font-semibold">Map layers</h3>
            <p className="mb-3 text-xs leading-relaxed text-slate-400">
              Select one or more layers. Sylhet layers describe GFM reference water, Sentinel-1 candidate changes, ALOS-2 mapped positives, or comparison eligibility.
            </p>
            <div className="space-y-3">
              {layers.map((layer) => (
                <label key={layer.id} className="flex cursor-pointer items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-1 accent-cyan-400"
                    checked={visibleLayers.includes(layer.id)}
                    disabled={!mapReady}
                    onChange={() => toggleLayer(layer.id)}
                  />
                  <span className="min-w-0">
                    <span className="block text-xs font-medium">{layer.title ?? layer.id}</span>
                    <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-400">{layer.description ?? ''}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {!supportedEvent && (
          <div className="absolute inset-x-4 top-1/2 z-20 mx-auto max-w-md -translate-y-1/2 rounded-lg border border-amber-400/50 bg-[#0a192f]/95 p-4 text-center text-sm text-white shadow-xl">
            Verified raster layers are currently available for Feni and Noakhali (August 2024) and Sylhet (June 2022). This event does not yet have a prepared raster package.
          </div>
        )}

        {!mapReady && (
          <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-[#0a192f]/60">
            <div className="rounded-lg bg-[#0a192f] px-4 py-3 text-sm text-white">Loading satellite map...</div>
          </div>
        )}

        {mapError && (
          <div className="absolute bottom-4 left-4 right-4 z-40 rounded-lg border border-red-400/50 bg-[#450a0a]/95 p-3 text-xs text-red-100 shadow-xl">
            <strong>Map loading notice:</strong> {mapError}
            <p className="mt-1">Check the browser developer console and confirm that manifest.json and the XYZ PNG tile paths exist under public/data.</p>
          </div>
        )}

        {boundsError && (
          <div className="pointer-events-none absolute bottom-4 left-4 z-10 max-w-sm rounded-lg border border-slate-600 bg-[#0a192f]/90 p-2 text-[10px] text-slate-300">
            {boundsError}
          </div>
        )}

        {manifest?.interpretation_warning && (
          <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-10 rounded-lg border border-amber-400/40 bg-[#0a192f]/95 p-3 text-xs leading-relaxed text-amber-100 shadow-lg sm:left-auto sm:right-4 sm:max-w-sm">
            <strong>Interpretation notice:</strong> {interpretationNotice}
          </div>
        )}
      </div>

      {manifest && (
        <div className="grid grid-cols-1 gap-4 border-t border-[#1e2d4a] bg-[#0a192f] p-4 sm:grid-cols-2">
          {legendGroups.map((group) => (
            <div key={group.title}>
              <h4 className="mb-2 text-sm font-semibold text-white">{group.title}</h4>
              <div className="space-y-2 text-xs text-slate-300">
                {group.items.map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <span
                      className={`h-3.5 w-3.5 shrink-0 rounded-sm ${item.border ? 'border border-slate-500' : ''}`}
                      style={{ backgroundColor: item.color }}
                    />
                    {item.label}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {eventId === 'sylhet-2022' && (
            <div className="sm:col-span-2 rounded-lg border border-amber-400/30 bg-amber-500/5 p-3 text-xs leading-relaxed text-slate-300">
              Domain colors indicate comparison eligibility categories, not flood classes. ALOS-2 positive overlap is corroborating evidence only; the original ALOS-2 observation footprint and independent accuracy remain unverified.
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default MapView;
