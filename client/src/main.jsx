import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './i18n' // Initialize i18n

// The legacy worker uses cache-first for scripts. In Vite development that
// caches stable /src/*.jsx URLs and can keep an old app shell (including the
// former dashboard sidebar) alive across code changes. Keep the worker out of
// development and remove only this app's old /sw.js registration. Production
// still registers the worker for PWA/offline support.
if ('serviceWorker' in navigator && import.meta.env.DEV) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations
      .filter((registration) => {
        const worker = registration.active || registration.waiting || registration.installing;
        return worker && new URL(worker.scriptURL).pathname === '/sw.js';
      })
      .forEach((registration) => registration.unregister());
  });
} else if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered: ', registration)
      })
      .catch((registrationError) => {
        console.log('Service Worker registration failed: ', registrationError)
      })
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
