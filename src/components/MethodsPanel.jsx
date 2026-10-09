import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, BookOpen } from 'lucide-react';

const MethodsPanel = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-8 border border-[#1e2d4a] bg-[#0a192f] rounded-xl overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 hover:bg-[#112240] transition-colors"
      >
        <div className="flex items-center gap-3">
          <BookOpen className="text-[#06b6d4] w-5 h-5" />
          <h3 className="text-lg font-semibold text-white">{t('methods.title')}</h3>
        </div>
        {isOpen ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
      </button>
      
      {isOpen && (
        <div className="p-6 pt-2 border-t border-[#1e2d4a] text-slate-300 text-sm leading-relaxed">
          <ul className="space-y-3 mb-6">
            <li className="flex gap-3"><span className="text-[#06b6d4] font-bold">1.</span> {t('methods.step1')}</li>
            <li className="flex gap-3"><span className="text-[#06b6d4] font-bold">2.</span> {t('methods.step2')}</li>
            <li className="flex gap-3"><span className="text-[#06b6d4] font-bold">3.</span> {t('methods.step3')}</li>
            <li className="flex gap-3"><span className="text-[#06b6d4] font-bold">4.</span> {t('methods.step4')}</li>
            <li className="flex gap-3"><span className="text-[#06b6d4] font-bold">5.</span> {t('methods.step5')}</li>
          </ul>
          <div className="bg-[#112240] p-4 rounded-lg border-l-4 border-amber-500 text-slate-400 text-xs italic">
            {t('methods.note')}
          </div>
        </div>
      )}
    </div>
  );
};

export default MethodsPanel;
