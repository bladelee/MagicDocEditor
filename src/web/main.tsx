/**
 * Application Entry Point
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';

import { GraphQLProvider } from './providers/graphql-provider.js';
import { App } from './app-test.js';
import '../styles/global.css';

// Bootstrap application
const rootElement = document.getElementById('app');

if (!rootElement) {
  throw new Error('Root element not found');
}

const root = createRoot(rootElement);
root.render(
  <StrictMode>
    <GraphQLProvider>
      <HashRouter>
        <App />
      </HashRouter>
    </GraphQLProvider>
  </StrictMode>
);

// Enable hot module replacement in development
if (import.meta.hot) {
  import.meta.hot.accept();
}
