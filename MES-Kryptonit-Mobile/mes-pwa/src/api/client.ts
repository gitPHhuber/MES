import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios'
import { User } from 'oidc-client-ts'

export type NetworkEnvironment = 'production' | 'wifi' | 'development'

interface NetworkConfig {
  apiBaseUrl: string
  keycloakAuthority: string
  keycloakClientId: string
  network: NetworkEnvironment
}

const detectNetwork = (): NetworkConfig => {
  const hostname = window.location.hostname
  const protocol = window.location.protocol

  if (hostname.startsWith('192.168.27.')) {
    return {
      apiBaseUrl: `${protocol}//${hostname}:3000/api`,
      keycloakAuthority: `${protocol}//${hostname}:8080/realms/MES-Realm`,
      keycloakClientId: 'mes-pwa-client',
      network: 'wifi'
    }
  }

  if (hostname === 'mes-wifi.local' || hostname === 'mes-mobile.local') {
    return {
      apiBaseUrl: `${protocol}//${hostname}:3000/api`,
      keycloakAuthority: `${protocol}//${hostname}:8080/realms/MES-Realm`,
      keycloakClientId: 'mes-pwa-client',
      network: 'wifi'
    }
  }

  if (hostname.startsWith('10.11.0.')) {
    return {
      apiBaseUrl: `${protocol}//${hostname}:3000/api`,
      keycloakAuthority: `${protocol}//10.11.0.16:8080/realms/MES-Realm`,
      keycloakClientId: 'mes-pwa-client',
      network: 'production'
    }
  }

  if (hostname === 'mes.local' || hostname === 'mes-kryptonit.local') {
    return {
      apiBaseUrl: `${protocol}//${hostname}:3000/api`,
      keycloakAuthority: `${protocol}//${hostname}:8080/realms/MES-Realm`,
      keycloakClientId: 'mes-pwa-client',
      network: 'production'
    }
  }

  if (hostname === '10.11.0.16') {
    return {
      apiBaseUrl: `${protocol}//10.11.0.16:5001/api`,
      keycloakAuthority: `${protocol}//10.11.0.16:8080/realms/MES-Realm`,
      keycloakClientId: 'mes-pwa-client',
      network: 'production'
    }
  }

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return {
      apiBaseUrl: '/api',
      keycloakAuthority: 'http://keycloak.local/realms/MES-Realm',
      keycloakClientId: 'mes-client',
      network: 'development'
    }
  }

  return {
    apiBaseUrl: `${protocol}//${hostname}/api`,
    keycloakAuthority: `${protocol}//${hostname}:8080/realms/MES-Realm`,
    keycloakClientId: 'mes-pwa-client',
    network: 'production'
  }
}

const networkConfig = detectNetwork()

export const API_BASE_URL = networkConfig.apiBaseUrl

export const KEYCLOAK_CONFIG = {
  authority: networkConfig.keycloakAuthority,
  clientId: networkConfig.keycloakClientId,
}

const DEBUG_HTTP = import.meta.env.DEV

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

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
})

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
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
  },
  (error) => {
    console.error('[API] Request error:', error)
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  (response: AxiosResponse) => {
    if (DEBUG_HTTP) {
      console.log(`[HTTP] <-- ${response.status} ${response.config.method?.toUpperCase()} ${joinUrl(response.config.baseURL, response.config.url)}`)
    }
    return response
  },
  (err: AxiosError) => {
    const status = err.response?.status
    const url = err.config?.url

    if (DEBUG_HTTP) {
      console.error(`[HTTP] <-- ERROR`, {
        message: err.message,
        status: status,
        data: err.response?.data,
      })
    }

    if (status === 401) {
      console.warn('[API] Unauthorized - token may be expired')
    }

    if (status === 403) {
      console.warn('[API] Forbidden - insufficient permissions')
    }

    if (status === 404) {
      console.warn('[API] Not Found:', url)
    }

    if (status && status >= 500) {
      console.error('[API] Server Error:', err.response?.data)
    }

    if (!err.response) {
      console.error('[API] Network Error - check connection')
    }

    return Promise.reject(err)
  }
)

export interface ApiErrorResponse {
  message: string
  error?: string
  statusCode?: number
  details?: any
}

export const getErrorMessage = (error: unknown, fallback = 'Произошла ошибка'): string => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>

    if (axiosError.response?.data?.message) {
      return axiosError.response.data.message
    }

    if (axiosError.response?.status === 401) {
      return 'Сессия истекла. Пожалуйста, войдите снова.'
    }
    if (axiosError.response?.status === 403) {
      return 'Недостаточно прав для выполнения операции.'
    }
    if (axiosError.response?.status === 404) {
      return 'Запрашиваемый ресурс не найден.'
    }
    if (axiosError.response?.status && axiosError.response.status >= 500) {
      return 'Ошибка сервера. Попробуйте позже.'
    }

    if (axiosError.code === 'ECONNABORTED') {
      return 'Превышено время ожидания. Проверьте соединение.'
    }
    if (!axiosError.response) {
      return 'Нет соединения с сервером. Проверьте сеть.'
    }

    return axiosError.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return fallback
}

export const isNetworkError = (error: unknown): boolean => {
  if (axios.isAxiosError(error)) {
    return !error.response || error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK'
  }
  return false
}

export const isAuthError = (error: unknown): boolean => {
  if (axios.isAxiosError(error)) {
    return error.response?.status === 401
  }
  return false
}

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

export const apiPatch = async <T>(url: string, body?: any): Promise<T> => {
  const { data } = await api.patch<T>(url, body)
  return data
}

export const apiDelete = async <T>(url: string): Promise<T> => {
  const { data } = await api.delete<T>(url)
  return data
}

export const apiUpload = async <T>(url: string, formData: FormData): Promise<T> => {
  const { data } = await api.post<T>(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 60000,
  })
  return data
}

export const getNetworkInfo = () => ({
  apiUrl: API_BASE_URL,
  keycloakAuthority: KEYCLOAK_CONFIG.authority,
  network: networkConfig.network,
  isWifi: networkConfig.network === 'wifi',
  isProduction: networkConfig.network === 'production',
  isDevelopment: networkConfig.network === 'development',
})

console.log(`[API] Network: ${networkConfig.network}, URL: ${API_BASE_URL}`)

export default api