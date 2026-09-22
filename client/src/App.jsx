import { BrowserRouter as Router } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { AuthProvider } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import { SettingsProvider } from './context/SettingsContext';
import AppRoutes from './routes/AppRoutes';
import CookieBanner from './components/common/CookieBanner';
import MobileCTA from './components/common/MobileCTA';
import OfflineBanner from './components/common/OfflineBanner';
import './index.css';
import i18n from './i18n'; // Initialize i18n before any components

export default function App() {
  return (
    <SettingsProvider>
      <I18nextProvider i18n={i18n}>
        <AuthProvider>
          <ChatProvider>
            <Router>
              <OfflineBanner />
              <AppRoutes />
              <CookieBanner />
              <MobileCTA />
            </Router>
          </ChatProvider>
        </AuthProvider>
      </I18nextProvider>
    </SettingsProvider>
  );
}
