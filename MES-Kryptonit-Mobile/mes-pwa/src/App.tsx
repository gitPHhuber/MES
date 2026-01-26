/**
 * MES Kryptonit PWA - Main App
 */

import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from 'react-oidc-context'
import { Loader } from './components/ui'

// Layout
import { Layout } from './components/common/Layout'

// Pages
import { LoginPage } from './pages/Auth/LoginPage'
import { HomePage } from './pages/Home/HomePage'
import { WarehousePage } from './pages/Warehouse/WarehousePage'
import { BoxDetailPage } from './pages/Warehouse/BoxDetailPage'
import { ProductionPage } from './pages/Production/ProductionPage'
import { ProductScanPage } from './pages/Production/ProductScanPage'
import { ChecklistPage } from './pages/Production/ChecklistPage'
import { RankingsPage } from './pages/Rankings/RankingsPage'
import { TasksPage } from './pages/Tasks/TasksPage'
import { ProfilePage } from './pages/Profile/ProfilePage'
import { BeryllPage } from './pages/Beryll/BeryllPage'
import { BeryllServerPage } from './pages/Beryll/BeryllServerPage'
import { BeryllBatchPage } from './pages/Beryll/BeryllBatchPage'
import { FEATURE_FLAGS } from './config'

/**
 * Protected Route wrapper
 */
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const auth = useAuth()

  if (auth.isLoading) {
    return <Loader fullScreen text="Проверка авторизации..." />
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

/**
 * App Component
 */
function App() {
  const auth = useAuth()
  const isBeryllEnabled = FEATURE_FLAGS.BERYLL

  // Регистрация обновления SW
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                if (confirm('Доступна новая версия приложения. Обновить?')) {
                  window.location.reload()
                }
              }
            })
          }
        })
      })
    }
  }, [])

  // Показываем загрузку пока OIDC инициализируется
  if (auth.isLoading) {
    return <Loader fullScreen text="Инициализация..." />
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomePage />} />
        
        {/* Warehouse */}
        <Route path="warehouse" element={<WarehousePage />} />
        <Route path="warehouse/:id" element={<BoxDetailPage />} />
        
        {/* Production */}
        <Route path="production" element={<ProductionPage />} />
        <Route path="production/scan" element={<ProductScanPage />} />
        <Route path="production/:id" element={<ProductionPage />} />
        <Route path="production/checklist/:productId/:stepId" element={<ChecklistPage />} />
        
        {/* Tasks */}
        <Route path="tasks" element={<TasksPage />} />
        
        {/* Rankings */}
        <Route path="rankings" element={<RankingsPage />} />
        
        {/* Profile */}
        <Route path="profile" element={<ProfilePage />} />

        {/* Beryll */}
        {isBeryllEnabled && (
          <>
            <Route path="beryll" element={<BeryllPage />} />
            <Route path="beryll/server/:id" element={<BeryllServerPage />} />
            <Route path="beryll/batch/:id" element={<BeryllBatchPage />} />
          </>
        )}
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
