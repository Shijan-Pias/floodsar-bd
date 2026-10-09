import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import MaplibreCompare from '@maplibre/maplibre-gl-compare';
import '@maplibre/maplibre-gl-compare/dist/maplibre-gl-compare.css';
import { getWaterMask } from '../api/floodApi';

const osmStyle = {
  version: 8,
  sources: {
    'osm': {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
      ],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap Contributors'
    }
  },
  layers: [
    {
      id: 'osm-tiles',
      type: 'raster',
      source: 'osm',
      minzoom: 0,
      maxzoom: 22
    }
  ]
};

const MapView = ({ event }) => {
  const containerRef = useRef(null);
  const beforeMapContainer = useRef(null);
  const afterMapContainer = useRef(null);
  const beforeMapRef = useRef(null);
  const afterMapRef = useRef(null);
  const compareRef = useRef(null);

  useEffect(() => {
    if (!beforeMapContainer.current || !afterMapContainer.current) return;

    const initMap = (container) => {
      return new maplibregl.Map({
        container: container,
        style: osmStyle, // Using OSM Raster for extreme reliability
        center: [90.0, 23.5],
        zoom: 6,
        attributionControl: false
      });
    };

    const beforeMap = initMap(beforeMapContainer.current);
    const afterMap = initMap(afterMapContainer.current);

    beforeMapRef.current = beforeMap;
    afterMapRef.current = afterMap;

    afterMap.addControl(new maplibregl.NavigationControl(), 'top-right');

    const compare = new MaplibreCompare(beforeMap, afterMap, containerRef.current);
    compareRef.current = compare;

    // Robust resizing
    const resizeObserver = new ResizeObserver(() => {
      beforeMap.resize();
      afterMap.resize();
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      compare.remove();
      beforeMap.remove();
      afterMap.remove();
    };
  }, []);

  useEffect(() => {
    const beforeMap = beforeMapRef.current;
    const afterMap = afterMapRef.current;
    if (!beforeMap || !afterMap || !event) return;

    const loadData = async () => {
      const beforeMask = await getWaterMask(event.id, 'before');
      const afterMask = await getWaterMask(event.id, 'after'); 

      const addSafeLayer = (map, sourceId, layerId, data, paint, filter) => {
        if (!map.getSource(sourceId)) {
          map.addSource(sourceId, { type: 'geojson', data });
        } else {
          map.getSource(sourceId).setData(data);
        }
        if (!map.getLayer(layerId)) {
          const layerDef = {
            id: layerId,
            type: 'fill',
            source: sourceId,
            paint
          };
          if (filter) layerDef.filter = filter;
          map.addLayer(layerDef);
        }
      };

      const populateBefore = () => {
        if (beforeMask) {
          addSafeLayer(beforeMap, 'before-water', 'before-water-layer', beforeMask, {
            'fill-color': '#06b6d4',
            'fill-opacity': 0.8
          });
        }
      };

      const populateAfter = () => {
        if (afterMask) {
          addSafeLayer(afterMap, 'after-water', 'after-water-layer-permanent', afterMask, 
            { 'fill-color': '#06b6d4', 'fill-opacity': 0.8 }, 
            ['==', 'type', 'permanent_water']
          );
          addSafeLayer(afterMap, 'after-water', 'after-water-layer-flood', afterMask, 
            { 'fill-color': '#ef4444', 'fill-opacity': 0.8 }, 
            ['==', 'type', 'flood_water']
          );
        }
      };

      // Ensure style is loaded before adding GeoJSON
      if (beforeMap.isStyleLoaded()) populateBefore();
      else beforeMap.once('styledata', populateBefore);

      if (afterMap.isStyleLoaded()) populateAfter();
      else afterMap.once('styledata', populateAfter);

      const [minLng, minLat, maxLng, maxLat] = event.bbox;
      const bounds = [[minLng, minLat], [maxLng, maxLat]];
      beforeMap.fitBounds(bounds, { padding: 50, duration: 0 });
      afterMap.fitBounds(bounds, { padding: 50, duration: 0 });
    };

    loadData();
  }, [event]);

  return (
    <div className="relative w-full h-[60vh] min-h-[500px] rounded-xl overflow-hidden shadow-2xl border border-[#1e2d4a] flex flex-col">
      <div ref={containerRef} className="relative flex-grow w-full h-full bg-[#0a192f]">
        <div ref={beforeMapContainer} className="absolute inset-0 w-full h-full outline-none" />
        <div ref={afterMapContainer} className="absolute inset-0 w-full h-full outline-none" />
      </div>
      
      <div className="absolute top-4 left-4 bg-[#0a192f]/90 px-3 py-1 rounded text-white text-sm font-semibold border border-[#1e2d4a] z-10 pointer-events-none">
        Before: {event?.before_window?.start} to {event?.before_window?.end}
      </div>
      <div className="absolute top-4 right-12 bg-[#0a192f]/90 px-3 py-1 rounded text-white text-sm font-semibold border border-[#1e2d4a] z-10 pointer-events-none">
        After: {event?.after_window?.start} to {event?.after_window?.end}
      </div>

      <div className="absolute bottom-6 left-6 bg-[#0a192f]/90 p-4 rounded-lg border border-[#1e2d4a] backdrop-blur-sm z-10 pointer-events-none">
        <h4 className="text-white text-sm font-semibold mb-2">Legend</h4>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-4 h-4 bg-[#06b6d4] rounded opacity-80"></div>
          <span className="text-xs text-slate-300">Permanent Water</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-[#ef4444] rounded opacity-80"></div>
          <span className="text-xs text-slate-300">New Flood Water</span>
        </div>
      </div>
    </div>
  );
};

export default MapView;
