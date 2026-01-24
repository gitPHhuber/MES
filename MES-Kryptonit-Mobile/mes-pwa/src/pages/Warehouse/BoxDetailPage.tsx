/**
 * Детальная страница коробки
 */

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Package, MapPin, Clock, QrCode, Plus, Minus, History, Edit } from 'lucide-react'
import { Card, Button, Badge, Loader, Modal, Input } from '../../components/ui'
import { api, getErrorMessage } from '../../api/client'
import { STATUS_COLORS, STATUS_LABELS } from '../../config'
import type { InventoryBox, WarehouseMovement } from '../../types'

export const BoxDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const [box, setBox] = useState<InventoryBox | null>(null)
  const [movements, setMovements] = useState<WarehouseMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [showMovementModal, setShowMovementModal] = useState(false)
  const [movementType, setMovementType] = useState<'IN' | 'OUT'>('OUT')
  const [movementQty, setMovementQty] = useState('')
  const [movementReason, setMovementReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (id) loadBox()
  }, [id])

  const loadBox = async () => {
    try {
      setLoading(true)
      const [boxRes, movementsRes] = await Promise.all([
        api.get(`/warehouse/boxes/${id}`),
        api.get(`/warehouse/boxes/${id}/movements`, { params: { limit: 10 } }),
      ])
      setBox(boxRes.data)
      setMovements(movementsRes.data?.rows || movementsRes.data || [])
      setError(null)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleMovement = async () => {
    if (!movementQty || !box) return
    try {
      setSubmitting(true)
      await api.post(`/warehouse/boxes/${id}/movements`, {
        type: movementType,
        quantity: parseInt(movementQty),
        reason: movementReason || undefined,
      })
      setShowMovementModal(false)
      setMovementQty('')
      setMovementReason('')
      loadBox()
    } catch (err) {
      alert(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const openMovementModal = (type: 'IN' | 'OUT') => {
    setMovementType(type)
    setShowMovementModal(true)
  }

  if (loading) return <div className="flex justify-center py-12"><Loader text="Загрузка..." /></div>

  if (error || !box) {
    return (
      <div className="text-center py-12">
        <p className="text-danger mb-4">{error || 'Коробка не найдена'}</p>
        <Button variant="outline" onClick={() => navigate('/warehouse')}>Назад к списку</Button>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center gap-4">
        <Button variant="ghost" icon={<ArrowLeft size={20} />} onClick={() => navigate('/warehouse')} />
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{box.label}</h1>
          <p className="text-slate-400 text-sm truncate">{box.qrCode}</p>
        </div>
        <Button variant="ghost" icon={<Edit size={18} />}><span className="hidden sm:inline">Редактировать</span></Button>
      </div>

      <Card className="p-5">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
            <Package size={32} className="text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-3xl font-bold">{box.quantity}</span>
              <span className="text-slate-400">{box.unit}</span>
            </div>
            <Badge variant={STATUS_COLORS[box.status] || 'neutral'}>{STATUS_LABELS[box.status] || box.status}</Badge>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" icon={<Minus size={18} />} onClick={() => openMovementModal('OUT')}>Списать</Button>
          <Button className="flex-1" icon={<Plus size={18} />} onClick={() => openMovementModal('IN')}>Добавить</Button>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-4">Информация</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <QrCode size={18} className="text-slate-500 shrink-0" />
            <div className="min-w-0"><p className="text-sm text-slate-400">QR-код</p><p className="font-medium truncate">{box.qrCode}</p></div>
          </div>
          {box.partNumber && (
            <div className="flex items-center gap-3">
              <Package size={18} className="text-slate-500 shrink-0" />
              <div className="min-w-0"><p className="text-sm text-slate-400">Артикул</p><p className="font-medium truncate">{box.partNumber}</p></div>
            </div>
          )}
          {box.section && (
            <div className="flex items-center gap-3">
              <MapPin size={18} className="text-slate-500 shrink-0" />
              <div className="min-w-0"><p className="text-sm text-slate-400">Секция</p><p className="font-medium truncate">{box.section.title}</p></div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Clock size={18} className="text-slate-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm text-slate-400">Обновлено</p>
              <p className="font-medium">{new Date(box.updatedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-4 flex items-center gap-2"><History size={18} className="text-slate-500" />История движений</h2>
        {movements.length > 0 ? (
          <div className="space-y-3">
            {movements.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${m.type === 'IN' ? 'bg-success/20' : 'bg-danger/20'}`}>
                    {m.type === 'IN' ? <Plus size={16} className="text-success" /> : <Minus size={16} className="text-danger" />}
                  </div>
                  <div>
                    <p className="font-medium">{m.type === 'IN' ? '+' : '-'}{m.quantity} {box.unit}</p>
                    <p className="text-xs text-slate-500">{m.user?.surname} {m.user?.name}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500">{new Date(m.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-center py-4">История пуста</p>
        )}
      </Card>

      <Modal isOpen={showMovementModal} onClose={() => setShowMovementModal(false)} title={movementType === 'IN' ? 'Приход' : 'Расход'} size="sm">
        <div className="space-y-4">
          <Input label="Количество" type="number" value={movementQty} onChange={(e) => setMovementQty(e.target.value)} placeholder={`Введите количество (${box.unit})`} min="1" autoFocus />
          <Input label="Причина (опционально)" value={movementReason} onChange={(e) => setMovementReason(e.target.value)} placeholder="Укажите причину" />
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" className="flex-1" onClick={() => setShowMovementModal(false)}>Отмена</Button>
            <Button variant={movementType === 'IN' ? 'success' : 'danger'} className="flex-1" onClick={handleMovement} loading={submitting} disabled={!movementQty || parseInt(movementQty) <= 0}>{movementType === 'IN' ? 'Добавить' : 'Списать'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
