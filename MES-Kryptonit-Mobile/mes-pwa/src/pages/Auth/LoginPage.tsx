/**
 * Страница авторизации
 */

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from 'react-oidc-context'
import { Cpu, Key, AlertCircle } from 'lucide-react'
import { Button, Card } from '../../components/ui'

export const LoginPage = () => {
  const navigate = useNavigate()
  const auth = useAuth()

  // Редирект если уже авторизован
  useEffect(() => {
    if (auth.isAuthenticated) {
      navigate('/', { replace: true })
    }
  }, [auth.isAuthenticated, navigate])

  const handleLogin = () => {
    auth.signinRedirect()
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary to-primary-dark rounded-2xl mb-4 shadow-2xl shadow-primary/30">
            <Cpu size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold">
            MES <span className="text-primary">Kryptonit</span>
          </h1>
          <p className="text-slate-400 mt-2">Система управления производством</p>
        </div>

        {/* Login */}
        <Card className="p-6">
          <div className="space-y-4">
            {auth.error && (
              <div className="flex items-center gap-2 p-3 bg-danger/10 border border-danger/20 rounded-xl text-danger text-sm">
                <AlertCircle size={16} className="shrink-0" />
                <span>{auth.error.message}</span>
              </div>
            )}

            <Button
              onClick={handleLogin}
              className="w-full"
              size="lg"
              icon={<Key size={20} />}
              loading={auth.isLoading}
            >
              Войти через SSO
            </Button>
          </div>
        </Card>

        {/* Info */}
        <div className="mt-6 text-center">
          <p className="text-slate-600 text-sm">
            MES Kryptonit PWA v2.0
          </p>
          <p className="text-slate-700 text-xs mt-1">
            Для работы требуется подключение к корпоративной сети
          </p>
        </div>
      </div>
    </div>
  )
}
