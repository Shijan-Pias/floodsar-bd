import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Languages, Code } from 'lucide-react';

const Header = () => {
  const { t, i18n } = useTranslation();

  const toggleLang = () => {
    const newLang = i18n.language === 'en' ? 'bn' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <header className="bg-[#0a192f] border-b border-[#1e2d4a] py-4 px-6 flex justify-between items-center sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <Globe className="text-[#06b6d4] w-8 h-8" />
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{t('app_title')}</h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">{t('app_tagline')}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleLang} 
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1e2d4a] hover:bg-[#2a3f63] transition-colors text-sm font-medium"
        >
          <Languages className="w-4 h-4" />
          {i18n.language === 'en' ? 'বাংলা' : 'EN'}
        </button>
        <a href="https://github.com/placeholder/floodsar-bd" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white transition-colors">
          <Code className="w-6 h-6" />
        </a>
      </div>
    </header>
  );
};

export default Header;
