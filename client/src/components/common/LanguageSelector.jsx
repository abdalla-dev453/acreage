import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export default function LanguageSelector() {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  const currentLanguage = i18n.language;

  return (
    <div className="flex items-center gap-2">
      <div className="p-2.5 bg-white/80 border border-slate-200/60 shadow-premium rounded-xl text-slate-500 hover:text-slate-800 transition-colors group">
        <Globe className="w-4 h-4 group-hover:scale-105 transition-transform duration-200" />
      </div>
      <select
        value={currentLanguage}
        onChange={(e) => changeLanguage(e.target.value)}
        className="text-xs font-bold bg-gradient-to-r from-primary-50 to-primary-100 border border-primary-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500/20 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
      >
        <option value="en">English</option>
        <option value="sw">Kiswahili</option>
      </select>
    </div>
  );
}