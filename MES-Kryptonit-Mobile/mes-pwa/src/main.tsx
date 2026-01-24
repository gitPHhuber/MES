import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from 'react-oidc-context'
import App from './App'
import './index.css'

// --- КОНФИГ KEYCLOAK ---
const oidcConfig = {
  authority: 'http://keycloak.local/realms/MES-Realm',
  client_id: 'mes-client',
  redirect_uri: window.location.origin + '/',
  post_logout_redirect_uri: window.location.origin + '/',
  response_type: 'code',
  
  // Чистит URL от мусора после редиректа
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, window.location.pathname)
  }
}

// PWA: Регистрация Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.log('[PWA] SW registration failed:', error)
    })
  })
}

console.log('[MES] PWA Mode:', import.meta.env.MODE)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider {...oidcConfig}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
)
