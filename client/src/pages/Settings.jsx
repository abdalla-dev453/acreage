import { useState, useContext } from 'react';
import { Settings, Sun, Moon, Monitor, Globe, Bell, BellOff, Volume2, VolumeX, Type, ZoomIn, ZoomOut, RotateCw, Save, Palette } from 'lucide-react';
import { SettingsContext } from '../context/SettingsContext';
import Navbar from '../components/common/Navbar';
import SEO from '../components/common/SEO';

export default function SettingsPage() {
  const { settings, updateSetting, resetSettings } = useContext(SettingsContext);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun, desc: 'Always use light mode' },
    { value: 'dark', label: 'Dark', icon: Moon, desc: 'Always use dark mode' },
    { value: 'system', label: 'System', icon: Monitor, desc: 'Follow system preference' },
  ];

  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'sw', label: 'Kiswahili' },
  ];

  const fontSizeOptions = [
    { value: 'small', label: 'Small' },
    { value: 'normal', label: 'Normal' },
    { value: 'large', label: 'Large' },
  ];

  const SettingCard = ({ title, description, children }) => (
    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
      <h3 className="font-bold text-slate-900 text-sm mb-1">{title}</h3>
      <p className="text-xs text-slate-500 mb-4">{description}</p>
      {children}
    </div>
  );

  const ToggleSwitch = ({ checked, onChange, label, desc }) => (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
      <div className="flex-1 min-w-0">
        <label className="text-xs font-bold text-slate-700">{label}</label>
        <p className="text-[10px] text-slate-400 mt-0.5">{desc}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${
          checked ? 'bg-green-500' : 'bg-slate-300'
        }`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full transition-transform ${
          checked ? 'translate-x-5 bg-white' : 'translate-x-0.5 bg-white'
        }`} />
      </button>
    </div>
  );

  return (
    <div className="space-y-6 w-full pb-12">
      <SEO title="Settings | Acreage" description="Manage your theme, language, notification, and website preferences." />
      <Navbar title="Settings" />

      <div className="flex justify-between items-center mb-2">
        <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
          <Settings className="w-5 h-5 text-green-600" />
          System Configuration
        </h1>
        {saved && (
          <span className="text-xs font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-lg">
            Saved
          </span>
        )}
      </div>

      <div className="space-y-4">
        {/* Theme Settings */}
        <SettingCard
          title="Theme"
          description="Choose your preferred color scheme."
        >
          <div className="grid grid-cols-3 gap-2">
            {themeOptions.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  onClick={() => updateSetting('theme', opt.value)}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    settings.theme === opt.value
                      ? 'border-green-500 bg-green-50/50 text-green-800'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  <Icon className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-xs font-bold">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </SettingCard>

        {/* Language Settings */}
        <SettingCard
          title="Language"
          description="Select your preferred interface language."
        >
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-slate-400" />
            <select
              value={settings.language}
              onChange={(e) => updateSetting('language', e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600"
            >
              {languageOptions.map((lang) => (
                <option key={lang.value} value={lang.value}>{lang.label}</option>
              ))}
            </select>
          </div>
        </SettingCard>

        {/* Notification Settings */}
        <SettingCard
          title="Notifications"
          description="Manage how you receive alerts and notifications."
        >
          <ToggleSwitch
            checked={settings.notifications}
            onChange={(v) => updateSetting('notifications', v)}
            label="Push Notifications"
            desc={settings.notifications ? 'Receive real-time notifications' : 'Notifications are disabled'}
          />
          <ToggleSwitch
            checked={settings.sound}
            onChange={(v) => updateSetting('sound', v)}
            label="Notification Sound"
            desc={settings.sound ? 'Play sound on new notifications' : 'Sounds are muted'}
          />
        </SettingCard>

        {/* Display Settings */}
        <SettingCard
          title="Display"
          description="Adjust text size and interface density."
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <label className="text-xs font-bold text-slate-700">Font Size</label>
              <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
                <button
                  onClick={() => updateSetting('fontSize', 'small')}
                  className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    settings.fontSize === 'small' ? 'bg-white text-slate-900 shadow' : 'text-slate-400'
                  }`}
                >
                  A
                </button>
                <button
                  onClick={() => updateSetting('fontSize', 'normal')}
                  className={`px-2 py-1.5 rounded-lg text-sm font-bold transition-all ${
                    settings.fontSize === 'normal' ? 'bg-white text-slate-900 shadow' : 'text-slate-400'
                  }`}
                >
                  Aa
                </button>
                <button
                  onClick={() => updateSetting('fontSize', 'large')}
                  className={`px-2 py-1.5 rounded-lg text-base font-bold transition-all ${
                    settings.fontSize === 'large' ? 'bg-white text-slate-900 shadow' : 'text-slate-400'
                  }`}
                >
                  Aa
                </button>
              </div>
            </div>
            <ToggleSwitch
              checked={settings.compactMode}
              onChange={(v) => updateSetting('compactMode', v)}
              label="Compact Mode"
              desc="Reduce vertical spacing for more content"
            />
          </div>
        </SettingCard>

        {/* Action Buttons */}
        <div className="flex justify-between pt-4">
          <button
            onClick={resetSettings}
            className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl border border-slate-200 hover:bg-slate-50 transition flex items-center gap-2"
          >
            <RotateCw className="w-3.5 h-3.5" /> Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-sm"
          >
            <Save className="w-3.5 h-3.5" /> Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
