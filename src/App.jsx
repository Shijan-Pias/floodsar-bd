import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import EventSelector from './components/EventSelector';
import MapView from './components/MapView';
import StatsPanel from './components/StatsPanel';
import MethodsPanel from './components/MethodsPanel';
import ProvenanceDrawer from './components/ProvenanceDrawer';
import { getEvent } from './api/floodApi';
import './i18n/i18n';

function App() {
  const [selectedEventId, setSelectedEventId] = useState('feni-noakhali-2024');
  const [eventData, setEventData] = useState(null);

  useEffect(() => {
    if (selectedEventId) {
      getEvent(selectedEventId).then(setEventData);
    }
  }, [selectedEventId]);

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8 max-w-7xl">
        <EventSelector 
          selectedEventId={selectedEventId} 
          onSelect={setSelectedEventId} 
        />
        
        {eventData ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 flex flex-col gap-8">
              <MapView event={eventData} />
              <MethodsPanel />
            </div>
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <StatsPanel event={eventData} />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#06b6d4]"></div>
          </div>
        )}
      </main>

      {eventData && <ProvenanceDrawer event={eventData} />}
      <Footer />
    </div>
  );
}

export default App;
