/**
 * Главная страница - Dashboard
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Package, Cpu, CheckCircle2, AlertTriangle, ArrowRight,
  ListTodo, Trophy, Clock, QrCode, TrendingUp
} from 'lucide-react'
import { Card, StatsCard, Badge, Skeleton, Button } from '../../components/ui'
import { useAuth } from 'react-oidc-context'
import { api } from '../../api/client'
import { STATUS_LABELS, STATUS_COLORS } from '../../config'
import type { Task, UserStats } from '../../types'

interface DashboardData {
  warehouse: { totalBoxes: number; alertsCount: number }
  production: { today: number; inProgress: number }
  userStats: UserStats | null
  recentTasks: Task[]
}

export const HomePage = () => {
  const auth = useAuth()
  const user = auth.user?.profile ? {
    name: auth.user.profile.given_name || '',
    surname: auth.user.profile.family_name || '',
  } : null
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      const [tasksRes] = await Promise.allSettled([
        api.get('/tasks', { params: { limit: 5 } }),
      ])

      setData({
        warehouse: {
          totalBoxes: 0,
          alertsCount: 0,
        },
        production: { today: 0, inProgress: 0 },
        userStats: null,
        recentTasks: tasksRes.status === 'fulfilled' ? (tasksRes.value.data?.rows || tasksRes.value.data || []) : [],
      })
    } catch (error) {
      console.error('Dashboard load error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Доброе утро'
    if (hour < 18) return 'Добрый день'
    return 'Добрый вечер'
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{getGreeting()}, {user?.name}!</h1>
          <p className="text-slate-400 mt-1">Вот что происходит сегодня</p>
        </div>
        <Link to="/production/scan">
          <Button icon={<QrCode size={18} />}>Сканировать</Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {loading ? (
          <>
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </>
        ) : (
          <>
            <StatsCard title="На складе" value={data?.warehouse.totalBoxes || 0} icon={<Package size={24} />} variant="primary" />
            <StatsCard title="В работе" value={data?.production.inProgress || 0} icon={<Cpu size={24} />} variant="warning" />
            <StatsCard title="Мой рейтинг" value={data?.userStats?.rank ? `#${data.userStats.rank}` : '—'} icon={<Trophy size={24} />} variant="success" />
            <StatsCard title="Критично" value={data?.warehouse.alertsCount || 0} icon={<AlertTriangle size={24} />} variant={data?.warehouse.alertsCount ? 'danger' : 'default'} />
          </>
        )}
      </div>

      {/* My Stats */}
      {data?.userStats && (
        <Card className="p-5">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-primary" />
            Моя статистика
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-surface-light/50 rounded-xl">
              <p className="text-2xl font-bold text-primary">{data.userStats.todayOperations}</p>
              <p className="text-xs text-slate-400 mt-1">Сегодня</p>
            </div>
            <div className="text-center p-3 bg-surface-light/50 rounded-xl">
              <p className="text-2xl font-bold">{data.userStats.weekOperations}</p>
              <p className="text-xs text-slate-400 mt-1">За неделю</p>
            </div>
            <div className="text-center p-3 bg-surface-light/50 rounded-xl">
              <p className="text-2xl font-bold">{data.userStats.monthOperations}</p>
              <p className="text-xs text-slate-400 mt-1">За месяц</p>
            </div>
            <div className="text-center p-3 bg-surface-light/50 rounded-xl">
              <p className="text-2xl font-bold">{data.userStats.totalOperations}</p>
              <p className="text-xs text-slate-400 mt-1">Всего</p>
            </div>
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
        <Link to="/warehouse">
          <Card hover className="p-5 group h-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/20"><Package size={24} className="text-primary" /></div>
                <div><h3 className="font-semibold">Склад</h3><p className="text-sm text-slate-400">Запасы</p></div>
              </div>
              <ArrowRight size={20} className="text-slate-600 group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
          </Card>
        </Link>

        <Link to="/production">
          <Card hover className="p-5 group h-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-success/20"><Cpu size={24} className="text-success" /></div>
                <div><h3 className="font-semibold">Производство</h3><p className="text-sm text-slate-400">Сборка</p></div>
              </div>
              <ArrowRight size={20} className="text-slate-600 group-hover:text-success group-hover:translate-x-1 transition-all" />
            </div>
          </Card>
        </Link>

        <Link to="/rankings">
          <Card hover className="p-5 group h-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-warning/20"><Trophy size={24} className="text-warning" /></div>
                <div><h3 className="font-semibold">Рейтинги</h3><p className="text-sm text-slate-400">Статистика</p></div>
              </div>
              <ArrowRight size={20} className="text-slate-600 group-hover:text-warning group-hover:translate-x-1 transition-all" />
            </div>
          </Card>
        </Link>
      </div>

      {/* Recent Tasks */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ListTodo size={20} className="text-primary" />
            Мои задачи
          </h2>
          <Link to="/tasks" className="text-sm text-primary hover:underline">Все задачи</Link>
        </div>

        {loading ? (
          <div className="space-y-3"><Skeleton className="h-14" /><Skeleton className="h-14" /><Skeleton className="h-14" /></div>
        ) : data?.recentTasks && data.recentTasks.length > 0 ? (
          <div className="space-y-2">
            {data.recentTasks.map((task) => (
              <Link key={task.id} to="/tasks" className="flex items-center justify-between p-3 rounded-xl hover:bg-surface-light transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${task.status === 'IN_PROGRESS' ? 'bg-primary' : 'bg-warning'}`} />
                  <span className="font-medium truncate">{task.title}</span>
                </div>
                <Badge variant={STATUS_COLORS[task.status] || 'neutral'}>{STATUS_LABELS[task.status] || task.status}</Badge>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <CheckCircle2 size={32} className="mx-auto mb-2 opacity-50" />
            <p>Нет активных задач</p>
          </div>
        )}
      </Card>

      {/* Current Time */}
      <Card className="p-4">
        <div className="flex items-center justify-center gap-3 text-slate-400">
          <Clock size={18} />
          <span>{new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
      </Card>
    </div>
  )
}