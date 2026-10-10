import { Buffer as CustomBuffer } from './buffer-polyfill';

if (typeof window !== 'undefined') {
  (window as any).Buffer = CustomBuffer as any;
  if (!(window as any).global) {
    (window as any).global = window;
  }
}
if (typeof globalThis !== 'undefined') {
  (globalThis as any).Buffer = CustomBuffer;
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ToastProvider } from './components/ui/Toast';
import { SiteSettingsProvider } from './context/SiteSettingsContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SiteSettingsProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </SiteSettingsProvider>
  </StrictMode>,
);
