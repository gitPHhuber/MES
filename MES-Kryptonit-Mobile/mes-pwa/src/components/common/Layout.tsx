/**
 * Layout - главный компонент разметки
 */

import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { 
  Home, Package, Cpu, ListTodo, Trophy, User, LogOut,
  Menu, X, Bell, QrCode, Wifi, WifiOff
} from 'lucide-react'
import { useAuth } from 'react-oidc-context'
import { USER_ROLES } from '../../config'

const navItems = [
  { to: '/', icon: Home, label: 'Главная' },
  { to: '/warehouse', icon: Package, label: 'Склад' },
  { to: '/production', icon: Cpu, label: 'Производство' },
  { to: '/tasks', icon: ListTodo, label: 'Задачи' },
  { to: '/rankings', icon: Trophy, label: 'Рейтинги' },
]

export const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Данные пользователя из OIDC
  const user = auth.user?.profile ? {
    name: auth.user.profile.given_name || '',
    surname: auth.user.profile.family_name || '',
    role: (auth.user.profile as any).realm_access?.roles?.[0] || 'USER',
    img: (auth.user.profile as any).picture,
  } : null

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleLogout = () => {
    if (confirm('Выйти из системы?')) {
      auth.signoutRedirect()
    }
  }

  const getPageTitle = () => {
    const path = location.pathname
    if (path === '/') return 'Главная'
    if (path.startsWith('/warehouse')) return 'Склад'
    if (path.startsWith('/production')) return 'Производство'
    if (path.startsWith('/tasks')) return 'Задачи'
    if (path.startsWith('/rankings')) return 'Рейтинги'
    if (path.startsWith('/profile')) return 'Профиль'
    return 'MES'
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-surface border-r border-slate-700/50
        transform transition-transform duration-300 ease-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-700/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg shadow-primary/25">
              <Cpu size={20} className="text-white" />
            </div>
            <div>
              <span className="font-bold text-lg">MES</span>
              <span className="text-primary ml-1 font-light">Kryptonit</span>
            </div>
          </div>
          <button 
            className="lg:hidden p-2 hover:bg-surface-light rounded-lg transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Quick Scan */}
        <div className="p-4 shrink-0">
          <button
            onClick={() => { navigate('/production/scan'); setSidebarOpen(false) }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 
              bg-gradient-to-r from-primary to-primary-dark text-white 
              rounded-xl font-medium shadow-lg shadow-primary/25
              hover:shadow-primary/40 transition-all active:scale-[0.98]"
          >
            <QrCode size={20} />
            Сканировать
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-xl
                transition-all duration-150
                ${isActive 
                  ? 'bg-primary text-white shadow-lg shadow-primary/25' 
                  : 'text-slate-400 hover:bg-surface-light hover:text-white'
                }
              `}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-slate-700/50 shrink-0">
          <NavLink
            to="/profile"
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-3 rounded-xl mb-2
              transition-all duration-150
              ${isActive 
                ? 'bg-primary/20 text-primary' 
                : 'text-slate-400 hover:bg-surface-light hover:text-white'
              }
            `}
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20">
              {user?.img ? (
                <img src={user.img} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <User size={18} className="text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate text-white">
                {user?.surname} {user?.name}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {USER_ROLES[user?.role || ''] || user?.role}
              </p>
            </div>
          </NavLink>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl
              text-slate-400 hover:bg-danger/10 hover:text-danger
              transition-all duration-150"
          >
            <LogOut size={20} />
            <span className="font-medium">Выйти</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-surface/80 backdrop-blur-xl border-b border-slate-700/50 flex items-center px-4 lg:px-6 sticky top-0 z-30 shrink-0">
          <button
            className="lg:hidden p-2 hover:bg-surface-light rounded-lg mr-3 transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={22} />
          </button>
          
          <h1 className="text-lg font-semibold lg:hidden">{getPageTitle()}</h1>
          
          <div className="flex-1" />

          {/* Online status */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg mr-3 ${isOnline ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
            {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
            <span className="text-xs font-medium hidden sm:inline">
              {isOnline ? 'Онлайн' : 'Офлайн'}
            </span>
          </div>
          
          {/* Notifications */}
          <button className="p-2 hover:bg-surface-light rounded-lg relative transition-colors">
            <Bell size={20} className="text-slate-400" />
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
