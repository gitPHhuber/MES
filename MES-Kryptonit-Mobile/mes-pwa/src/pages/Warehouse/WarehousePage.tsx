/**
 * Страница склада
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Package, Plus, Filter, AlertTriangle, RefreshCw } from 'lucide-react'
import { Card, Input, Button, Badge, EmptyState, Loader } from '../../components/ui'
import { api, getErrorMessage } from '../../api/client'
import { useDebounce } from '../../hooks'
import { STATUS_COLORS, STATUS_LABELS } from '../../config'
import type { InventoryBox } from '../../types'

export const WarehousePage = () => {
  const navigate = useNavigate()
  const [boxes, setBoxes] = useState<InventoryBox[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  
  const debouncedSearch = useDebounce(search, 300)

  useEffect(() => {
    loadBoxes()
  }, [debouncedSearch])

  const loadBoxes = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)
      
      const params: Record<string, string | number> = { limit: 50 }
      if (debouncedSearch) params.search = debouncedSearch
      
      const { data } = await api.get('/warehouse/boxes', { params })
      setBoxes(Array.isArray(data) ? data : data.rows || [])
      setError(null)
    } catch (err) {
      setError(getErrorMessage(err, 'Ошибка загрузки'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const getStatusBadge = (status: string, quantity: number, minQuantity?: number) => {
    if (minQuantity && quantity <= minQuantity) {
      return <Badge variant="danger" dot>Критично</Badge>
    }
    return <Badge variant={STATUS_COLORS[status] || 'neutral'}>{STATUS_LABELS[status] || status}</Badge>
  }

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Склад</h1>
          <p className="text-slate-400 text-sm">Управление запасами</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" icon={<RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />} onClick={() => loadBoxes(true)} disabled={refreshing}>
            <span className="hidden sm:inline">Обновить</span>
          </Button>
          <Button icon={<Plus size={18} />}><span className="hidden sm:inline">Новая коробка</span></Button>
        </div>
      </div>

      <Card className="p-3">
        <div className="flex gap-3">
          <div className="flex-1">
            <Input placeholder="Поиск по наименованию, QR или артикулу..." icon={<Search size={18} />} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" icon={<Filter size={18} />}><span className="hidden sm:inline">Фильтры</span></Button>
        </div>
      </Card>

      {error && (
        <Card className="p-4 bg-danger/10 border-danger/20">
          <div className="flex items-center gap-3 text-danger">
            <AlertTriangle size={20} />
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={() => loadBoxes()}>Повторить</Button>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader text="Загрузка данных..." /></div>
      ) : boxes.length === 0 ? (
        <EmptyState icon={<Package size={48} />} title="Коробки не найдены" description={search ? 'Попробуйте изменить поисковый запрос' : 'На складе пока нет коробок'} action={search ? <Button variant="outline" onClick={() => setSearch('')}>Сбросить поиск</Button> : undefined} />
      ) : (
        <div className="grid gap-3">
          {boxes.map((box) => (
            <Card key={box.id} hover className="p-4" onClick={() => navigate(`/warehouse/${box.id}`)}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                    <Package size={24} className="text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{box.label}</p>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <span className="truncate">{box.qrCode}</span>
                      {box.partNumber && <><span>•</span><span className="truncate">{box.partNumber}</span></>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="font-bold text-lg">{box.quantity}</p>
                    <p className="text-xs text-slate-500">{box.unit}</p>
                  </div>
                  {getStatusBadge(box.status, box.quantity, box.minQuantity)}
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/50 sm:hidden">
                <span className="text-slate-400">Количество</span>
                <span className="font-bold">{box.quantity} {box.unit}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
