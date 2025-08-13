import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './lib/i18n';

// Ensure RTL support is loaded
document.documentElement.setAttribute('lang', 'ar');
document.documentElement.setAttribute('dir', 'ltr'); // Default to LTR, will be changed by i18n

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);