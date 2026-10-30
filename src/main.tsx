import '@fontsource-variable/manrope';
import '@fontsource-variable/plus-jakarta-sans';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { VoltDataProvider } from './data/VoltDataContext';
import './index.css';
import './themes.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <VoltDataProvider>
      <App />
    </VoltDataProvider>
  </StrictMode>,
);
