import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const rootStyle = document.createElement('style');
rootStyle.textContent = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  html, body, #root { height: 100%; width: 100%; overflow: hidden; }
`;
document.head.appendChild(rootStyle);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
