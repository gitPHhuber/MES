import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider, AuthProviderProps } from 'react-oidc-context'
import App from './App'
import './index.css'
import { KEYCLOAK_CONFIG, getNetworkInfo } from './api/client'

const createOidcConfig = (): AuthProviderProps => {
  const networkInfo = getNetworkInfo()
  
  console.log('[MES] OIDC Authority:', KEYCLOAK_CONFIG.authority)
  console.log('[MES] OIDC Client:', KEYCLOAK_CONFIG.clientId)
  console.log('[MES] Network:', networkInfo.network)
  
  return {
    authority: KEYCLOAK_CONFIG.authority,
    client_id: KEYCLOAK_CONFIG.clientId,
    redirect_uri: `${window.location.origin}/`,
    post_logout_redirect_uri: `${window.location.origin}/`,
    response_type: 'code',
    scope: 'openid profile email',
    automaticSilentRenew: true,
    onSigninCallback: () => {
      window.history.replaceState({}, document.title, window.location.pathname)
    },
  }
}

const oidcConfig = createOidcConfig()

const registerServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
        console.log('[PWA] SW registered:', registration.scope)
        
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] New version available')
              }
            })
          }
        })
      } catch (error) {
        console.error('[PWA] SW registration failed:', error)
      }
    })
  }
}

if (import.meta.env.PROD) {
  registerServiceWorker()
}

const networkInfo = getNetworkInfo()
console.log('[MES] PWA Mode:', import.meta.env.MODE)
console.log('[MES] Network:', networkInfo.network)
console.log('[MES] API:', networkInfo.apiUrl)

const root = document.getElementById('root')

if (!root) {
  throw new Error('Root element not found')
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <AuthProvider {...oidcConfig}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
)