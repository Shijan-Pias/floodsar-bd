import eventsData from '../data/events.json';
import statsData from '../data/stats.json';

export const getEvents = async () => {
  return eventsData;
};

export const getEvent = async (id) => {
  return eventsData.find(e => e.id === id);
};

export const getFloodStats = async (id) => {
  return statsData[id];
};

export const getWaterMask = async (id, period) => {
  // period: "before" | "after"
  const event = eventsData.find(e => e.id === id);
  if (!event) return null;
  
  const [minLng, minLat, maxLng, maxLat] = event.bbox;
  const width = maxLng - minLng;
  const height = maxLat - minLat;
  
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [[
            [minLng + width*0.4, minLat + height*0.2],
            [minLng + width*0.6, minLat + height*0.2],
            [minLng + width*0.55, minLat + height*0.8],
            [minLng + width*0.45, minLat + height*0.8],
            [minLng + width*0.4, minLat + height*0.2]
          ]]
        },
        properties: { type: 'permanent_water' }
      },
      ...(period === 'after' ? [{
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [[
            [minLng + width*0.2, minLat + height*0.3],
            [minLng + width*0.8, minLat + height*0.3],
            [minLng + width*0.7, minLat + height*0.6],
            [minLng + width*0.3, minLat + height*0.6],
            [minLng + width*0.2, minLat + height*0.3]
          ]]
        },
        properties: { type: 'flood_water' }
      }] : [])
    ]
  };
};

export const getFloodChange = async (id) => {
  const event = eventsData.find(e => e.id === id);
  if (!event) return null;
  const [minLng, minLat, maxLng, maxLat] = event.bbox;
  const width = maxLng - minLng;
  const height = maxLat - minLat;
  
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [[
            [minLng + width*0.2, minLat + height*0.3],
            [minLng + width*0.8, minLat + height*0.3],
            [minLng + width*0.7, minLat + height*0.6],
            [minLng + width*0.3, minLat + height*0.6],
            [minLng + width*0.2, minLat + height*0.3]
          ]]
        },
        properties: { type: 'new_flood' }
      }
    ]
  };
};
