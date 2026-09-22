import { createContext, useState, useEffect, useCallback } from 'react';
import API from '../services/api';
import { changeLanguage } from '../i18n';

export const SettingsContext = createContext();

const DEFAULT_SETTINGS = {
  theme: 'system',
  language: 'en',
  notifications: true,
  sound: true,
  fontSize: 'normal',
  compactMode: false,
  featureAnnouncements: true,
  betaProgram: false,
  privateAccount: false,
  twoFactorAuth: false,
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem('app_settings');
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    applyTheme(settings.theme);
    applyLanguage(settings.language);
    localStorage.setItem('app_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setLoaded(true);
          return;
        }
        const response = await API.get('/settings/preferences');
        const serverPrefs = response.data?.preferences || {};
        setSettings((prev) => {
          const merged = { ...prev, ...serverPrefs };
          return merged;
        });
      } catch {
      } finally {
        setLoaded(true);
      }
    };
    if (!loaded) loadPreferences();
  }, []);

  function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      document.body.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
      document.body.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
      document.body.classList.toggle('dark', prefersDark);
    }
  }

  function applyLanguage(language) {
    changeLanguage(language);
    document.documentElement.lang = language;
  }

  const updateSetting = useCallback(async (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    
    // Apply theme immediately for better UX
    if (key === 'theme') {
      applyTheme(value);
    }
    
    // Apply language immediately
    if (key === 'language') {
      applyLanguage(value);
    }
    
    try {
      await API.put('/settings/preferences', { [key]: value });
    } catch (error) {
      console.error('Failed to update setting:', error);
      // Revert on error
      setSettings((prev) => ({ ...prev, [key]: settings[key] }));
    }
  }, [settings]);

  const saveAll = useCallback(async (newSettings) => {
    setSettings(newSettings);
    applyTheme(newSettings.theme);
    applyLanguage(newSettings.language);
    try {
      await API.put('/settings/preferences', newSettings);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    applyTheme(DEFAULT_SETTINGS.theme);
    applyLanguage(DEFAULT_SETTINGS.language);
    API.put('/settings/preferences', DEFAULT_SETTINGS).catch(() => {});
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, resetSettings, saveAll, loaded }}>
      {children}
    </SettingsContext.Provider>
  );
};
