import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Neutralize all native browser dialogs completely
if (typeof window !== 'undefined') {
  window.alert = (msg?: any) => { console.warn('[BLOCKED NATIVE ALERT]:', msg); };
  window.confirm = (msg?: any) => { console.warn('[BLOCKED NATIVE CONFIRM]:', msg); return true; };
  window.prompt = (msg?: any) => { console.warn('[BLOCKED NATIVE PROMPT]:', msg); return null; };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
