/**
 * API клиент для MES Kryptonit PWA
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { User } from 'oidc-client-ts'

// ============================================================================
// Конфигурация
// ============================================================================

export const API_BASE_URL = 'http://localhost:5001/api'

export const KEYCLOAK_CONFIG = {
  authority: 'http://keycloak.local/realms/MES-Realm',
  clientId: 'mes-client',
}

const DEBUG_HTTP = import.meta.env.DEV

// ============================================================================
// Helpers
// ============================================================================

const maskToken = (t?: string | null): string => {
  if (!t) return '<none>'
  const head = t.slice(0, 10)
  const tail = t.slice(-6)
  return `${head}…${tail} (len=${t.length})`
}

const joinUrl = (baseURL?: string, url?: string): string => {
  if (!url) return baseURL ?? ''
  if (/^https?:\/\//i.test(url)) return url
  const base = baseURL ?? ''
  return `${base.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`
}

// ============================================================================
// OIDC Token Storage
// ============================================================================

const getOidcStorageKey = (): string => {
  return `oidc.user:${KEYCLOAK_CONFIG.authority}:${KEYCLOAK_CONFIG.clientId}`
}

export const getAccessToken = (): string | null => {
  const key = getOidcStorageKey()
  const data = sessionStorage.getItem(key)
  
  if (!data) return null
  
  try {
    const user = JSON.parse(data) as User
    return user.access_token || null
  } catch {
    return null
  }
}

export const getUser = (): User | null => {
  const key = getOidcStorageKey()
  const data = sessionStorage.getItem(key)
  
  if (!data) return null
  
  try {
    return JSON.parse(data) as User
  } catch {
    return null
  }
}

// ============================================================================
// Axios Instance
// ============================================================================

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request Interceptor
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken()

  if (DEBUG_HTTP) {
    const method = (config.method ?? 'GET').toUpperCase()
    console.log(`[HTTP] --> ${method} ${joinUrl(config.baseURL, config.url)}`)
    console.log(`[HTTP] token = ${maskToken(token)}`)
  }

  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

// Response Interceptor
api.interceptors.response.use(
  (response) => {
    if (DEBUG_HTTP) {
      console.log(`[HTTP] <-- ${response.status} ${response.config.method?.toUpperCase()} ${joinUrl(response.config.baseURL, response.config.url)}`)
    }
    return response
  },
  (err: AxiosError) => {
    if (DEBUG_HTTP) {
      console.error(`[HTTP] <-- ERROR`, {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
      })
    }

    // 401 - редирект на логин
    if (err.response?.status === 401) {
      window.location.href = '/login'
    }

    return Promise.reject(err)
  }
)

// ============================================================================
// Error Helpers
// ============================================================================

export const getErrorMessage = (error: unknown, fallback = 'Произошла ошибка'): string => {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return 'Нет подключения к серверу'
    }
    const data = error.response.data as any
    return data?.message || data?.error || fallback
  }
  if (error instanceof Error) {
    return error.message
  }
  return fallback
}

// ============================================================================
// API Methods
// ============================================================================

export const apiGet = async <T>(url: string, params?: any): Promise<T> => {
  const { data } = await api.get<T>(url, { params })
  return data
}

export const apiPost = async <T>(url: string, body?: any): Promise<T> => {
  const { data } = await api.post<T>(url, body)
  return data
}

export const apiPut = async <T>(url: string, body?: any): Promise<T> => {
  const { data } = await api.put<T>(url, body)
  return data
}

export const apiDelete = async <T>(url: string): Promise<T> => {
  const { data } = await api.delete<T>(url)
  return data
}

export default api