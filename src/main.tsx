import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import '@umamichi-ui/common-css';
import App from './App';
import { startAutosaveScheduler } from './features/autosaveScheduler';
import { OverlayStackProvider } from './overlay/OverlayStackProvider';
import { store } from './store';
import './styles.css';

startAutosaveScheduler(store);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Provider store={store}>
      <OverlayStackProvider>
        <App />
      </OverlayStackProvider>
    </Provider>
  </React.StrictMode>,
);
