import React from 'react';
import { useTranslation } from 'react-i18next';

const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="bg-[#0a192f] border-t border-[#1e2d4a] py-6 px-6 mt-12 text-center text-slate-400 text-sm">
      <p className="mb-2">{t('footer.credits')}</p>
      <p className="mb-2">{t('footer.license')}</p>
      <p className="font-semibold text-slate-300">{t('footer.project')}</p>
    </footer>
  );
};

export default Footer;
