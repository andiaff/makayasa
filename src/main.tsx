import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initializeFirebaseSync } from './utils/firebaseSync.ts';
import { initializeSpreadsheetSync } from './utils/spreadsheetSync.ts';

// Initialize real-time cross-device data synchronization
initializeFirebaseSync();
initializeSpreadsheetSync();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

