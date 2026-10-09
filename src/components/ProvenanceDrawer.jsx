import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Database, X } from 'lucide-react';

const ProvenanceDrawer = ({ event }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  if (!event) return null;

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed right-0 top-1/2 -translate-y-1/2 bg-[#1e2d4a] hover:bg-[#2a3f63] border border-r-0 border-[#2a3f63] text-slate-300 p-3 rounded-l-lg shadow-2xl transition-all z-40 group"
      >
        <Database className="w-5 h-5 group-hover:text-[#06b6d4] transition-colors" />
        <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-[#0a192f] border border-[#1e2d4a] px-3 py-1.5 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          {t('provenance.title')}
        </span>
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer */}
      <div className={`fixed right-0 top-0 h-full w-full md:w-[450px] bg-[#0a192f] border-l border-[#1e2d4a] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between p-6 border-b border-[#1e2d4a]">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-[#06b6d4]" />
            {t('provenance.title')}
          </h2>
          <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-6">
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{t('provenance.dataset')}</h4>
              <p className="text-white bg-[#112240] p-3 rounded border border-[#1e2d4a]">{event.provider}</p>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{t('provenance.product')}</h4>
              <p className="text-white bg-[#112240] p-3 rounded border border-[#1e2d4a]">{event.product} ({event.sensor})</p>
            </div>
            
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Raw Data (JSON)</h4>
              <pre className="bg-[#0b1424] p-4 rounded border border-[#1e2d4a] overflow-x-auto text-xs text-[#06b6d4] font-mono">
                {JSON.stringify(event, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProvenanceDrawer;
