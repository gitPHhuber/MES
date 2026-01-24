/**
 * Страница чеклиста операции
 */

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Check, 
  Circle,
  CheckCircle2,
  AlertCircle,
  Camera,
  QrCode
} from 'lucide-react'
import { Card, Button, Input, Badge, Loader, Progress } from '../../components/ui'
import { api, getErrorMessage } from '../../api/client'
import type { Product, ProductionStep, ChecklistItem } from '../../types'

interface ChecklistItemState {
  item: ChecklistItem
  value: string
  completed: boolean
}

export const ChecklistPage = () => {
  const { productId, stepId } = useParams<{ productId: string; stepId: string }>()
  const navigate = useNavigate()
  
  const [product, setProduct] = useState<Product | null>(null)
  const [step, setStep] = useState<ProductionStep | null>(null)
  const [items, setItems] = useState<ChecklistItemState[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (productId && stepId) loadData()
  }, [productId, stepId])

  const loadData = async () => {
    try {
      setLoading(true)
      
      const [productRes, stepRes] = await Promise.all([
        api.get(`/products/${productId}`),
        api.get(`/production-steps/${stepId}`),
      ])
      
      setProduct(productRes.data)
      setStep(stepRes.data)
      
      const checklistItems = stepRes.data.checklistItems || []
      setItems(
        checklistItems
          .sort((a: ChecklistItem, b: ChecklistItem) => a.order - b.order)
          .map((item: ChecklistItem) => ({
            item,
            value: '',
            completed: false,
          }))
      )
      
      setError(null)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const updateItem = (index: number, value: string, completed?: boolean) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item
      
      const newCompleted = completed !== undefined 
        ? completed 
        : item.item.type === 'checkbox' 
          ? !item.completed 
          : !!value
          
      return { ...item, value, completed: newCompleted }
    }))
  }

  const completedCount = items.filter(i => i.completed).length
  const canSubmit = items.filter(i => i.item.required).every(i => i.completed)

  const handleSubmit = async () => {
    if (!canSubmit) return
    
    try {
      setSubmitting(true)
      
      await api.post(`/products/${productId}/complete-step`, {
        stepId: parseInt(stepId!),
        responses: items.map(i => ({
          itemId: i.item.id,
          value: i.item.type === 'checkbox' ? (i.completed ? 'true' : 'false') : i.value,
        })),
      })
      
      navigate(`/production/${productId}`, { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const renderItemInput = (itemState: ChecklistItemState, index: number) => {
    const { item, value, completed } = itemState
    
    switch (item.type) {
      case 'checkbox':
        return (
          <button
            onClick={() => updateItem(index, '', !completed)}
            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
              completed 
                ? 'bg-success border-success' 
                : 'border-slate-600 hover:border-primary'
            }`}
          >
            {completed && <Check size={14} className="text-white" />}
          </button>
        )
        
      case 'text':
        return (
          <Input
            value={value}
            onChange={(e) => updateItem(index, e.target.value)}
            placeholder="Введите значение..."
            className="mt-2"
          />
        )
        
      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => updateItem(index, e.target.value)}
            placeholder="Введите число..."
            className="mt-2"
          />
        )
        
      case 'select':
        return (
          <div className="flex flex-wrap gap-2 mt-2">
            {item.options?.map((option) => (
              <button
                key={option}
                onClick={() => updateItem(index, option, true)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  value === option
                    ? 'bg-primary text-white'
                    : 'bg-surface-light text-slate-400 hover:text-white'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        )
        
      case 'photo':
        return (
          <button
            onClick={() => updateItem(index, 'photo_captured', true)}
            className="mt-2 w-full p-4 border-2 border-dashed border-slate-600 rounded-xl
              hover:border-primary transition-colors flex flex-col items-center gap-2"
          >
            <Camera size={24} className="text-slate-500" />
            <span className="text-sm text-slate-400">
              {completed ? 'Фото добавлено ✓' : 'Сделать фото'}
            </span>
          </button>
        )
        
      case 'serial':
        return (
          <div className="mt-2 flex gap-2">
            <Input
              value={value}
              onChange={(e) => updateItem(index, e.target.value.toUpperCase())}
              placeholder="Серийный номер..."
              className="flex-1 font-mono"
            />
            <Button variant="outline" icon={<QrCode size={18} />}>
              Скан
            </Button>
          </div>
        )
        
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader text="Загрузка..." />
      </div>
    )
  }

  if (error || !product || !step) {
    return (
      <div className="text-center py-12">
        <p className="text-danger mb-4">{error || 'Данные не найдены'}</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Назад
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto space-y-4 animate-fadeIn pb-24">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          icon={<ArrowLeft size={20} />}
          onClick={() => navigate(-1)}
        />
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate">{step.title}</h1>
          <p className="text-slate-400 text-sm font-mono truncate">{product.serialNumber}</p>
        </div>
      </div>

      {/* Progress */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-400">Прогресс</span>
          <span className="text-sm font-medium">{completedCount} / {items.length}</span>
        </div>
        <Progress 
          value={completedCount} 
          max={items.length} 
          variant={completedCount === items.length ? 'success' : 'primary'}
        />
      </Card>

      {/* Checklist Items */}
      <div className="space-y-3">
        {items.map((itemState, index) => (
          <Card 
            key={itemState.item.id} 
            className={`p-4 transition-all ${
              itemState.completed ? 'border-success/30 bg-success/5' : ''
            }`}
          >
            <div className="flex items-start gap-3">
              {itemState.item.type === 'checkbox' ? (
                renderItemInput(itemState, index)
              ) : (
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                  itemState.completed ? 'bg-success/20' : 'bg-surface-light'
                }`}>
                  {itemState.completed ? (
                    <CheckCircle2 size={16} className="text-success" />
                  ) : (
                    <Circle size={16} className="text-slate-500" />
                  )}
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`font-medium ${itemState.completed ? 'text-success' : ''}`}>
                    {itemState.item.title}
                  </p>
                  {itemState.item.required && (
                    <Badge variant="danger" size="sm">Обяз.</Badge>
                  )}
                </div>
                
                {itemState.item.type !== 'checkbox' && renderItemInput(itemState, index)}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-slate-700/50">
        <div className="max-w-xl mx-auto">
          {!canSubmit && (
            <p className="text-center text-sm text-warning mb-3 flex items-center justify-center gap-2">
              <AlertCircle size={16} />
              Заполните все обязательные пункты
            </p>
          )}
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            loading={submitting}
            fullWidth
            size="lg"
            icon={<Check size={18} />}
          >
            Завершить операцию
          </Button>
        </div>
      </div>
    </div>
  )
}
