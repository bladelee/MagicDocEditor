/**
 * Diagnostic Entry Point
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/global.css';

// Test 1: Simple render without any components
const rootElement = document.getElementById('app');
if (!rootElement) {
  throw new Error('Root element not found');
}

const root = createRoot(rootElement);

// Create a simple test component
function TestApp() {
  return (
    <div
      style={{
        padding: '20px',
        fontFamily: 'sans-serif',
      }}
    >
      <h1 style={{ color: 'blue' }}>✅ React is Working!</h1>
      <p>If you can see this, the basic setup is correct.</p>
      <div
        style={{
          marginTop: '20px',
          padding: '20px',
          background: '#f0f0f0',
          borderRadius: '8px',
        }}
      >
        <h2>Next Steps:</h2>
        <ol>
          <li>Open browser console (F12)</li>
          <li>Check for any errors</li>
          <li>Check Network tab for failed requests</li>
        </ol>
      </div>
    </div>
  );
}

root.render(
  <StrictMode>
    <TestApp />
  </StrictMode>
);

console.log('Diagnostic app rendered successfully');
