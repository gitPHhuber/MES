/**
 * Страница профиля
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  User, 
  Mail, 
  Shield, 
  LogOut, 
  Bell,
  Moon,
  Smartphone,
  Download,
  CheckCircle,
  Info,
  ChevronRight,
  RefreshCw
} from 'lucide-react'
import { Card, Button, Badge } from '../../components/ui'
import { useAuth } from 'react-oidc-context'
import { USER_ROLES } from '../../config'

export const ProfilePage = () => {
  const navigate = useNavigate()
  const auth = useAuth()
  
  // Данные пользователя из OIDC
  const user = auth.user?.profile ? {
    name: auth.user.profile.given_name || '',
    surname: auth.user.profile.family_name || '',
    login: auth.user.profile.preferred_username || auth.user.profile.email || '',
    email: auth.user.profile.email || '',
    role: (auth.user.profile as any).realm_access?.roles?.[0] || 'USER',
    img: (auth.user.profile as any).picture,
  } : null
  
  const authMethod = 'keycloak'
  const logout = () => auth.signoutRedirect()
  
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  // Проверяем, установлено ли PWA
  useState(() => {
    // @ts-ignore
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      setIsInstalled(true)
    }

    // Слушаем событие установки
    const handleBeforeInstall = (e: any) => {
      e.preventDefault()
      setInstallPrompt(e)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  })

  const handleInstall = async () => {
    if (!installPrompt) return
    
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    
    if (outcome === 'accepted') {
      setIsInstalled(true)
      setInstallPrompt(null)
    }
  }

  const handleLogout = () => {
    if (confirm('Выйти из системы?')) {
      logout()
      navigate('/login')
    }
  }

  const handleRefreshApp = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.update()
        })
      })
    }
    window.location.reload()
  }

  return (
    <div className="max-w-xl mx-auto space-y-4 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Профиль</h1>
        <p className="text-slate-400 text-sm">Настройки аккаунта</p>
      </div>

      {/* User Card */}
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20">
            {user?.img ? (
              <img src={user.img} alt="" className="w-full h-full rounded-2xl object-cover" />
            ) : (
              <User size={28} className="text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold truncate">
              {user?.surname} {user?.name}
            </h2>
            <p className="text-slate-400 truncate">@{user?.login}</p>
            <Badge variant="primary" className="mt-2">
              {USER_ROLES[user?.role || ''] || user?.role}
            </Badge>
          </div>
        </div>

        {/* Auth Method */}
        <div className="mt-4 pt-4 border-t border-slate-700/50">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Shield size={14} />
            <span>
              Авторизация: {authMethod === 'keycloak' ? 'SSO (Keycloak)' : 'Логин/пароль'}
            </span>
          </div>
        </div>
      </Card>

      {/* User Info */}
      <Card className="divide-y divide-slate-700/50">
        <div className="p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-surface-light flex items-center justify-center">
            <User size={18} className="text-slate-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-slate-400">Логин</p>
            <p className="font-medium">{user?.login}</p>
          </div>
        </div>

        {user?.team && (
          <div className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-surface-light flex items-center justify-center">
              <Shield size={18} className="text-slate-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-slate-400">Команда</p>
              <p className="font-medium">{user.team.title}</p>
            </div>
          </div>
        )}

        {user?.section && (
          <div className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-surface-light flex items-center justify-center">
              <Info size={18} className="text-slate-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-slate-400">Участок</p>
              <p className="font-medium">{user.section.title}</p>
            </div>
          </div>
        )}
      </Card>

      {/* Permissions */}
      {user?.abilities && user.abilities.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Shield size={18} className="text-primary" />
            Права доступа
          </h3>
          <div className="flex flex-wrap gap-2">
            {user.abilities.map((ability) => (
              <Badge key={ability} variant="neutral">
                {ability}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* PWA Install */}
      {!isInstalled && (
        <Card className="p-4 bg-primary/10 border-primary/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
              <Smartphone size={24} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold">Установить приложение</h3>
              <p className="text-sm text-slate-400">
                Добавьте на главный экран для быстрого доступа
              </p>
            </div>
            <Button
              onClick={handleInstall}
              disabled={!installPrompt}
              icon={<Download size={18} />}
            >
              <span className="hidden sm:inline">Установить</span>
            </Button>
          </div>
        </Card>
      )}

      {isInstalled && (
        <Card className="p-4 bg-success/10 border-success/20">
          <div className="flex items-center gap-3 text-success">
            <CheckCircle size={20} />
            <span className="font-medium">Приложение установлено</span>
          </div>
        </Card>
      )}

      {/* Settings */}
      <Card className="divide-y divide-slate-700/50">
        <button className="w-full p-4 flex items-center gap-4 hover:bg-surface-light/50 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-surface-light flex items-center justify-center">
            <Bell size={18} className="text-slate-400" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-medium">Уведомления</p>
            <p className="text-sm text-slate-500">Настройки push-уведомлений</p>
          </div>
          <ChevronRight size={20} className="text-slate-600" />
        </button>

        <button className="w-full p-4 flex items-center gap-4 hover:bg-surface-light/50 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-surface-light flex items-center justify-center">
            <Moon size={18} className="text-slate-400" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-medium">Тема оформления</p>
            <p className="text-sm text-slate-500">Тёмная тема</p>
          </div>
          <ChevronRight size={20} className="text-slate-600" />
        </button>

        <button 
          onClick={handleRefreshApp}
          className="w-full p-4 flex items-center gap-4 hover:bg-surface-light/50 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-surface-light flex items-center justify-center">
            <RefreshCw size={18} className="text-slate-400" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-medium">Обновить приложение</p>
            <p className="text-sm text-slate-500">Проверить обновления</p>
          </div>
          <ChevronRight size={20} className="text-slate-600" />
        </button>
      </Card>

      {/* App Info */}
      <Card className="p-4">
        <div className="text-center text-sm text-slate-500">
          <p>MES Kryptonit PWA v2.0.0</p>
          <p className="mt-1">© 2024 Все права защищены</p>
        </div>
      </Card>

      {/* Logout */}
      <Button
        variant="danger"
        fullWidth
        size="lg"
        icon={<LogOut size={18} />}
        onClick={handleLogout}
      >
        Выйти из системы
      </Button>
    </div>
  )
}
