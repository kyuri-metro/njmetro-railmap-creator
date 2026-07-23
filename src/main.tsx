import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import '@umamichi-ui/common-css';
import '@umamichi-ui/windows-phone-motion/tokens.css';
import '@umamichi-ui/windows-phone-motion/easing.css';
import '@umamichi-ui/common-components/styles.css';
import '@umamichi-ui/chromatic-fringe';
import { OverlayStackProvider } from '@umamichi-ui/common-components/overlay';
import App from './App';
import { initAppChromaticFringe } from './chromaticFringe';
import { startAutosaveScheduler } from './features/autosaveScheduler';
import { store } from './store';
import './styles.css';

startAutosaveScheduler(store);
initAppChromaticFringe();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Provider store={store}>
      <OverlayStackProvider>
        <App />
      </OverlayStackProvider>
    </Provider>
  </React.StrictMode>,
);
