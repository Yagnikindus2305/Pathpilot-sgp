import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// A deployed fix should never require the user to know to hard-refresh.
// This forces an update check on load and every 20s while the tab is open,
// and immediately activates + reloads the instant a newer build is found —
// rather than silently swapping in the background on some later visit.
// registration.update() was previously only called inside the interval, so
// a page freshly opened right after a deploy could still sit on the old
// bundle for up to the full interval before its first check ever fired --
// this now also fires one check the moment the service worker registers.
const updateSW = registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return;
    registration.update();
    setInterval(() => registration.update(), 20_000);
  },
  onNeedRefresh() {
    updateSW(true);
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
