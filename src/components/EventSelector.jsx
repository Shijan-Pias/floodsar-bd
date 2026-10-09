import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getEvents } from '../api/floodApi';
import { MapPin } from 'lucide-react';

const EventSelector = ({ selectedEventId, onSelect }) => {
  const { t } = useTranslation();
  const [events, setEvents] = useState([]);

  useEffect(() => {
    getEvents().then(setEvents);
  }, []);

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-slate-400 mb-2">{t('select_event')}</label>
      <div className="relative">
        <select 
          value={selectedEventId || ''} 
          onChange={(e) => onSelect(e.target.value)}
          className="w-full md:w-96 appearance-none bg-[#1e2d4a] border border-[#2a3f63] text-white py-3 px-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06b6d4] focus:border-transparent transition-all cursor-pointer"
        >
          <option value="" disabled>Select...</option>
          {events.map(event => (
            <option key={event.id} value={event.id}>{event.name}</option>
          ))}
        </select>
        <MapPin className="absolute right-3 top-3.5 text-slate-400 pointer-events-none w-5 h-5" />
      </div>
    </div>
  );
};

export default EventSelector;
