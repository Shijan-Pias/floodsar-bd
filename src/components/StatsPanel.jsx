import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getFloodStats } from '../api/floodApi';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle, Activity } from 'lucide-react';

const StatsPanel = ({ event }) => {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (event) {
      getFloodStats(event.id).then(setStats);
    }
  }, [event]);

  if (!stats) return <div className="h-40 animate-pulse bg-[#1e2d4a] rounded-xl"></div>;

  const increase = ((stats.after_water_km2 - stats.before_water_km2) / stats.before_water_km2 * 100).toFixed(1);
  const chartData = [
    { name: t('before'), area: stats.before_water_km2 },
    { name: t('after'), area: stats.after_water_km2 }
  ];

  return (
    <div className="bg-[#0a192f] border border-[#1e2d4a] rounded-xl p-6 shadow-xl relative overflow-hidden">
      {/* Decorative gradient */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#ef4444] opacity-5 rounded-full blur-3xl -mr-10 -mt-10"></div>
      
      {stats.is_sample && (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/20 text-amber-400 text-xs font-bold tracking-widest mb-4 border border-amber-500/30">
          <AlertTriangle className="w-3.5 h-3.5" />
          {t('sample_data')}
        </div>
      )}

      <h2 className="text-4xl md:text-5xl font-black text-white mb-2 flex items-baseline gap-2">
        {stats.newly_inundated_km2.toLocaleString()} 
        <span className="text-xl text-[#ef4444] font-medium">{t('stats.km2')}</span>
      </h2>
      <p className="text-slate-400 text-sm md:text-base font-medium mb-8">Newly inundated area</p>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-[#112240] p-4 rounded-lg border border-[#1e2d4a]">
          <div className="text-slate-400 text-xs mb-1 uppercase tracking-wider">{t('stats.before_water')}</div>
          <div className="text-xl font-bold text-[#06b6d4]">{stats.before_water_km2} <span className="text-xs font-normal">km²</span></div>
        </div>
        <div className="bg-[#112240] p-4 rounded-lg border border-[#1e2d4a]">
          <div className="text-slate-400 text-xs mb-1 uppercase tracking-wider">{t('stats.after_water')}</div>
          <div className="text-xl font-bold text-[#ef4444]">{stats.after_water_km2} <span className="text-xs font-normal">km²</span></div>
        </div>
        <div className="bg-[#112240] p-4 rounded-lg border border-[#1e2d4a]">
          <div className="text-slate-400 text-xs mb-1 uppercase tracking-wider">{t('stats.increase')}</div>
          <div className="text-xl font-bold text-white">+{increase}%</div>
        </div>
        <div className="bg-[#112240] p-4 rounded-lg border border-[#1e2d4a]">
          <div className="text-slate-400 text-xs mb-1 uppercase tracking-wider">{t('stats.resolution')}</div>
          <div className="text-xl font-bold text-white">{stats.pixel_size_m}m</div>
        </div>
      </div>

      <div className="h-48 mt-4">
        <h4 className="text-slate-400 text-xs uppercase tracking-wider mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4" /> Water Area Comparison
        </h4>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#112240', border: '1px solid #1e2d4a', borderRadius: '8px' }}
              itemStyle={{ color: '#fff' }}
            />
            <Bar dataKey="area" fill="#06b6d4" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default StatsPanel;
