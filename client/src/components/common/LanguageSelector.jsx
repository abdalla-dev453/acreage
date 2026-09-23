import { useContext } from 'react';
import { Globe } from 'lucide-react';
import { SettingsContext } from '../../context/SettingsContext';

export default function LanguageSelector() {
  const { settings, updateSetting } = useContext(SettingsContext);

  const changeLanguage = (lng) => {
    updateSetting('language', lng);
  };

  const currentLanguage = settings?.language || 'en';

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <div className="hidden sm:flex p-2.5 bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 shadow-premium rounded-xl text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white transition-colors group">
        <Globe className="w-4 h-4 group-hover:scale-105 transition-transform duration-200" />
      </div>
      <select
        value={currentLanguage}
        onChange={(e) => changeLanguage(e.target.value)}
        className="text-xs font-bold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 sm:px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500/20 shadow-sm cursor-pointer hover:border-green-500 transition-all"
      >
        <option value="en">EN</option>
        <option value="sw">SW</option>
      </select>
    </div>
  );
}