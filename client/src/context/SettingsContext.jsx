import { createContext, useState, useEffect, useCallback } from 'react';
import API from '../services/api';
import { changeLanguage } from '../i18n';

export const SettingsContext = createContext();

const THEME_STORAGE_KEY = 'acreage_theme';

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

// Resolve 'system' into an effective 'light' | 'dark' value.
const getSystemTheme = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';

// Apply everything that must be reflected on the <html> element so that
// Tailwind's `dark:` variant, CSS variables and display preferences respond.
const applyTheme = (theme) => {
  const root = document.documentElement;
  const effective = theme === 'system' ? getSystemTheme() : theme;
  root.classList.toggle('dark', effective === 'dark');
  // Keep native form controls / scrollbars in sync with the active theme.
  root.style.colorScheme = effective;
};

const applyFontSize = (fontSize) => {
  document.documentElement.setAttribute('data-font-size', fontSize || 'normal');
};

const applyCompactMode = (compactMode) => {
  document.documentElement.setAttribute('data-compact', compactMode ? 'true' : 'false');
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
    applyLanguage(settings.language);
    applyTheme(settings.theme);
    applyFontSize(settings.fontSize);
    applyCompactMode(settings.compactMode);
    localStorage.setItem('app_settings', JSON.stringify(settings));
    localStorage.setItem(THEME_STORAGE_KEY, settings.theme);
  }, [settings]);

  // When the user picked "system", follow the OS theme changes live.
  useEffect(() => {
    if (settings.theme !== 'system' || !window.matchMedia) return undefined;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => applyTheme('system');
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, [settings.theme]);

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
        setSettings((prev) => ({ ...prev, ...serverPrefs }));
      } catch {
        // Offline / unauthorized — keep local preferences.
      } finally {
        setLoaded(true);
      }
    };
    loadPreferences();

    // Re-sync when the user logs out (keep local) or a token appears (login).
    const handleLogout = () => setSettings((prev) => ({ ...prev }));
    const handleStorage = (event) => {
      if (event.key === 'token' && event.newValue) loadPreferences();
    };
    window.addEventListener('auth-logout', handleLogout);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('auth-logout', handleLogout);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  function applyLanguage(language) {
    changeLanguage(language);
    document.documentElement.lang = language;
  }

  const updateSetting = useCallback(async (key, value) => {
    // Preferences are primarily local (theme/language/display). Update the UI
    // immediately and never roll it back on a failed sync — otherwise a
    // logged-out visitor (or any 401/network hiccup) would see the change
    // silently snap back, which is exactly why the theme/language switches
    // appeared "not to work".
    setSettings((prev) => ({ ...prev, [key]: value }));

    // Apply immediately for instant feedback (the effect also covers this,
    // but applying here avoids a one-frame flash).
    if (key === 'language') {
      applyLanguage(value);
    } else if (key === 'theme') {
      applyTheme(value);
    } else if (key === 'fontSize') {
      applyFontSize(value);
    } else if (key === 'compactMode') {
      applyCompactMode(value);
    }

    // Best-effort server sync for signed-in users.
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await API.put('/settings/preferences', { [key]: value });
      }
    } catch (error) {
      console.error('Failed to sync setting to server:', error);
    }
  }, []);

  const saveAll = useCallback(async (newSettings) => {
    setSettings(newSettings);
    applyLanguage(newSettings.language);
    applyTheme(newSettings.theme);
    applyFontSize(newSettings.fontSize);
    applyCompactMode(newSettings.compactMode);
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await API.put('/settings/preferences', newSettings);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    // The settings effect re-applies theme/language/display; clear the cached
    // server copy too, best-effort.
    const token = localStorage.getItem('token');
    if (token) {
      API.put('/settings/preferences', DEFAULT_SETTINGS).catch(() => {});
    } else {
      localStorage.removeItem('app_settings');
      localStorage.removeItem(THEME_STORAGE_KEY);
    }
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, resetSettings, saveAll, loaded }}>
      {children}
    </SettingsContext.Provider>
  );
};
