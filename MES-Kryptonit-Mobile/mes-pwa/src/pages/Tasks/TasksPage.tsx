/**
 * Страница задач
 */

import { useEffect, useState } from 'react'
import { 
  ListTodo, 
  Plus, 
  Search, 
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight
} from 'lucide-react'
import { Card, Input, Button, Badge, Tabs, EmptyState, Loader } from '../../components/ui'
import { api, getErrorMessage } from '../../api/client'
import { useDebounce } from '../../hooks'
import { STATUS_COLORS, STATUS_LABELS } from '../../config'
import type { Task } from '../../types'

export const TasksPage = () => {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('my')
  
  const debouncedSearch = useDebounce(search, 300)

  useEffect(() => {
    loadTasks()
  }, [debouncedSearch, activeTab])

  const loadTasks = async () => {
    try {
      setLoading(true)
      
      const params: Record<string, any> = { limit: 50 }
      if (debouncedSearch) params.search = debouncedSearch
      if (activeTab === 'my') params.assignedToMe = true
      if (activeTab === 'active') params.status = 'IN_PROGRESS,PENDING'
      if (activeTab === 'completed') params.status = 'COMPLETED'
      
      const { data } = await api.get('/tasks', { params })
      setTasks(Array.isArray(data) ? data : data.rows || [])
      setError(null)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 size={16} className="text-success" />
      case 'IN_PROGRESS':
        return <Clock size={16} className="text-primary" />
      case 'PENDING':
        return <AlertCircle size={16} className="text-warning" />
      default:
        return <Clock size={16} className="text-slate-500" />
    }
  }

  const getPriorityColor = (priority: number): 'danger' | 'warning' | 'neutral' => {
    if (priority >= 3) return 'danger'
    if (priority >= 2) return 'warning'
    return 'neutral'
  }

  const tabs = [
    { key: 'my', label: 'Мои', icon: <ListTodo size={16} /> },
    { key: 'active', label: 'Активные' },
    { key: 'completed', label: 'Завершённые' },
    { key: 'all', label: 'Все' },
  ]

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Задачи</h1>
          <p className="text-slate-400 text-sm">Управление задачами</p>
        </div>
        <Button icon={<Plus size={18} />}>
          Новая задача
        </Button>
      </div>

      {/* Search */}
      <Card className="p-3">
        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              placeholder="Поиск задач..."
              icon={<Search size={18} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" icon={<Filter size={18} />}>
            <span className="hidden sm:inline">Фильтры</span>
          </Button>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader text="Загрузка задач..." />
        </div>
      ) : error ? (
        <Card className="p-6 text-center">
          <p className="text-danger mb-4">{error}</p>
          <Button variant="outline" onClick={loadTasks}>Повторить</Button>
        </Card>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={<ListTodo size={48} />}
          title="Задачи не найдены"
          description={search ? 'Попробуйте изменить запрос' : 'У вас пока нет задач'}
          action={
            <Button icon={<Plus size={18} />}>
              Создать задачу
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <Card key={task.id} hover className="p-4">
              <div className="flex items-center gap-4">
                <div className="shrink-0">
                  {getStatusIcon(task.status)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className={`font-medium truncate ${
                      task.status === 'COMPLETED' ? 'text-slate-500 line-through' : ''
                    }`}>
                      {task.title}
                    </p>
                    {task.priority >= 2 && (
                      <Badge variant={getPriorityColor(task.priority)} size="sm">
                        {task.priority >= 3 ? 'Срочно' : 'Важно'}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    {task.project && (
                      <span className="truncate">{task.project.title}</span>
                    )}
                    {task.dueDate && (
                      <>
                        <span>•</span>
                        <span className={new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED' ? 'text-danger' : ''}>
                          {new Date(task.dueDate).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'short'
                          })}
                        </span>
                      </>
                    )}
                    {task.assignee && (
                      <>
                        <span>•</span>
                        <span className="truncate">{task.assignee.surname}</span>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant={STATUS_COLORS[task.status] || 'neutral'}>
                    {STATUS_LABELS[task.status] || task.status}
                  </Badge>
                  <ChevronRight size={18} className="text-slate-600" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
