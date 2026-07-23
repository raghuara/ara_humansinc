import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import './index.css';
import App from './App';
import store from './redux/store';
import theme from './theme';
import reportWebVitals from './reportWebVitals';

// ── Clear any stale service worker ────────────────────────────────────────────
// This app registers no service worker. But localhost:3000 is a shared dev port,
// so a service worker left behind by a *different* project can still be installed
// in the browser and intercept requests — serving cached HTML for a JS URL, which
// the browser then tries to run and throws "expected expression, got '<'".
// Unregister any that exist and drop their caches, then reload once so the page
// loads without the stale interception.
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations()
        .then((regs) => {
            if (!regs.length) return null;
            return Promise.all(regs.map((r) => r.unregister()))
                .then(() => (window.caches ? caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))) : null))
                .then(() => {
                    // One-shot reload guard, so this can never loop.
                    if (!sessionStorage.getItem('sw-cleared')) {
                        sessionStorage.setItem('sw-cleared', '1');
                        window.location.reload();
                    }
                });
        })
        .catch(() => { /* nothing we can do; the app still renders below */ });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  </React.StrictMode>
);

reportWebVitals();
