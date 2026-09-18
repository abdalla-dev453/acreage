import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import AppRoutes from './routes/AppRoutes';
import CookieBanner from './components/common/CookieBanner';
import MobileCTA from './components/common/MobileCTA';
import './index.css';

export default function App() {
  return (
    <AuthProvider>
      <ChatProvider>
        <Router>
          <AppRoutes />
          <CookieBanner />
          <MobileCTA />
        </Router>
      </ChatProvider>
    </AuthProvider>
  );
}
