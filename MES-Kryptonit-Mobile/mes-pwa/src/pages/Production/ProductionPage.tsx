/**
 * Страница производства
 */

import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { 
  Search, 
  Cpu, 
  QrCode, 
  ChevronRight
} from 'lucide-react'
import { Card, Input, Button, Badge, EmptyState, Loader, Tabs } from '../../components/ui'
import { api, getErrorMessage } from '../../api/client'
import { useDebounce } from '../../hooks'
import { STATUS_COLORS, STATUS_LABELS } from '../../config'
import type { Product } from '../../types'

export const ProductionPage = () => {
  const navigate = useNavigate()
  
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  
  const debouncedSearch = useDebounce(search, 300)

  useEffect(() => {
    loadProducts()
  }, [debouncedSearch, activeTab])

  const loadProducts = async () => {
    try {
      setLoading(true)
      
      const params: Record<string, any> = { limit: 50 }
      if (debouncedSearch) params.search = debouncedSearch
      if (activeTab !== 'all') params.status = activeTab
      
      const { data } = await api.get('/production/outputs', { params })
      setProducts(Array.isArray(data) ? data : data.rows || [])
      setError(null)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { key: 'all', label: 'Все' },
    { key: 'IN_PRODUCTION', label: 'В работе' },
    { key: 'QUALITY_CONTROL', label: 'ОТК' },
    { key: 'READY', label: 'Готово' },
  ]

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Производство</h1>
          <p className="text-slate-400 text-sm">Сборка и контроль качества</p>
        </div>
        <Link to="/production/scan">
          <Button icon={<QrCode size={18} />}>
            Сканировать
          </Button>
        </Link>
      </div>

      {/* Search */}
      <Card className="p-3">
        <Input
          placeholder="Поиск по серийному номеру..."
          icon={<Search size={18} />}
          value={search}
          onChange={(e) => setSearch(e.target.value.toUpperCase())}
        />
      </Card>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader text="Загрузка..." />
        </div>
      ) : error ? (
        <Card className="p-6 text-center">
          <p className="text-danger mb-4">{error}</p>
          <Button variant="outline" onClick={loadProducts}>
            Повторить
          </Button>
        </Card>
      ) : products.length === 0 ? (
        <EmptyState
          icon={<Cpu size={48} />}
          title="Продукты не найдены"
          description={search ? 'Попробуйте изменить запрос' : 'Нет продуктов с выбранным статусом'}
          action={
            <Link to="/production/scan">
              <Button icon={<QrCode size={18} />}>
                Сканировать новый
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-3">
          {products.map((product) => (
            <Card
              key={product.id}
              hover
              className="p-4"
              onClick={() => navigate(`/production/${product.id}`)}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-surface-light flex items-center justify-center shrink-0">
                    <Cpu size={24} className="text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold truncate">{product.serialNumber}</p>
                    <p className="text-sm text-slate-400 truncate">
                      {product.productType?.name || 'Без типа'}
                    </p>
                    {product.currentStep && (
                      <p className="text-xs text-slate-500 truncate mt-1">
                        Этап: {product.currentStep.title}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant={STATUS_COLORS[product.status] || 'neutral'}>
                    {STATUS_LABELS[product.status] || product.status}
                  </Badge>
                  <ChevronRight size={20} className="text-slate-600" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}