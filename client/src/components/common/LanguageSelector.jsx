import { useContext } from 'react';
import { Globe } from 'lucide-react';
import { SettingsContext } from '../../context/SettingsContext';

export default function LanguageSelector({ variant = 'solid' }) {
  const { settings, updateSetting } = useContext(SettingsContext);

  const changeLanguage = (lng) => {
    updateSetting('language', lng);
  };

  const currentLanguage = settings?.language || 'en';
  const isGhost = variant === 'ghost';

  return (
    <div className={`language-selector language-selector--${variant}`}>
      <span className="language-selector-icon" aria-hidden="true">
        <Globe className="w-4 h-4" />
      </span>
      <select
        value={currentLanguage}
        onChange={(e) => changeLanguage(e.target.value)}
        aria-label="Language"
        className="language-selector-select"
      >
        <option value="en">EN</option>
        <option value="sw">SW</option>
      </select>
    </div>
  );
}
