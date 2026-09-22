import { createContext, useState, useEffect, useCallback } from 'react';
import API from '../services/api';

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
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    }
  }

  const updateSetting = useCallback(async (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    try {
      await API.put('/settings/preferences', { [key]: value });
    } catch {
    }
  }, []);

  const saveAll = useCallback(async (newSettings) => {
    setSettings(newSettings);
    try {
      await API.put('/settings/preferences', newSettings);
    } catch {
    }
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    API.put('/settings/preferences', DEFAULT_SETTINGS).catch(() => {});
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, resetSettings, saveAll, loaded }}>
      {children}
    </SettingsContext.Provider>
  );
};
